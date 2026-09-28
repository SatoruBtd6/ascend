// aura:flashaudit — per-aura flash ledger (7m part 4 item G, reused for the
// moment auras of parts 5/6).
//
// For each aura it drives the page-wide flash clock itself
// (setFlashPageClock) so the budget is exercised in SIM seconds, not wall
// time, then:
//   solo   — one instance at ring 141, moments forced back-to-back for
//            --secs sim-seconds: reports moments run, flashes fired, and
//            flashes-per-moment (must be exactly 1 for a moment.flash aura)
//   pair   — every --only aura mounted at once, all moments forced: the
//            combined flashTimes timeline is checked for the page-wide
//            <=3 flashes/second cap
//   reduce — same solo run with inst.reduce: flashes must be 0
// It also lists which gated flash paths the merged spec carries
// (moment.flash, flare, bolts.flash / flashEvery) — every actual flash in
// the renderer goes through noteStrikeFlash; this proves the count.
//
//   aura:flashaudit                        all FX auras
//   aura:flashaudit -- --only a,b          a subset; pair check uses the list
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

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
const ONLY = argVal("--only")?.split(",").filter(Boolean)
  || args.filter((a, i) => !a.startsWith("--") && !["--only", "--secs"].includes(args[i - 1])).join(",").split(",").filter(Boolean);
const SECS = +(argVal("--secs") || 40);

const OUT = evidenceDir("aura-flashaudit");
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
hline(`aura:flashaudit — flash ledger, deterministic sim clock, moments forced, ring 141`);
hline(`current:  ${REPO} (${git(REPO, "rev-parse --short HEAD")}${git(REPO, "status --porcelain") ? " + dirty" : ""})`);
assertPortFree(CURR_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
hline(`server:   ${CURR_URL} (current tree)`);

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${CURR_URL}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
  let pt = 0;
  window.__clock = { get: () => pt, set: (v) => { pt = v; } };
  m.setFlashPageClock(() => pt);
}));

const known = await page.evaluate(() => {
  const m = window.__mod, cat = window.__cat;
  const resolve = cat.resolveAuraId || ((id) => id);
  return cat.AURAS.map((a) => a.id).filter((id) => m.AURA_FX[resolve(id)]);
});
const list = (ONLY && ONLY.length ? ONLY : known).filter((id) => known.includes(id));
hline(`auras:    ${list.length}${ONLY?.length ? ` (--only ${ONLY.join(",")})` : ""} — ${SECS} sim-seconds per run`);

// Solo + reduce runs, one aura at a time. Flash paths are read off the spec.
const solo = (aura, reduce) => page.evaluate(async ({ aura, reduce, SECS }) => {
  const mod = window.__mod;
  // which gated flash paths does this spec carry? (circle-merged view is the
  // ring; base spec answers for paths — view blocks can't add a flash field
  // except under circle.moment)
  const fx = mod.AURA_FX[aura];
  const paths = [];
  if (fx.moment?.flash || fx.circle?.moment?.flash || fx.body?.moment?.flash) paths.push("moment.flash");
  if (fx.flare) paths.push("flare");
  if (fx.bolts?.flash || fx.bolts?.flashEvery || fx.bolts?.flashP != null) paths.push("bolts.flash");
  // warm images
  const wmk = () => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 141;
    const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
    return mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  };
  const w = wmk(); if (w) for (let f = 0; f < 5; f++) w.frame(1 / 60);
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  window.__seed(0x9e3779b9);
  window.__clock.set(0);
  const cv = document.createElement("canvas"); cv.width = cv.height = 141;
  const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
  const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  inst.reduce = reduce;
  let moments = 0, wasM = false;
  for (let f = 0; f < SECS * 60; f++) {
    if (inst.moment == null && typeof inst.forceMoment === "function") inst.forceMoment();
    window.__clock.set(window.__clock.get() + 1 / 60);
    inst.frame(1 / 60);
    // count moments that actually completed — the flash belongs to a moment
    // that ran to its end, not one still in flight at loop exit
    if (inst.moment != null) wasM = true;
    else if (wasM) { moments++; wasM = false; }
  }
  // drain: finish the in-flight moment so its flash lands on a completed count
  for (let k = 0; k < 60 * 12 && inst.moment != null; k++) {
    window.__clock.set(window.__clock.get() + 1 / 60);
    inst.frame(1 / 60);
    if (inst.moment == null) moments++;
  }
  return { moments, flashes: inst.flashes, flashTimes: inst.flashTimes.slice(), paths };
}, { aura, reduce, SECS });

const lines = [];
let fails = 0;
for (const aura of list) {
  const s = await solo(aura, false);
  const r = await solo(aura, true);
  // moments that ended before the last forced one may still be mid-flight at
  // the loop's end — flashes <= moments is the real assertion; exactly one
  // flash per moment when the moment spec carries moment.flash
  const flashPerMoment = s.moments ? (s.flashes / s.moments).toFixed(2) : "n/a";
  const hasFlash = s.paths.some((p) => p === "moment.flash");
  let bad = false, notes = [];
  if (hasFlash && s.flashes !== s.moments) { bad = true; notes.push(`expected exactly 1 flash per moment, got ${s.flashes}/${s.moments}`); }
  if (r.flashes !== 0) { bad = true; notes.push(`reduced motion fired ${r.flashes} flashes`); }
  // the moment must still PLAY under reduce — the flash is gated, not the
  // moment; a reduce run that never enters the moment is a regression
  if (hasFlash && r.moments === 0) { bad = true; notes.push("moment never played under reduced motion"); }
  if (bad) fails++;
  const line = `${bad ? "FAIL" : "PASS"} ${aura.padEnd(14)} paths=[${s.paths.join(", ") || "none"}] moments=${s.moments} flashes=${s.flashes} (${flashPerMoment}/moment) reduce-moments=${r.moments} reduce-flashes=${r.flashes}`;
  const times = `    flashTimes: [${s.flashTimes.map((t) => t.toFixed(2)).join(", ")}]`;
  lines.push(line, times); console.log(line); console.log(times);
}

// Pair check: every aura in the list mounted together, all moments forced —
// the combined timeline must never exceed 3 flashes in any 1s window.
if (list.length > 0) {
  const pair = await page.evaluate(async ({ list, SECS }) => {
    const mod = window.__mod;
    for (const aura of list) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 141;
      const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456 });
      if (inst) for (let f = 0; f < 5; f++) inst.frame(1 / 60);
      for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    }
    window.__seed(0x9e3779b9);
    window.__clock.set(0);
    const insts = list.map((aura) => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 141;
      const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
      return mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
    }).filter(Boolean);
    for (let f = 0; f < SECS * 60; f++) {
      for (const inst of insts) {
        if (inst.moment == null && typeof inst.forceMoment === "function") inst.forceMoment();
        window.__clock.set(window.__clock.get() + 1 / 60);
        inst.frame(1 / 60);
      }
    }
    // rebuild the combined timeline: each instance's flashTimes are monotonic
    const times = insts.flatMap((i) => i.flashTimes).sort((a, b) => a - b);
    let maxWin = 0;
    for (let i = 0; i < times.length; i++) {
      const c = times.filter((t) => t >= times[i] && t < times[i] + 1).length;
      if (c > maxWin) maxWin = c;
    }
    return { insts: insts.length, flashes: times.length, maxWin, times };
  }, { list, SECS });
  const bad = pair.maxWin > 3;
  if (bad) fails++;
  const line = `${bad ? "FAIL" : "PASS"} page-wide      ${pair.insts} instances x ${SECS}s — ${pair.flashes} flashes, max ${pair.maxWin}/s (cap 3)`;
  lines.push(line); console.log(`\n${line}`);
}

const summary = `${list.length} auras + page-wide: ${fails} failure(s)`;
console.log(`\n${summary}`);
writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
console.log(`evidence: ${OUT}`);
await browser.close();
stopServers();
process.exit(fails ? 1 : 0);
