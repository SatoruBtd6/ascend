// Full-registry multi-frame pixel diff for 7j. For EVERY aura in the catalog,
// at figure160 (body 128x163), profile76 (circle 141), board32 (circle 59):
// seeded RNG + deterministic flash page clock; captures ImageData at a
// pre-moment frame, three moment-phase crossings (0.25/0.5/0.75), f150, and
// the final frame — mid-moment states are compared, not just the last frame.
// Results stream as JSONL (base64 pixels) so the node heap stays flat.
//   npm.cmd run aura:diff [-- --only id,id --expect id,id]   (default: run)
//   node scripts/aura-7j-full-diff.mjs capture out.jsonl [--base ...] [--aura id,id]
//   node scripts/aura-7j-full-diff.mjs compare out.jsonl [--base ...] [--aura id,id]
// "run" is the aura:diff command: starts the baseline worktree on 5181 and this
// tree on 5180, captures from the baseline, compares this tree, prints a
// verdict per aura, and exits 1 on any FAIL. --spec applies to the current
// side only; --expect lists the auras allowed to differ (must differ).
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, BASE_URL, BASE_PORT, baselineDir, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}
const args = process.argv.slice(2);
const cmd = ["capture", "compare", "run"].includes(args[0]) ? args[0] : "run";
const file = cmd !== "run" && args[1] && !args[1].startsWith("--") ? args[1] : join(process.env.TEMP || ".", "aura-7j-full.jsonl");
let base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
const argList = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1].split(",") : null);
const ONLY = argList("--aura") || argList("--only");
const EXPECT = argList("--expect") ? new Set(argList("--expect")) : null;

// aura:diff ("run") setup — before the browser launch so a busy port or a
// missing baseline fails fast. Header lines are kept for the evidence report.
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
let evDir = null;
if (cmd === "run") {
  const bdir = baselineDir();
  if (!existsSync(bdir)) { console.error(`baseline worktree ${bdir} does not exist — see aura:baseline`); process.exit(1); }
  const bCommit = git(bdir, "rev-parse --short HEAD");
  const bTag = git(bdir, "tag --points-at HEAD");
  const cCommit = git(REPO, "rev-parse --short HEAD");
  const dirty = git(REPO, "status --porcelain");
  hline(`aura:diff`);
  hline(`baseline: ${bdir} (${bCommit}${bTag ? " " + bTag : ""})`);
  hline(`current:  ${REPO} (${cCommit}${dirty ? " + dirty" : ""})`);
  assertPortFree(BASE_PORT);
  assertPortFree(CURR_PORT);
  startVite(bdir, BASE_PORT);
  startVite(REPO, CURR_PORT);
  await waitReady(BASE_URL);
  await waitReady(CURR_URL);
  hline(`servers:  baseline ${BASE_URL}, current ${CURR_URL}`);
  evDir = evidenceDir("aura-diff");
}

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: process.env.JS_FLAGS ? [`--js-flags=${process.env.JS_FLAGS}`] : [] });
const FRESH = cmd === "run" || args.includes("--fresh"); // new page per aura — kills accumulated GPU/canvas state
const SPECFILE = args.includes("--spec") ? JSON.parse(readFileSync(args[args.indexOf("--spec") + 1], "utf8")) : null;
let page, ctx;

async function newPage(useSpec = true) {
  if (page) await page.close();
  const spec = useSpec ? SPECFILE : null;
  ctx = await browser.newContext();
  page = await ctx.newPage();
  await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate((SPECFILE) => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m; window.__cat = cat;
    if (SPECFILE) for (const [id, spec] of Object.entries(SPECFILE)) m.AURA_FX[id] = spec;
    let fakeNow = 0;
    m.setFlashPageClock(() => fakeNow);
    window.__fakeStep = () => { fakeNow += 1 / 60; };
    // Per-cell reset: noteStrikeFlash's page budget (pageFlash.last) is
    // module-level and shared across cells — left to accumulate, one aura's
    // strikes would gate later auras' flashes and leak spec diffs downstream.
    window.__flashReset = () => m.setFlashPageClock(() => fakeNow);
    let rs = 0;
    window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
    window.__b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  }), spec);
}

// Per-page setup: warm every lazy image once so load timing never enters the
// captures. With --fresh this runs once per aura (each page is a fresh heap).
async function warmPage() {
  return page.evaluate(async (ONLY) => {
    const mod = window.__mod;
    const AURAS = window.__cat.AURAS;
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 164;
    const ov = document.createElement("canvas"); ov.width = 128; ov.height = 164;
    let wi = 0;
    for (const a of AURAS) {
      window.__seed(0x111 + wi++); // per-aura stream: a spec change in one aura must not shift warmup RNG for the rest
      const i = mod.makeAura(cv, { aura: a.id, w: 128, h: 164, mode: "body", ringR: 40, overCanvas: ov, figure: "/avatars/E.webp" });
      if (i) { i.frame(1 / 60); i.frame(1 / 60); }
    }
    for (let t = 0; t < 600; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    const resolve = window.__cat.resolveAuraId || mod.resolveAuraId || ((id) => id);
    return (ONLY || AURAS.map((a) => a.id)).filter((id) => mod.AURA_FX[resolve(id)]);
  }, ONLY);
}

// Switch origin + fresh page + warm. useSpec=false keeps --spec off the
// baseline side in run mode (it must capture the worktree's real specs).
const phaseInit = async (url, useSpec = true) => { base = url; await newPage(useSpec); return warmPage(); };

const REPEAT = +(args.find((a) => a.startsWith("--repeat="))?.slice(9) || 0);

const GEOMS = [["board32", "circle", 59, 59], ["profile76", "circle", 141, 141], ["figure160", "body", 128, 163]];

// Runs one aura x geometry cell; returns {tag: {main: b64, over: b64}}.
const captureCell = (aura, label, mode, w, h) => page.evaluate(async ({ aura, label, mode, w, h }) => {
  const mod = window.__mod;
  const px = (c) => window.__b64(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
  window.__seed(0x9e3779b9);
  window.__flashReset();
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
  const hasOver = mod.auraNeedsOver(aura);
  const mk = () => mod.makeAura(cv, { aura, w, h, mode, ringR: Math.min(w, h) / 3.456, overCanvas: hasOver ? cv2 : null, figure: mode === "body" ? "/avatars/E.webp" : undefined });
  let inst = mk();
  if (!inst) return { aura, label, skipped: true };
  inst.frame(1 / 60); window.__fakeStep(); // registers lazy image records
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  // Kill ambient ticking: gallery components mounted by ?auras=1 hold live
  // instances that fire on real RAF during our awaits, consuming the seeded
  // RNG and claiming the shared page flash budget between cells.
  mod.AuraLoop.set.clear();
  if (mod.AuraLoop.raf) { cancelAnimationFrame(mod.AuraLoop.raf); mod.AuraLoop.raf = 0; }
  // Rebuild post-warm: the registration frame above runs against unloaded
  // images and any state it bakes would leak into every captured frame.
  window.__seed(0x9e3779b9);
  window.__flashReset();
  inst = mk();
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

const dec = (b64) => (b64 == null ? null : Buffer.from(b64, "base64"));
const diff = (a, b) => { let n = 0, mx = 0; const len = Math.min(a.length, b.length); for (let i = 0; i < len; i++) { const d = Math.abs(a[i] - b[i]); if (d) { n++; if (d > mx) mx = d; } } return { n, mx }; };
const loadBefore = (f) => {
  const before = new Map();
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    before.set(c.aura + "|" + c.label, c.caps);
  }
  return before;
};
// Diff one aura across all three geoms vs its captured baseline cells.
const compareAura = async (aura, before) => {
  const cells = [];
  let totAll = 0;
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
    totAll += tot;
    cells.push(`${label}[${frameList.join(" ")}]=${tot}${tot ? ` (main ${totM} over ${totO})` : ""}${mx ? " max" + mx : ""}`);
  }
  return { cells, tot: totAll, marker: cells.some((c) => !c.endsWith("=0") && !c.endsWith("SKIP")), skipped: cells.some((c) => c.endsWith("SKIP")) };
};

if (cmd === "capture") {
  const ids = await phaseInit(base);
  const list = REPEAT ? [...Array(REPEAT).fill("ember"), ...ids] : ids;
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
} else if (cmd === "compare") {
  const ids = await phaseInit(base);
  const before = loadBefore(file);
  const list = REPEAT ? [...Array(REPEAT).fill("ember"), ...ids] : ids;
  let bad = 0;
  for (const aura of list) {
    if (FRESH) { await newPage(); await warmPage(); }
    const r = await compareAura(aura, before);
    const marker = r.marker ? "  <-- DIFF" : "";
    if (marker) bad++;
    console.log(`${aura.padEnd(14)} ${r.cells.join(" | ")}${marker}`);
  }
  console.log(`\nauras with diffs: ${bad}`);
} else {
  // run (aura:diff): capture on the baseline server, compare on this tree.
  const ids = await phaseInit(BASE_URL, false);
  const list = REPEAT ? [...Array(REPEAT).fill("ember"), ...ids] : ids;
  hline(`auras:    ${list.length}${ONLY ? ` (--only ${ONLY.join(",")})` : ""}${EXPECT ? `  expected-to-differ: ${[...EXPECT].join(",")}` : ""}`);
  const capFile = join(evDir, "baseline.jsonl");
  const ws = createWriteStream(capFile);
  for (const aura of list) {
    await newPage(false); await warmPage();
    for (const [label, mode, w, h] of GEOMS) {
      ws.write(JSON.stringify(await captureCell(aura, label, mode, w, h)) + "\n");
      process.stdout.write(".");
    }
  }
  await new Promise((r) => ws.end(r));
  console.log(`\ncaptured ${list.length} auras on baseline -> ${capFile}`);

  await phaseInit(CURR_URL);
  const before = loadBefore(capFile);
  let fails = 0, exp = 0;
  const lines = [];
  for (const aura of list) {
    await newPage(); await warmPage();
    const r = await compareAura(aura, before);
    const verdict = r.skipped ? "FAIL couldn't compare"
      : r.marker ? (EXPECT?.has(aura) ? `EXPECTED-DIFF ${r.tot}` : `FAIL unexpected diff ${r.tot}`)
      : (EXPECT?.has(aura) ? "FAIL expected change, none found" : "PASS");
    if (verdict.startsWith("FAIL")) fails++; else if (verdict.startsWith("EXPECTED")) exp++;
    const line = `${aura.padEnd(14)} ${r.cells.join(" | ")} — ${verdict}`;
    lines.push(line); console.log(line);
  }
  const summary = `${list.length} auras: ${list.length - fails - exp} pass, ${exp} expected-diff, ${fails} fail`;
  console.log(`\n${summary}`);
  writeFileSync(join(evDir, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
  console.log(`evidence: ${evDir}`);
  await browser.close();
  stopServers();
  process.exit(fails ? 1 : 0);
}
await browser.close();
stopServers();
