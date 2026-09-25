// 7j Part 2 sample sheet: every new shape next to crescent/pulse, rendered via
// makeAura at figure160 (body 128x163), profile76 (circle 141) and board32
// (circle 59), composited onto dark and light backgrounds. Also writes a second
// frame 0.5s later so motion is visible, and checks that no painted pixel
// touches the canvas edge (clip check).
//   node scripts/aura-7j-shape-sheet.mjs [--base http://localhost:5174]
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascend-7j");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const SHAPES = ["crescent", "pulse", "comet", "sparkle", "orb", "crystal", "wisp", "rune", "zap", "moth", "lantern", "sparkburst"];
const GEOMS = [["board32", "circle", 59, 59], ["profile76", "circle", 141, 141], ["figure160", "body", 128, 163]];
const FRAMES = [90, 120]; // t0 ≈1.5s, t1 ≈2s — second sheet shows animation

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
  window.__b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
}));

const res = await page.evaluate(async ({ SHAPES, GEOMS, FRAMES }) => {
  const mod = window.__mod;
  const specs = {};
  for (const s of SHAPES) {
    specs[`__sheet_${s}`] = {
      glow: 0,
      layers: [
        { k: "orbit", n: 14, shape: s, c: ["#7DD3FC", "#F0ABFC"], w: [0.5, 0.9], r: [0.82, 1.05], sz: [1.6, 2.8], a: 0.95, blend: "lighter" },
        { k: "paint", n: 6, shape: s, c: ["#FDE68A"], w: [0.4, 0.7], r: [0.35, 0.7], sz: [1.4, 2.2], a: 0.9, blend: "lighter" },
      ],
    };
  }
  Object.assign(mod.AURA_FX, specs);
  const cell = (shape, mode, w, h, frames) => {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const inst = mod.makeAura(cv, { aura: `__sheet_${shape}`, w, h, mode, ringR: Math.min(w, h) / 3.456 });
    for (let f = 0; f < frames; f++) inst.frame(1 / 60);
    // clip check: alpha in the outermost 1px border
    const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    let edge = 0;
    for (let x = 0; x < w; x++) { edge += d[(x) * 4 + 3] + d[((h - 1) * w + x) * 4 + 3]; }
    for (let y = 0; y < h; y++) { edge += d[(y * w) * 4 + 3] + d[(y * w + w - 1) * 4 + 3]; }
    return { png: cv.toDataURL("image/png").split(",")[1], edge };
  };
  const sheets = {};
  const clip = {};
  for (const frames of FRAMES) {
    const rows = [];
    for (const [label, mode, w, h] of GEOMS) {
      for (const s of SHAPES) {
        const r = cell(s, mode, w, h, frames);
        rows.push({ label, shape: s, w, h, png: r.png });
        if (frames === FRAMES[0]) { (clip[s] = clip[s] || {})[label] = r.edge; }
      }
    }
    sheets[frames] = rows;
  }
  return { sheets, clip };
}, { SHAPES, GEOMS, FRAMES });

// composite in node: grid layout per frame x theme — use a second page canvas
const composed = await page.evaluate(async ({ sheets, SHAPES, GEOMS, FRAMES0 }) => {
  const imgs = await Promise.all(Object.entries(sheets).flatMap(([f, rows]) =>
    rows.map((r) => new Promise((res) => { const im = new Image(); im.onload = () => res({ f: +f, ...r, im }); im.src = "data:image/png;base64," + r.png; }))));
  const out = {};
  for (const [theme, bg, fg] of [["dark", "#0b0e16", "#e8ecf4"], ["light", "#eef1f7", "#1a2030"]]) {
    for (const f of Object.keys(sheets)) {
      const cols = SHAPES.length, cellW = 150, cellH = 190;
      const cv = document.createElement("canvas"); cv.width = cols * cellW; cv.height = GEOMS.length * cellH + 34;
      const g = cv.getContext("2d");
      g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
      g.font = "11px monospace"; g.textAlign = "center"; g.fillStyle = fg;
      SHAPES.forEach((s, i) => g.fillText(s, i * cellW + cellW / 2, 16));
      GEOMS.forEach(([label], gi) => { g.textAlign = "left"; g.fillText(label, 4, 40 + gi * cellH + cellH / 2); g.textAlign = "center"; });
      for (const c of imgs.filter((x) => x.f === +f)) {
        const i = SHAPES.indexOf(c.shape), gi = GEOMS.findIndex((x) => x[0] === c.label);
        const scale = Math.min((cellW - 20) / c.w, (cellH - 40) / c.h);
        const dw = c.w * scale, dh = c.h * scale;
        g.drawImage(c.im, i * cellW + (cellW - dw) / 2, 30 + gi * cellH + (cellH - 40 - dh) / 2, dw, dh);
      }
      out[`sheet-${theme}-f${f}`] = cv.toDataURL("image/png").split(",")[1];
    }
    // zoom sheet: board32 cells 4x nearest-neighbour so shape detail is legible
    const zcv = document.createElement("canvas");
    const cols = SHAPES.length, zw = 59 * 4 + 24, zh = 59 * 4 + 40;
    zcv.width = cols * zw; zcv.height = zh;
    const zg = zcv.getContext("2d");
    zg.fillStyle = bg; zg.fillRect(0, 0, zcv.width, zcv.height);
    zg.imageSmoothingEnabled = false;
    zg.font = "11px monospace"; zg.textAlign = "center"; zg.fillStyle = fg;
    SHAPES.forEach((s, i) => zg.fillText(s, i * zw + zw / 2, 16));
    for (const c of imgs.filter((x) => x.f === FRAMES0 && x.label === "board32")) {
      const i = SHAPES.indexOf(c.shape);
      zg.drawImage(c.im, i * zw + 12, 30, 59 * 4, 59 * 4);
    }
    out[`sheet-${theme}-zoom`] = zcv.toDataURL("image/png").split(",")[1];
  }
  return out;
}, { sheets: res.sheets, SHAPES, GEOMS, FRAMES0: FRAMES[0] });

for (const [k, b64] of Object.entries(composed)) writeFileSync(join(OUT, `${k}.png`), Buffer.from(b64, "base64"));
console.log("sheets ->", OUT);
console.log("\nedge alpha (sum of border alpha, 0 = nothing clipped):");
for (const s of SHAPES) console.log(`  ${s.padEnd(12)} ${Object.entries(res.clip[s]).map(([k, v]) => `${k}:${v}`).join("  ")}`);
await browser.close();
