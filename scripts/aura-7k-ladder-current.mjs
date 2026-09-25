// Dumps per-aura ring-view (circle-merged) particle sz -> px-on-76px-avatar + glow + layers for the 7k ladder.
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await (await b.newContext()).newPage();
await p.goto("http://localhost:5174/?auras=1", { waitUntil: "domcontentloaded" });
const rows = await p.evaluate(async () => {
  const [m, cat] = await Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]);
  const { mergeViewSpec, mergeViewLayer } = await import("/src/auras/specFormat.js");
  const ids = ["ember", "tide", "sigil", "steadybreath", "iaidraw", "storm", "smolder", "stormborn", "dawn", "wanderer", "wyrm", "frost", "abyss", "rust", "thunder", "hollow", "deep", "magma", "plague", "sand", "void", "glassfire", "stormstep", "zeropoint", "ninetail", "vendetta", "ascended", "wheel", "brandmark", "carve", "yogurt", "chud"];
  return ids.map((id) => {
    const a = cat.AURAS.find((x) => x.id === id);
    const fx = mergeViewSpec(m.AURA_FX[id], "circle");
    const layers = (fx.layers || []).map((L) => {
      const M = mergeViewLayer(L, "circle");
      const szm = Array.isArray(M.sz) ? (M.sz[0] + M.sz[1]) / 2 : M.sz || 0;
      return { k: M.k, sh: M.shape || M.src || "img", n: M.n || 0, szm: +szm.toFixed(2) };
    });
    const N = layers.reduce((s, L) => s + L.n, 0);
    const wsz = layers.reduce((s, L) => s + L.szm * L.n, 0) / (N || 1);
    return { id, tier: a?.tier || a?.group, glow: fx.glow, layers: layers.length, N, px: +(wsz * 0.92).toFixed(1), detail: layers.map((L) => `${L.sh}x${L.n}@${L.szm}`).join(" ") };
  });
});
for (const r of rows) console.log(JSON.stringify(r));
await b.close();
