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
const baseline = process.argv[3] || null;
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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });

async function throttledPage(url) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(url, { waitUntil: "networkidle" });
  return page;
}

async function measureEmber(url) {
  const page = await throttledPage(`${url}/?auras=1`);
  await page.evaluate(async () => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AuraLoop.set.forEach((inst) => renderer.AuraLoop.remove(inst));
    document.body.innerHTML = "";
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const inst = renderer.makeAura(canvas, { aura: "ember", w: 200, h: 200, mode: "circle", ringR: 62 });
    inst.visible = true;
    renderer.AuraLoop.add(inst);
  });
  await page.waitForTimeout(7000);
  const hud = await page.evaluate(() => ({ ...window.__auraGalleryHud }));
  await page.close();
  return hud;
}

try {
  const page = await throttledPage(`${base}/?auras=1`);
  await page.evaluate(async () => {
    const gallerySource = await fetch("/src/auras/devGallery.jsx").then((res) => res.text());
    const rendererPath = gallerySource.match(/from "(\/src\/auras\/AuraCanvas[^"]*)"/)[1];
    const renderer = await import(rendererPath);
    renderer.AuraLoop.set.forEach((inst) => renderer.AuraLoop.remove(inst));
    renderer.AURA_FX.shadowsize = {
      glow: 0,
      layers: [{ k: "orbit", n: 1, shape: "img", src: "/.tmp-frames/shadow-test.svg", r: [0, 0], w: [0, 0], sz: [1.15, 1.15], a: 1, blend: "source-over", shadow: { rate: 1000, max: 24, anchors: 48, life: [1.1, 1.7], sp: [18, 42], sz: [3, 7], c: "#B26BFF", a: 0.85, blend: "screen", jit: 0.25 } }],
    };
    document.body.innerHTML = `<div style="min-height:100vh;background:#090d14;color:white;display:grid;place-items:center;font:13px system-ui"><div><div id="sizes" style="display:flex;gap:24px;align-items:end"></div><div style="margin-top:12px;text-align:center;color:#9fb0c8">size-scaled shadow wisps · 24 configured max</div></div></div>`;
    const sizes = [32, 76, 88, 160];
    const instances = [];
    for (const size of sizes) {
      const cell = document.createElement("div");
      cell.innerHTML = `<div style="position:relative;width:${size}px;height:${size}px"><canvas></canvas></div><div style="margin-top:6px;text-align:center">${size}px</div>`;
      document.getElementById("sizes").append(cell);
      const canvas = cell.querySelector("canvas");
      instances.push({ size, canvas, inst: renderer.makeAura(canvas, { aura: "shadowsize", w: size, h: size, mode: "circle", ringR: size / 2.7 }) });
    }
    await new Promise((resolve) => {
      const check = () => renderer._auraImageCache.get("/.tmp-frames/shadow-test.svg")?.ready ? resolve() : setTimeout(check, 50);
      check();
    });
    for (const row of instances) row.inst.frame(1);
    window.__shadowSizeEvidence = instances.map(({ size, canvas, inst }) => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let wispPixels = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 2] > data[i + 1] && data[i] > data[i + 1]) wispPixels += 1;
      return { size, wisps: inst.shadowWisps, wispPixels };
    });
  });
  const shadowShot = join(outDir, "shadow-size-scaled.png");
  await page.screenshot({ path: shadowShot, fullPage: true });
  const shadowSizeEvidence = await page.evaluate(() => window.__shadowSizeEvidence);

  await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
  await page.locator("button").filter({ hasText: "Black Sun" }).first().click();
  await page.locator('[data-control-group="frame-animation"]').first().waitFor();
  await page.getByRole("button", { name: "Enable frame cycle" }).first().click();
  await page.getByRole("button", { name: "Add frame" }).first().click();
  await page.getByRole("button", { name: "Add frame" }).first().click();
  await page.getByLabel("Shadow wisps").first().check();
  await page.getByLabel("Animated colours").first().check();
  await page.getByRole("button", { name: "Add flame layer" }).click();
  await page.locator('[data-control-group="flame"]').waitFor();
  const controlShots = {};
  for (const [name, selector] of Object.entries({
    frameAnimation: '[data-control-group="frame-animation"]',
    shadowControls: '[data-control-group="shadow-emission"]',
    ringCycle: '[data-control-group="ring-cycle-0"]',
    flameControls: '[data-control-group="flame"]',
  })) {
    const path = join(outDir, `${name}.png`);
    await page.locator(selector).first().screenshot({ path });
    controlShots[name] = path;
  }
  await page.getByText("Show shapes", { exact: true }).click();
  await page.locator('[data-control-group="shape-sheet"]').waitFor();
  const shapeSheet = join(outDir, "shape-sheet.png");
  await page.locator('[data-control-group="shape-sheet"]').screenshot({ path: shapeSheet });

  const currentHud = await measureEmber(base);
  const baselineHud = baseline ? await measureEmber(baseline) : null;
  console.log(JSON.stringify({ shadowShot, shadowSizeEvidence, controlShots, shapeSheet, baselineHud, currentHud }, null, 2));
} finally {
  await browser.close();
  rmSync(asset, { force: true });
  try { rmdirSync(tmpDir); } catch {}
}
