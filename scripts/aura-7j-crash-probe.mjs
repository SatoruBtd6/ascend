// Reproduce the layers.0.n crash on fallenlight/ossuary under new code.
// Usage: node scripts/aura-7j-crash-probe.mjs <base>
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
  return (await import("playwright")).chromium;
}
const base = process.argv[2];
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
const res = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const out = [];
  for (const aura of ["fallenlight", "ossuary"]) {
    const fx = mod.AURA_FX[aura];
    for (const n of [0, 1, 200]) {
      const old = fx.layers[0].n; fx.layers[0].n = n;
      const cv = document.createElement("canvas"); cv.width = 141; cv.height = 141;
      const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "body", ringR: 141 / 3.456, overCanvas: null, figure: "/avatars/E.webp" });
      try { for (let i = 0; i < 30; i++) inst.frame(1 / 60); out.push(`${aura} n=${n} ok`); }
      catch (e) { out.push(`${aura} n=${n} THREW: ${e.message}\n${(e.stack || "").split("\n").slice(0, 4).join("\n")}`); }
      fx.layers[0].n = old;
    }
  }
  return out;
});
console.log(res.join("\n"));
await browser.close();
