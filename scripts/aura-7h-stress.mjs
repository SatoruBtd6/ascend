// Leaderboard stress: N auras rendered simultaneously at board-32 geometry
// (avatar 32 -> canvas 59x59, ringR 17.19), frame() stepped per instance.
// Usage: node scripts/aura-7h-stress.mjs [--base http://localhost:5173] aura,aura,...
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
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
const auras = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--base").join(",").split(",").filter(Boolean);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });

const stats = await page.evaluate(async (auras) => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null;
  mod.AuraLoop.set.clear();
  const insts = auras.map((aura) => {
    const cv = document.createElement("canvas");
    const w = 59;
    cv.width = w; cv.height = w;
    return mod.makeAura(cv, { aura, w, h: w, mode: "circle", ringR: (32 * 1.45) / 2.7 });
  }).filter(Boolean);
  for (let tries = 0; tries < 200; tries++) {
    if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  // warm up so one-time costs don't skew the steady-state numbers
  insts.forEach((inst) => { for (let i = 0; i < 60; i += 1) inst.frame(1 / 60); });
  const times = [];
  for (let f = 0; f < 240; f += 1) {
    const t0 = performance.now();
    insts.forEach((inst) => inst.frame(1 / 60));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, v) => s + v, 0) / times.length;
  return { n: times.length, auras: insts.length, avg: +avg.toFixed(3), p50: +times[Math.floor(times.length * 0.5)].toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), max: +times[times.length - 1].toFixed(3) };
}, auras);
console.log(`${stats.auras} auras @ board-32 (59px): frames=${stats.n} avg=${stats.avg}ms p50=${stats.p50} p95=${stats.p95} max=${stats.max}`);
await browser.close();
