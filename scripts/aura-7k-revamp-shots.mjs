// 7k revamp evidence: for each aura — ring view on the real avatar (dark +
// light), board-32, body figure, two frames each (f90/f120), plus a reduced-
// motion ring shot, edge-clip scan, and loop p95 at board-32 / 4x CPU.
// Composite matches the app: aura main canvas BEHIND the avatar (photo r=38 on
// the 141px ring canvas, r=16 on the 59px board tile), `over` canvas in front.
// Body mode already contains the figure via anchors; avatar drawn for context.
// Writes evidence/7k/<aura>-<tag>.png (gitignored).
//   node scripts/aura-7k-revamp-shots.mjs ember,stormstep --tag before [--spec before.json] [--base ...] [--perf]
// --spec file: { "id": <spec> } — replaces AURA_FX[id] in-page before rendering
//   (use to render "before" shots without reverting source).
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "evidence", "7k");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const auras = (args[0] && !args[0].startsWith("--") ? args[0] : "ember").split(",");
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "shot";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
const specFile = args.includes("--spec") ? JSON.parse(readFileSync(args[args.indexOf("--spec") + 1], "utf8")) : null;
const PERF = args.includes("--perf");
const FRAMES = [90, 120];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx0 = await browser.newContext();
const page = await ctx0.newPage();
if (PERF) { const cdp = await ctx0.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate((specFile) => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  if (specFile) for (const [id, spec] of Object.entries(specFile)) m.AURA_FX[id] = spec;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}), specFile);

const res = await page.evaluate(async ({ auras, FRAMES }) => {
  const mod = window.__mod;
  const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const avatar = await load("/avatars/E.webp");
  const render = (aura, mode, w, h, frames, reduce) => {
    window.__seed(0x9e3779b9);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
    const hasOver = mod.auraNeedsOver(aura);
    const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: Math.min(w, h) / 3.456, overCanvas: hasOver ? cv2 : null, figure: mode === "body" ? "/avatars/E.webp" : undefined, reduce });
    if (!inst) return null;
    for (let f = 0; f < frames; f++) inst.frame(1 / 60);
    return { main: cv, over: hasOver ? cv2 : null };
  };
  const edge = (cv) => {
    const w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    let e = 0;
    for (let x = 0; x < w; x++) e += d[x * 4 + 3] + d[((h - 1) * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) e += d[(y * w) * 4 + 3] + d[(y * w + w - 1) * 4 + 3];
    return e;
  };
  // avatar occupies the central photo circle; aura main renders behind it.
  const ringComp = (r, bg, size, photoR) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    g.drawImage(r.main, 0, 0);
    if (avatar) { g.save(); g.beginPath(); g.arc(size / 2, size / 2, photoR, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, size / 2 - photoR, size / 2 - photoR, photoR * 2, photoR * 2); g.restore(); }
    if (r.over) g.drawImage(r.over, 0, 0);
    return c;
  };
  const out = {};
  const stats = {};
  for (const aura of auras) {
    const cells = {};
    for (const f of FRAMES) {
      const rd = render(aura, "circle", 141, 141, f, false);
      const rl = render(aura, "circle", 141, 141, f, false);
      cells[`ring-dark-f${f}`] = ringComp(rd, "#0b0e16", 141, 38).toDataURL();
      cells[`ring-light-f${f}`] = ringComp(rl, "#eef1f7", 141, 38).toDataURL();
      const b = render(aura, "circle", 59, 59, f, false);
      cells[`board-f${f}`] = ringComp(b, "#0b0e16", 59, 16).toDataURL();
      const fb = render(aura, "body", 128, 163, f, false);
      const fc = document.createElement("canvas"); fc.width = 128; fc.height = 163;
      const fg = fc.getContext("2d"); fg.fillStyle = "#0b0e16"; fg.fillRect(0, 0, 128, 163);
      fg.drawImage(fb.main, 0, 0);
      if (avatar) fg.drawImage(avatar, 0, 0, 128, 163);
      if (fb.over) fg.drawImage(fb.over, 0, 0);
      cells[`figure-f${f}`] = fc.toDataURL();
      if (f === FRAMES[0]) {
        stats[aura] = { edgeRing: edge(rd.main) + (rd.over ? edge(rd.over) : 0), edgeBoard: edge(b.main) + (b.over ? edge(b.over) : 0), edgeFig: edge(fb.main) + (fb.over ? edge(fb.over) : 0) };
      }
    }
    const rm = render(aura, "circle", 141, 141, 90, true);
    cells["ring-dark-reduced"] = ringComp(rm, "#0b0e16", 141, 38).toDataURL();
    out[aura] = cells;
  }
  return { out, stats };
}, { auras, FRAMES });

for (const [aura, cells] of Object.entries(res.out)) {
  const b64 = await page.evaluate(async ({ cells }) => {
    const names = Object.keys(cells);
    const ims = await Promise.all(names.map((n) => new Promise((r) => { const im = new Image(); im.onload = () => r({ n, im }); im.src = cells[n]; })));
    const cols = 5, cellW = 150, cellH = 180;
    const rows = Math.ceil(names.length / cols);
    const cv = document.createElement("canvas"); cv.width = cols * cellW; cv.height = rows * cellH;
    const g = cv.getContext("2d");
    g.fillStyle = "#141824"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "9px monospace"; g.textAlign = "center"; g.fillStyle = "#e8ecf4";
    ims.forEach(({ n, im }, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const sc = Math.min((cellW - 10) / im.width, (cellH - 20) / im.height);
      g.drawImage(im, x + (cellW - im.width * sc) / 2, y + 16 + (cellH - 20 - im.height * sc) / 2, im.width * sc, im.height * sc);
      g.fillText(n, x + cellW / 2, y + 11);
    });
    return cv.toDataURL("image/png").split(",")[1];
  }, { cells });
  writeFileSync(join(OUT, `${aura}-${tag}.png`), Buffer.from(b64, "base64"));
  console.log(`${aura}-${tag}.png  edges: ring=${res.stats[aura].edgeRing} board=${res.stats[aura].edgeBoard} fig=${res.stats[aura].edgeFig}`);
}

if (PERF) {
  for (const aura of auras) {
    const r = await page.evaluate(async (aura) => {
      const mod = window.__mod;
      const cv = document.createElement("canvas"); cv.width = cv.height = 59;
      const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 59;
      const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 17.2, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
      for (let f = 0; f < 60; f++) inst.frame(1 / 60);
      const times = [];
      for (let b = 0; b < 40; b++) {
        const t0 = performance.now();
        for (let f = 0; f < 10; f++) inst.frame(1 / 60);
        times.push((performance.now() - t0) / 10);
        await new Promise((r) => setTimeout(r, 0));
      }
      times.sort((a, b) => a - b);
      return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3) };
    }, aura);
    console.log(`  p95 ${aura}: avg=${r.avg} p95=${r.p95}${r.p95 > 0.8 ? "  <-- OVER 0.8ms" : ""}`);
  }
}
await browser.close();
