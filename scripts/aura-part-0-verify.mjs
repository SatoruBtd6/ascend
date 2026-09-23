// Part 0 verify: Ascended on all surfaces, parametrized by theme + motion.
//   node scripts/aura-part-0-verify.mjs [baseUrl] [suffix] [dark|light] [reduce|full]
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const [base = "http://127.0.0.1:5180", suffix = "fix", theme = "dark", motion = "full"] = process.argv.slice(2);
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = `${suffix}-${theme}-${motion}`;

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, reducedMotion: motion === "reduce" ? "reduce" : "no-preference" });
const page = await context.newPage();
await page.goto(base, { waitUntil: "networkidle" });
const email = page.getByPlaceholder("Email");
await email.or(page.getByRole("button", { name: "Train", exact: true })).first().waitFor({ timeout: 40000 });
if (await email.count()) {
  await email.fill(env.TEST_EMAIL);
  await page.getByPlaceholder("Password").fill(env.TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}
await page.getByRole("button", { name: "Train", exact: true }).first().waitFor({ timeout: 40000 });
await sleep(800);

await page.evaluate(async (t) => {
  const got = await window.storage.get("ascend-state");
  const state = JSON.parse(got.value);
  state.profile = state.profile || {};
  state.profile.look = { ...(state.profile.look || {}), aura: "ascended" };
  state.settings = { ...(state.settings || {}), theme: t };
  await window.storage.set("ascend-state", JSON.stringify(state));
}, theme);
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Train", exact: true }).first().waitFor({ timeout: 40000 });
await sleep(1500);

const clipAround = async (sel) => page.evaluate((q) => {
  const el = document.querySelector(q);
  const r = el?.getBoundingClientRect();
  return r ? { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 30), width: Math.min(430 - Math.max(0, r.x - 30), r.width + 60), height: r.height + 60 } : null;
}, sel);

// Status header avatar (~44px).
await page.screenshot({ path: join(OUT, `${tag}-status.png`) });
const hclip = await clipAround("header canvas") || await clipAround("canvas");
if (hclip) await page.screenshot({ path: join(OUT, `${tag}-avatar-sm.png`), clip: hclip });

// Profile page (76px avatar + physique figure).
await page.getByLabel("Open your profile").click().catch(async () => {
  await page.evaluate(() => { document.querySelector("header button")?.click(); });
});
await sleep(1500);
await page.screenshot({ path: join(OUT, `${tag}-profile.png`) });
const av = await page.evaluate(() => {
  const cs = [...document.querySelectorAll("canvas")].filter((c) => c.width <= 320 && c.width > 60);
  const c = cs.sort((a, b) => a.width - b.width)[0];
  const host = c?.closest("div");
  const r = host?.getBoundingClientRect();
  if (!r) return null;
  const x = Math.max(0, r.x - 30), y = Math.max(0, r.y - 30);
  return { x, y, width: Math.min(window.innerWidth - x, r.width + 60), height: Math.min(window.innerHeight - y, r.height + 60) };
});
if (av && av.width > 0 && av.height > 0) await page.screenshot({ path: join(OUT, `${tag}-avatar76.png`), clip: av });

// Board rows (other players render ascended at 32/38/48).
await page.evaluate(() => { document.querySelector("header button")?.click(); }).catch(() => {});
await page.goto(base, { waitUntil: "networkidle" }).catch(() => {});
await sleep(1200);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("nav button")].find((x) => (x.textContent || "").trim().startsWith("Board"));
  b?.click();
});
await sleep(1500);
await page.screenshot({ path: join(OUT, `${tag}-board.png`) });

await browser.close();
console.log("done ->", tag);
