// Dump atlas sphere p.sz + drawn positions at each path sample (board-32).
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto("http://127.0.0.1:5173/?auras=1", { waitUntil: "domcontentloaded" });
const res = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
  const out = [];
  for (const [mode, size, figure] of [["circle", 32, null], ["figure", 160, "E"]]) {
    const cw = Math.round(size * 1.45 * 1.28), ringR = size * 1.45 / 2.7;
    const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "atlas", w: cw, h: cw, mode, figure, ringR, overCanvas: cv2 });
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    let acc = 0;
    for (const t of [2.86, 5.71, 8.57, 11.4, 14.3, 17.1]) {
      const steps = Math.round((t - acc) * 60); acc = t;
      for (let i = 0; i < steps; i++) {
        try { inst.frame(1 / 60); } catch (e) { out.push({ stage: `${mode}${size}`, t, err: String(e && e.stack || e) }); break; }
      }
      out.push({
        stage: `${mode}${size}`, t,
        imgXY: inst.imgXY, orbitXY: inst.orbitXY,
        layers: (inst.layers || []).filter((l) => l.L?.wander).map((l) => ({
          mside: l.L.mside, sz: l.ps?.[0]?.sz, ang: l.ps?.[0]?.ang, wz: l.ps?.[0]?.wz,
        })),
      });
    }
  }
  return out;
});
for (const r of res) {
  console.log(`${r.stage} t=${r.t} imgXY=${JSON.stringify(r.imgXY)} orbitXY=${JSON.stringify(r.orbitXY)}`);
  for (const l of r.layers) console.log(`   layer ${l.mside} sz=${l.sz} wz=${l.wz}`);
}
await browser.close();
