// Crownfall ring-view proof: the 7i body-view spec change (y:-0.18 on the hat)
// must leave the avatar ring pixel-identical. Renders ring mode at photo 76
// and board 32 with the previous spec vs the live spec, seeded identically.
// Usage: node scripts/aura-7i-redline-ring-check.mjs [--base http://127.0.0.1:5173]
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
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  let state = 0x7f2a11;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
});
const page = await ctx.newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });

const out = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const { cloneSpec } = await import("/src/auras/specFormat.js");
  mod.AuraLoop.raf && cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
  let fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  const NEW = cloneSpec(mod.AURA_FX.crownfall);
  const OLD = cloneSpec(NEW);
  delete OLD.layers[0].y; delete OLD.layers[0].circle; // pre-change spec

  async function snap(spec, w, h, ringR) {
    mod.AURA_FX.crownfall = spec;
    const cv = document.createElement("canvas");
    const ov = document.createElement("canvas");
    seed();
    const inst = mod.makeAura(cv, { aura: "crownfall", w, h, mode: "circle", ringR, overCanvas: ov });
    for (let t = 0; t < 200; t++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed(); fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
    for (let f = 0; f < 120; f++) { fakeT += 1 / 60; inst.frame(1 / 60); }
    const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ov, 0, 0);
    return Array.from(g.getImageData(0, 0, w, h).data);
  }

  const results = {};
  for (const [name, w, h, ringR] of [["photo76", 76, 76, 23], ["board32", 32, 32, 10]]) {
    const a = await snap(OLD, w, h, ringR);
    const b = await snap(NEW, w, h, ringR);
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
    results[name] = diff;
  }
  // and the figure view SHOULD differ — sanity that the change is live
  const snapBody = async (spec) => {
    mod.AURA_FX.crownfall = spec;
    const cv = document.createElement("canvas"); const ov = document.createElement("canvas");
    seed();
    const inst = mod.makeAura(cv, { aura: "crownfall", w: 160, h: 204, mode: "body", overCanvas: ov, figure: "/avatars/E.webp" });
    for (let t = 0; t < 200; t++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed(); fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
    for (let f = 0; f < 120; f++) { fakeT += 1 / 60; inst.frame(1 / 60); }
    const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ov, 0, 0);
    return Array.from(g.getImageData(0, 0, 160, 204).data);
  };
  const fa = await snapBody(OLD), fb = await snapBody(NEW);
  let fdiff = 0;
  for (let i = 0; i < fa.length; i += 4) if (fa[i] !== fb[i] || fa[i + 1] !== fb[i + 1] || fa[i + 2] !== fb[i + 2] || fa[i + 3] !== fb[i + 3]) fdiff++;
  results.figure160 = fdiff;
  mod.AURA_FX.crownfall = NEW;
  return results;
});
console.log(JSON.stringify(out));
await browser.close();
process.exit(out.photo76 === 0 && out.board32 === 0 && out.figure160 > 0 ? 0 : 1);
