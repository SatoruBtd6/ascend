// one-off: stormborn per-frame cost at the 211px production ring size.
// Matches the aura:perf harness conditions: 4x CPU throttle, sprites warmed,
// moments forced during measurement. Asserts the full aura actually rendered
// (sprites ready, painter painting — lit-pixel count on the frame) and saves
// a screenshot of a measured frame as proof.
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
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });   // match aura:perf
await page.goto(`${CURR_URL}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

// warm the sprite cache
const ready = await page.evaluate(async () => {
  const mod = window.__mod;
  const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
  const inst = mod.makeAura(cv, { aura: "stormborn", w: 211, h: 211, mode: "circle", ringR: 211 / 3.456, overCanvas: cv2 });
  for (let f = 0; f < 10; f++) inst.frame(1 / 60);
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  return [...mod._auraImageCache.entries()].filter(([k]) => k.includes("stormborn")).map(([k, r]) => `${k.split("/").pop()}:${r.ready ? "ready" : r.failed ? "FAILED" : "pending"}`);
});
console.log(`sprites: ${ready.join(" ")}`);
if (ready.some((s) => !s.endsWith("ready"))) { console.error("sprites not ready — measurement would be invalid"); process.exit(1); }

let shotSaved = false;
const OUT = evidenceDir("sb-perf211");
for (let round = 1; round <= 3; round++) {
  const r = await page.evaluate(async ({ shotSaved }) => {
    const mod = window.__mod;
    const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "stormborn", w: 211, h: 211, mode: "circle", ringR: 211 / 3.456, overCanvas: cv2 });
    for (let f = 0; f < 60; f++) inst.frame(1 / 60);
    inst.forceMoment?.();
    const times = [];
    let lit = 0, shot = null;
    for (let f = 0; f < 400; f++) {
      if (inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment?.();
      const t0 = performance.now();
      inst.frame(1 / 60);
      times.push(performance.now() - t0);
      if (f === 200) {
        // count painter-painted alpha on the aura canvases themselves
        for (const c of [cv, cv2]) {
          const d = c.getContext("2d").getImageData(0, 0, 211, 211).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 24) lit++;
        }
        if (!shotSaved) {
          const comp = document.createElement("canvas"); comp.width = comp.height = 211;
          const cg = comp.getContext("2d");
          cg.fillStyle = "#0B0C10"; cg.fillRect(0, 0, 211, 211);
          cg.drawImage(cv, 0, 0); cg.drawImage(cv2, 0, 0);
          shot = comp.toDataURL("image/png");
        }
      }
    }
    times.sort((a, b) => a - b);
    return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), lit, shot };
  }, { shotSaved });
  console.log(`round ${round}: stormborn-211 avg=${r.avg} p95=${r.p95} litPx=${r.lit}${r.lit < 2000 ? "  <-- SUSPICIOUS: painter likely not drawing" : ""}`);
  if (r.shot && !shotSaved) { writeFileSync(join(OUT, "stormborn-211-frame200.png"), Buffer.from(r.shot.split(",")[1], "base64")); shotSaved = true; }
}
console.log(`evidence: ${OUT}`);
await browser.close();
stopServers();
