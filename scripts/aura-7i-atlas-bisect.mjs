// Bisect board-32 edge hits: (a) no art, (b) no wander (sphere pinned).
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
  const size = 32, cw = Math.round(size * 1.45 * 1.28), ringR = size * 1.45 / 2.7;
  const run = async (mutate, label) => {
    const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "atlas", w: cw, h: cw, mode: "circle", ringR, overCanvas: cv2 });
    if (mutate) mutate(inst);
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const W = cv.width, H = cv.height;
    const scan = (c) => {
      const d = c.getContext("2d").getImageData(0, 0, W, H).data;
      const hits = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = d[(y * W + x) * 4 + 3];
        if (a > 8 && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) hits.push([x, y, d[(y * W + x) * 4], d[(y * W + x) * 4 + 1], d[(y * W + x) * 4 + 2], a]);
      }
      return hits;
    };
    const all = [];
    let acc = 0;
    for (const t of [2.86, 5.71, 8.57, 11.4, 14.3, 17.1]) {
      const steps = Math.round((t - acc) * 60); acc = t;
      for (let i = 0; i < steps; i++) inst.frame(1 / 60);
      for (const [name, c] of [["base", cv], ["over", cv2]]) {
        const hits = scan(c);
        if (hits.length) all.push({ label, t, cv: name, hits: hits.slice(0, 6), n: hits.length });
      }
    }
    return all;
  };
  const artRef = mod.AURA_ART?.atlas;
  const out = {};
  out.normal = await run(null, "normal");
  if (artRef) mod.AURA_ART.atlas = () => null;
  out.noArt = await run(null, "noArt");
  if (artRef) mod.AURA_ART.atlas = artRef;
  out.noWander = await run((inst) => {
    for (const l of inst.layers || []) if (l.L?.wander) l.L = { ...l.L, wander: null };
  }, "noWander");
  return out;
});
for (const [k, v] of Object.entries(res)) {
  console.log(`=== ${k}: ${v.length} edge-hit frames`);
  for (const e of v.slice(0, 8)) console.log(`  t=${e.t} ${e.cv} n=${e.n}`, JSON.stringify(e.hits));
}
await browser.close();
