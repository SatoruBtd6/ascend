// Count input events vs canvas remounts during a real mouse drag.
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
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes("· huntersmoon"))?.click();
});
await new Promise((r) => setTimeout(r, 900));
await page.evaluate(() => {
  window.__probe = { canvasAdded: 0, inputs: 0, changes: 0 };
  new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach((n) => {
      if (n?.nodeName === "CANVAS") window.__probe.canvasAdded++;
      if (n?.querySelectorAll) window.__probe.canvasAdded += n.querySelectorAll("canvas").length;
    });
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("input", (e) => { if (e.target?.type === "range") window.__probe.inputs++; }, true);
  document.addEventListener("change", (e) => { if (e.target?.type === "range") window.__probe.changes++; }, true);
});

const slider = page.locator('input[type="range"]').first();
const box = await slider.boundingBox();
const y = box.y + box.height / 2, x0 = box.x + box.width * 0.3, x1 = box.x + box.width * 0.8;
await page.mouse.move(x0, y);
await page.mouse.down();
const t0 = Date.now();
for (let i = 1; i <= 40; i++) {
  await page.mouse.move(x0 + ((x1 - x0) * i) / 40, y);
  await new Promise((r) => setTimeout(r, 1500 / 40));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));
const wall = Date.now() - t0;
const probe = await page.evaluate(() => window.__probe);
console.log(`drag ${wall}ms: input events=${probe.inputs} change events=${probe.changes} canvas adds=${probe.canvasAdded}`);
await browser.close();
