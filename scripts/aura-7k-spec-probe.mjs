// Patches AURA_FX entries in-page with candidate specs and reports max border
// alpha over N frames per view. For tuning 7k specs before committing them.
//   node scripts/aura-7k-spec-probe.mjs '<json {id: spec}>' [frames]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
let chromium;
for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
  if (!existsSync(join(dir, "index.js"))) continue;
  try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) { chromium = m.chromium || m.default.chromium; break; } } catch {}
}
const specs = JSON.parse(process.argv[2]);
const FRAMES = +(process.argv[3] || 360);
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext()).newPage();
await p.goto("http://localhost:5174/?auras=1", { waitUntil: "domcontentloaded" });
await p.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear(); window.__mod = m;
  let rs = 0; window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}));
const res = await p.evaluate(({ specs, FRAMES }) => {
  const m = window.__mod;
  const edge = (cv) => { const w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data; let e = 0; for (let x = 0; x < w; x++) e += d[x * 4 + 3] + d[((h - 1) * w + x) * 4 + 3]; for (let y = 0; y < h; y++) e += d[(y * w) * 4 + 3] + d[(y * w + w - 1) * 4 + 3]; return e; };
  const out = [];
  for (const [aura, spec] of Object.entries(specs)) {
    const orig = m.AURA_FX[aura];
    m.AURA_FX[aura] = spec;
    for (const [view, w, h] of [["ring", 141, 141], ["board", 59, 59], ["figure", 128, 163]]) {
      window.__seed(0x9e3779b9);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
      const inst = m.makeAura(cv, { aura, w, h, mode: view === "figure" ? "body" : "circle", ringR: view === "figure" ? 0 : Math.min(w, h) / (view === "board" ? 3.43 : 3.456), overCanvas: m.auraNeedsOver(aura) ? cv2 : null, figure: view === "figure" ? "/avatars/E.webp" : undefined });
      let mx = 0, mxOver = 0;
      for (let f = 0; f < FRAMES; f++) { inst.frame(1 / 60); mx = Math.max(mx, edge(cv)); if (inst) mxOver = Math.max(mxOver, edge(cv2)); }
      out.push({ aura, view, edge: mx, over: mxOver });
    }
    m.AURA_FX[aura] = orig;
  }
  return out;
}, { specs, FRAMES });
for (const r of res) console.log(JSON.stringify(r));
await b.close();
