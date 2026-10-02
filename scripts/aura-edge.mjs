// aura:edge — the Part 4 edge rule (docs/phase-7m-ladder.md, proposal 1).
//
// Border = the outermost 1 px rows on all four edges of BOTH aura canvases
// (main + over). Per scanned frame it reports:
//   edgeSoft — border pixels at alpha in (0, 0.30): always legal
//   edgeHard — border pixels at alpha >= 0.30: must be 0 in steady state;
//              during a moment only transient burst debris may touch, and
//              every hard contact must clear within 0.5 s
//   edgeRun  — widest connected run of border pixels at alpha >= 0.50:
//              <=3 px at all times (a small spark may graze; anything bigger
//              must have dissolved below ~0.5 alpha first)
// A connected run of <=3 px counts as a legal spark touch, steady-state or
// moment — that's the style-guide "sparks of 3 px or less" carve-out folded
// into the hard/run numbers.
//
// Verdict = the worst over a grid: 5 seeds x EVERY frame 30..240
// (each frame classified steady-state or moment by inst.moment — sampled-frame
// grids let a one-seed transient hide between samples, e.g. an early-rolled
// forge moment at f~223) plus a forced-moment pass that scans EVERY frame and
// measures the longest sustained hard contact, at all six user-visible sizes
// {crew 52, board 59, studio 88 (w88/r25), ring 141, crate 160 (w160/r46),
// figure 128x163}.
// Fresh page per aura. FAIL on:
//   - any steady-state run30 wider than 3 px
//   - any run50 wider than 3 px at any time
//   - any hard contact sustained more than 0.5 s (30 frames) during a moment
//
//   aura:edge                              all FX auras, current tree
//   aura:edge -- --only a,b                a subset
//   aura:edge -- --baseline                A=baseline worktree (5181) vs
//                                          B=current (5180) side by side
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
const BASELINE = args.includes("--baseline");
const ONLY = argVal("--only")?.split(",").filter(Boolean)
  || args.filter((a, i) => !a.startsWith("--") && !["--only", "--spec"].includes(args[i - 1])).join(",").split(",").filter(Boolean);
// --spec file: { "id": <spec> } — replaces AURA_FX[id] in-page; spec-defined
// ids (rework variants) scan even though they are not catalog auras.
const specFile = argVal("--spec") ? JSON.parse(readFileSync(argVal("--spec"), "utf8")) : null;

const SEEDS = [1, 2, 3, 4, 5];
const GRID = [60, 90, 120, 150, 180, 210, 240];
const SCAN_FROM = 30; // scan every frame in the steady window, not the sparse GRID points
const SIZES = [
  { label: "crew52", w: 52, h: 52, mode: "circle", ringR: 52 / 3.456 },
  { label: "board59", w: 59, h: 59, mode: "circle", ringR: 59 / 3.456 },
  { label: "studio88", w: 88, h: 88, mode: "circle", ringR: 25 },
  { label: "ring141", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456 },
  { label: "crate160", w: 160, h: 160, mode: "circle", ringR: 46 },
  { label: "figure128x163", w: 128, h: 163, mode: "body", ringR: 128 / 3.456 },
];
// Deliberate edge bleed (Brodan-approved, phase 7o): Descended's wing tips run
// off the canvas at the large display sizes by design — "too big for the
// frame" is the effect. Contact is still measured and printed (marked BLEED),
// it just doesn't fail the gate. Small sizes still gate normally.
const EDGE_BLEED_OK = { descended: new Set(["ring141", "crate160", "figure128x163"]) };

const OUT = evidenceDir("aura-edge");
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
hline(`aura:edge — proposal-1 edge rule: hard=0 steady, run50<=3px always, moment debris clears <0.5s`);
hline(`current:  ${REPO} (${git(REPO, "rev-parse --short HEAD")}${git(REPO, "status --porcelain") ? " + dirty" : ""})`);
assertPortFree(CURR_PORT);
if (BASELINE) assertPortFree(BASE_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
hline(`B server: ${CURR_URL} (current tree)`);
if (BASELINE) {
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
hline(`auras:    ${list.length}${ONLY?.length ? ` (--only ${ONLY.join(",")})` : ""}`);
hline(`grid:     ${SEEDS.length} seeds x every frame ${SCAN_FROM}–${GRID[GRID.length - 1]} + forced-moment pass, sizes ${SIZES.map((s) => s.label).join(", ")} — fresh page per aura`);

// One aura on one page: runs the whole grid and returns per-size cells.
const scanAura = (page, aura) => page.evaluate(async ({ aura, SEEDS, GRID, SIZES, SCAN_FROM }) => {
  const mod = window.__mod;
  const hasOver = mod.auraNeedsOver(aura);
  const mk = (SZ, seed) => {
    window.__seed(seed);
    const cv = document.createElement("canvas"); cv.width = SZ.w; cv.height = SZ.h;
    const cv2 = document.createElement("canvas"); cv2.width = SZ.w; cv2.height = SZ.h;
    const inst = mod.makeAura(cv, {
      aura, w: SZ.w, h: SZ.h, mode: SZ.mode, ringR: SZ.ringR,
      overCanvas: hasOver ? cv2 : null,
      figure: SZ.mode === "body" ? "/avatars/E.webp" : undefined,
    });
    return { inst, main: cv, over: hasOver ? cv2 : null };
  };
  // register + warm lazy images before any timed grid work
  {
    const warm = mk(SIZES[2], 7);
    if (warm.inst) for (let f = 0; f < 5; f++) warm.inst.frame(1 / 60);
    for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  }
  // Border scan of one canvas: outermost 1px loop -> soft/hard counts and the
  // widest connected run above each alpha bar (circular — corners join).
  const scanCv = (cv) => {
    const w = cv.width, h = cv.height;
    const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    const loop = [];
    for (let x = 0; x < w; x++) loop.push(d[x * 4 + 3]);
    for (let y = 1; y < h; y++) loop.push(d[(y * w + w - 1) * 4 + 3]);
    for (let x = w - 2; x >= 0; x--) loop.push(d[((h - 1) * w + x) * 4 + 3]);
    for (let y = h - 2; y >= 1; y--) loop.push(d[(y * w) * 4 + 3]);
    let soft = 0, hard = 0;
    for (const a of loop) { if (a > 0 && a < 77) soft++; if (a >= 77) hard++; }
    const runOf = (bar) => {
      let best = 0, cur = 0;
      for (const a of loop) { if (a >= bar) { cur++; if (cur > best) best = cur; } else cur = 0; }
      if (cur) { let c = cur; for (let i = 0; i < loop.length && loop[i] >= bar; i++) c++; if (c > best) best = c; }
      return best;
    };
    return { soft, hard, run30: runOf(77), run50: runOf(128) };
  };
  const scan = (r) => {
    const a = scanCv(r.main), b = r.over ? scanCv(r.over) : { soft: 0, hard: 0, run30: 0, run50: 0 };
    return { soft: a.soft + b.soft, hard: a.hard + b.hard, run30: Math.max(a.run30, b.run30), run50: Math.max(a.run50, b.run50) };
  };
  // biggest edge-touching object the renderer attributed, per cell
  const mergeHits = (cell, inst) => {
    for (const [k, v] of Object.entries(inst.edgeHits || {})) {
      if (!(cell.hits[k] >= v)) cell.hits[k] = v;
    }
    inst.edgeHits = {};
  };
  const out = {};
  for (const SZ of SIZES) {
    const cell = { steadyHard: 0, steadyRun30: 0, steadyRun50: 0, steadySoft: 0, mHard: 0, mRun30: 0, mRun50: 0, mSoft: 0, mContact: 0, mFrames: 0, moment: false, hits: {} };
    for (const seed of SEEDS) {
      const { inst, main, over } = mk(SZ, seed * 2654435761 >>> 0);
      if (!inst) continue;
      let f = 0;
      while (f < GRID[GRID.length - 1]) {
        inst.frame(1 / 60); f++;
        if (f < SCAN_FROM) continue;
        const s = scan({ main, over });
        mergeHits(cell, inst);
        if (inst.moment == null) {
          cell.steadyHard = Math.max(cell.steadyHard, s.hard);
          cell.steadyRun30 = Math.max(cell.steadyRun30, s.run30);
          cell.steadyRun50 = Math.max(cell.steadyRun50, s.run50);
          cell.steadySoft = Math.max(cell.steadySoft, s.soft);
        } else {
          cell.mHard = Math.max(cell.mHard, s.hard);
          cell.mRun30 = Math.max(cell.mRun30, s.run30);
          cell.mRun50 = Math.max(cell.mRun50, s.run50);
          cell.mSoft = Math.max(cell.mSoft, s.soft);
        }
      }
      // forced-moment pass — only for auras with a moment spec. forceMoment
      // arms the moment on the NEXT frame(), so the loop waits for it to
      // start, scans every moment frame, then runs a 30-frame tail where
      // burst debris must stay cleared.
      const hasMoment = !!mod.AURA_FX?.[aura]?.moment;
      if (hasMoment && typeof inst.forceMoment === "function") {
        cell.moment = true;
        inst.forceMoment();
        let contact = 0, mF = 0, seen = false, tailF = 0;
        for (let guard = 0; guard < 60 * 15 && (!seen || tailF < 30); guard++) {
          inst.frame(1 / 60); mF++;
          const s = scan({ main, over });
          mergeHits(cell, inst);
          if (inst.moment != null) seen = true;
          else if (seen) tailF++;
          contact = s.hard > 0 ? contact + 1 : 0;
          cell.mContact = Math.max(cell.mContact, contact);
          cell.mHard = Math.max(cell.mHard, s.hard);
          cell.mRun30 = Math.max(cell.mRun30, s.run30);
          cell.mRun50 = Math.max(cell.mRun50, s.run50);
          cell.mSoft = Math.max(cell.mSoft, s.soft);
        }
        cell.mFrames += mF;
      }
    }
    out[SZ.label] = cell;
  }
  return out;
}, { aura, SEEDS, GRID, SIZES, SCAN_FROM });

const cellsBad = (c) => (c.steadyRun30 > 3) || (c.steadyRun50 > 3) || (c.mRun50 > 3) || (c.mContact > 30);
const cellLine = (c) => {
  const top = Object.entries(c.hits || {}).sort((a, b) => b[1] - a[1])[0];
  return `steady hard=${c.steadyHard}px run30=${c.steadyRun30}px run50=${c.steadyRun50}px soft=${c.steadySoft}px`
    + (c.moment ? ` | moment hard=${c.mHard}px run30=${c.mRun30}px run50=${c.mRun50}px longestContact=${(c.mContact / 60).toFixed(2)}s` : " | moment: none")
    + (top ? ` | edgeObj=${top[0]} ~${top[1]}px` : "");
};

const lines = [];
let fails = 0;
for (const aura of list) {
  const { page, ctx } = await openPage(CURR_URL);
  const B = await scanAura(page, aura);
  await ctx.close();
  let A = null;
  if (BASELINE) {
    const r = await openPage(BASE_URL);
    A = await scanAura(r.page, aura);
    await r.ctx.close();
  }
  let auraFail = false;
  for (const SZ of SIZES) {
    const c = B[SZ.label];
    const bad = cellsBad(c);
    const bleedOk = EDGE_BLEED_OK[aura]?.has(SZ.label);
    const verdict = bad ? (bleedOk ? "BLEED" : "FAIL") : "PASS";
    const line = `${verdict} ${aura.padEnd(14)} ${SZ.label.padEnd(14)} ${cellLine(c)}`;
    lines.push(line); console.log(line);
    if (bad && !bleedOk) auraFail = true;
    if (A) {
      const a = A[SZ.label];
      const aline = `  A ${" ".repeat(15)}${SZ.label.padEnd(14)} ${cellLine(a)}`;
      lines.push(aline); console.log(aline);
    }
  }
  if (auraFail) fails++;
}
const summary = `${list.length} auras: ${list.length - fails} pass, ${fails} fail${BASELINE ? " (A = baseline column shown where --baseline)" : ""}`;
console.log(`\n${summary}`);
writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
console.log(`evidence: ${OUT}`);
await browser.close();
stopServers();
process.exit(fails ? 1 : 0);
