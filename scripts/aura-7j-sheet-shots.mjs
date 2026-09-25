// 7j Part 2: screenshots of the gallery "New particle shapes" overlay — the
// ShapeCell canvases animate via RAF, so two captures 0.6s apart show motion.
//   node scripts/aura-7j-sheet-shots.mjs [--base http://localhost:5174]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascend-7j");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1000));
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Show shapes")?.click());
await new Promise((r) => setTimeout(r, 900));
const panel = await page.evaluate(() => {
  const el = document.querySelector('[data-control-group="shape-sheet"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
await page.screenshot({ path: join(OUT, "gallery-shapes-t0.png"), clip: panel });
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: join(OUT, "gallery-shapes-t1.png"), clip: panel });
console.log("saved gallery-shapes-t0/t1.png ->", OUT);
await browser.close();
