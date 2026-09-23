import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { AURAS } from "./catalog.js";
import { formatAuraEntry, parseAuraEntry } from "./specFormat.js";

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
