// 7i: create gem-emerald.png by hue-shifting gem-sapphire.png to emerald green
// (alpha + geometry untouched), then render a labelled sheet of all seven gems.
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const GEMS = ["ruby", "amber", "emerald", "aqua", "sapphire", "amethyst", "clear"];
const EMERALD_HUE = 152; // target mean hue (deg)

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();

const files = {};
for (const g of GEMS) {
  const p = `public/aura/gem-${g}.png`;
  files[g] = existsSync(p) ? readFileSync(p).toString("base64") : null;
}
files.__sapphireSrc = readFileSync("public/aura/gem-sapphire.png").toString("base64");

const out = await page.evaluate(async ({ files, EMERALD_HUE, GEMS }) => {
  const load = (b64) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = "data:image/png;base64," + b64; });
  const src = await load(files.__sapphireSrc);
  const cv = document.createElement("canvas"); cv.width = src.width; cv.height = src.height;
  const g = cv.getContext("2d"); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  const hsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, df = mx - mn;
    const s = df === 0 ? 0 : df / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (df) { if (mx === r) h = 60 * (((g - b) / df) % 6); else if (mx === g) h = 60 * ((b - r) / df + 2); else h = 60 * ((r - g) / df + 4); }
    return [(h + 360) % 360, s, l];
  };
  const rgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return t.map((v) => Math.round((v + m) * 255));
  };
  // measure the sapphire's mean hue over saturated pixels
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 80) continue;
    const [h, s] = hsl(d[i], d[i + 1], d[i + 2]);
    if (s < 0.2) continue;
    sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); n++;
  }
  const meanH = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
  const shift = EMERALD_HUE - meanH;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
    const [r, gg, b] = rgb((h + shift + 360) % 360, s, l);
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
  const emeraldB64 = cv.toDataURL("image/png").split(",")[1];

  // labelled sheet of all seven gems on the app's dark background
  const sheet = document.createElement("canvas");
  const cell = 150; sheet.width = cell * GEMS.length; sheet.height = 190;
  const sg = sheet.getContext("2d");
  sg.fillStyle = "#14161c"; sg.fillRect(0, 0, sheet.width, sheet.height);
  const emeraldImg = await load(emeraldB64);
  for (let i = 0; i < GEMS.length; i++) {
    const im = GEMS[i] === "emerald" ? emeraldImg : await load(files[GEMS[i]]);
    const x = i * cell + (cell - im.width) / 2, y = 30 + (110 - im.height) / 2;
    sg.imageSmoothingEnabled = false;
    sg.drawImage(im, x, y);
    sg.fillStyle = "#aab"; sg.font = "13px sans-serif"; sg.textAlign = "center";
    sg.fillText(GEMS[i], i * cell + cell / 2, 175);
  }
  return { emeraldB64, sheetB64: sheet.toDataURL("image/png").split(",")[1], srcHue: meanH.toFixed(1), shift: shift.toFixed(1), w: src.width, h: src.height };
}, { files, EMERALD_HUE, GEMS });

writeFileSync("public/aura/gem-emerald.png", Buffer.from(out.emeraldB64, "base64"));
writeFileSync("docs/baselines/ascended-7i/7i-gem-sheet.png", Buffer.from(out.sheetB64, "base64"));
console.log(`sapphire mean hue ${out.srcHue} -> emerald (shift ${out.shift}deg), ${out.w}x${out.h}`);
console.log("wrote public/aura/gem-emerald.png + docs/baselines/ascended-7i/7i-gem-sheet.png");
await browser.close();
