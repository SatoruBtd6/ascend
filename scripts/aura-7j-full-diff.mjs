// Full-registry multi-frame pixel diff for 7j. For EVERY aura in the catalog,
// at figure160 (body 128x163), profile76 (circle 141), board32 (circle 59):
// seeded RNG + deterministic flash page clock; captures ImageData at a
// pre-moment frame, three moment-phase crossings (0.25/0.5/0.75), f150, and
// the final frame — mid-moment states are compared, not just the last frame.
// Results stream as JSONL (base64 pixels) so the node heap stays flat.
//   node scripts/aura-7j-full-diff.mjs capture out.jsonl [--base ...] [--aura id,id]
//   node scripts/aura-7j-full-diff.mjs compare out.jsonl [--base ...] [--aura id,id]
import { createRequire } from "node:module";
import { existsSync, readFileSync, createWriteStream } from "node:fs";
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
const file = args[1] || join(process.env.TEMP || ".", "aura-7j-full.jsonl");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
const ONLY = args.includes("--aura") ? args[args.indexOf("--aura") + 1].split(",") : null;

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: process.env.JS_FLAGS ? [`--js-flags=${process.env.JS_FLAGS}`] : [] });
const FRESH = args.includes("--fresh"); // new page per aura — kills accumulated GPU/canvas state
let page, ctx;

async function newPage() {
  if (page) await page.close();
  ctx = await browser.newContext();
  page = await ctx.newPage();
  await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m; window.__cat = cat;
    let fakeNow = 0;
    m.setFlashPageClock(() => fakeNow);
    window.__fakeStep = () => { fakeNow += 1 / 60; };
    let rs = 0;
    window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
    window.__b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  }));
}
await newPage();

// Per-page setup: warm every lazy image once so load timing never enters the
// captures. With --fresh this runs once per aura (each page is a fresh heap).
async function warmPage() {
  return page.evaluate(async (ONLY) => {
    const mod = window.__mod;
    const AURAS = window.__cat.AURAS;
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 164;
    const ov = document.createElement("canvas"); ov.width = 128; ov.height = 164;
    window.__seed(0x111);
    for (const a of AURAS) {
      const i = mod.makeAura(cv, { aura: a.id, w: 128, h: 164, mode: "body", ringR: 40, overCanvas: ov, figure: "/avatars/E.webp" });
      if (i) { i.frame(1 / 60); i.frame(1 / 60); }
    }
    for (let t = 0; t < 600; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    const resolve = window.__cat.resolveAuraId || mod.resolveAuraId || ((id) => id);
    return (ONLY || AURAS.map((a) => a.id)).filter((id) => mod.AURA_FX[resolve(id)]);
  }, ONLY);
}
const ids = await warmPage();

const REPEAT = +(args.find((a) => a.startsWith("--repeat="))?.slice(9) || 0);
const list = REPEAT ? [...Array(REPEAT).fill("ember"), ...ids] : ids;

const GEOMS = [["board32", "circle", 59, 59], ["profile76", "circle", 141, 141], ["figure160", "body", 128, 163]];

// Runs one aura x geometry cell; returns {tag: {main: b64, over: b64}}.
const captureCell = (aura, label, mode, w, h) => page.evaluate(async ({ aura, label, mode, w, h }) => {
  const mod = window.__mod;
  const px = (c) => window.__b64(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
  window.__seed(0x9e3779b9);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
  const hasOver = mod.auraNeedsOver(aura);
  const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: Math.min(w, h) / 3.456, overCanvas: hasOver ? cv2 : null, figure: mode === "body" ? "/avatars/E.webp" : undefined });
  if (!inst) return { aura, label, skipped: true };
  inst.frame(1 / 60); window.__fakeStep(); // registers lazy image records
  // the wait loop consumes no RNG — the seeded stream stays continuous
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  const caps = {}; const got = new Set();
  const snap = (tag) => { caps[tag] = { main: px(cv), over: hasOver ? px(cv2) : null }; };
  for (let i = 0; i < 30; i++) { inst.frame(1 / 60); window.__fakeStep(); if (i === 9) snap("f10"); if (i === 29) snap("f30"); }
  if (inst.forceMoment) inst.forceMoment();
  for (let i = 0; i < 300; i++) {
    inst.frame(1 / 60); window.__fakeStep();
    const mt = inst.moment;
    if (mt != null) for (const th of [0.25, 0.5, 0.75]) if (mt >= th && !got.has(th)) { got.add(th); snap("m" + Math.round(th * 100)); }
    if (i === 119) snap("f150");
    if (i === 299) snap("end");
  }
  return { aura, label, caps };
}, { aura, label, mode, w, h });

if (cmd === "capture") {
  const ws = createWriteStream(file);
  for (const aura of list) {
    if (FRESH) { await newPage(); await warmPage(); }
    for (const [label, mode, w, h] of GEOMS) {
      const cell = await captureCell(aura, label, mode, w, h);
      ws.write(JSON.stringify(cell) + "\n");
      process.stdout.write(".");
    }
  }
  await new Promise((r) => ws.end(r));
  console.log(`\ncaptured ${ids.length} auras -> ${file}`);
} else {
  const before = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    before.set(c.aura + "|" + c.label, c.caps);
  }
  const dec = (b64) => (b64 == null ? null : Buffer.from(b64, "base64"));
  const diff = (a, b) => { let n = 0, mx = 0; const len = Math.min(a.length, b.length); for (let i = 0; i < len; i++) { const d = Math.abs(a[i] - b[i]); if (d) { n++; if (d > mx) mx = d; } } return { n, mx }; };
  let bad = 0;
  for (const aura of list) {
    if (FRESH) { await newPage(); await warmPage(); }
    const cells = [];
    for (const [label, mode, w, h] of GEOMS) {
      const ac = (await captureCell(aura, label, mode, w, h)).caps;
      const bc = before.get(aura + "|" + label);
      if (!bc || !ac) { cells.push(`${label}: SKIP`); continue; }
      let tot = 0, mx = 0, totM = 0, totO = 0; const frameList = [];
      for (const tag of Object.keys(ac)) {
        const dm = diff(dec(bc[tag]?.main) || Buffer.alloc(0), dec(ac[tag].main));
        const dov = bc[tag]?.over != null && ac[tag].over != null ? diff(dec(bc[tag].over), dec(ac[tag].over)) : { n: 0, mx: 0 };
        tot += dm.n + dov.n; totM += dm.n; totO += dov.n; if (dm.mx > mx) mx = dm.mx; if (dov.mx > mx) mx = dov.mx;
        frameList.push(dm.n + dov.n > 0 ? `${tag}:${dm.n}+${dov.n}o` : tag);
      }
      cells.push(`${label}[${frameList.join(" ")}]=${tot}${tot ? ` (main ${totM} over ${totO})` : ""}${mx ? " max" + mx : ""}`);
    }
    const marker = cells.some((c) => !c.endsWith("=0") && !c.endsWith("SKIP")) ? "  <-- DIFF" : "";
    if (marker) bad++;
    console.log(`${aura.padEnd(14)} ${cells.join(" | ")}${marker}`);
  }
  console.log(`\nauras with diffs: ${bad}`);
}
await browser.close();
