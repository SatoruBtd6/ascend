// 7i gallery pass — Redline hat size evidence. Renders the figure stage and
// the avatar-ring stage at each size-control extreme so the shots prove the
// control changes the render, not just the stored value.
// Usage: node scripts/aura-7i-redline-size-shots.mjs [--base http://127.0.0.1:5173]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
await ctx.addInitScript(() => {
  let state = 0x7f2a11;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
});
const page = await ctx.newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

// Variants: figure stage shows headSz (the working size control), ring stage
// shows rimSz. "size" labels refer to the gallery's single Size control, which
// now binds headSz on the figure view and rimSz on the avatar-ring view.
// Extremes match the editor slider bounds (fieldBounds): headSz 0.1–3,
// rimSz 0.1–1.2. "Size" is the gallery's single control — headSz on the
// figure view, rimSz on the avatar-ring view.
const jobs = [
  ["figure", "headSz", 0.1, "redline-figure-headsz-min.png"],
  ["figure", "headSz", 3, "redline-figure-headsz-max.png"],
  ["figure", "headSz", 0.1, "redline-figure-size-min.png"],
  ["figure", "headSz", 3, "redline-figure-size-max.png"],
  ["ring", "rimSz", 0.1, "redline-ring-size-min.png"],
  ["ring", "rimSz", 1.2, "redline-ring-size-max.png"],
  // headSz is a body-view control — on the avatar ring it is hidden, so these
  // two shots intentionally render identically (documents why it is hidden).
  ["ring", "headSz", 0.1, "redline-ring-headsz-min.png"],
  ["ring", "headSz", 3, "redline-ring-headsz-max.png"],
];

for (const [view, key, value, file] of jobs) {
  const dataUrl = await page.evaluate(async ([view, key, value]) => {
    const mod = await import("/src/auras/AuraCanvas.jsx");
    const { cloneSpec } = await import("/src/auras/specFormat.js");
    const ORIG = cloneSpec(mod.AURA_FX.crownfall);
    const spec = cloneSpec(ORIG);
    spec.layers[0][key] = value;
    const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
    const isFig = view === "figure";
    const w = isFig ? 160 : 232, h = isFig ? 204 : 232;
    // compose like the gallery stage: dark backdrop, figure/face under aura
    const root = document.createElement("div");
    root.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;background:#0B1220;overflow:hidden;`;
    const cv = document.createElement("canvas");
    const ov = document.createElement("canvas");
    root.appendChild(cv); root.appendChild(ov);
    document.body.appendChild(root);
    mod.AURA_FX.crownfall = spec;
    seed();
    const inst = mod.makeAura(cv, { aura: "crownfall", w, h, mode: isFig ? "body" : "circle", ringR: isFig ? undefined : 66, overCanvas: ov, figure: isFig ? "/avatars/E.webp" : undefined });
    for (let t = 0; t < 200; t++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed();
    for (let f = 0; f < 30; f++) inst.frame(1 / 60);
    // draw the figure/photo under the aura like the real stage does, then the
    // over canvas on top (over-layers draw above the figure)
    const g = cv.getContext("2d");
    if (isFig) {
      const img = new Image();
      img.src = "/avatars/E.webp";
      await img.decode().catch(() => {});
      g.save(); g.globalCompositeOperation = "destination-over";
      g.drawImage(img, (w - h) / 2 + 20, 0, h - 40, h);
      g.restore();
    } else {
      g.save(); g.globalCompositeOperation = "destination-over";
      g.fillStyle = "#22304a"; g.beginPath(); g.arc(w / 2, h / 2, 66 * 1.35, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8FA3C8"; g.font = `${66 * 1.1}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("A", w / 2, h / 2);
      g.restore();
    }
    g.drawImage(ov, 0, 0);
    const url = cv.toDataURL("image/png");
    root.remove();
    mod.AURA_FX.crownfall = ORIG;
    return url;
  }, [view, key, value]);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(OUT, file), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`saved ${file}  (${view} ${key}=${value})`);
}
await browser.close();
