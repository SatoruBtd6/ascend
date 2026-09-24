// 7i Part 2 shots: nullpoint blindfold (with fluttering tail ends) on all 14
// physique figures at 160, plus a photo at 76 and at board 32, dark theme
// (light variants too — the part adds colour).
// Stage DOM mirrors production z-order: main canvas < figure/photo < over.
// Also reports the smallest alpha margin of the over-canvas drawing to the
// canvas edge.
// Usage: node scripts/aura-7i-p2-shots.mjs [--base http://localhost:5173]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const AURA = "nullpoint";
const FIGS = ["E", "D", "C", "B", "A", "S", "SS", "E-f", "D-f", "C-f", "B-f", "A-f", "S-f", "SS-f"];
// [label, kind, size, theme]
const STAGES = [
  ...FIGS.map((f) => [`fig${f}`, "figure", 160, "dark"]),
  ["photo76", "photo", 76, "dark"],
  ["board32", "photo", 32, "dark"],
  ["figE", "figure", 160, "light"],
  ["photo76", "photo", 76, "light"],
  ["board32", "photo", 32, "light"],
];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 700 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

const margins = [];
const buildStage = async ({ aura, kind, size, theme, label }) => {
  const margin = await page.evaluate(async ({ aura, kind, size, theme, label }) => {
    const host = document.getElementById("stage") || document.body;
    const mod = window.__mod;
    let cw, ch, ringR, mode, art;
    if (kind === "figure") {
      cw = Math.round(size * 0.8); ch = Math.round(size * 1.02); mode = "body"; ringR = Math.min(cw, ch) / 3.2;
      art = { src: `/avatars/${size === 160 ? label.replace(/^pair-/, "").slice(3) : label}.webp`, w: size * (424 / 568), h: size };
    } else {
      cw = Math.round(size * 1.45 * 1.28); ch = cw; mode = "circle"; ringR = size * 1.45 / 2.7;
      // a real profile photo is a face shot — clip a circle around the
      // physique art's head the way a portrait upload would sit
      art = { src: "/avatars/E.webp", face: { x: 212, y: 55, half: 24 } };
    }
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:relative;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center;flex:0 0 auto`;
    const cv = document.createElement("canvas");
    cv.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:0`;
    wrap.appendChild(cv);
    if (art.face) {
      const clip = document.createElement("div");
      clip.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
      const img = document.createElement("img");
      img.src = art.src;
      // head (~half*2 px wide in the source art) fills ~62% of the circle,
      // centred slightly high like a real headshot
      const k = (size * 0.62) / (art.face.half * 2);
      img.style.cssText = `width:${424 * k}px;height:${568 * k}px;max-width:none;position:absolute;left:${size / 2 - art.face.x * k}px;top:${size * (0.5 - 0.16 * ringR / size) - art.face.y * k}px`;
      clip.appendChild(img);
      wrap.appendChild(clip);
      await img.decode().catch(() => {});
    } else {
      const img = document.createElement("img");
      img.src = art.src;
      img.style.cssText = `width:${art.w}px;height:${art.h}px;object-fit:cover;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
      wrap.appendChild(img);
      await img.decode().catch(() => {});
    }
    const cv2 = document.createElement("canvas");
    cv2.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:2;pointer-events:none`;
    wrap.appendChild(cv2);
    host.appendChild(wrap);
    const inst = mod.makeAura(cv, { aura, w: cw, h: ch, mode, ringR, figure: mode === "body" ? art.src : undefined, overCanvas: cv2 });
    inst.frame(1 / 60); // kicks off lazy image loads so the cache has records
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].length && [...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    for (let i = 0; i < 120; i++) inst.frame(1 / 60);
    const W = cv2.width, H = cv2.height;
    const d = cv2.getContext("2d").getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < 0) return { empty: true };
    const dpr = cv2.width / cw;
    return { left: +(minX / dpr).toFixed(1), top: +(minY / dpr).toFixed(1), right: +((W - 1 - maxX) / dpr).toFixed(1), bottom: +((H - 1 - maxY) / dpr).toFixed(1) };
  }, { aura, kind, size, theme, label });
  return margin;
};

for (const [label, kind, size, theme] of STAGES) {
  await page.evaluate((theme) => {
    document.body.innerHTML = "";
    document.body.style.cssText = `margin:0;background:${theme === "light" ? "#EDF1F7" : "#0B0F17"};display:flex;align-items:center;justify-content:center;height:100vh`;
    const stage = document.createElement("div");
    stage.id = "stage";
    document.body.appendChild(stage);
  }, theme);
  const r = await buildStage({ aura: AURA, kind, size, theme, label });
  const stage = await page.$("#stage");
  await stage.screenshot({ path: join(OUT, `7i-p2-${AURA}-${label}-${theme}.png`) });
  margins.push({ label, theme, ...r });
  console.log(`7i-p2-${AURA}-${label}-${theme}.png  margin L${r.left} T${r.top} R${r.right} B${r.bottom}`);
}
await browser.close();
const flat = margins.flatMap((m) => [m.left, m.top, m.right, m.bottom]).filter((v) => typeof v === "number");
console.log(`smallest over-canvas margin: ${Math.min(...flat)}px`);
