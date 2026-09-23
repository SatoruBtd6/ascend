// Verify commit throttle cadence: N events spaced `gap`ms -> expected commits.
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
  window.__probe = { canvasAdded: 0 };
  new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach((n) => {
      if (n?.nodeName === "CANVAS") window.__probe.canvasAdded++;
      if (n?.querySelectorAll) window.__probe.canvasAdded += n.querySelectorAll("canvas").length;
    });
  }).observe(document.body, { childList: true, subtree: true });
});

for (const gap of [10, 30, 60]) {
  const res = await page.evaluate(async (gapMs) => {
    const before = window.__probe.canvasAdded;
    const slider = document.querySelector('[data-control-group="layer-0"] input[type="range"]') || document.querySelector('input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const min = Number(slider.min), step = Number(slider.step) || 0.01;
    let v = Number(slider.value);
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      v += step * (i % 2 ? 1 : -1);
      if (v < min) v = min;
      setter.call(slider, String(v));
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, gapMs));
    }
    slider.dispatchEvent(new Event("pointerup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    return { remounts: window.__probe.canvasAdded - before, wallMs: performance.now() - t0 };
  }, gap);
  console.log(`gap=${gap}ms: ${res.remounts} remounts over ${res.wallMs.toFixed(0)}ms (${(res.remounts / (res.wallMs / 1000)).toFixed(1)}/s)`);
}
await browser.close();
