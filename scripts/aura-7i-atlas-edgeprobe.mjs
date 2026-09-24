// Which pixels touch canvas edges? Scan all four stages at each path sample.
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
  const stages = [
    { name: "figE", mode: "figure", figure: "E", size: 160 },
    { name: "figSS", mode: "figure", figure: "SS", size: 160 },
    { name: "photo76", mode: "circle", size: 76 },
    { name: "board32", mode: "circle", size: 32 },
  ];
  const out = [];
  for (const st of stages) {
    const cw = Math.round(st.size * 1.45 * 1.28), ch = cw, ringR = st.size * 1.45 / 2.7;
    const cv = document.createElement("canvas"), cv2 = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "atlas", w: cw, h: ch, mode: st.mode, figure: st.figure, ringR, overCanvas: cv2 });
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const W = cv.width, H = cv.height;
    const scan = (c, name) => {
      const d = c.getContext("2d").getImageData(0, 0, W, H).data;
      const hits = [];
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = d[(y * W + x) * 4 + 3];
        if (a > 8) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) hits.push([x, y, d[(y * W + x) * 4], d[(y * W + x) * 4 + 1], d[(y * W + x) * 4 + 2], a]);
        }
      }
      return { name, bounds: [minX, minY, maxX, maxY], n: hits.length, sample: hits.slice(0, 8) };
    };
    let acc = 0;
    for (const t of [2.86, 5.71, 8.57, 11.4]) {
      const steps = Math.round((t - acc) * 60); acc = t;
      for (let i = 0; i < steps; i++) inst.frame(1 / 60);
      const r = [scan(cv, "base"), scan(cv2, "over")];
      const hits = r.filter((s) => s.n > 0);
      if (hits.length) out.push({ stage: st.name, t, spos: inst.orbitXY, hits });
    }
  }
  return out;
});
console.log(JSON.stringify(res, null, 1).slice(0, 9000));
await browser.close();
