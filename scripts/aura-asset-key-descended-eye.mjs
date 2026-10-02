// aura-asset-key-descended-eye — one-off magenta key/despill/trim for
// public/aura/descended-eye-src.webp -> public/aura/descended-eye.webp
// (512x512, alpha). Clone of aura-asset-key.mjs with SRC/DST retargeted and the
// ring-radius stats kept (harmless on a non-ring sprite — they just report
// extent). Source magenta #C2185B sits at hue ~336 inside the 296-352 window.
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

// src archived at evidence/aura-asset-src/ — copy back to public/aura/ before re-running
const SRC = "aura/descended-eye-src.webp";
const DST = join(REPO, "public", "aura", "descended-eye.webp");
const DELETE_SRC = process.argv.includes("--rm-src");
const OUT_PX = 512;

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}

assertPortFree(CURR_PORT);
startVite(REPO, CURR_PORT);
await waitReady(CURR_URL);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });

const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${CURR_URL}/`, { waitUntil: "domcontentloaded" });

const res = await page.evaluate(async ({ SRC, OUT_PX }) => {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `/${SRC}`; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement("canvas"); c0.width = W; c0.height = H;
  const g0 = c0.getContext("2d", { willReadFrequently: true });
  g0.drawImage(img, 0, 0);
  const id0 = g0.getImageData(0, 0, W, H);
  const d = id0.data;

  const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a))); // a<b
  const hsv = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
    let h = 0;
    if (ch > 0) {
      if (mx === r) h = 60 * (((g - b) / ch) % 6);
      else if (mx === g) h = 60 * ((b - r) / ch + 2);
      else h = 60 * ((r - g) / ch + 4);
      if (h < 0) h += 360;
    }
    return [h, mx === 0 ? 0 : ch / mx, mx / 255];
  };

  let keyed = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const [h, s, v] = hsv(r, g, b);
    // magenta membership: strict linear interval — wrapped hue would eat the
    // h0-20 inner glow. full key 296..352, soft shoulders 282/356.
    const hueIn = h >= 282 && h <= 356 ? (h < 296 ? ramp(h, 282, 296) : h > 352 ? 1 - ramp(h, 352, 356) : 1) : 0;
    const satG = ramp(s, 0.14, 0.30);            // gradient bg is high-sat; iron is dark/desat
    const valG = ramp(v, 0.06, 0.14);            // near-black thorns never keyed
    const k = hueIn * satG * valG;
    if (k >= 1) keyed++;
    d[i + 3] = Math.round(255 * (1 - k));
    // despill: pull magenta excess out of every surviving pixel (self-gating on pinkish px)
    const spill = Math.min(r, b) - g;
    if (spill > 0) { d[i] = r - spill; d[i + 2] = b - spill; }
  }

  // trim bbox + residue scan
  let x0 = W, y0 = H, x1 = 0, y1 = 0, pink = 0, opaque = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = d[i + 3];
    if (a > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (a > 200) {
        opaque++;
        const [h, s, v] = hsv(d[i], d[i + 1], d[i + 2]);
        if (h > 288 && h < 356 && s > 0.28 && v > 0.18) pink++;
      }
    }
  }
  // sprite centre = centroid of opaque px; radii by ray scan
  let cx = 0, cy = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const a = d[(y * W + x) * 4 + 3];
    if (a > 128) { cx += x; cy += y; n++; }
  }
  cx /= n; cy /= n;
  const aAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[((y | 0) * W + (x | 0)) * 4 + 3];
  let inR = [], outR = [];
  for (let t = 0; t < 720; t++) {
    const th = t * Math.PI / 360, ux = Math.cos(th), uy = Math.sin(th);
    let first = -1, last = -1;
    for (let rr = 0; rr < Math.max(W, H); rr += 1) {
      const a = aAt(cx + ux * rr, cy + uy * rr);
      if (a > 128) { if (first < 0) first = rr; last = rr; }
      else if (rr > Math.max(W, H) / 2) break;
    }
    if (first >= 0) inR.push(first);
    if (last > 0) outR.push(last);
  }
  inR.sort((a, b) => a - b); outR.sort((a, b) => a - b);
  const medIn = inR[Math.floor(inR.length / 2)] || 0;
  const medOut = outR[Math.floor(outR.length / 2)] || 0;

  // square crop centred on sprite centroid, sized to opaque extent -> OUT_PX webp
  const side = Math.ceil(Math.max(x1 - cx, cx - x0, y1 - cy, cy - y0) * 2 + 4);
  const c2 = document.createElement("canvas"); c2.width = side; c2.height = side;
  const g2 = c2.getContext("2d");
  g2.putImageData(id0, Math.round(side / 2 - cx), Math.round(side / 2 - cy));
  const c3 = document.createElement("canvas"); c3.width = OUT_PX; c3.height = OUT_PX;
  c3.getContext("2d").drawImage(c2, 0, 0, OUT_PX, OUT_PX);
  const webp = c3.toDataURL("image/webp", 0.82);

  // preview: keyed result over near-black bg
  const c4 = document.createElement("canvas"); c4.width = OUT_PX; c4.height = OUT_PX;
  const g4 = c4.getContext("2d");
  g4.fillStyle = "#0A0A0E"; g4.fillRect(0, 0, OUT_PX, OUT_PX);
  g4.drawImage(c3, 0, 0);
  const preview = c4.toDataURL("image/png");

  return { W, H, keyed, opaque, pink, medIn, medOut, side, webp, preview, cx: +cx.toFixed(1), cy: +cy.toFixed(1), x0, y0, x1, y1 };
}, { SRC, OUT_PX });

const outDir = evidenceDir("aura-asset-key-descended-eye");
writeFileSync(join(outDir, "descended-eye-preview.png"), Buffer.from(res.preview.split(",")[1], "base64"));
const webpBuf = Buffer.from(res.webp.split(",")[1], "base64");
writeFileSync(DST, webpBuf);
if (DELETE_SRC && existsSync(join(REPO, "public", SRC))) unlinkSync(join(REPO, "public", SRC));

console.log(`src ${res.W}x${res.H}  centre=(${res.cx},${res.cy})  trim=(${res.x0},${res.y0})-(${res.x1},${res.y1})`);
console.log(`keyed fully: ${res.keyed} px | opaque kept: ${res.opaque} | pink residue (opaque magenta-ish): ${res.pink}`);
console.log(`median innerR=${res.medIn}px outerR=${res.medOut}px of src -> of ${OUT_PX}px output: inner ${(res.medIn / res.side).toFixed(3)} outer ${(res.medOut / res.side).toFixed(3)} of width`);
console.log(`wrote ${DST} (${(webpBuf.length / 1024).toFixed(1)} KB)  preview: ${join(outDir, "descended-eye-preview.png")}${DELETE_SRC ? "  src png DELETED" : "  src png kept (use --rm-src)"}`);

await browser.close();
stopServers();
