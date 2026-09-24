// Screenshot the aura editor panel (right column) for before/after comparison.
// Usage: node scripts/aura-7i-gallery-shot.mjs <outfile> [AuraName]
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const argv = process.argv.slice(2);
const out = argv[0] || "gallery-editor.png";
const auraName = argv[1] || "Ossuary";
const base = argv[2] || "http://127.0.0.1:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: new RegExp(auraName) }).first().click();
await page.waitForTimeout(900);
const anchor = page.locator('button:has-text("Copy spec")');
const box = await anchor.boundingBox();
if (box) {
  await page.screenshot({ path: out, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 60), width: Math.min(700, 1400 - box.x + 40), height: 800 } });
} else {
  await page.screenshot({ path: out });
}
await browser.close();
console.log(`saved ${out}`);
