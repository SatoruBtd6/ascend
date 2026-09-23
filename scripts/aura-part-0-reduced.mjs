// Ascended under prefers-reduced-motion: the global `*{animation:none}` rule
// strips the keyframe transform that centers the ophanim imgs.
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

const base = process.argv[2] || "http://127.0.0.1:5180";
const suffix = process.argv[3] || "v7g";
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, reducedMotion: process.env.RM === "0" ? "no-preference" : "reduce" });
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
await sleep(2500);
await page.screenshot({ path: join(OUT, `${suffix}-rm-status.png`) });

const boxes = await page.evaluate(() =>
  [...document.querySelectorAll("canvas")].map((c) => {
    const host = c.closest("div");
    const imgs = [...host.querySelectorAll("img")].map((i) => { const r = i.getBoundingClientRect(); return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], transform: getComputedStyle(i).transform }; });
    return { canvas: [c.width, c.height], imgs };
  })
);
console.log(JSON.stringify(boxes, null, 1));

// Open the profile (tap the header avatar) for the 76px view.
await page.getByLabel("Open your profile").click().catch(() => {});
await sleep(1800);
await page.screenshot({ path: join(OUT, `${suffix}-rm-profile.png`) });
const clip = await page.evaluate(() => {
  const c = [...document.querySelectorAll("canvas")].sort((a, b) => a.width - b.width)[0];
  const r = c?.getBoundingClientRect();
  return r ? { x: Math.max(0, r.x - 50), y: Math.max(0, r.y - 50), width: r.width + 100, height: r.height + 100 } : null;
});
if (clip) await page.screenshot({ path: join(OUT, `${suffix}-rm-avatar76.png`), clip });
await browser.close();
console.log("done");
