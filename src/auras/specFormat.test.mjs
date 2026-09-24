import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { AURAS } from "./catalog.js";
import {
  formatAuraEntry, parseAuraEntry, setDeep, walkPath,
  mergeViewSpec, mergeViewLayer, scopedPath, applyScopedEdit,
  clearScopedOverride, hasScopedOverride, scopedOverrideViews,
} from "./specFormat.js";

async function loadAuraFx() {
  const dir = mkdtempSync(join(tmpdir(), "aura-fx-"));
  const outfile = join(dir, "fx.mjs");
  await esbuild.build({
    stdin: {
      contents: `export { AURA_FX } from "./AuraCanvas.jsx";\n`,
      resolveDir: fileURLToPath(new URL(".", import.meta.url)),
      sourcefile: "fx-entry.js",
      loader: "js",
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    outfile,
    jsx: "automatic",
    define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" },
  });
  const mod = await import(pathToFileURL(outfile).href);
  return mod.AURA_FX;
}

test("every catalog aura round-trips through the gallery serializer", async () => {
  const AURA_FX = await loadAuraFx();
  const seen = new Set();
  for (const aura of AURAS) {
    if (aura.id === "none") {
      assert.equal(AURA_FX[aura.id], undefined);
      continue;
    }
    const spec = AURA_FX[aura.id];
    assert.ok(spec, `${aura.id} missing from AURA_FX`);
    const text = formatAuraEntry(aura.id, spec);
    const back = parseAuraEntry(text);
    assert.equal(back.id, aura.id);
    assert.deepEqual(back.spec, spec);
    seen.add(aura.id);
  }
  for (const id of Object.keys(AURA_FX)) {
    assert.ok(seen.has(id), `${id} is in AURA_FX but not the catalog`);
  }
  assert.ok(seen.size > 1);
});

test("every renderer-addition field round-trips through copy spec", () => {
  const spec = {
    glow: 0.7,
    rings: [{ r: 1.12, c: "#111111", colorCycle: ["#000000", "#FFFFFF", "#7DF9FF"], cyclePeriod: 4.5, cycleEasing: "step" }],
    layers: [
      {
        k: "orbit", n: 1, shape: "img", frames: ["a.webp", "b.webp"], frameDuration: 0.24, fadeLen: 0.08, frameMode: "pingpong",
        frameOffsets: [{ x: 0.1, y: -0.2, scale: 1.15, rotation: 0.25 }, { x: -0.05, y: 0.08, scale: 0.9, rotation: -0.1 }],
        shadow: { max: 18, rate: 12.5, anchors: 32, life: [0.8, 1.6], sp: [4, 12], sz: [3, 8], c: ["#111827", "#334155"], a: 0.42, blend: "source-over", jit: 0.28 },
      },
      {
        k: "orbit", n: 1, shape: "flame", r: [0, 0], w: [0, 0], sz: [12, 12], a: 0.96, tongues: 6,
        c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], flicker: 0.24, shimmer: true, shimmerN: 3,
        embers: { n: 8, sp: [18, 42], life: [0.5, 1.1], sz: [0.8, 1.6], sway: 10, a: 0.8, c: ["#FFB43C", "#FFF6C9"] },
      },
      { k: "rise", n: 4, shape: "ash", c: ["#9CA3AF"], sp: [4, 9], life: [1, 2], sz: [1, 2] },
    ],
  };
  const text = formatAuraEntry("rendereradditions", spec);
  const back = parseAuraEntry(text);
  assert.equal(back.id, "rendereradditions");
  assert.deepEqual(back.spec, spec);
});

// --- view-scoped override helpers (gallery "Changes apply to" scopes) ---

const scopeBase = () => ({
  spd: 1,
  rings: [{ r: 1.1, c: "#111111" }, { r: 1.24, c: "#222222" }],
  layers: [
    { k: "orbit", n: 4, shape: "dot", r: [0.6, 0.9], w: [0.3, 0.3], sz: [3, 3], c: "#FF8800", wander: { sx: 0.4, sy: 0.6, every: 4 } },
    { k: "rise", n: 5, shape: "spark", sp: [10, 12], life: [2, 2], sz: [2, 2], c: "#00FF88" },
  ],
});

test("applyScopedEdit writes body/circle blocks for scoped views and shared values for both", () => {
  const base = scopeBase();
  const body = applyScopedEdit(base, ["layers", 0, "n"], 9, "body");
  assert.equal(body.layers[0].body.n, 9);
  assert.equal(body.layers[0].n, 4); // shared base untouched
  assert.equal(walkPath(body, ["layers", 0, "body", "n"]), 9);

  const circle = applyScopedEdit(base, ["spd"], 1.6, "circle");
  assert.equal(circle.circle.spd, 1.6);
  assert.equal(circle.spd, 1);

  // "both" writes the shared value and drops any per-view override on it
  const both = applyScopedEdit(body, ["layers", 0, "n"], 7, "both");
  assert.equal(both.layers[0].n, 7);
  assert.equal(both.layers[0].body, undefined);
});

test("applyScopedEdit seeds a range pair so one end keeps its effective value", () => {
  const base = scopeBase();
  const out = applyScopedEdit(base, ["layers", 0, "sz", 1], 9, "body");
  assert.deepEqual(out.layers[0].body.sz, [3, 9]); // untouched end kept
  const out2 = applyScopedEdit(base, ["layers", 0, "w", 0], 0.9, "circle");
  assert.deepEqual(out2.layers[0].circle.w, [0.9, 0.3]);
});

test("applyScopedEdit clones array-valued ancestors into the block (rings)", () => {
  const base = scopeBase();
  const out = applyScopedEdit(base, ["rings", 1], { r: 1.5, c: "#FF0000" }, "body");
  // spec.body.rings must hold BOTH rings — a sparse override would drop ring 0
  assert.equal(out.body.rings.length, 2);
  assert.deepEqual(out.body.rings[0], base.rings[0]);
  assert.deepEqual(out.body.rings[1], { r: 1.5, c: "#FF0000" });
  assert.deepEqual(mergeViewSpec(out, "body").rings[1], { r: 1.5, c: "#FF0000" });
  assert.deepEqual(mergeViewSpec(out, "circle").rings, base.rings);
});

test("applyScopedEdit leaves structural layer keys on the shared value in scoped views", () => {
  const base = scopeBase();
  for (const view of ["body", "circle"]) {
    const out = applyScopedEdit(base, ["layers", 0, "shape"], "star", view);
    assert.equal(out.layers[0].shape, "star");
    assert.equal(out.layers[0][view], undefined);
  }
});

test("mergeViewLayer deep-merges nested objects one level so partial overrides inherit", () => {
  const layer = scopeBase().layers[0];
  const over = { ...layer, body: { wander: { sy: 0.1 } } };
  const merged = mergeViewLayer(over, "body");
  assert.equal(merged.wander.sy, 0.1);
  assert.equal(merged.wander.sx, 0.4); // sibling inherited from base
  assert.equal(merged.wander.every, 4);
  assert.equal(mergeViewLayer(over, "circle").wander.sy, 0.6); // other view unaffected
});

test("clearScopedOverride removes the scoped field; both clears every block", () => {
  let spec = applyScopedEdit(scopeBase(), ["layers", 0, "n"], 9, "body");
  spec = applyScopedEdit(spec, ["layers", 0, "n"], 11, "circle");
  assert.equal(scopedOverrideViews(spec, ["layers", 0, "n"]).join(","), "body,circle");
  const cleared = clearScopedOverride(spec, ["layers", 0, "n"], "body");
  assert.equal(cleared.layers[0].body, undefined); // empty block pruned
  assert.equal(cleared.layers[0].circle.n, 11);
  const clearedAll = clearScopedOverride(spec, ["layers", 0, "n"], "both");
  assert.equal(clearedAll.layers[0].body, undefined);
  assert.equal(clearedAll.layers[0].circle, undefined);
  assert.equal(hasScopedOverride(clearedAll, ["layers", 0, "n"], "both"), false);
});

test("scopedPath maps layer paths into the view block and rejects structural keys", () => {
  assert.deepEqual(scopedPath(["layers", 2, "sz", 0], "body"), ["layers", 2, "body", "sz", 0]);
  assert.deepEqual(scopedPath(["glow"], "circle"), ["circle", "glow"]);
  assert.equal(scopedPath(["layers", 0, "k"], "body"), null);
  assert.equal(scopedPath(["layers", 0], "body"), null);
  assert.equal(scopedPath(["layers", 0, "sz"], "both"), null);
  // honorLocks=false still reports the block path so hand-written overrides clear
  assert.deepEqual(scopedPath(["layers", 0, "k"], "body", false), ["layers", 0, "body", "k"]);
});

test("hasScopedOverride/scopedOverrideViews report which views hold an override", () => {
  const spec = setDeep(scopeBase(), ["layers", 1, "circle", "sp", 0], 20);
  assert.equal(hasScopedOverride(spec, ["layers", 1, "sp"], "circle"), true);
  assert.equal(hasScopedOverride(spec, ["layers", 1, "sp"], "body"), false);
  assert.equal(hasScopedOverride(spec, ["layers", 1, "sp"], "both"), true);
  assert.deepEqual(scopedOverrideViews(spec, ["layers", 1, "sp"]), ["circle"]);
});
