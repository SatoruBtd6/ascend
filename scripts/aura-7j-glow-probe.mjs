// Why was nullpoint glow@figure live? Reproduce the effect-test pair directly:
// ORIGINAL vs applyScopedEdit(ORIGINAL, ["glow"], v, "body") at the figure
// stage — print per-frame byte diffs. Usage: --base
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
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => { if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf); m.AuraLoop.raf = null; m.AuraLoop.set.clear(); window.__mod = m; }));

const res = await page.evaluate(async () => {
  const mod = window.__mod;
  const gal = await import("/src/auras/devGallery.jsx");
  const { cloneSpec, mergeViewSpec } = await import("/src/auras/specFormat.js");
  const ORIGINAL = cloneSpec(mod.AURA_FX.nullpoint);
  const variant = gal.applyScopedEdit(ORIGINAL, ["glow"], 0, "body");
  // what does the merged figure spec look like?
  const mv = mergeViewSpec(variant, "body");
  const seed = (s0) => { let s = s0; Math.random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  let fakeT = 0; mod.setFlashPageClock(() => fakeT);
  const runSide = async (spec) => {
    seed(0x7f2a11);
    mod.AURA_FX.nullpoint = spec;
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 164;
    const ov = document.createElement("canvas"); ov.width = 128; ov.height = 164;
    const inst = mod.makeAura(cv, { aura: "nullpoint", w: 128, h: 164, mode: "body", figure: "/avatars/E.webp", overCanvas: ov });
    inst.reduce = false;
    inst.frame(1 / 60); // prime: lazy image records (blindfold) are created on first frame
    for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    seed(0x7f2a11); fakeT = 0; mod.setFlashPageClock(() => fakeT);
    const out = [];
    for (let f = 0; f < 48; f++) { fakeT += 1 / 60; inst.frame(1 / 60); out.push([new Uint8ClampedArray(cv.getContext("2d").getImageData(0, 0, 128, 164).data), new Uint8ClampedArray(ov.getContext("2d").getImageData(0, 0, 128, 164).data)]); }
    return out;
  };
  const A = await runSide(ORIGINAL), B = await runSide(variant);
  const A2 = await runSide(ORIGINAL); // sanity: same-spec determinism
  mod.AURA_FX.nullpoint = ORIGINAL;
  const cmp = (X, Y) => {
    let main = 0, over = 0, firstF = -1, samples = [];
    for (let f = 0; f < 48; f++) for (let c = 0; c < 2; c++) {
      const a = X[f][c], b = Y[f][c]; let d = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
          d++; if (samples.length < 8) samples.push([i / 4 % 128, Math.floor(i / 4 / 128), a[i], a[i + 1], a[i + 2], a[i + 3], "->", b[i], b[i + 1], b[i + 2], b[i + 3]]);
        }
      }
      if (d) { if (c === 0) main += d; else over += d; if (firstF < 0) firstF = f; }
    }
    return { main, over, firstF, samples };
  };
  return { mergedGlow: mv.glow, mergedDark: mv.dark, variantBody: variant.body, sameSpec: cmp(A, A2), variant: cmp(A, B) };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
