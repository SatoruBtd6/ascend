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
      contents: `export { AURA_FX, _auraImageCache, FRAME_ANCHOR_CACHE_LIMIT, cachedFrameEdgeAnchors, edgeAnchorsFromAlpha, frameBlendAt, readyFrameBlend, ringColorAt, drawNewParticleShape, makeAura } from "./AuraCanvas.jsx";\n`,
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
const { FRAME_ANCHOR_CACHE_LIMIT, cachedFrameEdgeAnchors } = renderer;

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

function alphaFixture(seed = 0) {
  const data = new Uint8ClampedArray(64 * 64 * 4);
  for (let y = 16 + seed; y < 48; y += 1) {
    for (let x = 16; x < 48 - seed; x += 1) {
      const i = (y * 64 + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

function installAlphaDocument() {
  let sampled = null;
  const calls = { reads: 0 };
  globalThis.document = {
    createElement: () => {
      const ctx = new Proxy({
        drawImage: (img) => { sampled = img; },
        getImageData: () => { calls.reads += 1; return { data: sampled.alphaData }; },
        createRadialGradient: () => ({ addColorStop() {} }),
      }, {
        get: (target, key) => key in target ? target[key] : () => {},
        set: (target, key, value) => { target[key] = value; return true; },
      });
      return { width: 0, height: 0, getContext: () => ctx };
    },
  };
  return calls;
}

function alphaImage(src, seed = 0) {
  return { src, naturalWidth: 64, naturalHeight: 64, alphaData: alphaFixture(seed) };
}

test("image alpha is downsampled into bounded edge anchors and cached on the image", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  const calls = installAlphaDocument();
  const rec = { img: alphaImage("shadow-static.png"), ready: true, failed: false };
  renderer._auraImageCache.set("shadow-static.png", rec);
  renderer.AURA_FX.__shadowStatic = {
    glow: 0,
    layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-static.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: { rate: 12, max: 5 } }],
  };
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__shadowStatic", w: 200, h: 200, mode: "circle", ringR: 80 });
  assert.ok(rec.edgeAnchors.length > 0);
  assert.ok(rec.edgeAnchors.length <= 48);
  assert.equal(calls.reads, 1);

  inst.frame(0.5);
  assert.equal(inst.shadowWisps, 5);
  assert.ok(canvas.output.filter(([op]) => op === "drawImage").length > 1);
  inst.frame(0.5);
  assert.equal(inst.shadowWisps, 5);
  assert.equal(calls.reads, 1);
  delete renderer.AURA_FX.__shadowStatic;
  renderer._auraImageCache.delete("shadow-static.png");
});

test("shadow spawn credit accumulates across frames", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  const rec = { img: alphaImage("shadow-rate.png"), ready: true, failed: false };
  renderer._auraImageCache.set("shadow-rate.png", rec);
  renderer.AURA_FX.__shadowRate = { glow: 0, layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-rate.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: { rate: 2, max: 4 } }] };
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "__shadowRate", w: 200, h: 200, mode: "circle", ringR: 80 });
  for (let i = 0; i < 4; i += 1) inst.frame(0.1);
  assert.equal(inst.shadowWisps, 0);
  inst.frame(0.1);
  assert.equal(inst.shadowWisps, 1);
  delete renderer.AURA_FX.__shadowRate;
  renderer._auraImageCache.delete("shadow-rate.png");
});

test("shadow wisps use a separate default and configured budget", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  const rec = { img: alphaImage("shadow-budget.png"), ready: true, failed: false };
  renderer._auraImageCache.set("shadow-budget.png", rec);
  const run = (id, shadow) => {
    renderer.AURA_FX[id] = { glow: 0, layers: [{ k: "orbit", n: 2, shape: "img", src: "shadow-budget.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow }] };
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: id, w: 200, h: 200, mode: "circle", ringR: 80 });
    inst.frame(1);
    return inst;
  };
  assert.equal(run("__shadowDefault", { rate: 1000 }).shadowWisps, 24);
  assert.equal(run("__shadowConfigured", { rate: 1000, max: 7 }).shadowWisps, 7);
  delete renderer.AURA_FX.__shadowDefault;
  delete renderer.AURA_FX.__shadowConfigured;
  renderer._auraImageCache.delete("shadow-budget.png");
});

test("animated image shadows compute and cache anchors per frame lazily", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  const calls = installAlphaDocument();
  for (const [i, src] of ["anim-a.png", "anim-b.png", "anim-c.png"].entries()) {
    renderer._auraImageCache.set(src, { img: alphaImage(src, i), ready: true, failed: false });
  }
  renderer.AURA_FX.__shadowAnimated = {
    glow: 0,
    layers: [{ k: "orbit", n: 1, shape: "img", frames: ["anim-a.png", "anim-b.png", "anim-c.png"], frameDuration: 1, fadeLen: 0, r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: { rate: 2, max: 4 } }],
  };
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "__shadowAnimated", w: 200, h: 200, mode: "circle", ringR: 80 });
  assert.equal(calls.reads, 0);
  inst.frame(0.1);
  assert.equal(calls.reads, 0);
  inst.frame(0.6);
  assert.equal(calls.reads, 1);
  inst.frame(0.5);
  assert.equal(calls.reads, 2);
  inst.frame(1);
  assert.equal(calls.reads, 3);
  assert.equal(inst.shadowAnchorCache, 3);
  delete renderer.AURA_FX.__shadowAnimated;
  for (const src of ["anim-a.png", "anim-b.png", "anim-c.png"]) renderer._auraImageCache.delete(src);
});

test("failed or unshadowed images produce no wisps and no anchor reads", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  const calls = installAlphaDocument();
  renderer._auraImageCache.set("shadow-failed.png", { img: alphaImage("shadow-failed.png"), ready: false, failed: true });
  renderer._auraImageCache.set("shadow-plain.png", { img: alphaImage("shadow-plain.png"), ready: true, failed: false });
  renderer.AURA_FX.__shadowFailed = { glow: 0, layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-failed.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: true }] };
  renderer.AURA_FX.__shadowPlain = { glow: 0, layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-plain.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1 }] };
  const failed = renderer.makeAura(stubRendererCanvas(), { aura: "__shadowFailed", w: 200, h: 200, mode: "circle", ringR: 80 });
  const plain = renderer.makeAura(stubRendererCanvas(), { aura: "__shadowPlain", w: 200, h: 200, mode: "circle", ringR: 80 });
  assert.doesNotThrow(() => { failed.frame(1); plain.frame(1); });
  assert.equal(failed.shadowWisps, 0);
  assert.equal(plain.shadowWisps, 0);
  assert.equal(calls.reads, 0);
  delete renderer.AURA_FX.__shadowFailed;
  delete renderer.AURA_FX.__shadowPlain;
  renderer._auraImageCache.delete("shadow-failed.png");
  renderer._auraImageCache.delete("shadow-plain.png");
});

test("per-frame shadow anchor cache is capped", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  const cache = new Map();
  const records = Array.from({ length: FRAME_ANCHOR_CACHE_LIMIT + 1 }, (_, i) => ({ img: alphaImage(`cap-${i}.png`, i % 2), ready: true, failed: false }));
  for (const rec of records) cachedFrameEdgeAnchors(cache, rec, 48);
  assert.equal(cache.size, FRAME_ANCHOR_CACHE_LIMIT);
  assert.equal(cache.has(records[0]), false);
  assert.equal(cache.has(records.at(-1)), true);
});
