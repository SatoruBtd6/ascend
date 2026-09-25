// One-off: solo small ascended render with optional spec mutations, for the
// 1-byte-diff bisect.
// Usage: node scripts/aura-7j-solo-probe.mjs <base> <out.json> [norays|nobolts|noeye|nofeather|nostar|nomoment|none]
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
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
const base = process.argv[2], out = process.argv[3], mut = process.argv[4] || "none";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));
const res = await page.evaluate(async (mut) => {
  const mod = window.__mod;
  const seed = () => { let s = 0x9e3779b9; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const fx = mod.AURA_FX.ascended;
  const saved = {};
  if (mut === "norays") { saved.rays = fx.rays; fx.rays = null; }
  if (mut === "nobolts") { saved.bolts = fx.bolts; fx.bolts = null; }
  if (mut === "noeye") { saved.layers = fx.layers; fx.layers = fx.layers.filter((l) => l.shape !== "eye"); }
  if (mut === "nofeather") { saved.layers = saved.layers || fx.layers; fx.layers = fx.layers.filter((l) => l.shape !== "feather"); }
  if (mut === "nostar") { saved.layers = saved.layers || fx.layers; fx.layers = fx.layers.filter((l) => l.shape !== "star" && l.shape !== "star-cross"); }
  const render = (aura, w) => {
    const real = Math.random; Math.random = seed();
    const cv = document.createElement("canvas"); cv.width = w; cv.height = w;
    const inst = mod.makeAura(cv, { aura, w, h: w, mode: "circle", ringR: w / 3.456, overCanvas: null });
    inst.frame(1 / 60); Math.random = real;
    return { inst, cv };
  };
  const frames = (inst, n) => { const real = Math.random; Math.random = seed(); for (let i = 0; i < n; i++) inst.frame(1 / 60); Math.random = real; };
  for (let t = 0; t < 200; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  const t = render("ascended", 59); frames(t.inst, 40);
  if (saved.rays !== undefined) fx.rays = saved.rays;
  if (saved.bolts !== undefined) fx.bolts = saved.bolts;
  if (saved.layers !== undefined) fx.layers = saved.layers;
  return Array.from(t.cv.getContext("2d").getImageData(0, 0, t.cv.width, t.cv.height).data);
}, mut);
writeFileSync(out, JSON.stringify(res));
console.log(`wrote ${out} (${mut})`);
await browser.close();
