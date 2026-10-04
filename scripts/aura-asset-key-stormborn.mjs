// aura-asset-key-stormborn — keys the three stormborn cloud sprites off their
// flat magenta background into public/aura/stormborn-cloud-*.webp.
//
// Unlike the hue-membership keyers, this uses KNOWN-BACKGROUND UNMIXING: the
// bg is one flat colour, so each pixel is a blend O = M·(1−a) + C·a. Alpha is
// recovered by projecting (M−O) onto (M−anchor) for a small set of cloud
// anchor colours (chosen per-pixel by lowest residual), then C unmixed.
// Soft wispy edges keep honest alpha instead of a hard fringe.
// JPEG noise (the sources are jpg) is handled by: bg estimated from the actual
// border pixels rather than hard-coded, an alpha floor, a 3x3 median on the
// matte only, and a despill pass on recovered colour.
// Per-asset `fade` bakes a vertical alpha ramp so nothing survives below the
// ring's vertical midpoint (Brodan's note on back2's long side columns).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

const ASSETS = [
  { src: "aura/stormborn-cloud-back.jpg", dst: "stormborn-cloud-back.webp", fade: [0.60, 0.72] },
  { src: "aura/stormborn-cloud-back2.jpg", dst: "stormborn-cloud-back2.webp", fade: [0.50, 0.64] },
  { src: "aura/stormborn-cloud-front.jpg", dst: "stormborn-cloud-front.webp", fade: [0.56, 0.68] },
];
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
const outDir = evidenceDir("aura-asset-key-stormborn");

for (const { src, dst, fade } of ASSETS) {
  const res = await page.evaluate(async ({ SRC, OUT_PX, FADE }) => {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `/${SRC}`; });
    const W = img.naturalWidth, H = img.naturalHeight;
    const c0 = document.createElement("canvas"); c0.width = W; c0.height = H;
    const g0 = c0.getContext("2d", { willReadFrequently: true });
    g0.drawImage(img, 0, 0);
    const id0 = g0.getImageData(0, 0, W, H);
    const d = id0.data;

    // --- 1. estimate the flat bg from the outer border (JPEG shifts it a bit)
    const border = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x < W * 0.06 || x > W * 0.94 || y < H * 0.06 || y > H * 0.94) {
        const i = (y * W + x) * 4;
        border.push([d[i], d[i + 1], d[i + 2]]);
      }
    }
    border.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const M = border[Math.floor(border.length / 2)];

    // --- 2. cloud anchors: pixels far from bg, split by luminance into 3
    const cloud = [];
    for (let i = 0; i < d.length; i += 4) {
      const dx = d[i] - M[0], dy = d[i + 1] - M[1], dz = d[i + 2] - M[2];
      if (Math.hypot(dx, dy, dz) > 55) cloud.push([d[i], d[i + 1], d[i + 2], (d[i] + d[i + 1] + d[i + 2]) / 3]);
    }
    cloud.sort((a, b) => a[3] - b[3]);
    const meanOf = (lo, hi) => {
      const s = cloud.slice(Math.floor(cloud.length * lo), Math.floor(cloud.length * hi) || 1);
      return s.length ? [0, 1, 2].map((k) => s.reduce((a, p) => a + p[k], 0) / s.length) : null;
    };
    const anchors = [meanOf(0, 0.25), meanOf(0.3, 0.7), meanOf(0.8, 1)].filter(Boolean);
    const Ds = anchors.map((C) => { const v = [M[0] - C[0], M[1] - C[1], M[2] - C[2]]; return { v, dd: v[0] * v[0] + v[1] * v[1] + v[2] * v[2] || 1 }; });

    // --- 3. unmix per pixel: best anchor = lowest residual off the M→C ray
    const N = W * H, al = new Float32Array(N);
    for (let i = 0, px = 0; i < d.length; i += 4, px++) {
      const o = [d[i], d[i + 1], d[i + 2]];
      let best = 0, bestRes = 1e9;
      for (const { v, dd } of Ds) {
        const dm = [M[0] - o[0], M[1] - o[1], M[2] - o[2]];
        let a = (dm[0] * v[0] + dm[1] * v[1] + dm[2] * v[2]) / dd;
        a = Math.max(0, Math.min(1, a));
        const res = Math.hypot(o[0] - (M[0] - v[0] * a) * 1 - 0, 0, 0); // |O - (M - v·a)| per channel below
        const r = Math.hypot(o[0] - M[0] + v[0] * a, o[1] - M[1] + v[1] * a, o[2] - M[2] + v[2] * a);
        if (r < bestRes) { bestRes = r; best = a; }
      }
      al[px] = best < 0.055 ? 0 : best;
    }

    // --- 4. 3x3 median on alpha only (denoise the matte, keep colour crisp)
    const al2 = new Float32Array(al);
    const med = (x, y) => {
      const v = [];
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const yy = y + j, xx = x + k;
        if (xx >= 0 && xx < W && yy >= 0 && yy < H) v.push(al[yy * W + xx]);
      }
      v.sort((a, b) => a - b);
      return v[v.length >> 1];
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) al2[y * W + x] = med(x, y);

    // --- 5. recover colour + despill + optional vertical fade
    const [f0, f1] = FADE || [2, 2];
    for (let y = 0; y < H; y++) {
      const fk = f1 > f0 ? Math.max(0, Math.min(1, (f1 - y / H) / (f1 - f0))) : 1;
      for (let x = 0; x < W; x++) {
        const px = y * W + x, i = px * 4;
        const a = Math.max(0, Math.min(1, al2[px] * fk));
        if (a < 0.02) { d[i + 3] = 0; continue; }
        const t = Math.max(0.05, a);
        let cr = (d[i] - M[0] * (1 - t)) / t, cg = (d[i + 1] - M[1] * (1 - t)) / t, cb = (d[i + 2] - M[2] * (1 - t)) / t;
        // despill: pull residual magenta out of the recovered colour
        const spill = Math.min(cr, cb) - cg;
        if (spill > 0) { cr -= spill; cb -= spill; }
        // de-teal: the sources came back mint/cyan — the palette is slate/
        // gunmetal + cold blue-white. Rotate green/cyan hues (135-205 deg)
        // into steel blue (~215) while keeping value and softening sat, so
        // the bank stays in the blue-grey family.
        {
          const mx = Math.max(cr, cg, cb), mn = Math.min(cr, cg, cb), chd = mx - mn;
          if (chd > 8) {
            let hh = 0;
            if (mx === cr) hh = 60 * (((cg - cb) / chd) % 6);
            else if (mx === cg) hh = 60 * ((cb - cr) / chd + 2);
            else hh = 60 * ((cr - cg) / chd + 4);
            if (hh < 0) hh += 360;
            if (hh > 135 && hh < 205) {
              const nt = 215 + (hh - 170) * 0.2;
              const sat = (mx === 0 ? 0 : chd / mx) * 0.72;
              const C2 = sat * mx, X = C2 * (1 - Math.abs(((nt / 60) % 2) - 1)), m = mx - C2;
              let r2 = 0, g2 = 0, b2 = 0;
              if (nt < 60) { r2 = C2; g2 = X; }
              else if (nt < 120) { r2 = X; g2 = C2; }
              else if (nt < 180) { g2 = C2; b2 = X; }
              else if (nt < 240) { g2 = X; b2 = C2; }
              else if (nt < 300) { r2 = X; b2 = C2; }
              else { r2 = C2; b2 = X; }
              cr = r2 + m; cg = g2 + m; cb = b2 + m;
            }
          }
          if (cg > cb * 0.92) cg = cb * 0.92;   // safety: never let green lead
        }
        d[i] = Math.max(0, Math.min(255, cr)); d[i + 1] = Math.max(0, Math.min(255, cg)); d[i + 2] = Math.max(0, Math.min(255, cb));
        d[i + 3] = Math.round(255 * a);
      }
    }
    g0.putImageData(id0, 0, 0);

    // --- 6. stats + square out (no trim — the arch's position IS the art)
    let opaque = 0, pink = 0;
    const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn; let h = 0; if (ch > 0) { if (mx === r) h = 60 * (((g - b) / ch) % 6); else if (mx === g) h = 60 * ((b - r) / ch + 2); else h = 60 * ((r - g) / ch + 4); if (h < 0) h += 360; } return [h, mx === 0 ? 0 : ch / mx, mx / 255]; };
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 200) { opaque++; const [h2, s2, v2] = hsv(d[i], d[i + 1], d[i + 2]); if (h2 > 288 && h2 < 356 && s2 > 0.28 && v2 > 0.18) pink++; }
    }
    const c3 = document.createElement("canvas"); c3.width = c3.height = OUT_PX;
    c3.getContext("2d").drawImage(c0, 0, 0, OUT_PX, OUT_PX);
    const webp = c3.toDataURL("image/webp", 0.85);
    const c4 = document.createElement("canvas"); c4.width = c4.height = OUT_PX;
    const g4 = c4.getContext("2d");
    g4.fillStyle = "#0A0A0E"; g4.fillRect(0, 0, OUT_PX, OUT_PX);
    g4.drawImage(c3, 0, 0);
    const preview = c4.toDataURL("image/png");
    return { W, H, bg: M.map((v) => Math.round(v)), anchors: anchors.map((a) => a.map((v) => Math.round(v))), opaque, pink, webp, preview };
  }, { SRC: src, OUT_PX, FADE: fade });

  writeFileSync(join(REPO, "public", "aura", dst), Buffer.from(res.webp.split(",")[1], "base64"));
  writeFileSync(join(outDir, dst.replace(".webp", "-preview.png")), Buffer.from(res.preview.split(",")[1], "base64"));
  console.log(`${src} ${res.W}x${res.H} bg=${res.bg} anchors=${JSON.stringify(res.anchors)} opaque=${res.opaque} pink-residue=${res.pink} -> ${dst}`);
}

await browser.close();
stopServers();
