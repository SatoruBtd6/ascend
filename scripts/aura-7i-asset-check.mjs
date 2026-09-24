// 7i Part 0 asset check: verifies the worn-piece WebPs are real RGBA WebP
// with fully transparent corners (phone downloads can flatten to JPEG).
// Reports dimensions, byte size, alpha flag, and the four corner alphas.
// Usage: node scripts/aura-7i-asset-check.mjs [dir]   (default public/aura)
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const dir = process.argv[2] || join(process.cwd(), "public", "aura");
const FILES = ["hat-straw.webp", "blindfold.webp", "hair-white.webp", "robe-ledger.webp", "mask-ledger.webp"];

// WebP container: RIFF....WEBP then chunks. VP8X flag bit 0x10 = alpha.
// VP8L is always RGBA. Plain VP8 (lossy) has no alpha.
function header(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return { ok: false };
  const tag = buf.toString("ascii", 12, 16);
  if (tag === "VP8X") {
    const flags = buf[20];
    return { ok: true, fmt: "VP8X/" + buf.toString("ascii", 30, 34).trim(), w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: !!(flags & 0x10) };
  }
  if (tag === "VP8L") {
    const v = buf.readUInt32LE(21);
    return { ok: true, fmt: "VP8L", w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, alpha: true };
  }
  if (tag === "VP8 ") {
    const w = buf.readUInt16LE(26) & 0x3fff, h = buf.readUInt16LE(28) & 0x3fff;
    return { ok: true, fmt: "VP8", w, h, alpha: false };
  }
  return { ok: false, fmt: tag };
}

const files = FILES.map((name) => {
  const p = join(dir, name);
  if (!existsSync(p)) return { name, missing: true };
  const buf = readFileSync(p);
  return { name, bytes: buf.length, hdr: header(buf), b64: buf.toString("base64") };
});

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
for (const f of files) {
  if (f.missing) { console.log(`${f.name}: MISSING`); continue; }
  const px = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin]));
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const g = cv.getContext("2d");
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    const at = (x, y) => d[(y * bmp.width + x) * 4 + 3];
    let transparent = 0, total = bmp.width * bmp.height;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) transparent++;
    return { w: bmp.width, h: bmp.height, corners: [at(0, 0), at(bmp.width - 1, 0), at(0, bmp.height - 1), at(bmp.width - 1, bmp.height - 1)], transparent, total };
  }, f.b64);
  const h = f.hdr;
  const dimOk = h.ok && h.w === px.w && h.h === px.h;
  const cornersOk = px.corners.every((a) => a === 0);
  const rgbaOk = h.ok && h.alpha && px.transparent > 0;
  const verdict = h.ok && dimOk && cornersOk && rgbaOk ? "OK" : "FAIL";
  console.log(`${f.name}: ${verdict} | ${px.w}x${px.h} | ${f.bytes} B | fmt=${h.fmt || "?"} alphaFlag=${h.alpha} transparentPx=${px.transparent}/${px.total} | cornerAlpha=[${px.corners.join(",")}]${dimOk ? "" : ` | hdr ${h.w}x${h.h} != decoded ${px.w}x${px.h}`}`);
}
await browser.close();
