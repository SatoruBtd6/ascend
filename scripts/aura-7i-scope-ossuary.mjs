// View-scoped editing evidence: raise Ossuary's crown on the body figure only
// (a `body:` hover override on the crown layer), proving the avatar-ring photo
// stays pixel-identical. Produces a 2x2 before/after stage shot and a seeded
// pixel-diff count for both modes.
// Usage: node scripts/aura-7i-scope-ossuary.mjs [--base http://localhost:5173]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const RAISE = 0.3; // body-only crown lift: hover -0.62 -> -0.32

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 560 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([
  import("/src/auras/AuraCanvas.jsx").then((m) => {
    if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
    m.AuraLoop.raf = null; m.AuraLoop.set.clear();
    window.__mod = m;
  }),
  import("/src/auras/specFormat.js").then((m) => { window.__fmt = m; }),
]));

// ---- seeded pixel proof: identical RNG stream both runs, over composited ----
const diffs = await page.evaluate(async (RAISE) => {
  const mod = window.__mod, fmt = window.__fmt;
  let fakeT = 0;
  mod.setFlashPageClock?.(() => fakeT);
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  const snap = async (spec, mode) => {
    mod.AURA_FX.__ossuaryScope = spec;
    seed();
    const cv = document.createElement("canvas"), ov = document.createElement("canvas");
    const w = 160, h = mode === "body" ? 204 : 141;
    const inst = mod.makeAura(cv, { aura: "__ossuaryScope", w, h, mode, ringR: mode === "body" ? w / 3.2 : 40.7, overCanvas: ov, figure: mode === "body" ? "/avatars/E.webp" : undefined });
    await document.fonts.ready;
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed(); fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
    for (let f = 0; f < 120; f++) { fakeT += 1 / 60; inst.frame(1 / 60); }
    const gg = cv.getContext("2d");
    gg.setTransform(1, 0, 0, 1, 0, 0);
    gg.drawImage(ov, 0, 0);
    return cv.getContext("2d").getImageData(0, 0, w, h).data;
  };
  const baseSpec = fmt.cloneSpec(mod.AURA_FX.ossuary);
  const variant = fmt.applyScopedEdit(baseSpec, ["layers", 0, "hover"], RAISE, "body");
  const diff = async (specA, specB, mode) => {
    const a = await snap(specA, mode), b = await snap(specB, mode);
    let n = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) n++;
    return n;
  };
  const out = {
    bodyDiff: await diff(baseSpec, variant, "body"),
    ringDiff: await diff(baseSpec, variant, "circle"),
    override: variant.layers[0].body,
  };
  delete mod.AURA_FX.__ossuaryScope;
  return out;
}, RAISE);
console.log(`body override written: ${JSON.stringify(diffs.override)}`);
console.log(`body render diff: ${diffs.bodyDiff}px   ring render diff: ${diffs.ringDiff}px`);
if (diffs.ringDiff !== 0) { console.log("FAIL: ring render changed"); process.exitCode = 1; }
if (diffs.bodyDiff === 0) { console.log("FAIL: body render unchanged — override not applied"); process.exitCode = 1; }

// ---- visual before/after stage: figure 160 + photo 76 ----
const buildStage = (kind, size) => page.evaluate(async ({ kind, size }) => {
  const mod = window.__mod;
  const host = document.getElementById("stage");
  let cw, ch, ringR, mode, art;
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:grid;gap:4px;justify-items:center;flex:0 0 auto";
  const box = document.createElement("div");
  if (kind === "figure") {
    cw = Math.round(size * 0.8); ch = Math.round(size * 1.02); mode = "body"; ringR = Math.min(cw, ch) / 3.2;
    art = { src: "/avatars/E.webp", w: size * (424 / 568), h: size };
  } else {
    cw = Math.round(size * 1.45 * 1.28); ch = cw; mode = "circle"; ringR = size * 1.45 / 2.7;
    art = { src: "/avatars/E.webp", face: { x: 212, y: 55, half: 24 } };
  }
  box.style.cssText = `position:relative;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center`;
  const cv = document.createElement("canvas");
  cv.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:0`;
  box.appendChild(cv);
  if (art.face) {
    const clip = document.createElement("div");
    clip.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
    const img = document.createElement("img");
    img.src = art.src;
    const k = (size * 0.62) / (art.face.half * 2);
    img.style.cssText = `width:${424 * k}px;height:${568 * k}px;max-width:none;position:absolute;left:${size / 2 - art.face.x * k}px;top:${size * (0.5 - 0.16 * ringR / size) - art.face.y * k}px`;
    clip.appendChild(img);
    box.appendChild(clip);
    await img.decode().catch(() => {});
  } else {
    const img = document.createElement("img");
    img.src = art.src;
    img.style.cssText = `width:${art.w}px;height:${art.h}px;object-fit:cover;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
    box.appendChild(img);
    await img.decode().catch(() => {});
  }
  const cv2 = document.createElement("canvas");
  cv2.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:2;pointer-events:none`;
  box.appendChild(cv2);
  wrap.appendChild(box);
  host.appendChild(wrap);
  const inst = mod.makeAura(cv, { aura: "ossuary", w: cw, h: ch, mode, ringR, figure: mode === "body" ? art.src : undefined, overCanvas: cv2 });
  for (let tries = 0; tries < 200; tries++) {
    if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  for (let i = 0; i < 120; i++) inst.frame(1 / 60);
}, { kind, size });

await page.evaluate(() => {
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#0B0F17;display:flex;align-items:center;justify-content:center;height:100vh;font-family:ui-monospace,monospace";
  const stage = document.createElement("div");
  stage.id = "stage";
  stage.style.cssText = "display:flex;align-items:flex-end;justify-content:center;gap:36px";
  document.body.appendChild(stage);
});

const label = (text) => page.evaluate((text) => {
  const el = document.createElement("div");
  el.style.cssText = "font-size:11px;color:#8BA3C7";
  el.textContent = text;
  document.getElementById("stage").lastChild.appendChild(el);
}, text);

// before pair
await buildStage("figure", 160); await label("before — body figure 160");
await buildStage("photo", 76); await label("before — photo 76");

await page.screenshot({ path: join(OUT, "7i-scope-ossuary-before.png"), clip: { x: 0, y: 0, width: 1200, height: 560 } });

// apply the body-only crown raise to the live spec (same write the editor makes)
await page.evaluate((RAISE) => {
  const fmt = window.__fmt, mod = window.__mod;
  mod.AURA_FX.ossuary = fmt.applyScopedEdit(mod.AURA_FX.ossuary, ["layers", 0, "hover"], RAISE, "body");
}, RAISE);

await page.evaluate(() => {
  document.getElementById("stage").innerHTML = "";
});
await buildStage("figure", 160); await label("after — body figure 160 (crown raised)");
await buildStage("photo", 76); await label("after — photo 76 (unchanged)");
await page.screenshot({ path: join(OUT, "7i-scope-ossuary-after.png"), clip: { x: 0, y: 0, width: 1200, height: 560 } });

// combined 2x2 sheet for the report
await page.evaluate(() => {
  document.getElementById("stage").innerHTML = "";
});
await page.evaluate(() => {
  delete window.__mod.AURA_FX.ossuary.layers[0].body;
});
await buildStage("figure", 160); await label("before — figure");
await buildStage("photo", 76); await label("before — photo");
await page.evaluate((RAISE) => {
  const fmt = window.__fmt, mod = window.__mod;
  mod.AURA_FX.ossuary = fmt.applyScopedEdit(mod.AURA_FX.ossuary, ["layers", 0, "hover"], RAISE, "body");
}, RAISE);
await buildStage("figure", 160); await label("after — figure (body: hover)");
await buildStage("photo", 76); await label("after — photo (identical)");
await page.screenshot({ path: join(OUT, "7i-scope-ossuary-sheet.png"), clip: { x: 0, y: 0, width: 1200, height: 560 } });

await browser.close();
console.log("screenshots: 7i-scope-ossuary-{before,after,sheet}.png");
