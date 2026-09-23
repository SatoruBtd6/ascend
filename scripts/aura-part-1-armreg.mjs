// Measure alpha bounding boxes + shoulder-region centroids of the arm frames
// to derive frameOffsets that register arm-rest (512x422) into the
// flex/mid 476x443 coordinate space.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "domcontentloaded" });
const res = await page.evaluate(async () => {
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const out = {};
  for (const name of ["arm-rest", "arm-mid", "arm-flex"]) {
    const img = await load(`/aura/${name}.webp`);
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, n = 0;
    // shoulder = opaque pixels in the left 30% of the image
    let sx = 0, sy = 0, sn = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const a = d[(y * c.width + x) * 4 + 3];
        if (a < 40) continue;
        n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < c.width * 0.3) { sx += x; sy += y; sn++; }
      }
    }
    out[name] = {
      w: c.width, h: c.height,
      bbox: [minX, minY, maxX, maxY],
      shoulder: sn ? [sx / sn, sy / sn] : null,
      cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
    };
  }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
