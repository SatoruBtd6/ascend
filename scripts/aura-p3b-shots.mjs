// 7h Part 3 checkpoint B shots: <aura> loop + moment start/peak/end on a real
// makeAura canvas composited at production z-order: main aura canvas UNDER
// the figure/photo, over canvas ABOVE. Deterministic: AuraLoop stopped,
// frames stepped by hand to exact phases.
// Usage: node aura-p3b-shots.mjs [atlas,forge]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
mkdirSync(OUT, { recursive: true });
const base = [process.argv[2], process.argv[3], process.argv[4]].find((a) => a && a.startsWith("http")) || "http://localhost:5180";
const auras = (process.argv[2] && !process.argv[2].startsWith("http") ? process.argv[2] : "atlas,forge").split(",");
// argv[3]: "before" uses src/auras/AuraCanvas.before.jsx (git HEAD copy) and
// tags files -before; otherwise an optional comma list filters phases.
const arg3 = (process.argv[3] && !process.argv[3].startsWith("http") ? process.argv[3] : "") || "";
const beforeMode = arg3 === "before";
const phaseFilter = !beforeMode && arg3 ? arg3.split(",") : null;
const MOD = beforeMode ? "/src/auras/AuraCanvas.before.jsx" : "/src/auras/AuraCanvas.jsx";
const PHASES = {
  // orbit slow -> orbit fast -> dive/hit -> explosion -> re-form
  atlas: [["loop", null], ["oslow", 0.18], ["ofast", 0.55], ["hit", 0.7], ["boom", 0.735], ["reform", 0.9]],
  forge: [["loop", null], ["mstart", 0.06], ["mpeak", 0.28], ["mend", 0.94]],
  fallenlight: [["loop", null], ["mstart", 0.12], ["mpeak", 0.42], ["mend", 0.92]],
  ossuary: [["loop", null], ["mstart", 0.14], ["mpeak", 0.45], ["mend", 0.92]],
};
// Body mode on three figures: low rank (E), high rank (SS), female (S-f);
// plus the 76 photo and 32 board circle stages.
const STAGES = [
  ["figure", "E"], ["figure", "SS"], ["figure", "Sf"], ["photo", 76], ["photo", 32],
];
const FIG_SRC = { E: "/avatars/E.webp", SS: "/avatars/SS.webp", Sf: "/avatars/S-f.webp" };

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate((modPath) => import(modPath).then((m) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m;
}), MOD);

for (const aura of auras) {
  for (const [kind, avatar] of STAGES) {
    // build the stage DOM
    await page.evaluate(async ({ aura, kind, avatar, figSrc }) => {
      document.body.innerHTML = "";
      document.body.style.cssText = "margin:0;background:#0B0F17;display:flex;align-items:center;justify-content:center;height:100vh";
      const mod = window.__mod;
      let cw, ch, ringR, mode, art;
      if (kind === "figure") {
        const figH = 160;
        cw = figH * 0.8; ch = figH * 1.02; mode = "body"; ringR = Math.min(cw, ch) / 3.2;
        art = { src: figSrc, w: figH * (424 / 568), h: figH };
      } else {
        cw = Math.round(avatar * 1.45 * 1.28); ch = cw; mode = "circle"; ringR = avatar * 1.45 / 2.7;
        art = { src: "/avatars/E.webp", w: avatar, h: avatar, round: true };
      }
      const wrap = document.createElement("div");
      wrap.id = "stage";
      wrap.style.cssText = `position:relative;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center`;
      // Production z-order: aura main canvas (0) < figure/photo (1) < over canvas (2)
      const cv = document.createElement("canvas");
      cv.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:0`;
      wrap.appendChild(cv);
      const img = document.createElement("img");
      img.src = art.src;
      img.style.cssText = `width:${art.w}px;height:${art.h}px;${art.round ? "border-radius:50%;" : ""}object-fit:cover;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1`;
      wrap.appendChild(img);
      const cv2 = document.createElement("canvas");
      cv2.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${cw}px;height:${ch}px;z-index:2;pointer-events:none`;
      wrap.appendChild(cv2);
      document.body.appendChild(wrap);
      await img.decode().catch(() => {});
      const inst = mod.makeAura(cv, { aura, w: cw, h: ch, mode, ringR, figure: mode === "body" ? art.src : undefined, overCanvas: cv2 });
      window.__inst = inst;
      for (let tries = 0; tries < 200; tries++) {
        if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
        await new Promise((r) => setTimeout(r, 25));
      }
    }, { aura, kind, avatar, figSrc: FIG_SRC[avatar] });
    for (const [label, target] of (PHASES[aura] || PHASES.forge).filter(([l]) => !phaseFilter || phaseFilter.includes(l))) {
      await page.evaluate(({ target, aura }) => {
        const inst = window.__inst;
        const step = (n) => { for (let i = 0; i < n; i++) inst.frame(1 / 60); };
        if (target == null) {
          // run a natural moment through immediately, drain it, then settle —
          // the next wait is 6s+ so the loop frame is guaranteed clean
          inst.forceMoment();
          let guard = 0;
          while (inst.moment == null && guard++ < 600) inst.frame(1 / 60);
          guard = 0;
          while ((inst.moment != null || (inst.momentParts || 0) > 0) && guard++ < 3000) inst.frame(1 / 60);
          step(45);
          return;
        }
        inst.forceMoment();
        let guard = 0;
        while (inst.moment == null && guard++ < 600) inst.frame(1 / 60);
        const want = target === "peak" ? 0.5 : target;
        guard = 0;
        while (inst.moment != null && inst.moment < want && guard++ < 600) inst.frame(1 / 60);
        step(2);
      }, { target, aura });
      const stage = await page.$("#stage");
      const tag = kind === "figure" ? `fig${avatar}` : `${kind}${avatar}`;
      const name = `p3b2-${aura}-${tag}-${label}${beforeMode ? "-before" : ""}-dark.png`;
      await stage.screenshot({ path: join(OUT, name) });
      console.log(`${name}`);
    }
  }
}
await browser.close();
console.log("done");
