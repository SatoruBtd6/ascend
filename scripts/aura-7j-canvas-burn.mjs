// Does canvas-creation/readback pressure change rasterization? Render
// bonewright board32 f10, then burn N canvases+getImageData, render again.
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
const BURN = +(args.find((a) => a.startsWith("--burn="))?.slice(7) || 300);
const READBACK = args.includes("--readback");

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });

const res = await page.evaluate(async ({ BURN, READBACK }) => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cat = await import("/src/auras/catalog.js");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
  let fakeNow = 0; mod.setFlashPageClock(() => fakeNow);
  const seed = () => { let s = 0x9e3779b9; Math.random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const cell = async (aura) => {
    seed();
    const cv = document.createElement("canvas"); cv.width = 59; cv.height = 59;
    const ov = document.createElement("canvas"); ov.width = 59; ov.height = 59;
    const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 59 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? ov : null });
    inst.frame(1 / 60); fakeNow += 1 / 60;
    for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    for (let i = 0; i < 10; i++) { inst.frame(1 / 60); fakeNow += 1 / 60; }
    return Array.from(cv.getContext("2d").getImageData(0, 0, 59, 59).data);
  };
  const warm = async () => {
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 164;
    const ov = document.createElement("canvas"); ov.width = 128; ov.height = 164;
    let s = 0x111; Math.random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (const a of cat.AURAS) { const i = mod.makeAura(cv, { aura: a.id, w: 128, h: 164, mode: "body", ringR: 40, overCanvas: ov, figure: "/avatars/E.webp" }); if (i) { i.frame(1 / 60); i.frame(1 / 60); } }
    for (let t = 0; t < 600; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

  await warm();
  const A = await cell("bonewright");
  // burn canvases like real cells do
  const junk = [];
  for (let i = 0; i < BURN; i++) {
    const c = document.createElement("canvas"); c.width = c.height = 59;
    const g = c.getContext("2d"); g.fillRect(0, 0, 59, 59);
    if (READBACK) g.getImageData(0, 0, 59, 59);
    junk.push(c);
  }
  const B = await cell("bonewright");
  return { burn: BURN, readback: READBACK, diffAB: diff(A, B) };
}, { BURN, READBACK });
console.log(JSON.stringify(res));
await browser.close();
