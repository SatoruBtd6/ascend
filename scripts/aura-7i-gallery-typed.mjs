// Typed-value probe: does typing an out-of-range number commit it to the spec?
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

const base = process.argv[2] || "http://127.0.0.1:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Ossuary/ }).first().click();
await page.waitForTimeout(800);

const h = (await page.$$('label input[type="number"]'))[0];
const label = await h.evaluate((el) => el.closest("label").querySelector("span").textContent.trim());
const rng = () => h.evaluate((el) => { const r = el.closest("label").querySelector('input[type="range"]'); return `num=${el.value} range=${r.value} bounds=[${r.min}..${r.max}]`; });
console.log(`${label}: before: ${await rng()}`);
await h.scrollIntoViewIfNeeded();
const bb = await h.boundingBox();
await page.mouse.click(bb.x + bb.width / 2, Math.max(bb.y, 96) + bb.height / 2);
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.type("999");
await page.waitForTimeout(500);
console.log(`${label}: typed 999 -> ${await rng()}`);
await page.keyboard.press("Tab");
await page.waitForTimeout(500);
console.log(`${label}: after blur -> ${await rng()}`);
await browser.close();
