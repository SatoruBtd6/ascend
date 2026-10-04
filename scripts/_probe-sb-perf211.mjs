// one-off: stormborn per-frame cost at the 211px production ring size
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, stopServers } from "./aura-lib.mjs";

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
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m]) => { window.__mod = m; }));

// warm the sprite cache
await page.evaluate(async () => {
  const mod = window.__mod;
  const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
  const inst = mod.makeAura(cv, { aura: "stormborn", w: 211, h: 211, mode: "circle", ringR: 211 / 3.456, overCanvas: cv2 });
  for (let f = 0; f < 10; f++) inst.frame(1 / 60);
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
});

for (let round = 1; round <= 3; round++) {
  const r = await page.evaluate(() => {
    const mod = window.__mod;
    const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "stormborn", w: 211, h: 211, mode: "circle", ringR: 211 / 3.456, overCanvas: cv2 });
    for (let f = 0; f < 60; f++) inst.frame(1 / 60);
    inst.forceMoment?.();
    const times = [];
    for (let f = 0; f < 400; f++) {
      if (inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment?.();
      const t0 = performance.now();
      inst.frame(1 / 60);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3) };
  });
  console.log(`round ${round}: stormborn-211 avg=${r.avg} p95=${r.p95}`);
}
await browser.close();
stopServers();
