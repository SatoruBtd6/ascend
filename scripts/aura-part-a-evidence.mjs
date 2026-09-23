import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
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

const base = process.argv[2] || "http://127.0.0.1:5180";
const outDir = join(process.cwd(), ".tmp-aura-evidence");
mkdirSync(outDir, { recursive: true });
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
await page.getByText("Show shapes", { exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(outDir, "shape-sheet.png") });

await page.evaluate(async () => {
  const renderer = await import("/src/auras/AuraCanvas.jsx");
  const catalog = await import("/src/auras/catalog.js");
  renderer.AURA_FX.armtest = {
    spd: 1,
    glow: 0.3,
    layers: [{
      k: "orbit", n: 1, shape: "img",
      frames: [
        "/.tmp-frames/arm-rest.webp",
        "/.tmp-frames/arm-mid.webp",
        "/.tmp-frames/arm-flex.webp",
      ],
      frameDuration: 0.12,
      fadeLen: 0,
      frameMode: "pingpong",
      r: [0, 0], w: [0, 0], sz: [1.4, 1.4], a: 1, blend: "source-over",
    }],
  };
  catalog.AURAS.push({ id: "armtest", name: "Arm test", group: "dev", colors: ["#FFD447", "#FFFFFF"] });
  document.body.innerHTML = `<div style="min-height:100vh;background:#090d14;color:white;display:grid;grid-template-columns:repeat(4,220px);gap:24px;align-items:center;justify-content:center;padding:40px;font:14px system-ui"></div>`;
  const grid = document.body.firstElementChild;
  window.__armInstances = [];
  for (const [label, seconds] of [["rest", 0.01], ["mid", 0.13], ["flex", 0.25], ["mid return", 0.37]]) {
    const cell = document.createElement("div");
    cell.innerHTML = `<div style="position:relative;width:200px;height:200px"><canvas></canvas><div style="position:absolute;inset:0;display:grid;place-items:center;color:#64748b">ARM</div></div><div>${label} · ${seconds}s</div>`;
    grid.append(cell);
    const canvas = cell.querySelector("canvas");
    const inst = renderer.makeAura(canvas, { aura: "armtest", w: 200, h: 200, mode: "circle", ringR: 62 });
    window.__armInstances.push({ inst, seconds });
  }
  const sources = renderer.AURA_FX.armtest.layers[0].frames;
  await new Promise((resolve) => {
    const check = () => sources.every((src) => { const rec = renderer._auraImageCache.get(src); return rec?.ready || rec?.failed; }) ? resolve() : setTimeout(check, 50);
    check();
  });
  for (const { inst, seconds } of window.__armInstances) {
    inst.frame(0.001);
    inst.frame(seconds);
  }
});
await page.screenshot({ path: join(outDir, "arm-pingpong.png"), fullPage: true });
await browser.close();
console.log(JSON.stringify({ shapeSheet: join(outDir, "shape-sheet.png"), armPingpong: join(outDir, "arm-pingpong.png") }));
