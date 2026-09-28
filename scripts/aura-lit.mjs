// aura:lit — luminance measurements for the ladder evidence (7m part 4 item E,
// and the E items of parts 5/6).
//
// For each aura at ring size (141x141 circle) it reports, on the aura canvas
// alone (no photo composite):
//   lit%      — share of the r<=70.5 disc with alpha-weighted luminance >= 25
//               (the aura:contact definition; glow disc saturates this ~63%)
//   band%     — the same restricted to the halo band 38 < r <= 70.5, i.e.
//               what is actually visible around the profile photo
//   glow=0    — both numbers measured again with spec.glow disabled, the
//               metric the style guide says actually separates rungs
//
//   aura:lit                          all FX auras, current tree
//   aura:lit -- --only a,b            a subset
//   aura:lit -- --ab                  A=baseline worktree (5181) vs B=current
//                                     (5180) side by side — before/after
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, BASE_URL, BASE_PORT, baselineDir, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const args = process.argv.slice(2);
const argVal = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const AB = args.includes("--ab");
const CONTRAST = args.includes("--contrast");
const ONLY = argVal("--only")?.split(",").filter(Boolean)
  || args.filter((a, i) => !a.startsWith("--") && !["--only", "--spec"].includes(args[i - 1])).join(",").split(",").filter(Boolean);
const FRAME = +(argVal("--frame") || 120);
// --mtime t: after the warmup frames, force the moment and advance until its
// progress reaches t (0..1) before measuring — mid-moment band darkness.
const MTIME = argVal("--mtime") != null ? +argVal("--mtime") : null;
// --spec file: { "id": <spec> } — replaces AURA_FX[id] in-page; spec-defined
// ids (rework variants) measure even though they are not catalog auras.
const specFile = argVal("--spec") ? JSON.parse(readFileSync(argVal("--spec"), "utf8")) : null;

const OUT = evidenceDir("aura-lit");
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
hline(`aura:lit — lit% = share of aura-canvas pixels with alpha-weighted luminance >= 25`);
hline(`disc = r<=70.5; band = 38<r<=70.5 (the visible halo around the photo); glow=0 disables spec.glow`);
hline(`current:  ${REPO} (${git(REPO, "rev-parse --short HEAD")}${git(REPO, "status --porcelain") ? " + dirty" : ""})`);
assertPortFree(CURR_PORT);
if (AB) assertPortFree(BASE_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
hline(`B server: ${CURR_URL} (current tree)`);
if (AB) {
  const bdir = baselineDir();
  if (!existsSync(bdir)) { console.error(`baseline worktree ${bdir} does not exist — see aura:baseline`); process.exit(1); }
  const bTag = git(bdir, "tag --points-at HEAD");
  hline(`A server: ${BASE_URL} (baseline ${bdir} @ ${git(bdir, "rev-parse --short HEAD")}${bTag ? " " + bTag : ""}${git(bdir, "status --porcelain") ? " + dirty" : ""})`);
  startVite(bdir, BASE_PORT);
  await waitReady(BASE_URL);
}

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: CHROME });

const openPage = async (url) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${url}/?auras=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate((specFile) => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m; window.__cat = cat;
    if (specFile) for (const [id, spec] of Object.entries(specFile)) m.AURA_FX[id] = spec;
    let rs = 0;
    window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
  }), specFile);
  return { page, ctx };
};

const known = await (async () => {
  const { page, ctx } = await openPage(CURR_URL);
  const ids = await page.evaluate(() => {
    const m = window.__mod, cat = window.__cat;
    const resolve = cat.resolveAuraId || ((id) => id);
    return cat.AURAS.map((a) => a.id).filter((id) => m.AURA_FX[resolve(id)]);
  });
  await ctx.close();
  return ids;
})();
const list = (ONLY && ONLY.length ? ONLY : known).filter((id) => known.includes(id) || (specFile && id in specFile));
hline(`auras:    ${list.length}${ONLY?.length ? ` (--only ${ONLY.join(",")})` : ""} — ring 141, seed 1, f${FRAME}${MTIME != null ? ` + moment.t=${MTIME}` : ""}`);

// Measure one aura on one page: render with and without glow, return the
// four lit fractions.
const measure = (page, aura) => page.evaluate(async ({ aura, FRAME, MTIME }) => {
  const mod = window.__mod;
  const hasOver = mod.auraNeedsOver(aura);
  const spec0 = mod.AURA_FX[aura];
  const renderLit = (glowOff) => {
    if (glowOff) mod.AURA_FX[aura] = { ...spec0, glow: 0 };
    try {
      window.__seed(0x9e3779b9);
      const cv = document.createElement("canvas"); cv.width = cv.height = 141;
      const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
      const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: hasOver ? cv2 : null });
      if (!inst) return null;
      for (let f = 0; f < FRAME; f++) inst.frame(1 / 60);
      if (MTIME != null && inst.forceMoment) {
        inst.forceMoment();
        for (let f = 0; f < 900 && (inst.moment == null || inst.moment < MTIME); f++) inst.frame(1 / 60);
      }
      // lit scan over the aura main canvas — aura:contact's definition:
      // alpha-weighted luminance >= 25 inside the r <= 70.5 disc; band% is
      // the same restricted to 38 < r <= 70.5 (the visible halo around the
      // profile photo circle)
      const d = cv.getContext("2d").getImageData(0, 0, 141, 141).data;
      let lit = 0, total = 0, litB = 0, totalB = 0;
      const bandL = [], solidL = [];
      for (let y = 0; y < 141; y++) for (let x = 0; x < 141; x++) {
        const dx = x - 70.5, dy = y - 70.5, r = Math.hypot(dx, dy);
        if (r > 70.5) continue;
        const i = (y * 141 + x) * 4, a = d[i + 3] / 255;
        const lum = a * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
        const isLit = lum >= 25;
        total++;
        if (r > 38) { totalB++; bandL.push(lum); if (isLit) litB++; }
        if (a >= 0.6) solidL.push(lum);
        if (isLit) lit++;
      }
      // contrast (7m part 4 rework): dark-aura measure — rimPk is p95
      // alpha-weighted luminance of the band (the brightest 5% of the halo =
      // the rim's punch), coreMin is p5 of solid-painted disc pixels (the
      // void's floor), ratio is rimPk/coreMin.
      const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a2, b2) => a2 - b2); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
      const rimPk = +pct(bandL, 0.95).toFixed(1), coreMin = +pct(solidL, 0.05).toFixed(1), bandMed = +pct(bandL, 0.5).toFixed(1);
      return { lit: +(100 * lit / total).toFixed(1), band: +(100 * litB / totalB).toFixed(1), rimPk, coreMin, bandMed, ratio: +(rimPk / Math.max(1, coreMin)).toFixed(1) };
    } finally {
      if (glowOff) mod.AURA_FX[aura] = spec0;
    }
  };
  // warm lazy images first
  {
    const cv = document.createElement("canvas"); cv.width = cv.height = 141;
    const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
    const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: hasOver ? cv2 : null });
    if (inst) for (let f = 0; f < 5; f++) inst.frame(1 / 60);
    for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  }
  const on = renderLit(false);
  const off = renderLit(true);
  return on && off ? { lit: on.lit, band: on.band, lit0: off.lit, band0: off.band, rimPk: on.rimPk, coreMin: on.coreMin, bandMed: on.bandMed, ratio: on.ratio } : null;
}, { aura, FRAME, MTIME });

const lines = [];
hline(`aura           | lit%  band%  | lit% (glow=0)  band% (glow=0)${CONTRAST ? "  | rimPk  coreMin  bandMed  ratio" : ""}${AB ? "   [A=baseline | B=current]" : ""}`);
for (const aura of list) {
  const { page, ctx } = await openPage(CURR_URL);
  const B = await measure(page, aura);
  await ctx.close();
  let A = null;
  if (AB) {
    const r = await openPage(BASE_URL);
    A = await measure(r.page, aura);
    await r.ctx.close();
  }
  const fmt = (m) => (m ? `${String(m.lit).padStart(4)}  ${String(m.band).padStart(5)}  | ${String(m.lit0).padStart(5)}          ${String(m.band0).padStart(5)}${CONTRAST ? `  | ${String(m.rimPk).padStart(6)}  ${String(m.coreMin).padStart(7)}  ${String(m.bandMed).padStart(7)}  ${String(m.ratio).padStart(5)}` : ""}` : "  n/a");
  const line = AB
    ? `${aura.padEnd(14)} | A ${fmt(A)}  | B ${fmt(B)}`
    : `${aura.padEnd(14)} | ${fmt(B)}`;
  lines.push(line); console.log(line);
}
writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, ""].join("\n"));
console.log(`\nevidence: ${OUT}`);
await browser.close();
stopServers();
process.exit(0);
