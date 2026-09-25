// 7k Part 1: per-aura loop cost at board-32 / 4x CPU. Batches of 10 frames per
// sample (performance.now quantizes to ~0.1ms under throttling) — reports
// avg/p50/p95 against the 0.8 ms budget.
//   node scripts/aura-7k-perf.mjs [--base http://localhost:5174] [--aura a,b]
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
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
const ONLY = args.includes("--aura") ? args[args.indexOf("--aura") + 1].split(",") : null;

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
}));

// warm lazy images once so load timing never enters the measurements
const ids = await page.evaluate(async (ONLY) => {
  const mod = window.__mod, cat = window.__cat;
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 164;
  const ov = document.createElement("canvas"); ov.width = 128; ov.height = 164;
  for (const a of cat.AURAS) {
    const i = mod.makeAura(cv, { aura: a.id, w: 128, h: 164, mode: "body", ringR: 40, overCanvas: ov, figure: "/avatars/E.webp" });
    if (i) { i.frame(1 / 60); i.frame(1 / 60); }
  }
  for (let t = 0; t < 600; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  return (ONLY || cat.AURAS.map((a) => a.id)).filter((id) => mod.AURA_FX[(cat.resolveAuraId || mod.resolveAuraId || ((x) => x))(id)]);
}, ONLY);

for (const aura of ids) {
  const res = await page.evaluate(async (aura) => {
    const mod = window.__mod;
    const cv = document.createElement("canvas"); cv.width = cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 59;
    const hasOver = mod.auraNeedsOver(aura);
    const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 17, overCanvas: hasOver ? cv2 : null });
    for (let f = 0; f < 60; f++) inst.frame(1 / 60);
    const times = [];
    for (let b = 0; b < 40; b++) {
      const t0 = performance.now();
      for (let f = 0; f < 10; f++) inst.frame(1 / 60);
      times.push((performance.now() - t0) / 10);
      await new Promise((r) => setTimeout(r, 0));
    }
    times.sort((a, b) => a - b);
    const at = (q) => +times[Math.floor(times.length * q)].toFixed(3);
    return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p50: at(0.5), p95: at(0.95), max: at(0.99) };
  }, aura);
  console.log(`${aura.padEnd(15)} avg=${res.avg} p50=${res.p50} p95=${res.p95} max=${res.max}${res.p95 > 0.8 ? "  <-- OVER 0.8ms" : ""}`);
}
await browser.close();
