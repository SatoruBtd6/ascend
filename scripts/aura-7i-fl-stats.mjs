// Fallen Light bolt/flash stats for the 7i change report: bolts/s, gated
// flashes per 1s window, reduced-motion rate — same esbuild-stub harness as
// rendererAdditions.test.mjs.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";

const dir = mkdtempSync(join(tmpdir(), "aura-renderer-"));
const outfile = join(dir, "renderer.mjs");
await esbuild.build({
  stdin: {
    contents: `export { makeAura } from "./AuraCanvas.jsx";\n`,
    resolveDir: fileURLToPath(new URL("../src/auras/", import.meta.url)),
    sourcefile: "renderer-entry.js",
    loader: "js",
  },
  bundle: true, format: "esm", platform: "browser", outfile, jsx: "automatic",
  define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" },
});
const { makeAura } = await import(pathToFileURL(outfile).href);

class FakeImage {
  constructor() { this.naturalWidth = 20; this.naturalHeight = 10; }
  get src() { return this._src; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
  decode() { return Promise.resolve(); }
}
globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
globalThis.Image = FakeImage;
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({ createRadialGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }) }) };
const stub = () => { const output = []; const ctx = new Proxy({ globalAlpha: 1, globalCompositeOperation: "source-over", createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) }); return { output, getContext: () => ctx }; };

const run = async (reduce, secs = 10) => {
  const inst = makeAura(stub(), { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  await new Promise((r) => setTimeout(r, 0));
  if (reduce) inst.reduce = true;
  for (let i = 0; i < secs * 60; i += 1) inst.frame(1 / 60);
  return inst;
};

const full = await run(false);
const rate = full.boltsFired / 10;
let maxWin = 0;
full.flashTimes.forEach((t) => { maxWin = Math.max(maxWin, full.flashTimes.filter((u) => u >= t && u < t + 1).length); });
console.log(`full motion: ${full.boltsFired} bolts / 10s = ${rate.toFixed(2)} bolts/s`);
console.log(`full motion: ${full.flashTimes.length} flashes, max ${maxWin} in any 1s window (cap 3)`);
console.log(`  flashTimes: ${full.flashTimes.map((t) => t.toFixed(2)).join(" ")}`);
const calm = await run(true);
console.log(`reduced: ${calm.boltsFired} bolts / 10s = ${(calm.boltsFired / 10).toFixed(2)} bolts/s, flashes ${calm.flashTimes.length}`);
