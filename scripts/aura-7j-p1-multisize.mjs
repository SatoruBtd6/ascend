// Multi-size / live-edit cache-invalidation probe for 7j Part 1.
// capture: renders each probe aura at 141px then 59px (in that order — a
// geometry-keyed cache leaked via the shared spec would pollute the small
// render) plus a solo 59px render in a fresh module state, seeded; writes
// pixel arrays to a file. compare: diffs live output vs the file.
//   node scripts/aura-7j-p1-multisize.mjs capture out.json [--base ...]
//   node scripts/aura-7j-p1-multisize.mjs compare out.json [--base ...]
//   node scripts/aura-7j-p1-multisize.mjs edits            [--base ...]
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
const file = args[1] || join(process.env.TEMP || ".", "aura-7j-multisize.json");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
const AURAS = ["atlas", "ossuary", "ascended"];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

const diff = (a, b) => { let n = 0, mx = 0; const len = Math.min(a.length, b.length) || 1; for (let i = 0; i < len; i++) { const d = Math.abs((a[i] || 0) - (b[i] || 0)); if (d) { n++; if (d > mx) mx = d; } } return { n, mx, len }; };

// Warm every lazy image before rendering so captures don't depend on load timing.
await page.evaluate(async () => {
  const mod = window.__mod;
  const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
  for (const aura of Object.keys(mod.AURA_FX)) {
    const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 17, overCanvas: null });
    inst && inst.frame(1 / 60);
  }
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
});

if (cmd === "edits") {
  // Live-edit proof: mutate AURA_FX in place (as the gallery does via
  // applyScopedEdit + AURA_FX[id] = draft), remount, verify pixels change.
  const res = await page.evaluate(async () => {
    const mod = window.__mod;
    const seed = () => { let s = 0x9e3779b9; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
    const render = (aura, w, mode) => {
      const real = Math.random; Math.random = seed();
      const cv = document.createElement("canvas"); cv.width = w; cv.height = w;
      const inst = mod.makeAura(cv, { aura, w, h: w, mode, ringR: w / 3.456, overCanvas: null });
      for (let i = 0; i < 40; i++) inst.frame(1 / 60);
      Math.random = real;
      return Array.from(cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data);
    };
    const d = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
    const edits = [];
    const tryEdit = (aura, label, get, set) => {
      const p0 = render(aura, 141, "body");
      const old = get(); set();
      const p1 = render(aura, 141, "body");
      set(old);
      edits.push({ aura, label, differingBytes: d(p0, p1) });
    };
    const ascL = mod.AURA_FX.ascended.layers;
    const eyeIdx = ascL.findIndex((l) => l.shape === "eye");
    if (eyeIdx >= 0) tryEdit("ascended", `particle control layers[${eyeIdx}].n (+4)`, () => ascL[eyeIdx].n, (v) => { ascL[eyeIdx].n = v ?? ascL[eyeIdx].n + 4; });
    tryEdit("ascended", "ray control rays.n (+4)", () => mod.AURA_FX.ascended.rays.n, (v) => { mod.AURA_FX.ascended.rays.n = v ?? mod.AURA_FX.ascended.rays.n + 4; });
    tryEdit("ascended", "ray control rays.a (+0.2)", () => mod.AURA_FX.ascended.rays.a, (v) => { mod.AURA_FX.ascended.rays.a = v ?? mod.AURA_FX.ascended.rays.a + 0.2; });
    const atlL = mod.AURA_FX.atlas.layers;
    tryEdit("atlas", "particle control layers[0].n (+5)", () => atlL[0].n, (v) => { atlL[0].n = v ?? atlL[0].n + 5; });
    tryEdit("atlas", "ambient control glow (+0.3)", () => mod.AURA_FX.atlas.glow, (v) => { mod.AURA_FX.atlas.glow = v ?? mod.AURA_FX.atlas.glow + 0.3; });
    if (Array.isArray(atlL[0].c)) tryEdit("atlas", "particle colour layers[0].c[0] (#FF0000)", () => atlL[0].c[0], (v) => { atlL[0].c = [...atlL[0].c]; atlL[0].c[0] = v ?? "#FF0000"; });
    else tryEdit("atlas", "particle colour layers[0].c (#FF0000)", () => atlL[0].c, (v) => { atlL[0].c = v ?? "#FF0000"; });
    return edits;
  });
  for (const e of res) console.log(`${e.aura.padEnd(9)} ${e.label.padEnd(48)} differingBytes=${e.differingBytes}`);
  await browser.close();
  process.exit(0);
}

const dump = await page.evaluate(async (auras) => {
  const mod = window.__mod;
  const seed = () => { let s = 0x9e3779b9; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const px = (c) => Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
  // Deterministic render: seed covers makeAura + every frame (particle
  // respawns draw from Math.random mid-run).
  const render = (aura, w, mode = "circle") => {
    const real = Math.random; Math.random = seed();
    const cv = document.createElement("canvas"); cv.width = w; cv.height = w;
    const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = w;
    const inst = mod.makeAura(cv, { aura, w, h: w, mode, ringR: w / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
    inst.frame(1 / 60);
    Math.random = real;
    const out = { inst, cv, cv2 };
    return out;
  };
  const frames = (inst, n, cont) => {
    const real = Math.random; Math.random = cont;
    for (let i = 0; i < n; i++) inst.frame(1 / 60);
    Math.random = real;
  };
  const out = {};
  for (const aura of auras) {
    // Order matters: big FIRST so a spec-level cache holds 141px geometry
    // when the small instance mounts.
    const big = render(aura, 141);
    frames(big.inst, 40, seed());
    const small = render(aura, 59);
    frames(small.inst, 40, seed());
    out[aura] = { big: px(big.cv), small: px(small.cv), smallOver: small.cv2 ? px(small.cv2) : null };
  }
  // DPR check on ascended: backing store must double, pixels must differ
  // (2x raster), and each DPR render must be internally consistent.
  out.dpr = {};
  for (const d of [1, 2]) {
    const real = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => d });
    const t = render("ascended", 76);
    frames(t.inst, 30, seed());
    if (real) Object.defineProperty(window, "devicePixelRatio", real);
    out.dpr[d] = { canvasW: t.cv.width, px: px(t.cv) };
  }
  return out;
}, AURAS);

if (cmd === "capture") {
  writeFileSync(file, JSON.stringify(dump));
  console.log(`captured -> ${file}`);
  for (const a of AURAS) console.log(`${a}: big=${dump[a].big.length}B small=${dump[a].small.length}B`);
  console.log(`dpr1 canvasW=${dump.dpr[1].canvasW} dpr2 canvasW=${dump.dpr[2].canvasW}`);
} else {
  const before = JSON.parse(readFileSync(file, "utf8"));
  for (const a of AURAS) {
    const db = diff(before[a].big, dump[a].big), ds = diff(before[a].small, dump[a].small);
    const dov = before[a].smallOver && dump[a].smallOver ? diff(before[a].smallOver, dump[a].smallOver) : { n: 0, mx: 0 };
    console.log(`${a.padEnd(10)} big141 ${db.n} diff bytes (max ${db.mx}) | small59-after-big ${ds.n} (max ${ds.mx}) | smallOver ${dov.n} (max ${dov.mx})`);
  }
  const d1 = before.dpr[1], d2 = before.dpr[2];
  console.log(`dpr: canvasW ${d1.canvasW}->${dump.dpr[1].canvasW} / ${d2.canvasW}->${dump.dpr[2].canvasW}; px diffs ${diff(d1.px, dump.dpr[1].px).n} / ${diff(d2.px, dump.dpr[2].px).n}`);
}
await browser.close();
