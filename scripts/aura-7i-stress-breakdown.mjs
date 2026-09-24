// 7i perf headroom: per-aura share of the leaderboard worst-case stress.
// Same 10-aura set and method as aura-p3b-perf.mjs (board-32, moments forced
// simultaneously, 4x CPU), but each instance's frame() is timed separately so
// the top offenders can be optimized. Also reports the combined p95 so the
// run is directly comparable to the stress number.
// Usage: node scripts/aura-7i-stress-breakdown.mjs [--base http://localhost:5173]
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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:5173";
const STRESS = "atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright nullpoint inferno".split(" ");
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

const res = await page.evaluate(async (auras) => {
  const mod = window.__mod;
  const insts = auras.map((aura) => {
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    return { aura, inst: mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null }) };
  }).filter((x) => x.inst);
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  insts.forEach(({ inst }) => { for (let i = 0; i < 60; i++) inst.frame(1 / 60); });
  insts.forEach(({ inst }) => inst.forceMoment && inst.forceMoment());
  const per = Object.fromEntries(auras.map((a) => [a, []]));
  const total = [];
  for (let f = 0; f < 240; f++) {
    let sum = 0;
    for (const { aura, inst } of insts) {
      const t0 = performance.now();
      inst.frame(1 / 60);
      const ms = performance.now() - t0;
      per[aura].push(ms);
      sum += ms;
    }
    total.push(sum);
  }
  const s = (a) => { a.sort((x, y) => x - y); return { avg: +(a.reduce((v, x) => v + x, 0) / a.length).toFixed(3), p95: +a[Math.floor(a.length * 0.95)].toFixed(3), max: +a.at(-1).toFixed(3) }; };
  return { per: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, s(v)])), total: s(total) };
}, STRESS);

const rows = Object.entries(res.per).sort((a, b) => b[1].avg - a[1].avg);
const sumAvg = rows.reduce((s2, [, v]) => s2 + v.avg, 0);
for (const [aura, v] of rows) console.log(`${aura.padEnd(14)} avg=${v.avg}ms  p95=${v.p95}  max=${v.max}  share=${(100 * v.avg / sumAvg).toFixed(1)}%`);
console.log(`total: avg=${res.total.avg}ms p95=${res.total.p95} max=${res.total.max}  (sum of avgs ${sumAvg.toFixed(3)})`);
await browser.close();
