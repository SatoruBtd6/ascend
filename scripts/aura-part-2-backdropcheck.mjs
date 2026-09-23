// Verify the new backdrop controls: surface chips, body/rank chips, steppers,
// and that the hidden #aura-backdrop select still tracks state for scripts.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:5173/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const res = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sel = () => document.querySelector("#aura-backdrop")?.value;
  const click = (text) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text)?.click();
  const out = { start: sel() };
  click("Female"); await sleep(200); out.female = sel();
  click("SS"); await sleep(200); out.ss = sel();
  click("▶"); await sleep(200); out.afterNext = sel(); // wraps SS-f -> E-m
  click("◀"); click("◀"); await sleep(200); out.afterPrevPrev = sel(); // E-m -> S-f
  click("Default avatar"); await sleep(200); out.avatar = sel();
  click("Figure"); await sleep(200); out.backToFigure = sel(); // remembers S-f
  const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
  out.visibleControls = ["Figure", "Default avatar", "My photo", "Male", "Female", "E", "SS"].every((t) => buttons.includes(t));
  return out;
});
console.log(JSON.stringify(res, null, 1));
// toolbar screenshot
const clip = await page.evaluate(() => {
  const bar = document.querySelector("div"); // fixed bar is the first positioned div
  const el = [...document.querySelectorAll("div")].find((d) => d.style.position === "fixed");
  const r = el.getBoundingClientRect();
  return { x: 0, y: 0, width: 1400, height: r.height + 8 };
});
await page.screenshot({ path: join(OUT, "p2e-toolbar.png"), clip });
await browser.close();
console.log("done");
