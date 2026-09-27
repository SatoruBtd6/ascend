// aura:flash — Bonewright must be pixel-identical to the baseline with
// identical flashTimes (D6). The pixel check reuses aura:diff --only
// bonewright as a subprocess (it manages its own servers); the flashTimes
// capture then runs on the baseline (5181) and the current tree (5180) and
// the JSON must match exactly.
//   node scripts/aura-7j-flashtimes.mjs <base> <out.json>   legacy single capture
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { REPO, CURR_URL, CURR_PORT, BASE_URL, BASE_PORT, baselineDir, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Seeded bonewright flashTimes capture: runs the aura through a fixed frame
// sequence with forced moments and records api.flashTimes + every frame's
// strike/flash state. Deterministic per code version — diff across commits.
async function captureFlash(browser, base) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m;
  }));
  const res = await page.evaluate(async () => {
    const mod = window.__mod;
    const seed = () => { let s = 0x9e3779b9; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
    const real = Math.random;
    for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    const cv = document.createElement("canvas"); cv.width = 141; cv.height = 141;
    const cv2 = document.createElement("canvas"); cv2.width = 141; cv2.height = 141;
    Math.random = seed();
    const inst = mod.makeAura(cv, { aura: "bonewright", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver("bonewright") ? cv2 : null });
    const frames = 60 * 20; // 20s — long enough for several bolt/flash windows
    const flashes = [], strikes = [];
    for (let i = 0; i < frames; i++) {
      if (i % 240 === 0) inst.forceMoment && inst.forceMoment();
      inst.frame(1 / 60);
      if (inst.flashes !== flashes.length) flashes.push(...inst.flashTimes.slice(flashes.length));
      strikes.push(inst.strike || 0);
    }
    Math.random = real;
    return { flashTimes: inst.flashTimes, flashes: inst.flashes, strikes, boltCount: inst.boltsFired };
  });
  await page.close();
  return res;
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (positional.length >= 2) {
  const [base, out] = positional;
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const res = await captureFlash(browser, base);
  writeFileSync(out, JSON.stringify(res));
  console.log(`wrote ${out} flashes=${res.flashes} flashTimes=[${res.flashTimes.map((t) => t.toFixed(3)).join(",")}] bolts=${res.boltCount}`);
  await browser.close();
  process.exit(0);
}

// aura:flash command mode
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
hline(`aura:flash`);
hline(`current:  ${REPO} (${git(REPO, "rev-parse --short HEAD")}${git(REPO, "status --porcelain") ? " + dirty" : ""})`);
const bdir = baselineDir();
if (!existsSync(bdir)) { console.error(`baseline worktree ${bdir} does not exist — see aura:baseline`); process.exit(1); }
const bTag = git(bdir, "tag --points-at HEAD");
hline(`baseline: ${bdir} (${git(bdir, "rev-parse --short HEAD")}${bTag ? " " + bTag : ""})`);
const evDir = evidenceDir("aura-flash");
const lines = [];
let fails = 0;

// 1. pixel check: aura:diff --only bonewright (manages its own servers, so it
// runs before ours start).
console.log("--- pixel check: aura:diff --only bonewright");
const px = spawnSync(process.execPath, [join(REPO, "scripts", "aura-7j-full-diff.mjs"), "--only", "bonewright"], { stdio: "inherit" });
{
  const line = `${px.status === 0 ? "PASS" : "FAIL"} pixel — bonewright ${px.status === 0 ? "pixel-identical to baseline" : "differs from baseline (see aura:diff output above)"}`;
  lines.push(line); console.log(line);
  if (px.status !== 0) fails++;
}

// 2. flashTimes: same seeded capture on both servers, JSON must match.
assertPortFree(BASE_PORT);
assertPortFree(CURR_PORT);
startVite(bdir, BASE_PORT);
startVite(REPO, CURR_PORT);
await waitReady(BASE_URL);
await waitReady(CURR_URL);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const aRes = await captureFlash(browser, BASE_URL);
const bRes = await captureFlash(browser, CURR_URL);
await browser.close();
writeFileSync(join(evDir, "baseline-flash.json"), JSON.stringify(aRes));
writeFileSync(join(evDir, "current-flash.json"), JSON.stringify(bRes));
{
  const fields = ["flashTimes", "flashes", "strikes", "boltCount"];
  const diffs = fields.filter((f) => JSON.stringify(aRes[f]) !== JSON.stringify(bRes[f]));
  const ok = diffs.length === 0;
  const line = ok
    ? `PASS flashTimes — identical (flashes=${bRes.flashes} bolts=${bRes.boltCount} flashTimes=[${bRes.flashTimes.map((t) => t.toFixed(3)).join(",")}])`
    : `FAIL flashTimes — fields differ: ${diffs.join(", ")} (baseline flashes=${aRes.flashes}, current flashes=${bRes.flashes})`;
  lines.push(line); console.log(line);
  if (!ok) fails++;
}

const summary = fails ? `${fails} check(s) failed` : "bonewright unchanged";
console.log(`\n${summary}`);
writeFileSync(join(evDir, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
console.log(`evidence: ${evDir}`);
stopServers();
process.exit(fails ? 1 : 0);
