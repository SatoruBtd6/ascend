// Seeded bonewright flashTimes capture: runs the aura through a fixed frame
// sequence with forced moments and records api.flashTimes + every frame's
// strike/flash state. Deterministic per code version — diff across commits.
// Usage: node scripts/aura-7j-flashtimes.mjs <base> <out.json>
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
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
const base = process.argv[2], out = process.argv[3];
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));
const res = await page.evaluate(async () => {
  const mod = window.__mod;
  const seed = () => { let s = 0x9e3779b9; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const real = Math.random;
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  const cv = document.createElement("canvas"); cv.width = 141; cv.height = 141;
  const cv2 = document.createElement("canvas"); cv2.width = 141; cv2.height = 141;
  Math.random = seed();
  const inst = mod.makeAura(cv, { aura: "bonewright", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver("bonewright") ? cv2 : null });
  const frames = 60 * 20; // 20s — long enough for several bolt/flash windows
  const flashes = [], strikes = [];
  for (let i = 0; i < frames; i++) {
    if (i % 240 === 0) inst.forceMoment && inst.forceMoment();
    inst.frame(1 / 60);
    if (inst.flashes !== flashes.length) flashes.push(...inst.flashTimes.slice(flashes.length));
    strikes.push(inst.strike || 0);
  }
  Math.random = real;
  return { flashTimes: inst.flashTimes, flashes: inst.flashes, strikes, boltCount: inst.boltsFired };
});
writeFileSync(out, JSON.stringify(res));
console.log(`wrote ${out} flashes=${res.flashes} flashTimes=[${res.flashTimes.map((t) => t.toFixed(3)).join(",")}] bolts=${res.boltCount}`);
await browser.close();
