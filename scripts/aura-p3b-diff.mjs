// 7h Part 3 checkpoint B: Bonewright must be pixel-identical before/after the
// moment system, with identical flashTimes. Loads HEAD's AuraCanvas
// (AuraCanvas.before.jsx) and the working-tree version in one page, steps each
// with the same seeded RNG, diffs getImageData byte-for-byte.
// Also reports Forge flashTimes over a forced-moment run (<=3 flashes/sec).
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
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

const base = process.argv[2] || "http://localhost:5180";
// Materialize HEAD's renderer next to the working copy so the page can import both.
const beforePath = join(process.cwd(), "src", "auras", "AuraCanvas.before.jsx");
writeFileSync(beforePath, execSync("git show HEAD:src/auras/AuraCanvas.jsx", { encoding: "utf8" }));
process.on("exit", () => { try { unlinkSync(beforePath); } catch {} });
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
await ctx.addInitScript(() => {
  let state = 0x7f2a11;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
});
const page = await ctx.newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });

const out = await page.evaluate(async () => {
  const modNew = await import("/src/auras/AuraCanvas.jsx");
  const modOld = await import("/src/auras/AuraCanvas.before.jsx");
  if (modNew.AuraLoop.raf) cancelAnimationFrame(modNew.AuraLoop.raf);
  modNew.AuraLoop.raf = null;
  modNew.AuraLoop.set.clear();
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  const run = async (mod, aura, mode, frames = 120) => {
    seed();
    const cv = document.createElement("canvas");
    const w = 160, h = mode === "body" ? 204 : 160;
    cv.width = w; cv.height = h;
    const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: w / 3.2, figure: mode === "body" ? "/avatars/E.webp" : undefined });
    for (let tries = 0; tries < 200; tries++) {
      if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    seed();
    for (let f = 0; f < frames; f++) inst.frame(1 / 60);
    const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    return { px: Array.from(d), flashTimes: inst.flashTimes.slice(), flashes: inst.flashes };
  };
  const res = {};
  for (const mode of ["circle", "body"]) {
    const before = await run(modOld, "bonewright", mode);
    const after = await run(modNew, "bonewright", mode);
    let diff = 0;
    for (let i = 0; i < before.px.length; i++) if (before.px[i] !== after.px[i]) diff++;
    res[`bonewright:${mode}`] = { diff, flashBefore: before.flashTimes, flashAfter: after.flashTimes, flashesBefore: before.flashes, flashesAfter: after.flashes };
  }
  // Forge: force moments back-to-back for 60 simulated seconds, collect flashTimes.
  const fcv = document.createElement("canvas");
  fcv.width = 141; fcv.height = 141;
  const forge = modNew.makeAura(fcv, { aura: "forge", w: 141, h: 141, mode: "circle", ringR: 141 / 3.456 });
  for (let tries = 0; tries < 200; tries++) {
    if ([...modNew._auraImageCache.values()].every((r) => r.ready || r.failed)) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  for (let i = 0; i < 60 * 60; i += 1) {
    forge.frame(1 / 60);
    if (forge.moment == null) forge.forceMoment();
  }
  res.forge = { flashTimes: forge.flashTimes.slice(), flashes: forge.flashes };
  return res;
});

for (const [key, r] of Object.entries(out)) {
  if (key === "forge") continue;
  const same = JSON.stringify(r.flashBefore) === JSON.stringify(r.flashAfter);
  console.log(`${key.padEnd(22)} diffPx=${r.diff}  flashes ${r.flashesBefore}->${r.flashesAfter}  flashTimes identical: ${same}`);
  if (!same) { console.log("  before:", r.flashBefore); console.log("  after: ", r.flashAfter); }
}
const ft = out.forge.flashTimes;
let maxPerSec = 0;
for (const t of ft) maxPerSec = Math.max(maxPerSec, ft.filter((x) => x >= t && x < t + 1).length);
console.log(`forge flashes=${out.forge.flashes} recorded=${ft.length} max-per-1s-window=${maxPerSec}`);
console.log("forge flashTimes:", ft.map((t) => t.toFixed(3)).join(" "));
await browser.close();
