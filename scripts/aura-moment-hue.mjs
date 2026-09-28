// aura-moment-hue — hue audit of every frame of a forced moment.
//   node scripts/aura-moment-hue.mjs [--only ids] [--size label]
// Composites main+over canvases each frame and reports the share of visible
// saturated pixels whose hue lands in the magenta band (285–350°), plus the
// worst frame. Built for the blacksun gothic-palette rule — FAIL if any frame
// carries more than 1.5% magenta-band pixels, or any single saturated cluster
// reads magenta at the detonation.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, evidenceDir, stopServers, git } from "./aura-lib.mjs";

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
const ONLY = argVal("--only")?.split(",").filter(Boolean) || ["blacksun"];
const SIZE = argVal("--size") || "ring141";
const SIZES = {
  crew52: { w: 52, h: 52, mode: "circle", ringR: 52 / 3.456 },
  board59: { w: 59, h: 59, mode: "circle", ringR: 59 / 3.456 },
  ring141: { w: 141, h: 141, mode: "circle", ringR: 141 / 3.456 },
  figure128x163: { w: 128, h: 163, mode: "body", ringR: 128 / 3.456 },
};
const SZ = SIZES[SIZE] || SIZES.ring141;
const MAG_LO = 290, MAG_HI = 340;        // true purple-magenta band — must stay empty
const SAT_MIN = 0.35, A_MIN = 77;        // only judge visibly saturated pixels
const LUM_MIN = 64;                      // near-black pixels false-positive on hue:
                                         // a (15,2,14) void pixel is "saturated
                                         // magenta" arithmetically but invisible
const FAIL_PCT = 1.5;

const OUT = evidenceDir("aura-moment-hue");
const lines = [];
const hline = (s) => { lines.push(s); console.log(s); };
hline(`aura:moment-hue — share of saturated pixels in the magenta hue band (${MAG_LO}–${MAG_HI}°), every moment frame`);
hline(`current:  ${REPO} (${git(REPO, "rev-parse --short HEAD")}${git(REPO, "status --porcelain") ? " + dirty" : ""})`);
assertPortFree(CURR_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
hline(`server:   ${CURR_URL} — ${SIZE} (${SZ.w}x${SZ.h} ${SZ.mode}), moments forced, every frame sampled`);

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: CHROME });

let anyFail = false;
for (const aura of ONLY) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${CURR_URL}/?auras=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m;
    let rs = 0;
    window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
  }));
  const res = await page.evaluate(async ({ aura, SZ, MAG_LO, MAG_HI, SAT_MIN, A_MIN, LUM_MIN }) => {
    const mod = window.__mod;
    window.__seed(1);
    const hasOver = mod.auraNeedsOver(aura);
    const cv = document.createElement("canvas"); cv.width = SZ.w; cv.height = SZ.h;
    const cv2 = document.createElement("canvas"); cv2.width = SZ.w; cv2.height = SZ.h;
    const inst = mod.makeAura(cv, { aura, w: SZ.w, h: SZ.h, mode: SZ.mode, ringR: SZ.ringR, overCanvas: hasOver ? cv2 : null, figure: SZ.mode === "body" ? "/avatars/E.webp" : undefined });
    const scratch = document.createElement("canvas"); scratch.width = SZ.w; scratch.height = SZ.h;
    const sg = scratch.getContext("2d", { willReadFrequently: true });
    for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    for (let f = 0; f < 10; f++) inst.frame(1 / 60);
    inst.forceMoment();
    const hueOf = (r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (!d) return { h: 0, s: 0 };
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0 };
    };
    const frames = [];
    for (let f = 0; f < 600 && !(frames.length && inst.moment == null); f++) {
      inst.frame(1 / 60);
      if (inst.moment == null) continue;
      sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, SZ.w, SZ.h);
      sg.drawImage(cv, 0, 0); if (hasOver) sg.drawImage(cv2, 0, 0);
      const d = sg.getImageData(0, 0, SZ.w, SZ.h).data;
      let sat = 0, mag = 0, pink = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < A_MIN) continue;
        const { h, s } = hueOf(d[i], d[i + 1], d[i + 2]);
        if (s < SAT_MIN) continue;
        sat++;
        const vis = Math.max(d[i], d[i + 1], d[i + 2]) >= LUM_MIN;
        if (h >= MAG_LO && h <= MAG_HI && vis) mag++;
        if (h > MAG_HI && h < 358 && vis) pink++;   // crimson-adjacent pinks — info
      }
      frames.push({ t: +inst.moment.toFixed(3), sat, mag, pink, pct: sat ? +(100 * mag / sat).toFixed(2) : 0 });
    }
    const worst = frames.reduce((a, b) => (b.pct > a.pct ? b : a), { pct: 0, t: 0, mag: 0, sat: 0 });
    const worstPink = frames.reduce((a, b) => (b.pink > a.pink ? b : a), { pink: 0, t: 0 });
    return { frames: frames.length, worst, worstPink, magFrames: frames.filter((f) => f.mag > 0).length };
  }, { aura, SZ, MAG_LO, MAG_HI, SAT_MIN, A_MIN, LUM_MIN });
  const fail = res.worst.pct > FAIL_PCT;
  if (fail) anyFail = true;
  hline(`${fail ? "FAIL" : "PASS"} ${aura}: ${res.frames} moment frames — worst magenta share ${res.worst.pct}% at t=${res.worst.t} (${res.worst.mag}/${res.worst.sat} sat px) | pink(340-358°) max ${res.worstPink.pink}px at t=${res.worstPink.t}`);
  await ctx.close();
}
hline(`evidence: ${OUT}`);
await browser.close();
stopServers();
process.exit(anyFail ? 1 : 0);
