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
