// 7j Part 1 profiling: per-aura cost inside the leaderboard worst-case stress.
// Same conditions as aura-p3b-perf.mjs (board-32 circle, moments forced, 4x CPU)
// but each aura is measured alone with the CanvasRenderingContext2D prototype
// wrapped: per-method call counts and accumulated time, split into loop vs
// moment frames. Reports each aura's share, draw-call count, and where its
// time goes (gradients / image draws / fills+strokes / path building / state
// changes / non-canvas JS). Also verifies every lazy /aura/ image registered
// and decoded before measuring starts.
// Usage: node scripts/aura-7j-p1-profile.mjs [--base http://127.0.0.1:5174]
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

// Wrap the 2d prototype once: window.__cnt counts calls per method,
// window.__ms accumulates milliseconds per method. Overhead per call is a
// couple of property writes plus two performance.now() reads.
await page.evaluate(() => {
  const P = CanvasRenderingContext2D.prototype;
  const names = ["drawImage", "fill", "stroke", "fillRect", "strokeRect", "clearRect", "clip", "fillText",
    "createRadialGradient", "createLinearGradient", "createPattern", "setLineDash",
    "save", "restore", "translate", "rotate", "scale", "transform", "setTransform",
    "beginPath", "arc", "ellipse", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "rect", "closePath"];
  window.__cnt = {}; window.__ms = {};
  for (const n of names) {
    const orig = P[n];
    P[n] = function (...a) {
      const t0 = performance.now();
      const r = orig.apply(this, a);
      const el = performance.now() - t0;
      window.__cnt[n] = (window.__cnt[n] || 0) + 1;
      window.__ms[n] = (window.__ms[n] || 0) + el;
      return r;
    };
  }
});

const CAT = {
  images: ["drawImage"],
  gradients: ["createRadialGradient", "createLinearGradient", "createPattern"],
  fills: ["fill", "fillRect"],
  strokes: ["stroke", "strokeRect"],
  path: ["beginPath", "arc", "ellipse", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "rect", "closePath", "clip", "setLineDash"],
  state: ["save", "restore", "translate", "rotate", "scale", "transform", "setTransform"],
  clear: ["clearRect"],
  text: ["fillText"],
};
const catOf = Object.fromEntries(Object.entries(CAT).flatMap(([c, ns]) => ns.map((n) => [n, c])));

const s = (a) => { a.sort((x, y) => x - y); return a.length ? { n: a.length, avg: +(a.reduce((v, x) => v + x, 0) / a.length).toFixed(3), p95: +a[Math.floor(a.length * 0.95)].toFixed(3), max: +a.at(-1).toFixed(3) } : { n: 0 }; };

const all = await page.evaluate(async (auras) => {
  const mod = window.__mod;
  const s = (a) => { a.sort((x, y) => x - y); return a.length ? { n: a.length, avg: +(a.reduce((v, x) => v + x, 0) / a.length).toFixed(3), p95: +a[Math.floor(a.length * 0.95)].toFixed(3), max: +a.at(-1).toFixed(3) } : { n: 0 }; };
  const out = {};
  const waitImgs = async () => { for (let t = 0; t < 240; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); } };
  for (const aura of auras) {
    const seen = new Set(mod._auraImageCache.keys());
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const cv2 = document.createElement("canvas"); cv2.width = 59; cv2.height = 59;
    const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
    inst.frame(1 / 60); // lazy images register on first frame
    await waitImgs();
    const notReady = [...mod._auraImageCache.entries()].filter(([, r]) => !r.ready && !r.failed).map(([k]) => k);
    const failed = [...mod._auraImageCache.entries()].filter(([, r]) => r.failed).map(([k]) => k);
    const assets = [...mod._auraImageCache.keys()].filter((k) => !seen.has(k));
    for (let i = 0; i < 60; i++) inst.frame(1 / 60);
    inst.forceMoment && inst.forceMoment();
    window.__cnt = {}; window.__ms = {};
    const loop = [], moment = [];
    for (let f = 0; f < 240; f++) {
      if (inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment && inst.forceMoment();
      const t0 = performance.now();
      inst.frame(1 / 60);
      const ms = performance.now() - t0;
      (inst.moment != null || (inst.momentParts || 0) > 0 ? moment : loop).push(ms);
    }
    const frames = loop.length + moment.length;
    const perFrame = {}, msFrame = {};
    for (const [k, v] of Object.entries(window.__cnt)) perFrame[k] = +(v / frames).toFixed(2);
    for (const [k, v] of Object.entries(window.__ms)) msFrame[k] = +(v / frames).toFixed(4);
    const ctxTotal = Object.values(window.__ms).reduce((a2, v) => a2 + v, 0) / frames;
    out[aura] = { loop: s(loop), moment: s(moment), frames, momentShare: +(moment.length / frames).toFixed(3), perFrame, msFrame, ctxPerFrame: +ctxTotal.toFixed(4), notReady, failed, assets };
  }
  return out;
}, STRESS);

const blendAvg = (v) => (v.moment.n ? v.loop.avg * (1 - v.momentShare) + v.moment.avg * v.momentShare : v.loop.avg);
const sumAvg = Object.values(all).reduce((a2, v) => a2 + blendAvg(v), 0);
for (const aura of STRESS) {
  const v = all[aura];
  const avg = blendAvg(v);
  const drawCalls = (v.perFrame.drawImage || 0) + (v.perFrame.fill || 0) + (v.perFrame.fillRect || 0) + (v.perFrame.stroke || 0) + (v.perFrame.strokeRect || 0);
  const cats = {};
  for (const [k, ms] of Object.entries(v.msFrame)) { const c = catOf[k] || "other"; cats[c] = +((cats[c] || 0) + ms).toFixed(4); }
  console.log(`\n${aura}  blended avg=${avg.toFixed(3)}ms  share=${(100 * avg / sumAvg).toFixed(1)}%  (loop avg=${v.loop.avg} n=${v.loop.n} | moment ${v.moment.n ? `avg=${v.moment.avg} p95=${v.moment.p95} n=${v.moment.n}` : "n=0"})`);
  console.log(`  draw calls/frame=${drawCalls.toFixed(0)}  grads=${v.perFrame.createRadialGradient || 0}+${v.perFrame.createLinearGradient || 0}  imgs=${v.perFrame.drawImage || 0}  pathOps=${["beginPath", "arc", "ellipse", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo"].map((k) => v.perFrame[k] || 0).join("/")}  state=${v.perFrame.save || 0}/${v.perFrame.restore || 0}`);
  const catStr = Object.entries(cats).sort((a2, b) => b[1] - a2[1]).map(([c, ms]) => `${c}=${ms}`).join(" ");
  console.log(`  ctx ms/frame: ${catStr}  | ctx total=${v.ctxPerFrame}ms  JS overhead=${(avg - v.ctxPerFrame).toFixed(3)}ms`);
  console.log(`  assets: ${v.assets.map((a2) => a2.split("/").pop()).join(", ") || "none"}`);
  if (v.notReady.length || v.failed.length) console.log(`  IMG NOT LOADED: notReady=${v.notReady.join(",") || "none"} failed=${v.failed.join(",") || "none"}`);
}
console.log(`\n(sum of blended avgs ${sumAvg.toFixed(3)}ms — wrapper overhead included)`);
await browser.close();
