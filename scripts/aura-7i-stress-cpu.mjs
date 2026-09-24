// CPU profile of the 10-aura board-32 stress loop (same set/method as
// aura-7i-stress-breakdown.mjs). Aggregates self-time per function so the
// optimization targets are measured, not guessed.
// Usage: node scripts/aura-7i-stress-cpu.mjs [--base http://localhost:5173]
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
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:5173";
const STRESS = "atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright nullpoint inferno".split(" ");
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));
await page.evaluate(async (auras) => {
  const mod = window.__mod;
  window.__insts = auras.map((aura) => {
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    return mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  }).filter(Boolean);
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  window.__insts.forEach((inst) => { for (let i = 0; i < 60; i++) inst.frame(1 / 60); });
  window.__insts.forEach((inst) => inst.forceMoment && inst.forceMoment());
}, STRESS);

await cdp.send("Profiler.start");
await page.evaluate(() => {
  for (let f = 0; f < 240; f++) window.__insts.forEach((inst) => inst.frame(1 / 60));
});
const { profile } = await cdp.send("Profiler.stop");

// aggregate self time per node
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
profile.nodes.forEach((n) => self.set(n.id, 0));
(profile.samples || []).forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
const rows = [];
self.forEach((us, id) => {
  const n = nodes.get(id);
  if (!n || us <= 0) return;
  const f = n.callFrame;
  const name = f.functionName || "(anonymous)";
  const file = (f.url || "").split("/").pop();
  rows.push({ us, name, file, line: f.lineNumber });
});
rows.sort((a, b) => b.us - a.us);
const totalUs = rows.reduce((s, r) => s + r.us, 0);
console.log(`total profiled: ${(totalUs / 1000).toFixed(1)}ms over 240 frames`);
for (const r of rows.slice(0, 30)) console.log(`${(r.us / 1000).toFixed(1).padStart(7)}ms ${(100 * r.us / totalUs).toFixed(1).padStart(5)}%  ${r.name}  ${r.file}:${r.line}`);
writeFileSync(join(process.env.TEMP || ".", "aura-7i-cpu.json"), JSON.stringify(profile));
await browser.close();
