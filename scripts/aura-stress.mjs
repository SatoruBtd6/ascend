// Leaderboard stress: N auras rendered simultaneously at board-32 geometry
// (avatar 32 -> canvas 59x59, ringR 17.19), frame() stepped per instance.
//   aura:stress                                    all three sets, median of 3
//   aura:stress -- --set fixed|ledger|revamp|ring|spectacle   one set, or a
//                                                             comma list
//   aura:stress -- --ab [--set x] [--runs N]       baseline (A) vs current (B),
//                                                  alternating A B A B A B
//   node scripts/aura-stress.mjs [--base URL] aura,aura,...   legacy single run
// Command mode bakes in board-32, circle mode, 4x CPU, moments forced, and
// self-serves the current tree on 5180 (baseline on 5181 for --ab) per D4.
// Set lists live in aura-sets.mjs (D11).
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, BASE_URL, BASE_PORT, baselineDir, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";
import { STRESS_SETS } from "./aura-sets.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}

// One measurement: build the whole set, wait out lazy images, warm 60 frames,
// then time 240 frames of all auras stepped together. `revamp` forces moments
// continuously (re-force whenever idle) so moment auras stay mid-moment.
const measure = (page, auras, revamp, SZ) => page.evaluate(async ({ auras, revamp, SZ }) => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null;
  mod.AuraLoop.set.clear();
  const insts = auras.map((aura) => {
    const cv = document.createElement("canvas");
    const w = SZ.w;
    cv.width = w; cv.height = SZ.h;
    const cv2 = document.createElement("canvas");
    cv2.width = w; cv2.height = SZ.h;
    return mod.makeAura(cv, { aura, w, h: SZ.h, mode: "circle", ringR: SZ.ringR, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  }).filter(Boolean);
  for (let tries = 0; tries < 200; tries++) {
    if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  // warm up so one-time costs don't skew the steady-state numbers
  insts.forEach((inst) => { for (let i = 0; i < 60; i += 1) inst.frame(1 / 60); });
  const times = [];
  for (let f = 0; f < 240; f += 1) {
    const t0 = performance.now();
    insts.forEach((inst) => {
      // revamp stress keeps moment auras inside their moment continuously
      if (revamp && inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment?.();
      inst.frame(1 / 60);
    });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, v) => s + v, 0) / times.length;
  return { n: times.length, auras: insts.length, avg: +avg.toFixed(3), p50: +times[Math.floor(times.length * 0.5)].toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), max: +times[times.length - 1].toFixed(3) };
}, { auras, revamp, SZ });

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const throttledPage = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(`${url}/?auras=1`, { waitUntil: "domcontentloaded" });
  return page;
};

const args = process.argv.slice(2);
const argVal = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const SET = argVal("--set");
const AB = args.includes("--ab");
const RUNS = +(args.find((a) => a.startsWith("--runs="))?.slice(7) || 3);
// --size ring (7m): same sets at real profile geometry so the gate still sees
// the loud recipe once auras opt into small:. Separate series from board-32.
const SIZE = argVal("--size") || "board";
const SIZES = {
  board: { w: 59, h: 59, ringR: (32 * 1.45) / 2.7, label: "board-32 (59px)" },
  ring: { w: 141, h: 141, ringR: 141 / 3.456, label: "ring-141 (141px)" },
};
if (!SIZES[SIZE]) { console.error(`unknown --size "${SIZE}" — board|ring`); process.exit(1); }
const SZ = SIZES[SIZE];
const auras = args.filter((a, i) => !a.startsWith("--") && !["--base", "--set", "--size"].includes(args[i - 1])).join(",").split(",").filter(Boolean);

if (auras.length) {
  // legacy: one run of an explicit aura list against --base
  const base = argVal("--base") || "http://localhost:5173";
  const revamp = args.includes("--revamp");
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await throttledPage(browser, base);
  const stats = await measure(page, auras, revamp, SZ);
  console.log(`${stats.auras} auras @ ${SZ.label}: frames=${stats.n} avg=${stats.avg}ms p50=${stats.p50} p95=${stats.p95} max=${stats.max}`);
  await browser.close();
  process.exit(0);
}

// command mode (aura:stress)
// --size ring gates on the realistic ring set only (7m): a real screen shows
// at most ~3 ring-size auras, so a 10-aura ring run is a synthetic worst case
// that reports INFO and can never fail.
const names = SET ? SET.split(",").filter(Boolean) : SIZE === "ring" ? ["ring"] : ["fixed", "ledger", "revamp"];
for (const n of names) {
  if (!STRESS_SETS[n]) { console.error(`unknown set "${n}" — sets: ${Object.keys(STRESS_SETS).join(", ")}`); process.exit(1); }
}

const header = [];
const hline = (s) => { header.push(s); console.log(s); };
hline(`aura:stress`);
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
hline(`size:     ${SZ.label}${SIZE === "ring" ? " — separate series; not comparable to board-32 medians" : ""}`);
hline(`sets:     ${names.join(", ")} — circle, 4x CPU, moments forced, ${RUNS} runs each (median)`);

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const pageB = await throttledPage(browser, CURR_URL);
const pageA = AB ? await throttledPage(browser, BASE_URL) : null;

const med = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const evDir = evidenceDir("aura-stress");
const lines = [];
let fails = 0;
for (const name of names) {
  const ids = STRESS_SETS[name];
  const b95 = [], a95 = [];
  for (let r = 0; r < RUNS; r++) {
    if (AB) a95.push((await measure(pageA, ids, true, SZ)).p95); // A = baseline
    b95.push((await measure(pageB, ids, true, SZ)).p95);         // B = current
  }
  const medB = med(b95);
  const medA = a95.length ? med(a95) : null;
  const gated = SIZE === "board" || name === "ring"; // only the realistic ring set gates at ring size
  const verdict = !gated ? "INFO" : medB >= 16 ? "FAIL" : (name === "fixed" && medB > 12 ? "WARN" : "PASS");
  if (verdict === "FAIL") fails++;
  const line = `${verdict} ${name.padEnd(7)} ${ids.length} auras, ${RUNS} runs — B median p95=${medB} ms  runs=[${b95.join(", ")}]`
    + (medA != null ? `  |  A median p95=${medA} ms  runs=[${a95.join(", ")}]  diff B-A=${+(medB - medA).toFixed(2)} ms` : "")
    + (gated ? `  (FAIL >= 16${name === "fixed" ? "; WARN > 12" : ""})` : "  (synthetic worst case — info only, not a gate)");
  lines.push(line); console.log(line);
}
const summary = fails ? `${fails} set(s) failed` : "all sets within limits";
console.log(`\n${summary}`);
writeFileSync(join(evDir, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
console.log(`evidence: ${evDir}`);
await browser.close();
stopServers();
process.exit(fails ? 1 : 0);
