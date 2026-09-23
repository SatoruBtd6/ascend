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
const outDir = join(process.cwd(), "tmp-diag", "aura-evidence");
mkdirSync(outDir, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const context = await browser.newContext({ viewport: { width: 980, height: 420 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const flameSpec = (on) => ({
  glow: 0.15,
  layers: on ? [{
    k: "orbit", n: 1, shape: "flame", r: [0, 0], w: [0, 0], sz: [13, 13], a: 0.96,
    tongues: 6, c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], flicker: 0.24, shimmerN: 3,
    embers: { n: 10, sp: [16, 32], life: [0.6, 1.1], sz: [0.8, 1.5], sway: 8, a: 0.8 },
  }] : [],
});

try {
  await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
  await page.evaluate(async (spec) => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AuraLoop.set.forEach((inst) => renderer.AuraLoop.remove(inst));
    renderer.AURA_FX.flamepartc = spec;
    document.body.innerHTML = `<div style="min-height:100vh;background:#090d14;color:white;display:grid;place-items:center;font:13px system-ui"><div><div style="display:flex;gap:18px;align-items:end" id="flameFrames"></div><div style="margin-top:12px;text-align:center;color:#9fb0c8">procedural flame · same seeded tongue set at four times</div></div></div>`;
    let randomState = 0x7f2a11;
    Math.random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
    const times = [0.1, 0.34, 0.58, 0.82];
    for (const t of times) {
      randomState = 0x7f2a11;
      const cell = document.createElement("div");
      cell.innerHTML = `<div style="position:relative;width:200px;height:200px"><canvas></canvas></div><div style="margin-top:6px;text-align:center">t=${t.toFixed(2)}s</div>`;
      document.getElementById("flameFrames").append(cell);
      const inst = renderer.makeAura(cell.querySelector("canvas"), { aura: "flamepartc", w: 200, h: 200, mode: "circle", ringR: 62 });
      for (let i = 0; i < Math.round(t * 30); i += 1) inst.frame(1 / 30);
    }
    window.__flameEvidence = { frames: times.length, spec };
  }, flameSpec(true));
  const shot = join(outDir, "flame-frames.png");
  await page.screenshot({ path: shot, fullPage: true });

  const makeSingle = (on) => page.evaluate(async (specValue) => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AuraLoop.set.forEach((inst) => renderer.AuraLoop.remove(inst));
    renderer.AURA_FX.flameperf = specValue;
    document.body.innerHTML = "";
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const inst = renderer.makeAura(canvas, { aura: "flameperf", w: 200, h: 200, mode: "circle", ringR: 62 });
    inst.visible = true;
    renderer.AuraLoop.add(inst);
    window.__flamePerfInst = inst;
    return true;
  }, flameSpec(on));

  await makeSingle(false);
  await page.waitForTimeout(7000);
  const flameOff = await page.evaluate(() => ({ ...window.__auraGalleryHud }));
  await makeSingle(true);
  await page.waitForTimeout(7000);
  const flameOn = await page.evaluate(() => ({ ...window.__auraGalleryHud }));
  const evidence = await page.evaluate(() => window.__flameEvidence);
  console.log(JSON.stringify({ screenshot: shot, evidence, flameOff, flameOn }, null, 2));
} finally {
  await browser.close();
}
