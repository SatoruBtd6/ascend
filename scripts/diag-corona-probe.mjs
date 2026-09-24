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
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  async function ready() { for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) return; await new Promise((r) => setTimeout(r, 25)); } }
  function run(spec, mode) {
    seed();
    mod.AURA_FX.huntersmoon = spec;
    const cv = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "huntersmoon", w: 128, h: 164, mode: "body", figure: "/avatars/E.webp" });
    seed();
    const frames = [];
    for (let f = 0; f < 48; f++) { inst.frame(1 / 60); frames.push(Array.from(cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data)); }
    return frames;
  }
  const ORIG = cloneSpec(mod.AURA_FX.huntersmoon);
  const variant = setPath(ORIG, ["corona", "inner"], "#00ff88");
  await ready();
  const A = run(ORIG, "body");
  const B = run(variant, "body");
  let diff = 0, first = -1;
  for (let f = 0; f < 48; f++) {
    const a = A[f], b = B[f];
    let d = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++;
    if (d && first < 0) first = f;
    diff += d;
  }
  // also dump the raw canvas for eyeballing
  seed();
  mod.AURA_FX.huntersmoon = ORIG;
  const cv = document.createElement("canvas");
  const inst = mod.makeAura(cv, { aura: "huntersmoon", w: 128, h: 164, mode: "body", figure: "/avatars/E.webp" });
  for (let f = 0; f < 30; f++) inst.frame(1 / 60);
  return { diff, first, png: cv.toDataURL("image/png") };
});
console.log(JSON.stringify({ diff: out.diff, first: out.first }));
if (out.png) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync("docs/baselines/ascended-7i/diag-huntersmoon-fig.png", Buffer.from(out.png.split(",")[1], "base64"));
  console.log("saved diag-huntersmoon-fig.png");
}
await browser.close();
