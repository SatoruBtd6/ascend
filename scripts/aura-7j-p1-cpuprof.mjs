// 7j Part 1: CDP CPU profile of the worst-case stress (10 auras, board-32,
// moments forced, 4x CPU). Aggregates self time per function so optimization
// targets the real hot spots instead of guesses.
// Usage: node scripts/aura-7j-p1-cpuprof.mjs [--base http://127.0.0.1:5174]
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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:5174";
const STRESS = (process.argv.includes("--stress") ? process.argv[process.argv.indexOf("--stress") + 1] : "atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright nullpoint inferno").split(/[ ,]+/).filter(Boolean);
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

// build + warm the instances, then hand control back so profiling covers only
// the measured window
await page.evaluate(async (auras) => {
  const mod = window.__mod;
  window.__insts = auras.map((aura) => {
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    return mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  }).filter(Boolean);
  window.__insts.forEach((inst) => inst.frame(1 / 60));
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  window.__insts.forEach((inst) => { for (let i = 0; i < 60; i++) inst.frame(1 / 60); });
  window.__insts.forEach((inst) => inst.forceMoment && inst.forceMoment());
}, STRESS);

await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
await page.evaluate(async () => {
  for (let f = 0; f < 480; f++) {
    for (const inst of window.__insts) {
      if (inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment && inst.forceMoment();
      inst.frame(1 / 60);
    }
  }
});
const { profile } = await cdp.send("Profiler.stop");

const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i] || 0;
  total += dt;
  const id = profile.samples[i];
  self.set(id, (self.get(id) || 0) + dt);
}
const byFunc = new Map();
for (const [id, t] of self) {
  const n = nodes.get(id);
  if (!n) continue;
  const cf = n.callFrame;
  const name = `${cf.functionName || "(anon)"}@${(cf.url || "").split("/").pop()}:${cf.lineNumber}`;
  byFunc.set(name, (byFunc.get(name) || 0) + t);
}
const rows = [...byFunc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
console.log(`profiled ${(total / 1000).toFixed(0)}ms across ${profile.samples.length} samples`);
for (const [name, t] of rows) console.log(`${(t / 1000).toFixed(1).padStart(7)}ms  ${(100 * t / total).toFixed(1).padStart(5)}%  ${name}`);
await browser.close();
