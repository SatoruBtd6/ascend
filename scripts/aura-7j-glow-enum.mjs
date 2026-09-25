// Enumerate how the effect test classifies nullpoint's glow field.
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
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => import("/src/auras/AuraCanvas.jsx").then((m) => { if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf); m.AuraLoop.raf = null; m.AuraLoop.set.clear(); window.__mod = m; }));

const res = await page.evaluate(async () => {
  const mod = window.__mod;
  const gal = await import("/src/auras/devGallery.jsx");
  const { specFields, cloneSpec } = await import("/src/auras/specFormat.js");
  const ORIGINAL = cloneSpec(mod.AURA_FX.nullpoint);
  const all = specFields(ORIGINAL).map((f) => f.path.join("."));
  const fig = gal.editorFields(ORIGINAL, "body").map((f) => f.path.join("."));
  const ring = gal.editorFields(ORIGINAL, "circle").map((f) => f.path.join("."));
  const visible = new Set([...fig, ...ring]);
  const hidden = specFields(ORIGINAL).filter((f) => f.path[2] !== "circle" && f.path[2] !== "body" && f.path[0] !== "circle" && f.path[0] !== "body" && !visible.has(f.path.join("."))).map((f) => f.path.join("."));
  return {
    glowInSpecFields: all.includes("glow"),
    glowInFigure: fig.includes("glow"),
    glowInRing: ring.includes("glow"),
    glowInHidden: hidden.includes("glow"),
    hidden,
    fieldBounds: gal.fieldBounds ? gal.fieldBounds(["glow"], undefined, 0.66) : null,
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
