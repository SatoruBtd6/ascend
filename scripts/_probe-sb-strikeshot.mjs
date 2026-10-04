// one-off: visual proof that a ledgered loop strike still shows stroke +
// afterglow (option-A check). Forces near-continuous bolt spawns, shoots the
// frame where cc.sbBolt is live with sb.flashed set, and one where the page
// budget has just denied a gate (stroke should show with NO afterglow).
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}

assertPortFree(CURR_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${CURR_URL}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
  m.AURA_FX.stormborn.bolts.every = [0.1, 0.12];   // continuous spawns
  let pt = 0;
  window.__clock = { get: () => pt, set: (v) => { pt = v; } };
  m.setFlashPageClock(() => pt);
}));

const OUT = evidenceDir("sb-strikegate");
const shots = await page.evaluate(async () => {
  const mod = window.__mod;
  const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
  const inst = mod.makeAura(cv, { aura: "stormborn", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: cv2 });
  // find the painter's cc via the live-bolt flag path: inst doesn't expose cc;
  // instead detect sbBolt state by watching flashes vs boltsFired deltas
  let prevFlashes = 0, prevFired = 0;
  const out = { lit: null, denied: null };
  for (let f = 0; f < 2400 && (!out.lit || !out.denied); f++) {
    window.__clock.set(window.__clock.get() + 1 / 60);
    inst.frame(1 / 60);
    if (inst.flashes > prevFlashes) {   // a gate fired this frame — mid-strike frames follow
      prevFlashes = inst.flashes;
      for (let k = 0; k < 4; k++) { window.__clock.set(window.__clock.get() + 1 / 60); inst.frame(1 / 60); }
      if (!out.lit) {
        const comp = document.createElement("canvas"); comp.width = comp.height = 141;
        const cg = comp.getContext("2d"); cg.fillStyle = "#0B0C10"; cg.fillRect(0, 0, 141, 141);
        cg.drawImage(cv, 0, 0); cg.drawImage(cv2, 0, 0);
        out.lit = comp.toDataURL("image/png");
      }
    }
    if (inst.boltsFired > prevFired && inst.flashes === prevFlashes) {
      // a bolt spawned this frame WITHOUT a new flash — gate denied: its
      // stroke draws over the next ~0.28s with no afterglow
      for (let k = 0; k < 4; k++) { window.__clock.set(window.__clock.get() + 1 / 60); inst.frame(1 / 60); }
      if (!out.denied) {
        const comp = document.createElement("canvas"); comp.width = comp.height = 141;
        const cg = comp.getContext("2d"); cg.fillStyle = "#0B0C10"; cg.fillRect(0, 0, 141, 141);
        cg.drawImage(cv, 0, 0); cg.drawImage(cv2, 0, 0);
        out.denied = comp.toDataURL("image/png");
      }
    }
    prevFired = inst.boltsFired; prevFlashes = inst.flashes;
  }
  return { lit: !!out.lit, denied: !!out.denied, flashes: inst.flashes, fired: inst.boltsFired, srcs: inst.flashSrcs, out };
});
console.log(`bolts spawned=${shots.fired} flashes ledgered=${shots.flashes} denied=${shots.fired - shots.flashes} srcs=${JSON.stringify(shots.srcs)}`);
for (const k of ["lit", "denied"]) if (shots.out[k]) writeFileSync(join(OUT, `stormborn-strike-${k}.png`), Buffer.from(shots.out[k].split(",")[1], "base64"));
console.log(`evidence: ${OUT}`);
await browser.close();
stopServers();
