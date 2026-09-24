// 7h Part 3 checkpoint B perf: per-aura loop vs moment frame cost at 4x CPU,
// plus a worst-case leaderboard stress: 10 auras at board-32 geometry with all
// moments forced to fire simultaneously. p95 total must stay under 16ms.
// Usage: node scripts/aura-p3b-perf.mjs [--base http://localhost:5180]
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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:5180";
const AURAS = ["atlas", "forge"];
const STRESS = "atlas forge ironbound standardbearer ascended bonewright nullpoint eclipseheart blacksun inferno".split(" ");
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

const stats = (times) => {
  times.sort((a, b) => a - b);
  return { n: times.length, avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), max: +times.at(-1).toFixed(3) };
};

// per-aura: loop vs moment frame cost at board and profile geometry
for (const aura of AURAS) {
  for (const [label, w] of [["board32", 59], ["profile76", 141]]) {
    const res = await page.evaluate(async ({ aura, w }) => {
      const mod = window.__mod;
      const cv = document.createElement("canvas"); cv.width = w; cv.height = w;
      const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = w;
      const inst = mod.makeAura(cv, { aura, w, h: w, mode: "circle", ringR: w / 3.456, overCanvas: cv2 });
      for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
      for (let i = 0; i < 60; i++) inst.frame(1 / 60);
      const loop = [], moment = [];
      for (let f = 0; f < 720; f++) {
        if (inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment();
        const t0 = performance.now();
        inst.frame(1 / 60);
        const ms = performance.now() - t0;
        (inst.moment != null || (inst.momentParts || 0) > 0 ? moment : loop).push(ms);
      }
      const s = (a) => { a.sort((x, y) => x - y); return a.length ? { n: a.length, avg: +(a.reduce((v, x) => v + x, 0) / a.length).toFixed(3), p95: +a[Math.floor(a.length * 0.95)].toFixed(3), max: +a.at(-1).toFixed(3) } : { n: 0 }; };
      return { loop: s(loop), moment: s(moment) };
    }, { aura, w });
    console.log(`${aura} ${label}: loop avg=${res.loop.avg} p95=${res.loop.p95} (n=${res.loop.n}) | moment avg=${res.moment.avg} p95=${res.moment.p95} max=${res.moment.max} (n=${res.moment.n})`);
  }
}

// worst-case stress: 10 auras at board-32, all moments forced simultaneously
const stress = await page.evaluate(async (auras) => {
  const mod = window.__mod;
  const insts = auras.map((aura) => {
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    return mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: cv2 });
  }).filter(Boolean);
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  insts.forEach((inst) => { for (let i = 0; i < 60; i++) inst.frame(1 / 60); });
  insts.forEach((inst) => inst.forceMoment && inst.forceMoment());
  const times = [];
  for (let f = 0; f < 240; f++) {
    const t0 = performance.now();
    insts.forEach((inst) => inst.frame(1 / 60));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { n: times.length, avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p50: +times[Math.floor(times.length * 0.5)].toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), max: +times.at(-1).toFixed(3) };
}, STRESS);
console.log(`stress 10 auras @ board-32 forced-moments: avg=${stress.avg}ms p50=${stress.p50} p95=${stress.p95} max=${stress.max}`);
await browser.close();
