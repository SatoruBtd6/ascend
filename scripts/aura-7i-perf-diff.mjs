// Pixel-diff harness for perf optimizations: captures deterministic canvas
// pixels for the stress auras (board-32, seeded RNG, 120 frames, forced
// moments) so an optimization can be proven pixel-identical or near-0.
// Usage:
//   node scripts/aura-7i-perf-diff.mjs capture out.json   # writes baseline
//   node scripts/aura-7i-perf-diff.mjs compare out.json   # diffs live code vs baseline
//   [--base http://localhost:5173]
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
const cmd = args[0] || "capture";
const file = args[1] || join(process.env.TEMP || ".", "aura-7i-perf-base.json");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
const AURAS = (args.includes("--stress") ? args[args.indexOf("--stress") + 1] : "atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright nullpoint inferno").split(/[ ,]+/).filter(Boolean);

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

const dump = await page.evaluate(async (auras) => {
  const mod = window.__mod;
  const out = {};
  for (const aura of auras) {
    // deterministic RNG per aura so capture/compare run the same particle set
    let state = 0x9e3779b9;
    const realRandom = Math.random;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    const over = mod.auraNeedsOver(aura) ? cv2 : null;
    const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: over });
    inst.frame(1 / 60); // seeded: lazy images (overArt pieces) only register on first frame
    Math.random = realRandom;
    for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    for (let i = 0; i < 60; i++) inst.frame(1 / 60);
    inst.forceMoment && inst.forceMoment();
    for (let i = 0; i < 120; i++) inst.frame(1 / 60);
    Math.random = realRandom;
    const px = (c) => Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
    out[aura] = { main: px(cv), over: over ? px(cv2) : null };
  }
  return out;
}, AURAS);

if (cmd === "capture") {
  writeFileSync(file, JSON.stringify(dump));
  console.log(`captured ${Object.keys(dump).length} auras -> ${file}`);
} else {
  const before = JSON.parse(readFileSync(file, "utf8"));
  let worst = { aura: null, n: 0 };
  for (const aura of AURAS) {
    const b = before[aura], a = dump[aura];
    const diff = (x, y) => { let n = 0, maxDelta = 0; for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d) { n++; if (d > maxDelta) maxDelta = d; } } return { n, maxDelta }; };
    const dm = diff(b.main, a.main);
    // A null baseline over canvas means the aura had no over pass back then —
    // every non-zero live byte is a real difference, not a skip.
    const dov = b.over && a.over ? diff(b.over, a.over) : (a.over ? { n: a.over.filter((v) => v !== 0).length, maxDelta: 255 } : { n: 0, maxDelta: 0 });
    const totalPx = b.main.length / 4 + (b.over ? b.over.length / 4 : 0);
    console.log(`${aura.padEnd(14)} main ${dm.n} differing bytes (maxDelta ${dm.maxDelta})  over ${dov.n} (maxDelta ${dov.maxDelta})  = ${(100 * (dm.n + dov.n) / (totalPx * 4)).toFixed(3)}% of bytes`);
    if (dm.n + dov.n > worst.n) worst = { aura, n: dm.n + dov.n };
  }
  console.log(`worst: ${worst.aura} ${worst.n}`);
}
await browser.close();
