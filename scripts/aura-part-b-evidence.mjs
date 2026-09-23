import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
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
const tmpDir = join(process.cwd(), "public", ".tmp-frames");
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });
const asset = join(tmpDir, "shadow-test.svg");
writeFileSync(asset, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M64 12 C75 30 98 28 112 18 C105 38 111 55 120 70 C98 68 84 78 76 96 C70 110 58 110 52 96 C44 78 30 68 8 70 C17 55 23 38 16 18 C30 28 53 30 64 12 Z" fill="#7DF9FF"/>
  <circle cx="64" cy="64" r="18" fill="#120A24"/>
</svg>`);

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const context = await browser.newContext({ viewport: { width: 900, height: 520 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const layer = (shadow) => ({
  k: "orbit", n: 1, shape: "img", src: "/.tmp-frames/shadow-test.svg",
  r: [0, 0], w: [0, 0], sz: [1.45, 1.45], a: 1, blend: "source-over",
  rot: 0.08, breathe: 1, wobble: 0.04,
  ...(shadow ? { shadow: { rate: 28, max: 24, anchors: 48, life: [1.1, 1.7], sp: [5, 14], sz: [3, 7], c: "#B26BFF", a: 0.7, jit: 0.25 } } : {}),
});
const spec = (shadow) => ({ glow: 0, layers: [layer(shadow)] });

try {
  await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
  await page.evaluate(async (specOn) => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AURA_FX.shadowtest = specOn;
    document.body.innerHTML = `<div style="min-height:100vh;background:#090d14;color:white;display:grid;place-items:center;font:14px system-ui"><div><div style="position:relative;width:320px;height:320px;margin:0 auto"><canvas></canvas></div><div style="margin-top:12px;text-align:center">temporary image layer · 24 max shadow wisps</div></div></div>`;
    const canvas = document.querySelector("canvas");
    const inst = renderer.makeAura(canvas, { aura: "shadowtest", w: 320, h: 320, mode: "circle", ringR: 100 });
    await new Promise((resolve) => {
      const check = () => renderer._auraImageCache.get("/.tmp-frames/shadow-test.svg")?.ready ? resolve() : setTimeout(check, 50);
      check();
    });
    for (let i = 0; i < 75; i += 1) inst.frame(1 / 30);
    window.__shadowEvidence = { wisps: inst.shadowWisps, anchors: renderer._auraImageCache.get("/.tmp-frames/shadow-test.svg")?.edgeAnchors?.length || 0 };
  }, spec(true));
  const shot = join(outDir, "shadow-emission.png");
  await page.screenshot({ path: shot, fullPage: true });

  const makeSingle = (shadow) => page.evaluate(async (specValue) => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AuraLoop.set.forEach((inst) => renderer.AuraLoop.remove(inst));
    renderer.AURA_FX.shadowperf = specValue;
    document.body.innerHTML = "";
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const inst = renderer.makeAura(canvas, { aura: "shadowperf", w: 200, h: 200, mode: "circle", ringR: 62 });
    inst.visible = true;
    renderer.AuraLoop.add(inst);
    window.__shadowPerfInst = inst;
    return true;
  }, spec(shadow));

  await makeSingle(false);
  await page.waitForTimeout(7000);
  const shadowsOff = await page.evaluate(() => ({ ...window.__auraGalleryHud, wisps: window.__shadowPerfInst.shadowWisps }));
  await makeSingle(true);
  await page.waitForTimeout(7000);
  const shadowsOn = await page.evaluate(() => ({ ...window.__auraGalleryHud, wisps: window.__shadowPerfInst.shadowWisps }));
  const evidence = await page.evaluate(() => window.__shadowEvidence);
  console.log(JSON.stringify({ screenshot: shot, evidence, shadowsOff, shadowsOn }, null, 2));
} finally {
  await browser.close();
  rmSync(asset, { force: true });
  try { rmdirSync(tmpDir); } catch {}
}
