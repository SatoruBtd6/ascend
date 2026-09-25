// 7j Part 3: sprite sharpness proof. For every baked-sprite shape, draws at
// board/ring/figure particle sizes, at 3x figure, and at a DPR-2-equivalent
// size (double device px). Spies on ctx.drawImage to assert the sprite's bake
// resolution never falls below the draw size — i.e. no small-size bake is ever
// stretched to a big size. Prints the _glowCache keys so the tiers are visible.
//   node scripts/aura-7j-multisize.mjs [--base http://localhost:5174]
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascend-7j");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const SHAPES = ["comet", "sparkle", "orb", "wisp", "lantern", "sparkburst"];
// sz values: board-32 ~3.6, ring/photo-76 ~8.5, figure-160 ~15,
// figure 3x ~45, ring at DPR2 = 17 device px (same CSS size, doubled backing)
const SIZES = [["board32", 3.6], ["ring76", 8.5], ["figure160", 15], ["figure3x", 45], ["ring76-dpr2", 17]];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

const out = await page.evaluate(({ SHAPES, SIZES }) => {
  const mod = window.__mod;
  mod._glowCache.clear();
  const rows = [];
  const shots = {};
  for (const shape of SHAPES) {
    for (const [label, sz] of SIZES) {
      const dim = Math.ceil(sz * 6.4);
      const cv = document.createElement("canvas"); cv.width = cv.height = dim;
      const g = cv.getContext("2d");
      const calls = [];
      const orig = g.drawImage.bind(g);
      g.drawImage = (src, ...a) => { calls.push({ srcW: src.width, dstW: a.length === 4 ? a[2] : a[6], dstH: a.length === 4 ? a[3] : a[7] }); return orig(src, ...a); };
      const p = { sz, c: "#7DD3FC", rot: 0.4, ph: 0.7, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, i: 3, vx: 10, vy: -6 };
      mod.drawNewParticleShape(g, shape, p, dim / 2, dim / 2, 0.5, false);
      const worst = Math.min(...calls.map((c) => c.srcW / c.dstW));
      rows.push({ shape, label, sz, draws: calls.length, minRatio: +worst.toFixed(2) });
      if (label === "figure3x") shots[shape] = cv.toDataURL("image/png").split(",")[1];
    }
  }
  const keys = [...mod._glowCache.keys()].filter((k) => k.startsWith("7j:")).sort();
  // sharpness check: hard-edge pixel fraction on the figure3x render —
  // a blurred upscale shows smooth ramps, an at-size bake keeps crisp detail
  const sharp = {};
  for (const shape of SHAPES) {
    const sz = 45, dim = Math.ceil(sz * 6.4);
    const cv = document.createElement("canvas"); cv.width = cv.height = dim;
    const g = cv.getContext("2d");
    const p = { sz, c: "#7DD3FC", rot: 0.4, ph: 0.7, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, i: 3, vx: 10, vy: -6 };
    mod.drawNewParticleShape(g, shape, p, dim / 2, dim / 2, 0.5, false);
    const d = g.getImageData(0, 0, dim, dim).data;
    let edges = 0, painted = 0;
    for (let y = 1; y < dim - 1; y++) for (let x = 1; x < dim - 1; x++) {
      const a = d[(y * dim + x) * 4 + 3];
      if (a > 20) painted++;
      if (Math.abs(a - d[(y * dim + x + 1) * 4 + 3]) > 120 || Math.abs(a - d[((y + 1) * dim + x) * 4 + 3]) > 120) edges++;
    }
    sharp[shape] = +(edges / Math.max(1, painted)).toFixed(3);
  }
  return { rows, keys, sharp, shots };
}, { SHAPES, SIZES });

let fail = 0;
console.log("shape        size          spriteSrc/drawDst ratio (>=1 = no upscale of a small bake)");
for (const r of out.rows) {
  const bad = r.minRatio < 0.99;
  if (bad) fail++;
  console.log(`  ${r.shape.padEnd(12)} ${r.label.padEnd(13)} sz=${String(r.sz).padEnd(4)} draws=${r.draws} minRatio=${r.minRatio}${bad ? "  <-- UPSCALED" : ""}`);
}
console.log("\nbaked tiers per colour (7j:shape:color:tier):");
for (const k of out.keys) console.log("  " + k);
console.log("\nhard-edge fraction at figure3x (higher = crisper detail):");
for (const [s, v] of Object.entries(out.sharp)) console.log(`  ${s.padEnd(12)} ${v}`);
// large-size visual sheet
const sheet = await page.evaluate(({ shots, SHAPES }) => {
  const ims = SHAPES.map((s) => new Promise((r) => { const im = new Image(); im.onload = () => r({ s, im }); im.src = "data:image/png;base64," + shots[s]; }));
  return Promise.all(ims).then((list) => {
    const cw = 300, ch = 320;
    const cv = document.createElement("canvas"); cv.width = cw * list.length; cv.height = ch;
    const g = cv.getContext("2d");
    g.fillStyle = "#0b0e16"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "13px monospace"; g.textAlign = "center"; g.fillStyle = "#e8ecf4";
    list.forEach(({ s, im }, i) => {
      g.fillText(`${s} @3x figure`, i * cw + cw / 2, 18);
      g.drawImage(im, i * cw + (cw - im.width) / 2, 26);
    });
    return cv.toDataURL("image/png").split(",")[1];
  });
}, { shots: out.shots, SHAPES });
writeFileSync(join(OUT, "shape-3x-figure.png"), Buffer.from(sheet, "base64"));
console.log(`\nlarge-size sheet -> ${join(OUT, "shape-3x-figure.png")}`);
console.log(fail ? `\n${fail} UPSCALED draws` : "\nno upscaled small bakes at any size");
await browser.close();
process.exit(fail ? 1 : 0);
