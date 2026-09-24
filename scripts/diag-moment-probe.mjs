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
const br = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const pg = await br.newPage();
await pg.goto("http://127.0.0.1:5173/?auras=1");
const out = await pg.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const gal = await import("/src/auras/devGallery.jsx");
  const { cloneSpec } = await import("/src/auras/specFormat.js");
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  let fakeT = 0; mod.setFlashPageClock(() => fakeT);
  const cases = [
    ["fallenlight", "body", ["layers", 0, "mY", 3, 1], 0.05, 300],
    ["fallenlight", "body", ["moment", "bursts", 2, "c", 1], "#00ff88", 300],
    ["fallenlight", "body", ["flare", "bolt"], 0, 300],
    ["forge", "body", ["layers", 0, "mX", 5, 0], 0.05, 300],
    ["atlas", "circle", ["layers", 0, "mOrbit", "hit"], 0.05, 300],
    ["atlas", "circle", ["layers", 0, "mOrbit", "reform", 1], 0.05, 300],
    ["vendetta", "body", ["bolts", "c", 0], "#00ff88", 600],
    ["bonewright", "body", ["bolts", "strike"], 0, 600],
  ];
  const res = {};
  for (const [id, mode, path, val, frames] of cases) {
    const ORIG = cloneSpec(mod.AURA_FX[id]);
    const w = 160, h = 200;
    const run = (sp) => {
      fakeT = 0; mod.setFlashPageClock(() => fakeT);
      seed();
      mod.AURA_FX[id] = sp;
      const cv = document.createElement("canvas"), ov = document.createElement("canvas");
      const inst = mod.makeAura(cv, { aura: id, w, h, mode, ringR: 60, figure: "/avatars/E.webp", overCanvas: ov });
      inst.forceMoment();
      const ds = [];
      for (let f = 0; f < frames; f++) {
        fakeT += 1 / 60; inst.frame(1 / 60);
        const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        const o = ov.getContext("2d").getImageData(0, 0, ov.width, ov.height).data;
        for (let i = 3; i < o.length; i += 4) if (o[i] > 0) n++;
        ds.push(n);
      }
      return ds;
    };
    const A = run(ORIG);
    const sp2 = cloneSpec(ORIG); gal.setDeep(sp2, path, val);
    const B = run(sp2);
    let diff = 0, first = -1;
    for (let f = 0; f < frames; f++) { const d = Math.abs(A[f] - B[f]); diff += d; if (d > 0 && first < 0) first = f; }
    res[id + ":" + mode + ":" + path.join(".")] = { diffSum: diff, firstFrame: first };
    mod.AURA_FX[id] = ORIG;
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await br.close();
