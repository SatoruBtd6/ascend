// 7i Part 1 untouched-aura proof: every aura EXCEPT crownfall must render
// pixel-identical to the pre-7i tag, and bonewright's flashTimes must match.
// Same seeded-RNG, per-aura-reserved stream method as aura-part-1-unchanged.mjs.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const [beforeBase = "http://localhost:5181", afterBase = "http://localhost:5180"] = process.argv.slice(2);
const AURAS = "ember tide storm smolder stormborn dawn wanderer wyrm frost abyss chud rust thunder hollow deep magma plague sand void yogurt vendetta champion ascended soon_throne soon_seraphim huntersmoon wheel sigil glassfire crownfall eclipseheart steadybreath iaidraw stormstep zeropoint ninetail ledger bonewright nullpoint carve brandmark inferno halo godray blacksun".split(" ");

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });

async function snapAll(base) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
  await ctx.addInitScript(() => {
    let state = 0x7f2a11;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
  const out = await page.evaluate(async (auras) => {
    const mod = await import("/src/auras/AuraCanvas.jsx");
    if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
    mod.AuraLoop.raf = null;
    mod.AuraLoop.set.clear();
    // drive the page-wide flash budget on the same fake clock as the frames so
    // scripted stepping doesn't compress wall time (pre-7i lacks the hook — ?.)
    let fakeT = 0;
    mod.setFlashPageClock?.(() => fakeT);
    const results = {};
    for (const aura of auras) {
      for (const mode of ["circle", "body"]) {
        const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
        seed();
        const cv = document.createElement("canvas");
        const w = 160, h = mode === "body" ? 204 : 160;
        cv.width = w; cv.height = h;
        const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: w / 3.2, figure: mode === "body" ? "/avatars/E.webp" : undefined });
        if (!inst) { results[`${aura}:${mode}`] = null; continue; }
        await document.fonts.ready;
        for (let tries = 0; tries < 200; tries++) {
          if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
          await new Promise((r) => setTimeout(r, 25));
        }
        seed();
        fakeT = 0; // re-invoking the hook rewinds the clock AND resets the budget
        mod.setFlashPageClock?.(() => fakeT);
        for (let f = 0; f < 120; f++) { fakeT += 1 / 60; inst.frame(1 / 60); }
        const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
        results[`${aura}:${mode}`] = { px: Array.from(d), flashTimes: inst.flashTimes.slice() };
      }
    }
    return results;
  }, AURAS);
  await page.close();
  return out;
}

const a = await snapAll(beforeBase);
const b = await snapAll(afterBase);
console.log("aura:mode          diffPx  flashTimes");
let fail = 0;
for (const key of Object.keys(a)) {
  if (!a[key] || !b[key]) { console.log(`${key.padEnd(20)} MISSING`); fail++; continue; }
  let diff = 0;
  for (let i = 0; i < a[key].px.length; i += 4) {
    if (a[key].px[i] !== b[key].px[i] || a[key].px[i + 1] !== b[key].px[i + 1] || a[key].px[i + 2] !== b[key].px[i + 2] || a[key].px[i + 3] !== b[key].px[i + 3]) diff++;
  }
  const ftSame = JSON.stringify(a[key].flashTimes) === JSON.stringify(b[key].flashTimes);
  console.log(`${key.padEnd(20)} ${String(diff).padEnd(7)} ${ftSame ? "same" : `DIFF ${JSON.stringify(a[key].flashTimes)} vs ${JSON.stringify(b[key].flashTimes)}`}`);
  if (key.startsWith("crownfall") || key.startsWith("eclipseheart")) { if (diff === 0) { console.log(`  ^ ${key} expected to differ (7i respec) — 0 diffs means the change is NOT rendering`); fail++; } }
  else if (diff !== 0 || !ftSame) fail++;
}
console.log(fail ? `FAIL: ${fail} unexpected result(s)` : "PASS: only 7i-respec'd auras differ; all other auras pixel-identical, flashTimes identical");
await browser.close();
process.exit(fail ? 1 : 0);
