// Locate diffing pixels: render one aura+geom on a base, dump f10 pixel grid
// as a coarse ASCII map of diff locations. --base
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
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
const aura = args.includes("--aura") ? args[args.indexOf("--aura") + 1] : "bonewright";
const W = +(args.find((a) => a.startsWith("--w="))?.slice(4) || 59);
const H = +(args.find((a) => a.startsWith("--h="))?.slice(4) || W);
const mode = args.find((a) => a.startsWith("--mode="))?.slice(7) || "circle";
const FRAMES = +(args.find((a) => a.startsWith("--f="))?.slice(4) || 10);
const file = args[args.indexOf("compare") + 1];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  let fakeNow = 0; m.setFlashPageClock(() => fakeNow); window.__fakeStep = () => { fakeNow += 1 / 60; };
}));

const caps = await page.evaluate(async ({ aura, W, H, mode, FRAMES, skipWarm }) => {
  const mod = window.__mod;
  let rs = 0x9e3779b9; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296;
  if (!skipWarm) {
    // warm all lazy images first (same as full-diff)
    const wcv = document.createElement("canvas"); wcv.width = 128; wcv.height = 164;
    const wov = document.createElement("canvas"); wov.width = 128; wov.height = 164;
    for (const a of window.__cat.AURAS) { const i = mod.makeAura(wcv, { aura: a.id, w: 128, h: 164, mode: "body", ringR: 40, overCanvas: wov, figure: "/avatars/E.webp" }); if (i) { i.frame(1 / 60); i.frame(1 / 60); } }
    for (let t = 0; t < 600; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  }
  rs = 0x9e3779b9; // re-seed: warm-up consumed from the same stream
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ov = document.createElement("canvas"); ov.width = W; ov.height = H;
  const inst = mod.makeAura(cv, { aura, w: W, h: H, mode, ringR: Math.min(W, H) / 3.456, overCanvas: mod.auraNeedsOver(aura) ? ov : null, figure: mode === "body" ? "/avatars/E.webp" : undefined });
  inst.frame(1 / 60); window.__fakeStep();
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
  const grab = () => ({ main: Array.from(cv.getContext("2d").getImageData(0, 0, W, H).data), over: Array.from(ov.getContext("2d").getImageData(0, 0, W, H).data), mainPng: cv.toDataURL("image/png"), overPng: ov.toDataURL("image/png"), instState: { boltsFired: inst.boltsFired, flashes: inst.flashes, moment: inst.moment } });
  let cap;
  for (let i = 0; i <= FRAMES; i++) { inst.frame(1 / 60); window.__fakeStep(); if (i === FRAMES - 1) cap = grab(); }
  return cap;
}, { aura, W, H, mode, FRAMES, skipWarm: args.includes("--skipwarm") });

const before = new Map();
for (const line of (args[0] === "compare" ? readFileSync(file, "utf8") : "").split("\n")) {
  if (!line.trim()) continue;
  const c = JSON.parse(line);
  before.set(c.aura + "|" + c.label, c.caps);
}
const { writeFileSync } = await import("node:fs");
const side = base.includes("5175") ? "old" : "new";
writeFileSync(join(process.env.TEMP || ".", `locate-${aura}-${W}-${side}.png`), Buffer.from(caps.mainPng.split(",")[1], "base64"));
writeFileSync(join(process.env.TEMP || ".", `locate-${aura}-${W}-over-${side}.png`), Buffer.from(caps.overPng.split(",")[1], "base64"));
console.log("state:", JSON.stringify(caps.instState));
for (const [x, y] of [[29, 10], [29, 29], [10, 29], [45, 29], [29, 45], [20, 20], [40, 40]]) {
  const i = (y * W + x) * 4;
  console.log(`  px ${x},${y} -> ${caps.main[i]},${caps.main[i + 1]},${caps.main[i + 2]},${caps.main[i + 3]}`);
}
if (args[0] !== "compare") { await browser.close(); process.exit(0); }
const label = W === 59 ? "board32" : W === 141 ? "profile76" : "figure160";
const b64caps = before.get(aura + "|" + label);
const tag = "f" + FRAMES;
const bMain = Buffer.from(b64caps[tag].main, "base64");
const bOver = b64caps[tag].over ? Buffer.from(b64caps[tag].over, "base64") : null;
const A = Buffer.from(caps.main), O = Buffer.from(caps.over);
// ASCII map: mark differing pixel cells
for (const [name, a, b] of [["MAIN", A, bMain], ["OVER", O, bOver]]) {
  if (!b) { console.log(name + ": (no baseline over)"); continue; }
  const grid = [];
  let n = 0;
  for (let y = 0; y < H; y++) { let row = ""; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const d = a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]; row += d ? "#" : (a[i + 3] ? "." : " "); if (d) n++; } grid.push(row); }
  console.log(`=== ${name} f${FRAMES}: ${n} px differ ===`);
  console.log(grid.join("\n"));
}
await browser.close();
