// 7j Part 2: per-shape loop cost at board-32 / 4x CPU. For each shape, builds a
// throwaway aura spec with a 20-particle orbit layer (nothing else) and times
// frame() over ~3s. Reports p50/p95 per shape against the 0.8 ms budget.
// Usage: node scripts/aura-7j-shape-cost.mjs [--base http://localhost:5173] [--shape a,b]
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
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
const only = args.includes("--shape") ? args[args.indexOf("--shape") + 1].split(",") : null;
const SHAPES = only || ["dot", "crescent", "pulse", "comet", "sparkle", "orb", "crystal", "wisp", "rune", "bolt", "moth", "lantern", "sparkburst"];
const N = +(process.env.SHAPE_N || 20);
const RAW = args.includes("--raw"); // time drawNewParticleShape calls directly — isolates shape cost from aura overhead

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 300, height: 300 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));
for (const shape of SHAPES) {
  const res = await page.evaluate(async ({ shape, N, RAW }) => {
    const mod = window.__mod;
    if (RAW) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 59;
      const g = cv.getContext("2d");
      const mk = (i) => ({ sz: 3.2, c: "#7DD3FC", rot: 0.4, ph: i * 0.37, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, i, vx: 10, vy: -6 });
      const ps = Array.from({ length: 30 }, (_, i) => mk(i)); // persistent particles — path caches hit like a real layer
      for (let i = 0; i < 300; i++) mod.drawNewParticleShape(g, shape, ps[i % 30], 30, 30, i * 0.016, false);
      const t0 = performance.now();
      for (let f = 0; f < 120; f++) for (let i = 0; i < 30; i++) mod.drawNewParticleShape(g, shape, ps[i], 30, 30, f * 0.016 + i * 0.001, false);
      const total = performance.now() - t0;
      return { batch: +(total / 120).toFixed(4) }; // ms per 30-draw batch ≈ one layer's shape cost per frame
    }
    mod.AURA_FX.__shapeCost = {
      glow: 0,
      layers: [{ k: "orbit", n: N, shape, c: ["#7DD3FC"], w: [0.5, 0.9], r: [0.9, 1.2], sz: [2.2, 4.4], a: 0.95, blend: "source-over" }],
    };
    const cv = document.createElement("canvas"); cv.width = cv.height = 59;
    const inst = mod.makeAura(cv, { aura: "__shapeCost", w: 59, h: 59, mode: "circle", ringR: 20 });
    for (let f = 0; f < 60; f++) inst.frame(0.016); // warm: JIT, sprite caches, path caches
    // performance.now() is quantized to ~0.1ms under headless throttling, so
    // per-frame p95 collapses into buckets. Time batches of 10 frames instead —
    // each sample is frames*cost, giving 0.01ms resolution per frame.
    const times = [];
    for (let b = 0; b < 90; b++) {
      const t0 = performance.now();
      for (let f = 0; f < 10; f++) inst.frame(0.016);
      times.push((performance.now() - t0) / 10);
      await new Promise((r) => setTimeout(r, 0)); // yield so throttling mirrors real frames
    }
    times.sort((a, b) => a - b);
    const at = (q) => +times[Math.floor(times.length * q)].toFixed(3);
    const avg = +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3);
    return { avg, p50: at(0.5), p95: at(0.95), max: at(0.99) };
  }, { shape, N, RAW });
  if (RAW) { console.log(`${shape.padEnd(12)} 30-draw batch=${res.batch}ms (per-particle ${(res.batch / 30).toFixed(4)}ms)`); continue; }
  console.log(`${shape.padEnd(12)} n=${N} avg=${res.avg} p50=${res.p50} p95=${res.p95} max=${res.max}${res.p95 <= 0.8 ? "" : "  <-- OVER 0.8ms"}`);
}
await browser.close();
