import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1100 } })).newPage();
await page.goto("http://localhost:5173/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes("· inferno"))?.click());
await new Promise((r) => setTimeout(r, 900));
const res = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Avatar ring")?.click();
  await sleep(400);
  const findRow = () => [...document.querySelectorAll("label")].find((l) => l.querySelector("span")?.textContent.trim() === "Size — min");
  const range = findRow()?.querySelector('input[type="range"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(range, "40"); range.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(50);
  range.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  await sleep(700);
  const afterDrag = findRow()?.querySelector('input[type="number"]')?.value;
  const markers = [...document.querySelectorAll("span")].filter((s) => s.textContent === "●").length;
  const revertBtn = [...document.querySelectorAll("button")].find((b) => b.title === "Revert to base value");
  revertBtn?.click();
  await sleep(400);
  const afterRevert = findRow()?.querySelector('input[type="number"]')?.value;
  return { afterDrag, overrideMarkers: markers, afterRevert };
});
console.log(JSON.stringify(res));
await browser.close();
