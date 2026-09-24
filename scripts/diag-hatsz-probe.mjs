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
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
await ctx.addInitScript(() => {
  let state = 0x7f2a11;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
});
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:5173/?auras=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
  const { cloneSpec, setPath } = await import("/src/auras/specFormat.js");
  const ORIG = cloneSpec(mod.AURA_FX.crownfall);
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  async function ready() { for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) return; await new Promise((r) => setTimeout(r, 25)); } }
  function mk(spec, mode) {
    mod.AURA_FX.crownfall = spec;
    const cv = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "crownfall", w: mode === "body" ? 128 : 141, h: mode === "body" ? 164 : 141, mode, ringR: 40.7, figure: mode === "body" ? "/avatars/E.webp" : undefined });
    return { inst, cv };
  }
  const res = {};
  for (const [name, mode, path, v] of [
    ["headSz0@ring", "circle", ["layers", 0, "headSz"], 0],
    ["headSzMax@ring", "circle", ["layers", 0, "headSz"], 9.6],
    ["szMin@figure", "body", ["layers", 0, "sz", 0], 0.02],
    ["szMax@figure", "body", ["layers", 0, "sz", 0], 4],
    ["rimSzMin@ring", "circle", ["layers", 0, "rimSz"], 0.02],
  ]) {
    const variant = setPath(ORIG, path, v);
    seed(); const A = mk(ORIG, mode);
    seed(); const B = mk(variant, mode);
    await ready(); seed();
    let firstDiff = -1, total = 0;
    for (let f = 0; f < 48; f++) {
      A.inst.frame(1 / 60); B.inst.frame(1 / 60);
      const a = A.cv.getContext("2d").getImageData(0, 0, A.cv.width, A.cv.height).data;
      const b = B.cv.getContext("2d").getImageData(0, 0, B.cv.width, B.cv.height).data;
      let d = 0;
      for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++;
      if (d && firstDiff < 0) { firstDiff = f; if (name === "headSz0@ring") { window.__A = A.cv.toDataURL(); window.__B = B.cv.toDataURL(); } }
      total += d;
    }
    res[name] = { firstDiff, total };
  }
  mod.AURA_FX.crownfall = ORIG;
  return res;
});
console.log(JSON.stringify(out, null, 1));
const urls = await page.evaluate(() => ({ a: window.__A, b: window.__B }));
if (urls.a) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync("docs/baselines/ascended-7i/diag-headsz-A.png", Buffer.from(urls.a.split(",")[1], "base64"));
  writeFileSync("docs/baselines/ascended-7i/diag-headsz-B.png", Buffer.from(urls.b.split(",")[1], "base64"));
  console.log("saved diag-headsz-A/B.png");
}
await browser.close();
