// aura-asset-key-chain — one-off magenta key/despill/trim for
// public/aura/chain-heavy-src.jpg -> public/aura/chain-heavy.webp (tall strand,
// alpha). Flat-magenta key in hue/sat space (JPEG fringing handled by the same
// despill as blacksun's ring). Trims the source's cropped ends: top ends on a
// whole link; the bottom is cut deliberately mid-link for a snapped tail.
// Prints the row-alpha profile first (--probe only prints, no write).
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { REPO, CURR_URL, CURR_PORT, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

const SRC = "aura/chain-heavy-src.jpg";
const DST = join(REPO, "public", "aura", "chain-heavy.webp");
const DELETE_SRC = process.argv.includes("--rm-src");
const PROBE = process.argv.includes("--probe");
// vertical cut rows, chosen from --probe profile output
const TOP_CUT = Number(process.argv.find((a) => a.startsWith("--top="))?.split("=")[1] ?? 0);
const BOT_CUT = Number(process.argv.find((a) => a.startsWith("--bot="))?.split("=")[1] ?? 9999);
const BOT_SNAP = Number(process.argv.find((a) => a.startsWith("--snap="))?.split("=")[1] ?? 0); // slant-erase depth px
const OUT_H = 640; // output strand height (chain.webp is 512 tall)
const QUALITY = 0.82;

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

const res = await page.evaluate(async ({ SRC, TOP_CUT, BOT_CUT, BOT_SNAP, OUT_H, QUALITY, PROBE }) => {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `/${SRC}`; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement("canvas"); c0.width = W; c0.height = H;
  const g0 = c0.getContext("2d", { willReadFrequently: true });
  g0.drawImage(img, 0, 0);
  const id0 = g0.getImageData(0, 0, W, H);
  const d = id0.data;

  const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
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
    // flat magenta ~#E14AD2 (hue ~306, high sat, high val); steel is desat/dark.
    const hueIn = h >= 288 && h <= 340 ? (h < 296 ? ramp(h, 288, 296) : h > 334 ? 1 - ramp(h, 334, 340) : 1) : 0;
    const satG = ramp(s, 0.18, 0.38);
    const valG = ramp(v, 0.12, 0.28);
    const k = hueIn * satG * valG;
    if (k >= 1) keyed++;
    d[i + 3] = Math.round(255 * (1 - k));
    // despill: remove magenta excess on surviving pixels (same as ring keyer)
    const spill = Math.min(r, b) - g;
    if (spill > 0) { d[i] = r - spill; d[i + 2] = b - spill; }
  }

  // per-row painted count -> pinch list (local minima = necks between links)
  const rowA = new Array(H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) rowA[y]++;
  const pinches = [];
  for (let y = 8; y < H - 8; y++) {
    let isMin = true;
    for (let o = -6; o <= 6; o++) if (rowA[y + o] < rowA[y]) { isMin = false; break; }
    if (isMin && rowA[y] > 0 && rowA[y] < 60) pinches.push({ y, n: rowA[y] });
  }

  if (PROBE) {
    return { W, H, keyed, pinches, rowA: rowA.filter((_, y) => y % 16 === 0), maxRow: Math.max(...rowA) };
  }

  // apply vertical cuts: everything above TOP_CUT / below BOT_CUT goes clear
  for (let y = 0; y < TOP_CUT; y++) for (let x = 0; x < W; x++) d[(y * W + x) * 4 + 3] = 0;
  for (let y = BOT_CUT; y < H; y++) for (let x = 0; x < W; x++) d[(y * W + x) * 4 + 3] = 0;
  // snapped tail: slant-erase a wedge over BOT_SNAP px so the last link ends
  // torn, not scissor-flat
  if (BOT_SNAP > 0) {
    const y0s = BOT_CUT - BOT_SNAP;
    for (let y = y0s; y < BOT_CUT; y++) {
      const t = (y - y0s) / BOT_SNAP; // 0..1 down the wedge
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const slope = t * (0.55 + 0.9 * (x / W)); // diagonal-ish tear
        if (d[i + 3] > 0) d[i + 3] = Math.round(d[i + 3] * Math.max(0, Math.min(1, 1 - slope * 1.6)));
      }
    }
  }

  // bbox of remaining alpha + magenta residue audit
  let x0 = W, y0 = H, x1 = 0, y1 = 0, pink = 0, opaque = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = d[i + 3];
    if (a > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (a > 200) {
        opaque++;
        const [h, s, v] = hsv(d[i], d[i + 1], d[i + 2]);
        if (h > 288 && h < 345 && s > 0.25 && v > 0.15) pink++;
      }
    }
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  // tight crop with small pad, scaled so height -> OUT_H
  const pad = 4;
  const cw2 = cw + pad * 2, ch2 = ch + pad * 2;
  const c2 = document.createElement("canvas"); c2.width = cw2; c2.height = ch2;
  const g2 = c2.getContext("2d");
  g2.putImageData(id0, pad - x0, pad - y0);
  const outW = Math.round((cw2 / ch2) * OUT_H);
  const c3 = document.createElement("canvas"); c3.width = outW; c3.height = OUT_H;
  const g3 = c3.getContext("2d"); g3.imageSmoothingQuality = "high";
  g3.drawImage(c2, 0, 0, outW, OUT_H);
  const webp = c3.toDataURL("image/webp", QUALITY);

  // previews: keyed over near-black and over light-grey (fringe check)
  const mkPrev = (bg) => {
    const c4 = document.createElement("canvas"); c4.width = outW; c4.height = OUT_H;
    const g4 = c4.getContext("2d"); g4.fillStyle = bg; g4.fillRect(0, 0, outW, OUT_H);
    g4.drawImage(c3, 0, 0);
    return c4.toDataURL("image/png");
  };
  return { W, H, keyed, opaque, pink, x0, y0, x1, y1, cw, ch, outW, webp, dark: mkPrev("#0A0A0E"), light: mkPrev("#E9EDF4") };
}, { SRC, TOP_CUT, BOT_CUT, BOT_SNAP, OUT_H, QUALITY, PROBE });

if (PROBE) {
  console.log(`src ${res.W}x${res.H}  keyed=${res.keyed}  maxRow=${res.maxRow}`);
  console.log("pinches (row: alphaCount):");
  console.log(res.pinches.map((p) => `${p.y}:${p.n}`).join("  "));
  console.log("rowA every 16:", res.rowA.map((n, i) => `${i * 16}:${n}`).join(" "));
  await browser.close(); stopServers(); process.exit(0);
}

const outDir = evidenceDir("aura-asset-key");
writeFileSync(join(outDir, "chain-heavy-dark.png"), Buffer.from(res.dark.split(",")[1], "base64"));
writeFileSync(join(outDir, "chain-heavy-light.png"), Buffer.from(res.light.split(",")[1], "base64"));
const webpBuf = Buffer.from(res.webp.split(",")[1], "base64");
writeFileSync(DST, webpBuf);
if (DELETE_SRC && existsSync(join(REPO, "public", SRC))) unlinkSync(join(REPO, "public", SRC));

console.log(`src ${res.W}x${res.H}  crop=(${res.x0},${res.y0})-(${res.x1},${res.y1})  ${res.cw}x${res.ch} -> ${res.outW}x${OUT_H}`);
console.log(`keyed ${res.keyed}px | opaque ${res.opaque} | magenta residue on alpha edge: ${res.pink}`);
console.log(`aspect ${(res.cw / res.ch).toFixed(3)} (chain.webp 0.197) | sz·rx = painted height; width = ${(res.cw / res.ch).toFixed(2)}·sz·rx`);
console.log(`wrote ${DST} ${(webpBuf.length / 1024).toFixed(1)} KB | previews ${outDir}${DELETE_SRC ? " | src DELETED" : " | src kept (--rm-src to delete)"}`);
await browser.close(); stopServers(); process.exit(0);
