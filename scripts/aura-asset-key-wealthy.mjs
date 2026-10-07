// Wealthy asset keying — top hat and money gun.
//
// Adapted from aura-asset-key-descended-eye.mjs (flat-magenta key, no flood
// fill, despill, crop-to-content square export). Unlike the aura-sheet
// keyers this takes the source and destination as argv so both Wealthy
// sprites run through one script:
//
//   node scripts/aura-asset-key-wealthy.mjs _wealthy-tophat-raw.png wealthy-tophat.webp
//   node scripts/aura-asset-key-wealthy.mjs _wealthy-gun-raw.png    wealthy-gun.webp
//
// Pipeline per file:
//   1. Load the source PNG (in public/aura/) — flat magenta backdrop.
//   2. Hue-similarity key (H 296-322) with S/V gates; hard-cut the
//      backdrop, keep partial alpha only on genuinely-magenta edge pixels.
//   3. Despill: pull residual magenta toward the pixel's green channel.
//   4. Report metrics (keyed %, residual-pink px after despill, content
//      bbox + normalized extents) and trim the sprite to its opaque bbox.
//   5. Write a 512x512 RGBA .webp to public/aura/ plus dark- and
//      light-backing previews under evidence/aura-asset-key-wealthy/.
//
//   node scripts/aura-asset-key-wealthy.mjs <src.png> <dst.webp>
// CHROME_PATH overrides the browser binary (macOS default below).
import { REPO, CURR_PORT, BASE_PORT, startVite, waitReady, assertPortFree, evidenceDir } from "./aura-lib.mjs";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = REPO;
const OUT_DIR = join(ROOT, "evidence", "aura-asset-key-wealthy");

const loadChromium = async () => {
  const dirs = [join(REPO, "node_modules", "playwright-core"), join(REPO, "node_modules", "playwright")];
  for (const dir of dirs) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
};
const save = (p, buf) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, buf); };

const SRC = process.argv[2];
const DST = process.argv[3] || "wealthy-out.webp";
if (!SRC) {
  console.error("usage: node scripts/aura-asset-key-wealthy.mjs <src.png> <dst.webp>");
  process.exit(2);
}

const chromium = await loadChromium();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH
    || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "C:/Program Files/Google/Chrome/Application/chrome.exe"),
});
const vite = startVite(ROOT, CURR_PORT);
try {
  await waitReady(`http://localhost:${CURR_PORT}`);

  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  await page.goto(`http://localhost:${CURR_PORT}/`);
  const result = await page.evaluate(async ({ SRC }) => {
    const loadImg = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    const img = await loadImg(`/aura/${SRC}`);
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H), px = d.data;
    const N = W * H;

    const rgb2hsv = (r, g2, b) => {
      const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), dv = mx - mn;
      let h = 0;
      if (dv > 0) {
        if (mx === r) h = ((g2 - b) / dv) % 6;
        else if (mx === g2) h = (b - r) / dv + 2;
        else h = (r - g2) / dv + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return [h, mx === 0 ? 0 : dv / mx, mx / 255];
    };
    const hueDist = (h) => Math.min(Math.abs(h - 310), Math.abs(h - 310 + 360), Math.abs(h - 310 - 360));
    const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
    const aIn = new Float32Array(N), hueIn = new Float32Array(N), key = new Float32Array(N);
    let keyed = 0;
    for (let i = 0; i < N; i++) {
      const r = px[i * 4], g2 = px[i * 4 + 1], b = px[i * 4 + 2];
      const [h, s, v] = rgb2hsv(r, g2, b);
      const hd = hueDist(h);
      hueIn[i] = 1 - ramp(hd, 12, 26);
      const satG = ramp(s, 0.34, 0.62), valG = ramp(v, 0.06, 0.14);
      const k = hueIn[i] * satG * valG;
      key[i] = k; aIn[i] = 1 - k;
      if (k > 0.5) keyed++;
    }
    const despillAmt = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (key[i] >= 0.98) continue;
      const o = i * 4, r = px[o], g2 = px[o + 1], b = px[o + 2];
      const spill = Math.min(r, b) - g2;
      if (spill > 0) {
        despillAmt[i] = spill;
        px[o] = Math.max(0, r - spill); px[o + 2] = Math.max(0, b - spill);
      }
    }
    let pinkRes = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (aIn[i] > 0.5 && Math.min(px[o], px[o + 2]) - px[o + 1] > 14) pinkRes++;
    }
    // content bbox over the keyed alpha
    let x0 = W, x1 = 0, y0 = H, y1 = 0, opp = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (aIn[y * W + x] > 0.5) { opp++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    return {
      src: SRC, W, H, keyedPct: (keyed / N * 100), pinkRes, opp,
      bbox: { x0, y0, x1, y1, bw, bh },
      extent: { x0: x0 / W, x1: x1 / W, y0: y0 / H, y1: y1 / H },
    };
  }, { SRC });

  const metrics = result;
  console.log(`${SRC}: ${result.W}x${result.H}, keyed ${result.keyedPct.toFixed(1)}% bg, ${result.pinkRes} pink-residue px after despill`);
  console.log(`content bbox: x ${result.bbox.x0}-${result.bbox.x1} (${(result.extent.x0 * 100).toFixed(1)}-${(result.extent.x1 * 100).toFixed(1)}%), y ${result.bbox.y0}-${result.bbox.y1} (${(result.extent.y0 * 100).toFixed(1)}-${(result.extent.y1 * 100).toFixed(1)}%), ${result.bbox.bw}x${result.bbox.bh}px`);

  // Re-run the key in-page, crop to the opaque bbox and export a square
  // 512 webp centred on the opaque centroid (same as the aura-sheet
  // keyers), plus dark/light backing previews and a normalized grid
  // preview for anchor-point measurement.
  const shot = await page.evaluate(async ({ SRC, DST }) => {
    const loadImg = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    const img = await loadImg(`/aura/${SRC}`);
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H), px = d.data;
    const N = W * H;
    const rgb2hsv = (r, g2, b) => {
      const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), dv = mx - mn;
      let h = 0;
      if (dv > 0) {
        if (mx === r) h = ((g2 - b) / dv) % 6;
        else if (mx === g2) h = (b - r) / dv + 2;
        else h = (r - g2) / dv + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return [h, mx === 0 ? 0 : dv / mx, mx / 255];
    };
    const hueDist = (h) => Math.min(Math.abs(h - 310), Math.abs(h - 310 + 360), Math.abs(h - 310 - 360));
    const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
    const aIn = new Float32Array(N), key = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = px[i * 4], g2 = px[i * 4 + 1], b = px[i * 4 + 2];
      const [h, s, v] = rgb2hsv(r, g2, b);
      const hd = hueDist(h);
      const satG = ramp(s, 0.34, 0.62), valG = ramp(v, 0.06, 0.14);
      const k = (1 - ramp(hd, 12, 26)) * satG * valG;
      key[i] = k; aIn[i] = 1 - k;
    }
    for (let i = 0; i < N; i++) {
      if (key[i] >= 0.98) continue;
      const o = i * 4, r = px[o], g2 = px[o + 1], b = px[o + 2];
      const spill = Math.min(r, b) - g2;
      if (spill > 0) { px[o] = Math.max(0, r - spill); px[o + 2] = Math.max(0, b - spill); }
    }
    let x0 = W, x1 = 0, y0 = H, y1 = 0, ccx = 0, ccy = 0, n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = aIn[y * W + x];
      if (a > 0.5) { n++; ccx += x; ccy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    ccx /= n; ccy /= n;
    for (let i = 0; i < N; i++) px[i * 4 + 3] = Math.round(255 * aIn[i]);
    g.putImageData(d, 0, 0);

    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    // crop window is centred on the content BBOX, not the opaque centroid —
    // lopsided sprites (the gun's grip pulls the centroid toward the handle)
    // would otherwise crop the barrel end off.
    const ext = Math.max(bw, bh) * 1.04;
    const outSize = 512;
    const out = document.createElement("canvas"); out.width = outSize; out.height = outSize;
    const og = out.getContext("2d");
    og.drawImage(c, x0 + bw / 2 - ext / 2, y0 + bh / 2 - ext / 2, ext, ext, 0, 0, outSize, outSize);
    const blob = await new Promise((res) => out.toBlob(res, "image/webp", 0.92));

    // previews: keyed sprite over dark and light backings, plus a grid
    // preview in OUTPUT-normalized coords (0-1 each way) for measuring
    // sprite-space anchor points (muzzle, brim centre).
    const mk = (bg, grid) => {
      const pv = document.createElement("canvas"); pv.width = 560; pv.height = 560;
      const pg = pv.getContext("2d");
      pg.fillStyle = bg; pg.fillRect(0, 0, 560, 560);
      pg.drawImage(out, 24, 24, 512, 512);
      if (grid) {
        pg.strokeStyle = "rgba(255,60,60,0.8)"; pg.lineWidth = 1;
        pg.font = "10px monospace"; pg.fillStyle = "rgba(255,60,60,0.9)";
        for (let i = 1; i < 10; i++) {
          const p = 24 + i * 51.2;
          pg.beginPath(); pg.moveTo(p, 24); pg.lineTo(p, 536); pg.stroke();
          pg.beginPath(); pg.moveTo(24, p); pg.lineTo(536, p); pg.stroke();
          pg.fillText(String(i / 10), p + 2, 34); pg.fillText(String(i / 10), 26, p + 10);
        }
        pg.strokeStyle = "rgba(60,255,60,0.9)";
        pg.strokeRect(24, 24, 512, 512);
      }
      return new Promise((res) => pv.toBlob(res, "image/png"));
    };
    const darkBlob = await mk("#0a0c14", false);
    const lightBlob = await mk("#e8e4d8", false);
    const gridBlob = await mk("#0a0c14", true);
    return {
      dst: DST,
      webpB64: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(blob); }),
      darkB64: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(darkBlob); }),
      lightB64: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(lightBlob); }),
      gridB64: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(gridBlob); }),
      outContent: { x0: (24 / 560), w: (bw / ext) },
      srcContent: { cx: ccx, cy: ccy, bw, bh, ext, x0, y0, x1, y1 },
    };
  }, { SRC, DST });

  const b64 = (s) => Buffer.from(s, "base64");
  const dstName = shot.dst.endsWith(".webp") ? shot.dst : `${shot.dst}.webp`;
  save(join(ROOT, "public/aura", dstName), b64(shot.webpB64));
  const base = dstName.replace(/\.webp$/, "");
  save(`${OUT_DIR}/${base}-dark.png`, b64(shot.darkB64));
  save(`${OUT_DIR}/${base}-light.png`, b64(shot.lightB64));
  save(`${OUT_DIR}/${base}-grid.png`, b64(shot.gridB64));
  save(`${OUT_DIR}/${base}-metrics.json`, JSON.stringify({ ...metrics, srcContent: shot.srcContent }, null, 2));
  console.log(`wrote public/aura/${dstName} + evidence previews (${base}-dark/-light/-grid.png)`);
  await browser.close();
} finally {
  vite.kill();
}
