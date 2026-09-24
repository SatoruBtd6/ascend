// 7i Eclipseheart respec shots: figure 160 (E), photo 76, board 32 — dark theme.
// Stage DOM mirrors production z-order: main canvas < figure/photo < over.
// Usage: node scripts/aura-7i-eclipseheart-shots.mjs [--base http://localhost:5173]
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
const AURA = "eclipseheart";
// [label, kind, size]
const STAGES = [
  ["figE", "figure", 160],
  ["photo76", "photo", 76],
  ["board32", "photo", 32],
];

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}));

for (const [label, kind, size] of STAGES) {
  await page.evaluate(async ({ aura, kind, size, label }) => {
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;background:#0B0F17;display:flex;align-items:center;justify-content:center;height:100vh";
    const mod = window.__mod;
    let cw, ch, ringR, mode, art;
    if (kind === "figure") {
      cw = Math.round(size * 0.8); ch = Math.round(size * 1.02); mode = "body"; ringR = Math.min(cw, ch) / 3.2;
      art = { src: `/avatars/${label.slice(3)}.webp`, w: size * (424 / 568), h: size };
    } else {
      cw = Math.round(size * 1.45 * 1.28); ch = cw; mode = "circle"; ringR = size * 1.45 / 2.7;
      art = { src: "/avatars/E.webp", w: size, h: size, round: true };
    }
    const wrap = document.createElement("div");
    wrap.id = "stage";
    wrap.style.cssText = `position:relative;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center`;
    const cv = document.createElement("canvas");
    cv.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:0`;
    wrap.appendChild(cv);
    const img = document.createElement("img");
    img.src = art.src;
    img.style.cssText = `width:${art.w}px;height:${art.h}px;${art.round ? "border-radius:50%;" : ""}object-fit:cover;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
    wrap.appendChild(img);
    const cv2 = document.createElement("canvas");
    cv2.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:2;pointer-events:none`;
    wrap.appendChild(cv2);
    document.body.appendChild(wrap);
    await img.decode().catch(() => {});
    const inst = mod.makeAura(cv, { aura, w: cw, h: ch, mode, ringR, figure: mode === "body" ? art.src : undefined, overCanvas: cv2 });
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    for (let i = 0; i < 120; i++) inst.frame(1 / 60);
  }, { aura: AURA, kind, size, label });
  const stage = await page.$("#stage");
  await stage.screenshot({ path: join(OUT, `7i-eclipseheart-${label}-dark.png`) });
  console.log(`7i-eclipseheart-${label}-dark.png`);
}
await browser.close();
