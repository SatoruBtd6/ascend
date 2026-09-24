// One-off: atlas steady-state loop at 59px, 1x vs 4x CPU — explains the 7h
// ~0.104ms "loop" figure (un-throttled noise) vs the new 0.641ms baseline.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
for (const rate of [1, 4]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto("http://127.0.0.1:5173/?auras=1", { waitUntil: "domcontentloaded" });
  const res = await page.evaluate(async () => {
    const mod = await import("/src/auras/AuraCanvas.jsx");
    if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
    mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
    const spec = mod.AURA_FX.atlas;
    mod.AURA_FX.atlas = { ...spec, moment: null };
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    const inst = mod.makeAura(cv, { aura: "atlas", w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: cv2 });
    mod.AURA_FX.atlas = spec;
    for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    for (let i = 0; i < 60; i++) inst.frame(1 / 60);
    const times = [];
    for (let f = 0; f < 600; f++) { const t0 = performance.now(); inst.frame(1 / 60); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[570].toFixed(3) };
  });
  console.log(`atlas 59px steady-state loop @ cpu${rate}: avg=${res.avg} p95=${res.p95}`);
  await ctx.close();
}
await browser.close();
