// Before/after shots for renderer-fix diffs — renders an aura on two servers
// (before/after) at figure 160 and photo 76, dark theme.
// Usage: node scripts/aura-7i-fix-shots.mjs <aura> <beforeBase> <afterBase>
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const [aura = "huntersmoon", beforeBase = "http://localhost:5199", afterBase = "http://127.0.0.1:5173"] = process.argv.slice(2);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });

async function shot(base, view, file) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 } });
  await ctx.addInitScript(() => {
    let state = 0x7f2a11;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
  const dataUrl = await page.evaluate(async ([aura, view]) => {
    const mod = await import("/src/auras/AuraCanvas.jsx");
    mod.AuraLoop.raf && cancelAnimationFrame(mod.AuraLoop.raf);
    mod.AuraLoop.raf = null; mod.AuraLoop.set.clear();
    let fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
    const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
    const isFig = view === "figure";
    const w = isFig ? 160 : 76, h = isFig ? 204 : 76;
    const cv = document.createElement("canvas");
    const ov = document.createElement("canvas");
    seed();
    const inst = mod.makeAura(cv, { aura, w, h, mode: isFig ? "body" : "circle", ringR: w / 3.2, overCanvas: ov, figure: isFig ? "/avatars/E.webp" : undefined });
    for (let t = 0; t < 200; t++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed(); fakeT = 0; mod.setFlashPageClock?.(() => fakeT);
    for (let f = 0; f < 90; f++) { fakeT += 1 / 60; inst.frame(1 / 60); }
    const g = cv.getContext("2d");
    if (isFig) {
      const img = new Image(); img.src = "/avatars/E.webp"; await img.decode().catch(() => {});
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over";
      g.drawImage(img, (w - h) / 2 + 20, 0, h - 40, h); g.restore();
    } else {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over";
      g.fillStyle = "#22304a"; g.beginPath(); g.arc(w / 2, h / 2, w / 2.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8FA3C8"; g.font = `${w * 0.45}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("A", w / 2, h / 2); g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ov, 0, 0);
    const url = cv.toDataURL("image/png");
    return url;
  }, [aura, view]);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(OUT, file), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`saved ${file}`);
  await ctx.close();
}

for (const [tag, base] of [["before", beforeBase], ["after", afterBase]]) {
  await shot(base, "figure", `7i-fix-${aura}-fig160-${tag}.png`);
  await shot(base, "photo", `7i-fix-${aura}-photo76-${tag}.png`);
}
await browser.close();
