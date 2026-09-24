import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
await page.goto("http://127.0.0.1:5173/?auras=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
  const res = {};
  for (const mode of ["body", "circle"]) {
    const cv = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: "crownfall", w: 128, h: mode === "body" ? 164 : 141, mode, ringR: 40.7, figure: mode === "body" ? "/avatars/E.webp" : undefined });
    for (let f = 0; f < 720; f++) inst.frame(1 / 60);
    res[mode] = { bolts: inst.boltsFired, flashes: inst.flashes };
  }
  return res;
});
console.log(JSON.stringify(out));
await browser.close();
