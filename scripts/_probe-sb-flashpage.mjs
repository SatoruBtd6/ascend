// one-off: page-wide flash budget with several stormborn instances mounted
// at once (user ask: "several Stormborn instances at 110px or larger on
// screen at once"). N x 141px ring instances, moments forced, 40 sim-
// seconds on the shared page clock — merged flashTimes must never exceed
// 3 flashes in any 1s window.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, stopServers } from "./aura-lib.mjs";

const N = 6, SECS = 40;

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
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
  let pt = 0;
  window.__clock = { get: () => pt, set: (v) => { pt = v; } };
  m.setFlashPageClock(() => pt);
}));

const res = await page.evaluate(async ({ N, SECS }) => {
  const mod = window.__mod;
  // warm sprites first
  const w = mod.makeAura(document.createElement("canvas"), { aura: "stormborn", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: document.createElement("canvas") });
  for (let f = 0; f < 5; f++) w.frame(1 / 60);
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  window.__seed(0x9e3779b9);
  window.__clock.set(0);
  const insts = [];
  for (let i = 0; i < N; i++) {
    const inst = mod.makeAura(document.createElement("canvas"), { aura: "stormborn", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: document.createElement("canvas") });
    if (inst) insts.push(inst);
  }
  for (let f = 0; f < SECS * 60; f++) {
    window.__clock.set(window.__clock.get() + 1 / 60);
    for (const inst of insts) {
      if (inst.moment == null && typeof inst.forceMoment === "function") inst.forceMoment();
      inst.frame(1 / 60);
    }
  }
  const times = insts.flatMap((i) => i.flashTimes).sort((a, b) => a - b);
  let maxWin = 0;
  for (let i = 0; i < times.length; i++) {
    const c = times.filter((t) => t >= times[i] && t < times[i] + 1).length;
    if (c > maxWin) maxWin = c;
  }
  const srcs = {};
  for (const i of insts) for (const [k, v] of Object.entries(i.flashSrcs)) srcs[k] = (srcs[k] || 0) + v;
  return { insts: insts.length, flashes: times.length, maxWin, srcs };
}, { N, SECS });
console.log(`${res.insts}x stormborn @141px x ${SECS}s — ${res.flashes} flashes, max ${res.maxWin}/s (cap 3) — ${res.maxWin <= 3 ? "PASS" : "FAIL"}`);
console.log(`by-source: ${Object.entries(res.srcs).map(([k, v]) => `${k}:${v}`).join(" ")}`);
await browser.close();
stopServers();
