// Full editor-panel screenshot for a given aura.
// Usage: node scripts/aura-7i-editor-shot.mjs <outfile> <buttonLabelRegex> [base]
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

const [out = "editor.png", name = "Ossuary", base = "http://127.0.0.1:5173"] = process.argv.slice(2);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1800, height: 950 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 300)));
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: name }).first().click();
await page.waitForTimeout(900);
// scroll the editor column to the top, then shoot the whole right pane
const pane = page.locator('button:has-text("Copy spec")').first();
const box = await pane.boundingBox();
if (box) {
  await page.screenshot({ path: out, clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 70), width: 1800 - box.x - 10, height: 900 } });
} else {
  await page.screenshot({ path: out });
}
await browser.close();
console.log(`saved ${out}`);
