// Part 0 repro: Ascended aura on the real avatar surfaces. Usage:
//   node scripts/aura-part-0-ascended.mjs [baseUrl] [outSuffix]
// Signs in as chud (TEST_EMAIL/TEST_PASSWORD), forces look.aura="ascended"
// through the app's own storage layer, then screenshots the profile avatar,
// the physique header, and the board.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const suffix = process.argv[3] || "now";
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
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("[page-err]", m.text().slice(0, 200)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));

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

// Force ascended on chud's look through the app's own storage layer.
const setRes = await page.evaluate(async () => {
  const got = await window.storage.get("ascend-state");
  const state = JSON.parse(got.value);
  state.profile = state.profile || {};
  state.profile.look = { ...(state.profile.look || {}), aura: "ascended" };
  await window.storage.set("ascend-state", JSON.stringify(state));
  return { aura: state.profile.look.aura, test: state.test, lb: state.lb };
});
console.log("set look:", JSON.stringify(setRes));

await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Train", exact: true }).first().waitFor({ timeout: 40000 });
await sleep(1200);

async function nav(label) {
  const btn = page.locator("nav").getByRole("button", { name: label, exact: true });
  try { await btn.click({ force: true, timeout: 8000 }); }
  catch {
    await page.evaluate((name) => {
      const b = [...document.querySelectorAll("nav button")].find((x) => (x.textContent || "").trim().startsWith(name));
      b?.click();
    }, label);
  }
  await sleep(900);
}

// Profile tab — avatar 76px + physique header.
await nav("Profile");
await sleep(1500);
await page.screenshot({ path: join(OUT, `${suffix}-profile.png`) });
// Zoom into the avatar itself.
const avatarBox = await page.evaluate(() => {
  const canvas = [...document.querySelectorAll("canvas")].find((c) => c.width <= 320);
  const el = canvas?.closest("div");
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
});
console.log("avatarBox:", JSON.stringify(avatarBox));
if (avatarBox) {
  const clip = { x: Math.max(0, avatarBox.x - 40), y: Math.max(0, avatarBox.y - 40), width: avatarBox.width + 80, height: avatarBox.height + 80 };
  await page.screenshot({ path: join(OUT, `${suffix}-avatar76.png`), clip });
}
// Dump geometry of every aura canvas on the profile.
const geo = await page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => { const r = c.getBoundingClientRect(); return { w: c.width, h: c.height, cssW: r.width, cssH: r.height, x: Math.round(r.x), y: Math.round(r.y) }; }));
console.log("canvases:", JSON.stringify(geo));

// Board tab — rows render Avatar at 32/38/48.
await nav("Board");
await sleep(1500);
await page.screenshot({ path: join(OUT, `${suffix}-board.png`) });

writeFileSync(join(OUT, `${suffix}-meta.json`), JSON.stringify({ base, setRes, avatarBox, geo }, null, 2));
await browser.close();
console.log("done ->", OUT);
