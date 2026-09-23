import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";

async function loadRenderer() {
  const dir = mkdtempSync(join(tmpdir(), "aura-renderer-"));
  const outfile = join(dir, "renderer.mjs");
  await esbuild.build({
    stdin: {
      contents: `export { AURA_FX, _auraImageCache, frameBlendAt, readyFrameBlend, ringColorAt, drawNewParticleShape, makeAura } from "./AuraCanvas.jsx";\n`,
      resolveDir: fileURLToPath(new URL(".", import.meta.url)),
      sourcefile: "renderer-entry.js",
      loader: "js",
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    outfile,
    jsx: "automatic",
    define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" },
  });
  return import(pathToFileURL(outfile).href);
}

const renderer = await loadRenderer();

function stubCanvas() {
  const output = [];
  const methods = ["save", "restore", "translate", "rotate", "beginPath", "arc", "fill", "stroke", "moveTo", "lineTo", "closePath", "ellipse", "quadraticCurveTo", "bezierCurveTo"];
  const ctx = { globalAlpha: 1 };
  for (const method of methods) ctx[method] = (...args) => output.push([method, ...args]);
  return { ctx, output };
}

function stubRendererCanvas(output = []) {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    drawImage: (img, ...args) => output.push(["drawImage", img.src, ...args]),
  }, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => output.push([String(key), ...args]);
    },
    set(target, key, value) {
      target[key] = value;
      output.push(["set", String(key), value]);
      return true;
    },
  });
  return { output, getContext: () => ctx };
}

class FakeImage {
  constructor() { this.naturalWidth = 20; this.naturalHeight = 10; }
  get src() { return this._src; }
  set src(value) {
    this._src = value;
    queueMicrotask(() => value.includes("bad") ? this.onerror?.() : this.onload?.());
  }
  decode() { return this._src?.includes("bad") ? Promise.reject(new Error("bad image")) : Promise.resolve(); }
}

async function frameAura(id, frames, extra = {}) {
  renderer.AURA_FX[id] = {
    glow: 0,
    layers: [{ k: "orbit", n: 1, shape: "img", frames, frameDuration: 1, fadeLen: 0.2, frameMode: "pingpong", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, ...extra }],
  };
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: id, w: 200, h: 200, mode: "circle", ringR: 80 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { canvas, inst };
}

const drawn = (canvas, from = 0) => [...new Set(canvas.output.slice(from).filter(([op]) => op === "drawImage").map(([, src]) => src))];

test("image frames draw on canvas, cross-fade, pingpong, and hold frame zero in reduced motion", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const { canvas, inst } = await frameAura("__frameTest", ["frame-a", "frame-b", "frame-c"], { frameOffsets: [{}, { x: 0.1, y: -0.2, scale: 1.1, rotation: 0.25 }] });
  inst.frame(0);
  assert.deepEqual(drawn(canvas), ["frame-a"]);

  let mark = canvas.output.length;
  inst.frame(0.9);
  assert.deepEqual(drawn(canvas, mark), ["frame-a", "frame-b"]);
  assert.ok(canvas.output.some(([op, x, y]) => op === "translate" && x === 8 && y === -16));
  assert.ok(canvas.output.some(([op, value]) => op === "rotate" && Math.abs(value - Math.PI / 2) < 0.000001));
  assert.ok(canvas.output.some(([op, x, y]) => op === "scale" && x === 1.1 && y === 1.1));

  mark = canvas.output.length;
  inst.frame(0.2);
  assert.deepEqual(drawn(canvas, mark), ["frame-b"]);
  mark = canvas.output.length;
  inst.frame(1);
  assert.deepEqual(drawn(canvas, mark), ["frame-c"]);
  mark = canvas.output.length;
  inst.frame(1);
  assert.deepEqual(drawn(canvas, mark), ["frame-b"]);
  mark = canvas.output.length;
  inst.reduce = true;
  inst.frame(1);
  assert.deepEqual(drawn(canvas, mark), ["frame-a"]);
  delete renderer.AURA_FX.__frameTest;
});

test("failed image frames are skipped while successful frames keep cycling", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const { canvas, inst } = await frameAura("__failedFrameTest", ["fail-a", "bad-frame", "fail-c"], { fadeLen: 0, frameMode: "loop" });
  inst.frame(0);
  assert.deepEqual(drawn(canvas), ["fail-a"]);
  const mark = canvas.output.length;
  inst.frame(1.01);
  assert.deepEqual(drawn(canvas, mark), ["fail-c"]);
  assert.deepEqual([...renderer._auraImageCache.values()].filter((rec) => rec.failed).map((rec) => rec.img.src), ["bad-frame"]);
  delete renderer.AURA_FX.__failedFrameTest;
});

test("ring colours interpolate through the list and blend back to the first", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  const ring = { colorCycle: ["#000000", "#ffffff"], cyclePeriod: 4 };
  assert.equal(renderer.ringColorAt(ring, 0), "#000000");
  assert.equal(renderer.ringColorAt(ring, 1), "#808080");
  assert.equal(renderer.ringColorAt(ring, 2), "#ffffff");
  assert.equal(renderer.ringColorAt(ring, 3), "#808080");
  assert.equal(renderer.ringColorAt(ring, 4), "#000000");
  assert.equal(renderer.ringColorAt({ ...ring, cycleEasing: "step" }, 1.9), "#000000");
  assert.equal(renderer.ringColorAt({ colorCycle: ["#123456"] }, 99), "#123456");

  renderer.AURA_FX.__ringTest = { glow: 0, layers: [], rings: [{ r: 1, w: 1, a: 1, colorCycle: ["#000000", "#ffffff"], cyclePeriod: 4 }] };
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__ringTest", w: 200, h: 200, mode: "circle", ringR: 80 });
  const strokes = () => canvas.output.filter(([op, key]) => op === "set" && key === "strokeStyle").map(([, , value]) => value);
  const last = () => strokes().at(-1);
  inst.frame(1);
  assert.match(last(), /^rgba\(128,128,128,/);
  inst.frame(1);
  assert.match(last(), /^rgba\(255,255,255,/);
  inst.frame(1);
  assert.match(last(), /^rgba\(128,128,128,/);
  inst.frame(1);
  assert.match(last(), /^rgba\(0,0,0,/);
  inst.reduce = true;
  inst.frame(1);
  assert.match(last(), /^rgba\(0,0,0,/);
  delete renderer.AURA_FX.__ringTest;
});

test("all eight new particle shapes draw non-empty output without throwing", () => {
  const shapes = ["ash", "feather", "bonechip", "coin", "crescent", "pulse", "sandgrain", "chainlink"];
  for (const shape of shapes) {
    const { ctx, output } = stubCanvas();
    const particle = { sz: 3, c: "#abcdef", rot: 0.4, ph: 0.7, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, ashBlobs: [[-0.2, 0.1, 0.3], [0.1, -0.1, 0.25]] };
    assert.doesNotThrow(() => renderer.drawNewParticleShape(ctx, shape, particle, 20, 20, 0.5), shape);
    assert.ok(output.some(([operation]) => operation === "fill" || operation === "stroke"), `${shape} produced no painted output`);
  }
});

test("ash geometry is stable across frames and only its transform changes", () => {
  const particle = { sz: 3, c: "#888888", rot: 0.4, ashBlobs: [[-0.2, 0.1, 0.3], [0.1, -0.1, 0.25]] };
  const first = stubCanvas();
  const second = stubCanvas();
  renderer.drawNewParticleShape(first.ctx, "ash", particle, 20, 20, 0);
  particle.rot = 1.1;
  renderer.drawNewParticleShape(second.ctx, "ash", particle, 20, 20, 10);
  assert.notDeepEqual(second.output.find(([op]) => op === "rotate"), first.output.find(([op]) => op === "rotate"));
  assert.deepEqual(second.output.filter(([op]) => op === "arc"), first.output.filter(([op]) => op === "arc"));
});
