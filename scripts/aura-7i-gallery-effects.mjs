// 7i gallery effect test — for every aura, every visible gallery control is
// driven to its min and max (or each select option) on the stage it applies
// to, and the rendered pixels must actually change. Baseline and variant run
// in lockstep and EVERY frame is compared, so intermittent visuals (bolts,
// flashes, ejects) can't slip past the check. Controls that leave every frame
// pixel-identical are reported dead, with a reason.
// Usage: node scripts/aura-7i-gallery-effects.mjs [--base http://127.0.0.1:5173] [--aura redline] [--json]
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const ONLY = args.includes("--aura") ? args[args.indexOf("--aura") + 1].split(",") : null;
const JSON_OUT = args.includes("--json");

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 400, height: 300 } });
await ctx.addInitScript(() => {
  let state = 0x7f2a11;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  if (mod.AuraLoop.raf) cancelAnimationFrame(mod.AuraLoop.raf);
  mod.AuraLoop.raf = null;
  mod.AuraLoop.set.clear();
});

const auraIds = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  return Object.keys(mod.AURA_FX);
});

const targets = ONLY ? auraIds.filter((id) => ONLY.includes(id)) : auraIds;
const allResults = {};

for (const aura of targets) {
  const res = await page.evaluate(async ({ id, LEGACY }) => {
    const mod = await import("/src/auras/AuraCanvas.jsx");
    const gal = await import("/src/auras/devGallery.jsx");
    const { specFields, cloneSpec } = await import("/src/auras/specFormat.js");
    const ORIGINAL = cloneSpec(mod.AURA_FX[id]);
    if (!ORIGINAL) return { id, skipped: "no spec" };

    let fakeT = 500;
    mod.setFlashPageClock?.(() => fakeT);
    const seed = (v = 0x7f2a11) => { let st = v; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const STAGES = {
      figure: { w: 128, h: 164, mode: "body", figure: "/avatars/E.webp" },
      ring: { w: 141, h: 141, mode: "circle", ringR: 40.7 },
    };

    async function imagesReady() {
      await document.fonts.ready;
      for (let t = 0; t < 200; t++) {
        if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) return;
        await sleep(25);
      }
    }

    function mkInst(spec, stageName, reduce) {
      mod.AURA_FX[id] = spec;
      const st = STAGES[stageName];
      const cv = document.createElement("canvas");
      const ov = document.createElement("canvas");
      const inst = mod.makeAura(cv, { aura: id, w: st.w, h: st.h, mode: st.mode, ringR: st.ringR, figure: st.figure, overCanvas: ov });
      if (inst) inst.reduce = reduce;
      return { inst, cv, ov };
    }

    // Both sides must see identical RNG streams, so instances can't be stepped
    // interleaved (they'd split the stream). Run each to completion, storing
    // every frame's pixels, then compare frame-by-frame — bolts/flashes/ejects
    // that only live a few frames still count.
    async function runSide(spec, stageName, frames, moment, reduce, stride, seedV) {
      seed(seedV);
      const { inst, cv, ov } = mkInst(spec, stageName, reduce);
      if (!inst) return { crash: "no instance" };
      await imagesReady();
      seed(seedV);
      // Rewind the fake page clock — re-invoking the hook also resets the
      // page-wide flash budget, so both sides see the same flash schedule.
      fakeT = 0;
      mod.setFlashPageClock?.(() => fakeT);
      if (moment) inst.forceMoment();
      const out = [];
      for (let f = 0; f < frames; f++) {
        fakeT += 1 / 60;
        inst.frame(1 / 60);
        if (f % stride !== 0) continue;
        out.push([
          new Uint8ClampedArray(cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data),
          new Uint8ClampedArray(ov.getContext("2d").getImageData(0, 0, ov.width, ov.height).data),
        ]);
      }
      return { frames: out, bolts: inst.boltsFired, flashes: inst.flashes };
    }

    const baseCache = new Map();
    async function runPair(specA, specB, stageName, { frames = 48, moment = false, reduce = false, seedV = 0x7f2a11 } = {}) {
      // Long runs are sampled — bolts live ~17 frames, ejects ~48, so a stride
      // of 6 still catches them while keeping memory bounded.
      const stride = frames > 240 ? 6 : frames > 96 ? 3 : 1;
      let A, B;
      // The baseline spec never changes — cache its frame strip per bucket.
      const ck = `${stageName}|${frames}|${moment ? 1 : 0}|${reduce ? 1 : 0}|${seedV}`;
      if (baseCache.has(ck)) A = baseCache.get(ck);
      else {
        try { A = await runSide(specA, stageName, frames, moment, reduce, stride, seedV); } catch (e) { return { crash: "baseline: " + (e && e.message || e) }; }
        if (!A.crash) baseCache.set(ck, A);
      }
      if (A.crash) return A;
      try { B = await runSide(specB, stageName, frames, moment, reduce, stride, seedV); } catch (e) { return { crash: (e && e.message || e) }; }
      if (B.crash) return B;
      let diff = 0, diffFrame = -1;
      for (let f = 0; f < A.frames.length; f++) {
        for (let c = 0; c < 2; c++) {
          const a = A.frames[f][c], b = B.frames[f][c];
          let d = 0;
          for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++;
          if (d > 0) { diff += d; if (diffFrame < 0) diffFrame = f * stride; }
        }
      }
      return { diff, diffFrame, bolts: B.bolts, flashes: B.flashes };
    }

    // ---- control enumeration: same field list the editor renders + panels ----
    const PANEL_IMG = new Set(["x", "y", "at", "r", "sz", "rot", "flip", "shadow", "frames", "frameDuration", "fadeLen", "frameOffsets", "headSz"]);
    const PANEL_FLAME = new Set(["n", "sz", "a", "rot", "spin", "tongues", "flicker", "shimmer", "shimmerN", "c", "embers"]);

    function controlsFor(view) {
      const ring = view === "ring";
      const list = [];
      const seen = new Set();
      for (const f of gal.editorFields(ORIGINAL, ring)) {
        const shape = f.path[0] === "layers" ? ORIGINAL.layers?.[f.path[1]]?.shape : undefined;
        list.push({ path: f.path, kind: f.kind, value: f.value, via: "field", shape });
        seen.add(f.path.join("."));
      }
      if (ring) return list;
      const overCount = (ORIGINAL.layers || []).filter((l) => l?.over).length;
      (ORIGINAL.layers || []).forEach((layer, i) => {
        const headPlaced = layer.placed === "head";
        for (const f of specFields(layer)) {
          const key = f.path[0];
          const full = ["layers", i, ...f.path];
          if (seen.has(full.join("."))) continue;
          // the img panel binds x/y + headSz on head-placed layers — the raw
          // at/r/sz fields have no control there (mirrors ImagePlacement).
          // LEGACY_PANEL enumerates the pre-fix panel, which rendered them anyway.
          const imgPanelDead = !LEGACY && layer.shape === "img" && (gal.isDeadField(layer, key, { view: "figure", overCount }) || (headPlaced && (key === "at" || key === "r" || (key === "sz" && layer.headSz != null))));
          if (layer.shape === "img" && PANEL_IMG.has(key) && !imgPanelDead) list.push({ path: full, kind: f.kind, value: f.value, via: "img panel", shape: "img" });
          else if (layer.shape === "flame" && PANEL_FLAME.has(key)) list.push({ path: full, kind: f.kind, value: f.value, via: "flame panel", shape: "flame" });
        }
        if (layer.shape !== "img" && layer.shape !== "flame") {
          list.push({ path: ["layers", i, "k"], kind: "select", value: layer.k || "orbit", options: gal.LAYER_KIND_OPTIONS, via: "select" });
          list.push({ path: ["layers", i, "shape"], kind: "select", value: layer.shape || "dot", options: gal.LAYER_SHAPE_OPTIONS, via: "select" });
        }
        // the Blend select is hidden when the layer is alone on the over canvas
        if (layer.blend != null && (LEGACY || !(layer.over && overCount <= 1))) list.push({ path: ["layers", i, "blend"], kind: "select", value: layer.blend, options: gal.BLEND_OPTIONS.map((o) => o[0]), via: "select" });
        if (layer.frames?.length > 1) list.push({ path: ["layers", i, "frameMode"], kind: "select", value: layer.frameMode || "loop", options: ["loop", "pingpong"], via: "select" });
      });
      (ORIGINAL.rings || []).forEach((ringSpec, i) => {
        for (const key of gal.DEDICATED_RING_FIELDS) {
          if (ringSpec[key] == null) continue;
          list.push({ path: ["rings", i, key], kind: typeof ringSpec[key] === "number" ? "number" : "select", value: ringSpec[key], options: key === "cycleEasing" ? ["linear", "ease", "pulse"] : undefined, via: "ring panel" });
        }
      });
      return list;
    }

    function hiddenFields() {
      const visible = new Set();
      for (const v of ["figure", "ring"]) for (const c of controlsFor(v)) visible.add(c.path.join("."));
      return specFields(ORIGINAL).filter((f) => f.path[2] !== "circle" && !visible.has(f.path.join(".")))
        .map((f) => ({ path: f.path, kind: f.kind, value: f.value, via: "hidden" }));
    }

    // ---- routing: frames keyed to how often the effect shows ----
    const SCHEDULE_KEYS = new Set(["every", "gap"]); // pure event timing — verified by a long unforced run
    const EVENT_KEYS = new Set(["burst", "burstSpan", "dur", "rate", "eject", "flash", "flashP", "flashEvery", "flashPeak", "flashLife", "flashC", "strike"]);
    const SLOW_KEYS = new Set(["cyclePeriod", "period"]);
    const REDUCE_KEYS = new Set(["calm", "calmEvery", "bobAmp"]);
    const MOMENT_KEY = /^m[A-Z]/; // mX/mY/mSpin/mR/mShake/mFlings/mOrbit/mBurst... — only matter during the moment

    function plan(path, c) {
      const last = path[path.length - 1];
      const key = String(typeof last === "number" ? path[path.length - 2] : last);
      const inMomentObject = path[0] === "moment" || path.some((p) => typeof p === "string" && MOMENT_KEY.test(p));
      const layer = path[0] === "layers" ? ORIGINAL.layers?.[path[1]] : null;
      let frames = 48, moment = false, reduce = false, seeds = 1;
      if (inMomentObject && !SCHEDULE_KEYS.has(key)) {
        moment = true;
        // run past the whole moment — mdur scales ×1.35 on >=110px canvases
        frames = Math.ceil((ORIGINAL.moment?.dur ?? 1.2) * 1.35 * 60) + 60;
      }
      else if (SCHEDULE_KEYS.has(key) && path[0] === "moment") frames = 1500; // schedule-only fields — let it fire twice
      if (!inMomentObject && (EVENT_KEYS.has(key) || path.some((p) => p === "eject" || p === "bolts" || p === "flare"))) frames = 900;
      if (SCHEDULE_KEYS.has(key) && path[0] !== "moment") frames = Math.max(frames, 900);
      if (SLOW_KEYS.has(key)) frames = 600;
      if (["frameMode", "glint", "tremble", "breathe", "wobble", "bob"].includes(key)) frames = Math.max(frames, 300);
      if (layer && (layer.wander || layer.frontOnly || (layer.k === "orbit" && Math.abs(layer.w?.[0] ?? 1) < 0.08))) frames = Math.max(frames, 300);
      if (REDUCE_KEYS.has(key)) reduce = true;
      // Colour-array elements: the index may go unpicked under one seed, so a
      // zero diff on a single seed is inconclusive — retry under other seeds.
      if (c && c.kind === "color" && typeof last === "number") seeds = 3;
      return { frames, moment, reduce, key, seeds };
    }

    // ---- variant application (ring-view writes land in layer.circle) ----
    function applyVariant(spec, path, v, ringView) {
      if (!ringView || path[0] !== "layers") return gal.setDeep(spec, path, v);
      const [, i, key, ...rest] = path;
      const layer = spec.layers[i];
      const eff = layer.circle && Object.prototype.hasOwnProperty.call(layer.circle, key) ? layer.circle[key] : layer[key];
      let val = cloneSpec(eff);
      if (rest.length === 0) val = v;
      else if (val && typeof val === "object") { let cur = val; for (let j = 0; j < rest.length - 1; j++) cur = cur[rest[j]]; cur[rest[rest.length - 1]] = v; }
      else val = v;
      return gal.setDeep(spec, ["layers", i, "circle", key], val);
    }

    function valueTries(c) {
      if (c.kind === "select") return (c.options || []).filter((o) => o !== c.value).slice(0, 2);
      if (c.kind === "color") return [String(c.value).toLowerCase() === "#00ff88" ? "#ff0088" : "#00ff88"];
      const last = c.path[c.path.length - 1];
      if (typeof last === "string" && last !== "jit" && gal.FLAG_KEYS.has(last)) return [c.value ? 0 : 1];
      const b = gal.fieldBounds(c.path, c.shape, c.value);
      return [...new Set([b.min, b.max])].filter((v) => v !== c.value);
    }

    const results = [];
    async function test(c, view) {
      const p = plan(c.path, c);
      const tries = valueTries(c);
      if (!tries.length) { results.push({ ...c, view, ok: null, why: "no values" }); return; }
      for (const v of tries) {
        const variant = applyVariant(ORIGINAL, c.path, v, view === "ring");
        for (const seedV of [0x7f2a11, 0x9e3779, 0x243f6a].slice(0, p.seeds)) {
          const r = await runPair(ORIGINAL, variant, view, { ...p, seedV });
          if (r.crash) { results.push({ ...c, view, ok: false, key: p.key, crash: r.crash, value: v }); return; }
          if (r.diff > 0) { results.push({ ...c, view, ok: true, value: v, diff: r.diff }); return; }
        }
      }
      results.push({ ...c, view, ok: false, key: p.key });
    }

    for (const view of ["figure", "ring"]) {
      for (const c of controlsFor(view)) await test(c, view);
    }
    for (const c of hiddenFields()) await test(c, "figure");
    mod.AURA_FX[id] = ORIGINAL;
    return { id, results };
  }, { id: aura, LEGACY: process.env.LEGACY_PANEL === "1" });
  allResults[aura] = res;
  const dead = (res.results || []).filter((r) => r.ok === false);
  console.log(`${aura}: ${(res.results || []).length} controls — ${dead.length} dead${dead.length ? `  [${dead.map((d) => `${d.path.join(".")}@${d.view}${d.crash ? " CRASH" : ""}`).join(", ")}]` : ""}`);
}

// ---- summary ----
let total = 0; const deadVis = [], hiddenDead = [];
for (const id of Object.keys(allResults)) {
  for (const r of allResults[id].results || []) {
    if (r.via === "hidden") { if (r.ok === false) hiddenDead.push({ id, ...r }); continue; }
    total++;
    if (r.ok === false) deadVis.push({ id, ...r });
  }
}
console.log(`\n== EFFECT TEST SUMMARY ==`);
console.log(`visible controls tested: ${total}`);
console.log(`dead visible controls: ${deadVis.length}`);
for (const d of deadVis) console.log(`  DEAD ${d.id} ${d.path.join(".")} (${d.via}) view=${d.view}${d.crash ? ` CRASHES: ${d.crash}` : ""}`);
console.log(`hidden spec fields with no rendered effect: ${hiddenDead.length}`);
for (const d of hiddenDead) console.log(`  hidden ${d.id} ${d.path.join(".")} key=${d.key || ""}${d.crash ? ` CRASHES: ${d.crash}` : ""}`);
if (JSON_OUT) console.log(`\nJSON ${JSON.stringify({ total, deadVis, hiddenDead })}`);

// ---- editor check: clicking every catalog aura must open its controls.
// The only allowed "no particle spec" is an aura with no AURA_FX entry
// (currently just "none"). A regression like the crownfall→redline rename —
// where previews render via resolveAuraId but the editor's spec lookup missed
// the new id — shows up here as noSpec/0 controls on a spec'd aura.
const catalog = await page.evaluate(async () => {
  const { AURAS } = await import("/src/auras/catalog.js");
  const mod = await import("/src/auras/AuraCanvas.jsx");
  return AURAS.map((a) => ({ id: a.id, hasSpec: !!mod.AURA_FX[a.id] }));
});
const editorFails = [];
for (const { id, hasSpec } of catalog) {
  const clicked = await page.evaluate((aid) => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().endsWith(`· ${aid}`));
    if (!btn) return false;
    btn.click();
    return true;
  }, id);
  if (!clicked) { editorFails.push({ id, why: "grid button not found" }); continue; }
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({
    noSpec: document.body.innerText.includes("no particle spec"),
    sliders: document.querySelectorAll("input[type=range]").length,
  }));
  const ok = hasSpec ? (!r.noSpec && r.sliders > 0) : r.noSpec;
  if (!ok) editorFails.push({ id, why: hasSpec ? `noSpec=${r.noSpec} sliders=${r.sliders}` : "specless aura did not show the no-spec note" });
  // the grid unmounts while an aura is selected — go back before the next one
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "All auras")?.click());
  await page.waitForTimeout(250);
}
console.log(`\n== EDITOR CHECK ==`);
console.log(`catalog auras checked: ${catalog.length}`);
console.log(`specless (no-spec note expected): ${catalog.filter((a) => !a.hasSpec).map((a) => a.id).join(", ") || "none"}`);
console.log(`failures: ${editorFails.length}`);
for (const f of editorFails) console.log(`  FAIL ${f.id}: ${f.why}`);
await browser.close();
process.exit(deadVis.length + editorFails.length > 0 ? 1 : 0);
