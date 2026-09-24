import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
let chromium;
for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
  if (!existsSync(join(dir, "index.js"))) continue;
  try { const m = await import(pathToFileURL(join(dir, "index.js")).href); chromium = m.chromium || m.default?.chromium; } catch {}
  if (chromium) break;
}
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 700, height: 700 } })).newPage();
await page.goto("http://127.0.0.1:5173/?auras=1", { waitUntil: "domcontentloaded" });
const info = await page.evaluate(() => {
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#0B0F17";
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:141px;height:141px";
  document.body.appendChild(wrap);
  const size = 76, ringR = 40.8, face = { x: 212, y: 55, half: 24 };
  const clip = document.createElement("div");
  clip.style.cssText = "width:76px;height:76px;border-radius:50%;overflow:hidden;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1";
  const img = document.createElement("img");
  img.src = "/avatars/E.webp";
  const k = (size * 0.62) / (face.half * 2);
  img.style.cssText = `width:${424 * k}px;height:${568 * k}px;position:absolute;left:${size / 2 - face.x * k}px;top:${size * (0.5 - 0.16 * ringR / size) - face.y * k}px`;
  clip.appendChild(img);
  wrap.appendChild(clip);
  return { k, iw: 424 * k, ih: 568 * k, left: size / 2 - face.x * k, top: size * (0.5 - 0.16 * ringR / size) - face.y * k, clipRect: clip.getBoundingClientRect().toJSON(), imgRect: img.getBoundingClientRect().toJSON(), complete: img.complete, nw: img.naturalWidth };
});
console.log(JSON.stringify(info, null, 1));
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: "docs/baselines/ascended-7i/_dbg-photofix.png" });
await browser.close();
