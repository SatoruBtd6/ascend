// Decompose per-input-event cost: sync ms per dispatch on small vs rich specs.
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
  window.__probe = { canvasAdded: 0 };
  new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach((n) => {
      if (n?.nodeName === "CANVAS") window.__probe.canvasAdded++;
      if (n?.querySelectorAll) window.__probe.canvasAdded += n.querySelectorAll("canvas").length;
    });
  }).observe(document.body, { childList: true, subtree: true });
});

const select = async (id) => {
  await page.evaluate((aura) => {
    [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${aura}`))?.click();
  }, id);
  await new Promise((r) => setTimeout(r, 900));
};
const back = async () => {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 500));
};

for (const aura of ["sigil", "huntersmoon", "ascended"]) {
  await select(aura);
  const stats = await page.evaluate(() => {
    const before = window.__probe.canvasAdded;
    const slider = document.querySelector('[data-control-group] input[type="range"]');
    if (!slider) return null;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const min = Number(slider.min), max = Number(slider.max), step = Number(slider.step) || 0.01;
    const times = [];
    let v = Number(slider.value);
    for (let i = 0; i < 30; i++) {
      v += step * (i % 2 ? 1 : -1) * Math.min(5, i + 1);
      v = Math.min(max, Math.max(min, v));
      const t0 = performance.now();
      setter.call(slider, String(v));
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const controls = document.querySelectorAll('[data-control-group] input, [data-control-group] select').length;
    return new Promise((res) => setTimeout(() => res({
      controls,
      remounts: window.__probe.canvasAdded - before,
      avgMs: times.reduce((s, t) => s + t, 0) / times.length,
      p95Ms: times[Math.floor(times.length * 0.95)],
      maxMs: times[times.length - 1],
    }), 300));
  });
  console.log(`${aura}: controls=${stats.controls} remounts=${stats.remounts} | ${stats.avgMs.toFixed(1)}ms avg / ${stats.p95Ms.toFixed(1)}ms p95 / ${stats.maxMs.toFixed(1)}ms max per input event`);
  await back();
}
await browser.close();
