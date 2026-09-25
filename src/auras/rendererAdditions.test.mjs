import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { FIGURE_ANCHORS } from "./anchors.js";

async function loadRenderer() {
  const dir = mkdtempSync(join(tmpdir(), "aura-renderer-"));
  const outfile = join(dir, "renderer.mjs");
  await esbuild.build({
    stdin: {
      contents: `export { AURA_FX, _auraImageCache, _auraLiveInstances, trackAuraInstance, FRAME_ANCHOR_CACHE_LIMIT, cachedFrameEdgeAnchors, edgeAnchorsFromAlpha, frameBlendAt, readyFrameBlend, ringColorAt, drawNewParticleShape, makeAura, makeFlameTongues, setFlashPageClock } from "./AuraCanvas.jsx";\n`,
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

// The page-wide flash budget runs on wall time; drive it with this fake clock
// so tests step flashes deterministically. Tests that assert flash counts reset
// pageT to 0 (a rewind resets the budget) and advance it inside frame loops.
let pageT = 0;
renderer.setFlashPageClock(() => pageT);

function stubCanvas() {
  const output = [];
  const methods = ["save", "restore", "translate", "rotate", "scale", "beginPath", "arc", "fill", "stroke", "moveTo", "lineTo", "closePath", "ellipse", "quadraticCurveTo", "bezierCurveTo", "drawImage", "rect", "clip"];
  const ctx = { globalAlpha: 1 };
  for (const method of methods) ctx[method] = (...args) => output.push([method, ...args]);
  return { ctx, output };
}

// Sprite helpers (glowSprite/orbSprite/softSprite) build offscreen canvases
// through document.createElement — give them a recording stub in Node.
function installStubDocument() {
  globalThis.document = {
    createElement: () => {
      const el = { width: 0, height: 0 };
      el.getContext = () => new Proxy({ globalAlpha: 1, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, {
        get: (t, k) => (k in t ? t[k] : () => {}),
        set: (t, k, v) => { t[k] = v; return true; },
      });
      return el;
    },
  };
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

test("all ten 7j particle shapes draw distinct painted output without throwing", () => {
  installStubDocument();
  const shapes = ["comet", "sparkle", "orb", "crystal", "wisp", "rune", "bolt", "moth", "lantern", "sparkburst"];
  const mk = (over = {}) => ({ sz: 4, c: "#abcdef", rot: 0.4, ph: 0.7, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, i: 3, vx: 10, vy: -6, ...over });
  const sig = (shape, t, reduced, p) => {
    const { ctx, output } = stubCanvas();
    renderer.drawNewParticleShape(ctx, shape, p || mk(), 20, 20, t, reduced);
    return JSON.stringify(output);
  };
  const seen = new Set();
  for (const shape of shapes) {
    const ops = sig(shape, 0.5, false);
    assert.ok(ops.includes('"fill"') || ops.includes('"stroke"') || ops.includes('"drawImage"'), `${shape} produced no painted output`);
    assert.ok(!seen.has(ops), `${shape} draws the same op stream as another shape — not visually distinct`);
    seen.add(ops);
  }
});

test("7j particle shapes animate over time and hold still under reduced motion", () => {
  installStubDocument();
  const animated = ["sparkle", "orb", "crystal", "wisp", "rune", "moth", "lantern", "sparkburst"];
  const p = { sz: 4, c: "#abcdef", rot: 0.4, ph: 0.7, age: 0.4, life: 1.5, ang: 0.3, w: 0.2, i: 3, vx: 10, vy: -6 };
  const sig = (shape, t, reduced) => {
    const { ctx, output } = stubCanvas();
    renderer.drawNewParticleShape(ctx, shape, { ...p }, 20, 20, t, reduced);
    return JSON.stringify(output);
  };
  for (const shape of animated) {
    assert.notEqual(sig(shape, 0.5, false), sig(shape, 1.3, false), `${shape} does not animate`);
    assert.equal(sig(shape, 0.5, true), sig(shape, 1.3, true), `${shape} still animates under reduced motion`);
  }
  // bolt flickers through globalAlpha, which the stub records as a property
  // set — read the final value rather than the op stream
  const boltAlpha = (t, reduced) => {
    const { ctx } = stubCanvas();
    renderer.drawNewParticleShape(ctx, "bolt", { ...p }, 20, 20, t, reduced);
    return ctx.globalAlpha;
  };
  assert.notEqual(boltAlpha(0.5, false), boltAlpha(0.62, false), "bolt does not flicker");
  assert.equal(boltAlpha(0.5, true), boltAlpha(0.62, true), "bolt still flickers under reduced motion");
  // comet has no internal clock — its tail follows velocity; reduced motion shortens it
  const cometScale = (reduced) => {
    const { ctx, output } = stubCanvas();
    renderer.drawNewParticleShape(ctx, "comet", { ...p }, 20, 20, 0.5, reduced);
    return output.find(([op]) => op === "scale")?.[1];
  };
  assert.ok(cometScale(true) < cometScale(false), "comet tail is not shorter under reduced motion");
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

test("reduced motion keeps shadow wisps with a smaller cap", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  const rec = { img: alphaImage("shadow-reduced.png"), ready: true, failed: false };
  renderer._auraImageCache.set("shadow-reduced.png", rec);
  renderer.AURA_FX.__shadowReduced = { glow: 0, layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-reduced.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: { rate: 1000, max: 24 } }] };
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "__shadowReduced", w: 200, h: 200, mode: "circle", ringR: 80 });
  inst.reduce = true;
  inst.frame(1);
  assert.equal(inst.shadowWisps, 9);
  inst.frame(1);
  assert.equal(inst.shadowWisps, 9);
  delete renderer.AURA_FX.__shadowReduced;
  renderer._auraImageCache.delete("shadow-reduced.png");
});

test("shadow count and spawn rate scale with canvas size and stop below 56px", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  const rec = { img: alphaImage("shadow-size.png"), ready: true, failed: false };
  renderer._auraImageCache.set("shadow-size.png", rec);
  const make = (id, size, rate = 1000) => {
    renderer.AURA_FX[id] = { glow: 0, layers: [{ k: "orbit", n: 1, shape: "img", src: "shadow-size.png", r: [0, 0], w: [0, 0], sz: [0.25, 0.25], a: 1, shadow: { rate, max: 24 } }] };
    return renderer.makeAura(stubRendererCanvas(), { aura: id, w: size, h: size, mode: "circle", ringR: size / 3 });
  };
  const tiny = make("__shadowSize32", 32);
  tiny.frame(1);
  assert.equal(tiny.shadowWisps, 0);
  for (const [id, size, expected] of [["__shadowSize76", 76, 12], ["__shadowSize88", 88, 14], ["__shadowSize160", 160, 24]]) {
    const inst = make(id, size);
    inst.frame(1);
    assert.equal(inst.shadowWisps, expected);
  }
  const small = make("__shadowRate88", 88, 10);
  const large = make("__shadowRate160", 160, 10);
  small.frame(0.25);
  large.frame(0.25);
  assert.equal(small.shadowWisps, 1);
  assert.equal(large.shadowWisps, 2);
  for (const id of ["__shadowSize32", "__shadowSize76", "__shadowSize88", "__shadowSize160", "__shadowRate88", "__shadowRate160"]) delete renderer.AURA_FX[id];
  renderer._auraImageCache.delete("shadow-size.png");
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

test("procedural flame draws multiple tapered tongues and base shimmer", () => {
  const particle = { sz: 12, c: "#FF5A1F", rot: 0, ph: 0.4, flameTongues: renderer.makeFlameTongues(6) };
  const { ctx, output } = stubCanvas();
  assert.doesNotThrow(() => renderer.drawNewParticleShape(ctx, "flame", particle, 40, 60, 0.35, false, { c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], shimmerN: 3 }));
  assert.equal(particle.flameTongues.length, 6);
  assert.ok(output.filter(([op]) => op === "bezierCurveTo").length >= 36);
  assert.ok(output.filter(([op]) => op === "fill").length >= 19);
  assert.equal(output.filter(([op]) => op === "stroke").length, 3);
});

test("flame tongue phases are randomized and reduced motion lowers flicker without shimmer", () => {
  const first = renderer.makeFlameTongues(6);
  const second = renderer.makeFlameTongues(6);
  assert.notDeepEqual(first.map((t) => [t.f1, t.f2, t.f3, t.p1, t.p2, t.p3]), second.map((t) => [t.f1, t.f2, t.f3, t.p1, t.p2, t.p3]));
  const particle = { sz: 12, c: "#FF5A1F", rot: 0, ph: 0.4, flameTongues: first };
  const delta = (reduced) => {
    const a = stubCanvas();
    const b = stubCanvas();
    const layer = { c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], shimmerN: 3 };
    renderer.drawNewParticleShape(a.ctx, "flame", particle, 40, 60, 0.2, reduced, layer);
    renderer.drawNewParticleShape(b.ctx, "flame", particle, 40, 60, 0.65, reduced, layer);
    const ac = a.output.filter(([op]) => op === "bezierCurveTo");
    const bc = b.output.filter(([op]) => op === "bezierCurveTo");
    return {
      strokes: a.output.filter(([op]) => op === "stroke").length,
      motion: ac.reduce((sum, args, i) => sum + args.slice(1).reduce((inner, n, j) => inner + Math.abs(n - bc[i][j + 1]), 0), 0),
    };
  };
  const normal = delta(false);
  const reduced = delta(true);
  assert.ok(normal.motion > reduced.motion);
  assert.equal(normal.strokes, 3);
  assert.equal(reduced.strokes, 0);
});

test("flame embers expand into the existing rise particle layer", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  installAlphaDocument();
  renderer.AURA_FX.__flameEmbers = {
    glow: 0,
    layers: [{ k: "orbit", n: 1, shape: "flame", r: [0, 0], w: [0, 0], sz: [10, 10], a: 1, embers: { n: 8, sp: [10, 10], life: [100, 100], sz: [1, 1], c: "#FFB43C" } }],
  };
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__flameEmbers", w: 200, h: 200, mode: "circle", ringR: 80 });
  inst.frame(0.1);
  assert.ok(canvas.output.filter(([op]) => op === "bezierCurveTo").length >= 30);
  assert.ok(canvas.output.filter(([op]) => op === "drawImage").length >= 8);
  delete renderer.AURA_FX.__flameEmbers;
});

test("ironbound and standardbearer render without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  for (const id of ["ironbound", "standardbearer"]) {
    for (const mode of ["circle", "body"]) {
      const canvas = stubRendererCanvas();
      const inst = renderer.makeAura(canvas, { aura: id, w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40 });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `${id} ${mode}`);
      assert.ok(canvas.output.some(([op]) => op === "drawImage"), `${id} ${mode} drew nothing`);
    }
  }
});

test("atlas and forge render without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  for (const id of ["atlas", "forge"]) {
    for (const mode of ["circle", "body"]) {
      const canvas = stubRendererCanvas();
      const inst = renderer.makeAura(canvas, { aura: id, w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, figure: "/avatars/E.webp" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `${id} ${mode}`);
      assert.ok(canvas.output.some(([op]) => op === "drawImage"), `${id} ${mode} drew nothing`);
    }
  }
});

test("moment start is randomized per mount within the spec interval", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const waits = [];
  for (let i = 0; i < 24; i += 1) {
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "atlas", w: 141, h: 141, mode: "circle", ringR: 40.7 });
    waits.push(inst.momentWait);
  }
  assert.ok(waits.every((t) => t >= 0.4 && t <= 30));
  assert.ok(new Set(waits.map((t) => t.toFixed(2))).size > 12, "first moment waits should differ per mount");
  assert.ok(Math.min(...waits) < 10 && Math.max(...waits) > 15, "waits should spread across the interval");
});

test("atlas moment orbits the avatar faster and faster, then explodes at its centre", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const canvas = stubRendererCanvas();
  const over = stubRendererCanvas();
  const w = 141, cx = w / 2, cy = w / 2;
  const inst = renderer.makeAura(canvas, { aura: "atlas", w, h: w, mode: "circle", ringR: 40.7, overCanvas: over });
  await new Promise((resolve) => setTimeout(resolve, 0));
  inst.forceMoment();
  const sphereXY = [];
  let boomBurst = null;
  for (let i = 0; i < 60 * 8 && inst.moment == null; i += 1) { pageT += 1 / 60; inst.frame(1 / 60); }
  for (let i = 0; i < 60 * 8; i += 1) {
    pageT += 1 / 60; inst.frame(1 / 60);
    if (inst.moment == null) break;
    if (inst.moment > 0.72 && inst.moment < 0.8 && inst.lastBurst?.anchor === "center") boomBurst = inst.lastBurst;
    // Sphere position = the translate feeding its drawImage, on either canvas
    for (const out of [canvas.output, over.output]) {
      for (let j = out.length - 1; j >= 0; j -= 1) {
        const op = out[j];
        if (op[0] === "drawImage" && String(op[1]).includes("stone-sphere")) {
          for (let k = j - 1; k >= 0; k -= 1) {
            if (out[k][0] === "translate") { sphereXY.push({ mt: inst.moment, x: out[k][1], y: out[k][2] }); break; }
          }
          break;
        }
      }
      if (sphereXY.length && sphereXY.at(-1).mt === inst.moment) break;
    }
  }
  assert.ok(sphereXY.length > 30, "moment should run for a while");
  // Angular speed about the avatar centre must grow across the orbit window
  const orb = sphereXY.filter((p) => p.mt > 0.1 && p.mt < 0.6);
  const steps = [];
  for (let i = 1; i < orb.length; i += 1) {
    const a0 = Math.atan2(orb[i - 1].y - cy, orb[i - 1].x - cx);
    const a1 = Math.atan2(orb[i].y - cy, orb[i].x - cx);
    let d = a1 - a0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    steps.push(Math.abs(d));
  }
  const half = Math.floor(steps.length / 2);
  const early = steps.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const late = steps.slice(half).reduce((a, b) => a + b, 0) / (steps.length - half);
  assert.ok(late > early * 2, `orbit should speed up (early ${early.toFixed(4)} vs late ${late.toFixed(4)} rad/frame)`);
  // The orbit sweeps around the avatar, not just above it
  const span = Math.max(...orb.map((p) => p.y)) - Math.min(...orb.map((p) => p.y));
  assert.ok(span > 40, `orbit should sweep a wide arc (y span ${span.toFixed(1)})`);
  // Explosion bursts fire from the avatar centre (torso / photo centre)
  assert.ok(boomBurst, "explosion burst should have fired at the centre anchor");
  assert.ok(Math.abs(boomBurst.x - cx) < 1 && Math.abs(boomBurst.y - cy) < 1,
    `explosion at (${boomBurst.x.toFixed(1)},${boomBurst.y.toFixed(1)}) should be the centre (${cx},${cy})`);
  // Sphere returns to rest after the moment
  assert.ok(inst.moment == null, "moment should have completed");
});

test("forge moment slams and fires a gated flash; never over 3 flashes per second", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "forge", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  for (let elapsed = 0; elapsed < 120; elapsed += 1 / 60) {
    pageT += 1 / 60; inst.frame(1 / 60);
    if (inst.moment == null) inst.forceMoment();
  }
  const times = inst.flashTimes;
  assert.equal(times.length, 40, "flashTimes should fill its 40-entry cap");
  assert.ok(inst.flashes >= times.length);
  for (let i = 1; i < times.length; i += 1) assert.ok(times[i] - times[i - 1] >= 0.334 - 1e-9, "gate min gap");
  for (let i = 0; i < times.length; i += 1) {
    const inWindow = times.filter((t) => t >= times[i] && t < times[i] + 1).length;
    assert.ok(inWindow <= 3, `${inWindow} flashes in one second`);
  }
});

test("reduced motion suppresses the forge flash but the moment still runs", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "forge", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  inst.reduce = true;
  let sawMoment = false;
  for (let i = 0; i < 60 * 12; i += 1) {
    inst.frame(1 / 60);
    if (inst.moment != null) sawMoment = true;
  }
  assert.ok(sawMoment, "moment should still play under reduced motion");
  assert.equal(inst.flashes, 0);
});

test("moment bursts scale with canvas size", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const peak = (w) => {
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "forge", w, h: w, mode: "circle", ringR: w / 3.456 });
    inst.forceMoment();
    let max = 0;
    for (let i = 0; i < 60 * 3; i += 1) { inst.frame(1 / 60); max = Math.max(max, inst.momentParts || 0); }
    return max;
  };
  const board = peak(59), profile = peak(141);
  assert.ok(board >= 20, `board burst too small (${board})`);
  assert.ok(profile >= board * 2, `profile burst (${profile}) should be at least 2x board (${board})`);
});

test("untracking removes every AuraCanvas instance and empties the registry key", () => {
  // AuraCanvas's effect registers via trackAuraInstance and runs the returned
  // cleanup on unmount — this exercises that exact path.
  const live = renderer._auraLiveInstances;
  const a = { id: "a" }, b = { id: "b" };
  const untrackA = renderer.trackAuraInstance("__reg", a);
  const untrackB = renderer.trackAuraInstance("__reg", b);
  assert.equal(live.get("__reg")?.size, 2);
  untrackA();
  assert.equal(live.get("__reg")?.size, 1);
  untrackB();
  assert.ok(!live.has("__reg"), "registry key removed after last unmount");
  assert.equal(live.size, 0, "registry is empty afterwards");
});

test("burst colours given as strings resolve to the full colour, not one character", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  renderer.AURA_FX.__strBurst = { glow: 0, layers: [], moment: { every: [5, 5], dur: 1, bursts: [
    { at: 0.5, path: "radial", shape: "shard", n: 4, c: "#FFF3D0", sp: [50, 90], sz: [2, 3], life: [0.5, 0.8] },
    { at: 0.5, path: "shockring", c: "#FFEFC0", lw: 2, life: [0.4, 0.4] },
  ] } };
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__strBurst", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  inst.forceMoment();
  for (let i = 0; i < 90 && inst.moment == null; i += 1) inst.frame(1 / 60);
  for (let i = 0; i < 90; i += 1) { inst.frame(1 / 60); if (inst.moment == null) break; }
  const colours = canvas.output.filter(([op, key]) => op === "set" && (key === "fillStyle" || key === "strokeStyle")).map(([, , v]) => v);
  assert.ok(colours.includes("#FFF3D0"), "string burst colour painted verbatim");
  assert.ok(colours.includes("#FFEFC0"), "string shockring colour painted verbatim");
  assert.ok(!colours.some((c) => c === "#" || (typeof c === "string" && c.length === 1)), "no single-character colour leaked from pick()");
  delete renderer.AURA_FX.__strBurst;
});

test("head and ground burst anchors land correctly in body and circle modes", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  for (const mode of ["circle", "body"]) {
    renderer.AURA_FX.__anchors = { glow: 0, layers: [], moment: { every: [5, 5], dur: 1, bursts: [
      { at: 0.2, path: "shockring", c: "#FFFFFF", anchor: "face", life: [0.3, 0.3] },
      { at: 0.4, path: "shockring", c: "#FFFFFF", anchor: "head", life: [0.3, 0.3] },
      { at: 0.6, path: "shockring", c: "#FFFFFF", anchor: "ground", life: [0.3, 0.3] },
    ] } };
    const w = 141, h = mode === "body" ? 180 : 141, cy = h / 2, ringR = 40;
    const canvas = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "__anchors", w, h, mode, ringR, figure: "/avatars/E.webp" });
    const seen = {};
    inst.forceMoment();
    for (let i = 0; i < 240 && inst.moment == null; i += 1) inst.frame(1 / 60);
    for (let i = 0; i < 240; i += 1) {
      inst.frame(1 / 60);
      if (inst.lastBurst?.anchor && !seen[inst.lastBurst.anchor]) seen[inst.lastBurst.anchor] = { ...inst.lastBurst };
      if (inst.moment == null) break;
    }
    assert.ok(seen.face && seen.head && seen.ground, `${mode}: all three anchors fired`);
    assert.ok(seen.head.y < seen.face.y - 2, `${mode}: head lands above the face (head y=${seen.head.y.toFixed(1)} face y=${seen.face.y.toFixed(1)})`);
    if (mode === "body") assert.ok(seen.ground.y > h * 0.9, `body: ground lands under the feet (y=${seen.ground.y.toFixed(1)} vs h=${h})`);
    else assert.ok(Math.abs(seen.ground.y - (cy + ringR * 0.97)) < 2, `circle: ground lands at the bottom of the ring (y=${seen.ground.y.toFixed(1)})`);
    assert.ok(Math.abs(seen.head.x - w / 2) < w * 0.3, `${mode}: head stays centred`);
  }
  delete renderer.AURA_FX.__anchors;
});

test("frontOnly orbit particles skip drawing while on the far side", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  renderer.AURA_FX.__frontOnly = { glow: 0, layers: [
    { k: "orbit", n: 4, shape: "shard", c: "#FFFFFF", w: [0.1, 0.1], r: [1.1, 1.1], sz: [3, 3], even: 1, over: 1, frontOnly: 1 },
  ] };
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__frontOnly", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
  const counts = [];
  for (let i = 0; i < 240; i += 1) {
    over.output.length = 0;
    inst.frame(1 / 60);
    counts.push(over.output.filter(([op]) => op === "translate").length);
  }
  const max = Math.max(...counts), min = Math.min(...counts);
  assert.ok(max < 4, `far-side particles were drawn (max ${max}/4 drawn)`);
  assert.ok(min >= 1, "near side should always draw at least one");
  delete renderer.AURA_FX.__frontOnly;
});

test("ejected orbit particles fly outward and fade", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  renderer.AURA_FX.__eject = { glow: 0, layers: [
    { k: "orbit", n: 1, shape: "shard", c: "#FFFFFF", w: [0.05, 0.05], r: [1.1, 1.1], sz: [3, 3], even: 1, eject: { every: [0.3, 0.3], sp: [0.8, 0.8], life: 0.7 } },
  ] };
  const canvas = stubRendererCanvas();
  const cx = 70.5, cy = 70.5;
  const inst = renderer.makeAura(canvas, { aura: "__eject", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  const dists = [];
  let minAlpha = 1;
  for (let i = 0; i < 140; i += 1) {
    canvas.output.length = 0;
    inst.frame(1 / 60);
    const t = canvas.output.filter(([op]) => op === "translate").at(-1);
    if (t) dists.push(Math.hypot(t[1] - cx, t[2] - cy));
    for (const [op, key, v] of canvas.output) if (op === "set" && key === "globalAlpha") minAlpha = Math.min(minAlpha, v);
  }
  const orbitR = dists[0];
  const maxD = Math.max(...dists);
  assert.ok(maxD > orbitR * 1.3, `ejected particle should travel outward (orbit ${orbitR.toFixed(1)} → max ${maxD.toFixed(1)})`);
  assert.ok(minAlpha < 0.5, `ejected particle should fade out (min alpha ${minAlpha.toFixed(2)})`);
  delete renderer.AURA_FX.__eject;
});

test("fallenlight and ossuary render without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  for (const id of ["fallenlight", "ossuary"]) {
    for (const mode of ["circle", "body"]) {
      const canvas = stubRendererCanvas();
      const over = stubRendererCanvas();
      const inst = renderer.makeAura(canvas, { aura: id, w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, overCanvas: over, figure: "/avatars/E.webp" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `${id} ${mode}`);
      assert.ok(canvas.output.some(([op]) => op === "drawImage"), `${id} ${mode} drew nothing`);
    }
  }
});

test("fallenlight flare flickers through the flash gate: <=3 per second, none reduced", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  for (let elapsed = 0; elapsed < 120; elapsed += 1 / 60) {
    pageT += 1 / 60; inst.frame(1 / 60);
    if (inst.moment == null) inst.forceMoment(); // worst case: flares + moment flash together
  }
  const times = inst.flashTimes;
  assert.ok(times.length >= 10, `expected recurring flares to fire (got ${times.length})`);
  for (let i = 0; i < times.length; i += 1) {
    const inWindow = times.filter((t) => t >= times[i] && t < times[i] + 1).length;
    assert.ok(inWindow <= 3, `${inWindow} flashes in one second`);
  }
  const calm = renderer.makeAura(stubRendererCanvas(), { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  calm.reduce = true;
  for (let i = 0; i < 60 * 30; i += 1) calm.frame(1 / 60);
  assert.equal(calm.flashes, 0, "no flares under reduced motion");
});

test("fallenlight moment drops the loose shard and fires one gated flash at the halo", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
  inst.forceMoment();
  const shardY = [];
  let headBurst = null, flashCount = 0;
  for (let i = 0; i < 60 * 8 && inst.moment == null; i += 1) { pageT += 1 / 60; inst.frame(1 / 60); }
  for (let i = 0; i < 60 * 8; i += 1) {
    pageT += 1 / 60; inst.frame(1 / 60);
    if (inst.moment == null) break;
    if (inst.lastBurst?.anchor === "img:/aura/halo-cracked.webp" && inst.moment > 0.28 && inst.moment < 0.5) headBurst = inst.lastBurst;
    for (let j = over.output.length - 1; j >= 0; j -= 1) {
      const op = over.output[j];
      if (op[0] === "drawImage" && String(op[1]).includes("halo-shard")) {
        for (let k = j - 1; k >= 0; k -= 1) {
          if (over.output[k][0] === "translate") { shardY.push({ mt: inst.moment, y: over.output[k][2] }); break; }
        }
        break;
      }
    }
  }
  assert.ok(shardY.length > 10, "shard should be tracked through the moment");
  const rest = shardY[0].y, low = Math.max(...shardY.filter((p) => p.mt > 0.4 && p.mt < 0.8).map((p) => p.y));
  assert.ok(low > rest + 15, `shard should fall from the halo (rest ${rest.toFixed(1)} → ${low.toFixed(1)})`);
  assert.ok(headBurst, "moment bursts should fire from the halo image position");
  assert.ok(inst.flashes > flashCount, "moment flash should fire");
});

test("ossuary moment lifts the bone shards and erupts from the crown", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "ossuary", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
  inst.forceMoment();
  const boneY = [];
  let headBurst = null;
  for (let i = 0; i < 60 * 8 && inst.moment == null; i += 1) { pageT += 1 / 60; inst.frame(1 / 60); }
  for (let i = 0; i < 60 * 8; i += 1) {
    pageT += 1 / 60; inst.frame(1 / 60);
    if (inst.moment == null) break;
    if (inst.lastBurst?.anchor === "img:/aura/crown-bone.webp" && inst.moment > 0.25 && inst.moment < 0.6) headBurst = inst.lastBurst;
    for (const out of [canvas.output, over.output]) {
      for (let j = out.length - 1; j >= 0; j -= 1) {
        const op = out[j];
        if (op[0] === "drawImage" && String(op[1]).includes("bone-shard")) {
          for (let k = j - 1; k >= 0; k -= 1) {
            if (out[k][0] === "translate") { boneY.push({ mt: inst.moment, y: out[k][2] }); break; }
          }
          break;
        }
      }
    }
  }
  assert.ok(boneY.length > 10, "bone shards should be tracked through the moment");
  const rest = boneY[0].y, high = Math.min(...boneY.filter((p) => p.mt > 0.35 && p.mt < 0.75).map((p) => p.y));
  assert.ok(high < rest - 10, `bones should rise from the crown (rest ${rest.toFixed(1)} → ${high.toFixed(1)})`);
  assert.ok(headBurst, "bone eruption bursts should fire from the crown image position");
  assert.ok(inst.flashes > 0, "cold flare should fire through the gate");
});

test("fallenlight flare strikes red lightning through the gate, none under reduced motion", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const reds = ["#FF4D5A", "#FF8A7A", "#D92B2B"];
  const bolts = (out) => out.filter(([op, key, v]) => op === "set" && key === "strokeStyle" && reds.includes(v)).length;
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  let struck = 0;
  for (let i = 0; i < 60 * 60; i += 1) {
    inst.frame(1 / 60);
    if (bolts(canvas.output) > struck) struck = bolts(canvas.output);
  }
  assert.ok(struck >= 2, `expected recurring red bolt strokes (got ${struck})`);
  const calmCv = stubRendererCanvas();
  const calm = renderer.makeAura(calmCv, { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  calm.reduce = true;
  let rFrames = 0;
  for (let i = 0; i < 60 * 40; i += 1) { calmCv.output.length = 0; calm.frame(1 / 60); if (bolts(calmCv.output) > 0) rFrames += 1; }
  assert.ok(rFrames > 0, "reduced motion should still strike occasionally");
  assert.ok(rFrames < 60 * 40 * 0.35, `reduced motion should strike far less often (bolt visible on ${(rFrames / 2400 * 100).toFixed(0)}% of frames)`);
  assert.equal(calm.flashTimes.length, 0, "reduced motion should never flash");
});

test("fallenlight bolts strike several times a second while the wash flash stays gated", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const secs = 10;
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  for (let i = 0; i < secs * 60; i += 1) { pageT += 1 / 60; inst.frame(1 / 60); }
  const rate = inst.boltsFired / secs;
  assert.ok(rate >= 3 && rate <= 9, `bolts should strike several times per second (got ${rate.toFixed(1)}/s)`);
  assert.ok(inst.flashTimes.length >= 3, `expected gated flashes (got ${inst.flashTimes.length})`);
  let maxWin = 0;
  inst.flashTimes.forEach((t) => { maxWin = Math.max(maxWin, inst.flashTimes.filter((u) => u >= t && u < t + 1).length); });
  assert.ok(maxWin <= 3, `flash gate exceeded: ${maxWin} flashes in a 1s window`);
  const calm = renderer.makeAura(stubRendererCanvas(), { aura: "fallenlight", w: 141, h: 141, mode: "circle", ringR: 40.7 });
  calm.reduce = true;
  for (let i = 0; i < secs * 60; i += 1) calm.frame(1 / 60);
  const calmRate = calm.boltsFired / secs;
  assert.ok(calmRate > 0 && calmRate < rate / 3, `reduced motion should strike far less often (${calmRate.toFixed(1)}/s vs ${rate.toFixed(1)}/s)`);
  assert.equal(calm.flashTimes.length, 0, "reduced motion should never flash");
});

test("page flash budget caps five fallenlight plus bonewright and forge at 3 per second", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const mk = (aura) => renderer.makeAura(stubRendererCanvas(), { aura, w: 141, h: 141, mode: "circle", ringR: 40.7 });
  const insts = [0, 1, 2, 3, 4].map(() => mk("fallenlight"));
  insts.push(mk("bonewright"), mk("forge"));
  insts.forEach((i) => i.forceMoment());
  const secs = 12;
  for (let f = 0; f < secs * 60; f += 1) {
    pageT += 1 / 60;
    for (const i of insts) { i.frame(1 / 60); if (i.moment == null) i.forceMoment(); }
  }
  const all = insts.flatMap((i) => i.flashTimes).sort((a, b) => a - b);
  assert.ok(all.length > 6, `expected seven auras to flash often enough to contend (got ${all.length})`);
  for (const t of all) {
    const inWindow = all.filter((u) => u >= t && u < t + 1).length;
    assert.ok(inWindow <= 3, `${inWindow} flashes in a 1s window across the page`);
  }
  // reduced motion: zero flashes anywhere on the page
  const calmSet = [0, 1, 2, 3, 4].map(() => mk("fallenlight"));
  calmSet.push(mk("bonewright"), mk("forge"));
  calmSet.forEach((i) => { i.reduce = true; i.forceMoment(); });
  for (let f = 0; f < 8 * 60; f += 1) { pageT += 1 / 60; for (const i of calmSet) { i.frame(1 / 60); if (i.moment == null) i.forceMoment(); } }
  assert.equal(calmSet.reduce((n, i) => n + i.flashes, 0), 0, "no flashes anywhere under reduced motion");
});

test("ossuary moment swirls the bones faster and faster in a tightening spiral, then settles", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "ossuary", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
  await new Promise((r) => setTimeout(r, 0)); // flush FakeImage onload microtasks
  inst.forceMoment();
  const cx = 70.5, cy = 70.5;
  const pts = [];
  let scanned = 0, started = false;
  for (let i = 0; i < 60 * 8; i += 1) {
    inst.frame(1 / 60);
    if (inst.moment == null) { if (started) break; continue; }
    started = true;
    const out = canvas.output;
    for (let j = out.length - 1; j >= scanned; j -= 1) {
      if (out[j][0] === "drawImage" && String(out[j][1]).includes("bone-shard-1")) {
        for (let k = j - 1; k >= scanned; k -= 1) {
          if (out[k][0] === "translate") {
            pts.push({ mt: inst.moment, ang: Math.atan2(out[k][2] - cy, out[k][1] - cx), r: Math.hypot(out[k][1] - cx, out[k][2] - cy) });
            break;
          }
        }
        break;
      }
    }
    scanned = out.length;
  }
  assert.ok(pts.length > 20, `bone should be tracked through the swirl (got ${pts.length})`);
  // unwrap the angle and measure orbit speed early vs late in the swirl
  let prev = pts[0].ang;
  const speeds = pts.map((p) => {
    let d = p.ang - prev;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    prev = p.ang;
    return { mt: p.mt, v: Math.abs(d) };
  }).slice(1);
  const early = speeds.filter((s) => s.mt > 0.3 && s.mt < 0.45).map((s) => s.v);
  const late = speeds.filter((s) => s.mt > 0.6 && s.mt < 0.73).map((s) => s.v);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  assert.ok(late.length > 3 && mean(late) > mean(early) * 2, `swirl should accelerate (early ${mean(early).toFixed(4)} → late ${mean(late).toFixed(4)} rad/frame)`);
  // spiral: the orbit pulls inward at peak speed
  const restR = pts[0].r, tightR = Math.min(...pts.filter((p) => p.mt > 0.65 && p.mt < 0.78).map((p) => p.r));
  assert.ok(tightR < restR * 0.95, `spiral should tighten (rest ${restR.toFixed(1)} → ${tightR.toFixed(1)})`);
  // settle: last position returns near the rest position
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last.r - restR) < restR * 0.2, `bone should settle back to the crown orbit (rest ${restR.toFixed(1)} → ${last.r.toFixed(1)})`);
  // no explosion: only shower bursts
  for (const b of renderer.AURA_FX.ossuary.moment.bursts) assert.equal(b.path, "shower", `ossuary burst ${b.path} should be a shower, not an explosion`);
});

test("ossuary flying bones split between behind and over layers", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const boneLayers = renderer.AURA_FX.ossuary.layers.filter((L) => String(L.src).includes("bone-shard"));
  assert.ok(boneLayers.some((L) => L.behind), "some bones orbit behind the figure");
  assert.ok(boneLayers.some((L) => L.over && L.frontOnly), "some bones pass in front on the over layer");
});

// --- 7i Part 1: redline worn straw hat ---
const figureHead = (w, h, src) => {
  const lm = FIGURE_ANCHORS[src];
  const figH = h / 1.02, figW = figH * (424 / 568), s = figW / 424;
  return { x: (w - figW) / 2 + lm.head.x * s, y: 0.02 * figH + lm.head.y * s, half: lm.head.half * s };
};

const lastImgDraw = (out, src) => {
  for (let j = out.length - 1; j >= 0; j -= 1) if (out[j][0] === "drawImage" && String(out[j][1]).includes(src)) return out[j];
  return null;
};

test("redline renders without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  for (const mode of ["circle", "body"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "redline", w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, overCanvas: over, figure: "/avatars/E.webp" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `redline ${mode}`);
    assert.ok(lastImgDraw(over.output, "hat-straw"), `redline ${mode} hat drew nothing on the over canvas`);
  }
});

test("redline straw hat anchors to each figure's head and scales from head half-width", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const hat = renderer.AURA_FX.redline.layers.find((L) => String(L.src).includes("hat-straw"));
  const widths = {};
  for (const fig of ["/avatars/E.webp", "/avatars/SS.webp", "/avatars/S-f.webp"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const w = 128, h = 163;
    const inst = renderer.makeAura(canvas, { aura: "redline", w, h, mode: "body", ringR: 40, overCanvas: over, figure: fig });
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const head = figureHead(w, h, fig);
    const xy = inst.imgXY?.["/aura/hat-straw.webp"];
    assert.ok(xy, `hat imgXY missing on ${fig}`);
    assert.ok(Math.abs(xy.x - head.x) < 0.01, `${fig} hat x ${xy.x.toFixed(2)} vs head ${head.x.toFixed(2)}`);
    const d = head.half * hat.headSz;
    const wantY = head.y - head.half - d * (hat.hover ?? 0.14);
    assert.ok(Math.abs(xy.y - wantY) < 0.01, `${fig} hat y ${xy.y.toFixed(2)} vs ${wantY.toFixed(2)}`);
    const di = lastImgDraw(over.output, "hat-straw");
    assert.ok(di, `hat not drawn on ${fig}`);
    widths[fig] = di[4];
    assert.ok(Math.abs(di[4] - d) / d < 0.06, `${fig} hat width ${di[4].toFixed(1)} vs ${d.toFixed(1)}`);
  }
  assert.ok(widths["/avatars/S-f.webp"] > widths["/avatars/E.webp"] * 1.2, "the wider female head must get a wider hat");
});

test("redline straw hat rests on the photo frame's top edge in circle mode", () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const hat = renderer.AURA_FX.redline.layers.find((L) => String(L.src).includes("hat-straw"));
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "redline", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
  inst.frame(1 / 60);
  const xy = inst.imgXY["/aura/hat-straw.webp"];
  const ringTop = 70.5 - 40.7, faceY = 70.5 - 0.16 * 40.7;
  const d = 40.7 * hat.rimSz;
  const wantY = ringTop + d * (hat.rimSink ?? 0.12);
  assert.ok(Math.abs(xy.x - 70.5) < 0.01, `hat x ${xy.x.toFixed(2)} should sit centred on the ring`);
  assert.ok(Math.abs(xy.y - wantY) < 0.01, `hat y ${xy.y.toFixed(2)} vs rim ${wantY.toFixed(2)}`);
  const di = lastImgDraw(over.output, "hat-straw");
  assert.ok(di, "hat not drawn");
  assert.ok(Math.abs(di[4] - d) / d < 0.06, `hat width ${di[4].toFixed(1)} vs ${d.toFixed(1)}`);
  assert.ok(xy.y + di[5] * 0.5 < faceY, `hat bottom ${(xy.y + di[5] * 0.5).toFixed(1)} should stay above the face line ${faceY.toFixed(1)} — on the frame, not over the face`);
});

test("redline hat keeps drawing under reduced motion with a damped bob", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const ys = async (reduce) => {
    const over = stubRendererCanvas();
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "redline", w: 141, h: 141, mode: "circle", ringR: 40.7, overCanvas: over });
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (reduce) inst.reduce = true;
    const out = [];
    for (let i = 0; i < 170; i += 1) {
      inst.frame(1 / 60);
      const di = lastImgDraw(over.output, "hat-straw");
      for (let k = over.output.indexOf(di) - 1; k >= 0; k -= 1) {
        if (over.output[k][0] === "translate") { out.push(over.output[k][2]); break; }
      }
    }
    return out;
  };
  const full = await ys(false), calm = await ys(true);
  const range = (a) => Math.max(...a) - Math.min(...a);
  assert.ok(full.length > 100 && calm.length > 100, "hat should draw under both motions");
  assert.ok(range(full) > 0.5, `hat should visibly bob at full motion (range ${range(full).toFixed(2)})`);
  assert.ok(range(calm) < range(full) * 0.55, `bob should damp under reduce (${range(calm).toFixed(2)} vs ${range(full).toFixed(2)})`);
});

test("atlas sphere wanders a zigzag around the figure instead of resting on the head", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "atlas", w: 128, h: 163, mode: "body", ringR: 40, overCanvas: stubRendererCanvas(), figure: "/avatars/E.webp" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const xs = [], ys = [], zs = [];
  for (let i = 0; i < 60 * 14; i += 1) {
    inst.frame(1 / 60);
    const p = inst.imgXY["/aura/stone-sphere.webp"];
    xs.push(p.x); ys.push(p.y); zs.push(p.z);
  }
  const xr = Math.max(...xs) - Math.min(...xs), yr = Math.max(...ys) - Math.min(...ys);
  assert.ok(xr > 20, `sphere should sweep horizontally (x range ${xr.toFixed(1)}px)`);
  assert.ok(yr > 15, `sphere should zigzag vertically (y range ${yr.toFixed(1)}px)`);
  const revs = (a) => { let n = 0; for (let i = 2; i < a.length; i += 1) if (Math.sign(a[i] - a[i - 1]) !== Math.sign(a[i - 1] - a[i - 2])) n += 1; return n; };
  assert.ok(revs(ys) >= 3, `zigzag should reverse vertically (got ${revs(ys)} reversals)`);
  assert.ok(Math.min(...zs) < -0.5 && Math.max(...zs) > 0.5, `sphere should pass both behind (z<0) and in front (z>0); got ${Math.min(...zs).toFixed(2)}..${Math.max(...zs).toFixed(2)}`);
  const head = figureHead(128, 163, "/avatars/E.webp");
  const behind = xs.filter((x, i) => zs[i] < -0.3);
  assert.ok(behind.every((x) => Math.abs(x - head.x) < head.half * 1.6), "sphere goes behind only while crossing the face horizontally");
});

test("atlas moment orbit lifts off smoothly from the sphere's wander position", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "atlas", w: 128, h: 163, mode: "body", ringR: 40, overCanvas: stubRendererCanvas(), figure: "/avatars/E.webp" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const pos = () => inst.orbitXY?.near || inst.orbitXY?.far;
  for (let i = 0; i < 120; i += 1) inst.frame(1 / 60);
  const before = { ...pos() };
  inst.forceMoment();
  let maxJump = 0, prev = before, maxDist = 0;
  const ccx = 64, ccy = 163 * 0.52;
  for (let i = 0; i < 60 * 5; i += 1) {
    inst.frame(1 / 60);
    const p = pos();
    // lift-off continuity is measured through the orbit phase (mt<=0.7); the
    // sphere is destroyed at the hit and fades back in at its live wander spot
    // during reform, which is an intentional fade, not a position jump
    if (p && inst.moment != null && inst.moment <= 0.7) {
      maxJump = Math.max(maxJump, Math.hypot(p.x - prev.x, p.y - prev.y));
      maxDist = Math.max(maxDist, Math.hypot(p.x - ccx, p.y - ccy));
    }
    if (p) prev = p;
    if (inst.moment == null && i > 10) break;
  }
  assert.ok(maxJump < 8, `orbit should lift off continuously — largest frame-to-frame jump ${maxJump.toFixed(1)}px`);
  assert.ok(maxDist > 30, `sphere should actually orbit out from centre (reached ${maxDist.toFixed(1)}px)`);
});

test("switching a layer's motion kind to one it has no fields for still renders without throwing", () => {
  // The gallery Motion dropdown can set k on a bare layer — before the spawn
  // defaults, rnd(...L.sp) on the missing range crashed makeAura/frame.
  for (const k of ["rise", "fall", "orbit", "inward", "bubble"]) {
    renderer.AURA_FX[`__kindSwitch_${k}`] = { glow: 0, layers: [{ k, n: 4, shape: "dot", c: "#FFD447" }] };
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: `__kindSwitch_${k}`, w: 128, h: 164, mode: "body", figure: "/avatars/E.webp" });
    assert.ok(inst, `instance for k=${k}`);
    for (let i = 0; i < 30; i++) inst.frame(1 / 60);
  }
});

test("a leaderboard card carrying the old crownfall id renders the Redline aura identically", () => {
  // Cards published before the rename still say "crownfall" — the alias must
  // resolve to the redline spec so they draw Redline instead of nothing.
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  const seed = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };
  const run = (aura) => {
    seed();
    const canvas = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura, w: 141, h: 141, mode: "circle", ringR: 40.7 });
    assert.ok(inst, `instance for ${aura}`);
    for (let i = 0; i < 30; i++) inst.frame(1 / 60);
    // serialise the recorded draw calls — gradient/fn values differ by
    // identity across runs even when every draw is identical
    return JSON.stringify(canvas.output, (k, v) => (typeof v === "function" ? "fn" : v));
  };
  assert.equal(run("crownfall"), run("redline"));
});

// --- 7i Part 2: nullpoint blindfold ---

test("nullpoint renders without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  for (const mode of ["circle", "body"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "nullpoint", w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, overCanvas: over, figure: "/avatars/E.webp" });
    inst.frame(0.01); // kicks off the lazy blindfold image load
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `nullpoint ${mode}`);
    assert.ok(lastImgDraw(over.output, "blindfold"), `nullpoint ${mode} blindfold drew nothing on the over canvas`);
  }
});

test("nullpoint blindfold sits on the eye line and spans both eyes on every figure", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const foldY = renderer.AURA_FX.nullpoint.foldY || 0;
  const widths = {};
  for (const fig of ["/avatars/E.webp", "/avatars/SS.webp", "/avatars/S-f.webp"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const w = 128, h = 163;
    const inst = renderer.makeAura(canvas, { aura: "nullpoint", w, h, mode: "body", ringR: 40, overCanvas: over, figure: fig });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const head = figureHead(w, h, fig);
    const di = lastImgDraw(over.output, "blindfold");
    assert.ok(di, `blindfold not drawn on ${fig}`);
    const bx = di[2] + di[4] / 2;
    const by = di[3] + di[5] * 0.38; // the cloth band's centre line
    assert.ok(Math.abs(bx - head.x) < 0.5, `${fig} fold centre x ${bx.toFixed(2)} vs face ${head.x.toFixed(2)}`);
    assert.ok(Math.abs(by - (head.y + head.half * foldY)) < 0.5, `${fig} fold centre y ${by.toFixed(2)} vs eye line ${(head.y + head.half * foldY).toFixed(2)}`);
    // eyes sit at face.x ± eyeX with width eyeW: band must reach past both
    const eyeSpan = head.half * ((9 + 4) / 22.5);
    assert.ok(di[4] / 2 > eyeSpan, `${fig} fold half-width ${(di[4] / 2).toFixed(2)} should clear the outer eye edge ${eyeSpan.toFixed(2)}`);
    widths[fig] = di[4];
  }
  assert.ok(widths["/avatars/S-f.webp"] > widths["/avatars/E.webp"] * 1.2, "the wider female head must get a wider blindfold");
});

test("nullpoint tails trail past the band ends and flutter under reduced motion", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const w = 128, h = 163;
  const tipXs = async (reduce) => {
    const over = stubRendererCanvas();
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "nullpoint", w, h, mode: "body", ringR: 40, overCanvas: over, figure: "/avatars/E.webp" });
    inst.frame(1 / 60); // kicks off the lazy blindfold image load
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (reduce) inst.reduce = true;
    const out = [];
    for (let i = 0; i < 300; i += 1) {
      inst.frame(1 / 60);
      // the stub output accumulates across frames — only look at ops after
      // this frame's clearRect
      const start = over.output.map((o, j) => (o[0] === "clearRect" ? j : -1)).reduce((a, b) => Math.max(a, b), 0);
      const frame = over.output.slice(start);
      const quads = frame.filter((o) => o[0] === "quadraticCurveTo");
      // two tails per frame, each two quads — the tip quad ends farthest out;
      // its y flutters with time
      if (quads.length) {
        const tip = quads.reduce((a, b) => (b[3] > a[3] ? b : a));
        out.push(tip[4]);
      }
    }
    return out;
  };
  const full = await tipXs(false), calm = await tipXs(true);
  const range = (a) => Math.max(...a) - Math.min(...a);
  assert.ok(full.length > 200 && calm.length > 200, "tails should draw under both motions");
  assert.ok(range(full) > 1, `tails should visibly flutter at full motion (range ${range(full).toFixed(2)})`);
  assert.ok(range(calm) < range(full) * 0.55, `tail flutter should damp under reduce (${range(calm).toFixed(2)} vs ${range(full).toFixed(2)})`);
});

test("nullpoint circle: override widens only the ring blindfold", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  const bandW = async (mode, figure) => {
    const over = stubRendererCanvas();
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "nullpoint", w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40.7, overCanvas: over, figure });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const di = lastImgDraw(over.output, "blindfold");
    return di ? di[4] : 0;
  };
  const ring = await bandW("circle"), body = await bandW("body", "/avatars/E.webp");
  const fx = renderer.AURA_FX.nullpoint;
  assert.ok(fx.circle.foldW > fx.foldW, "shipped spec must carry a wider circle: foldW");
  assert.ok(ring > body * 2, `ring band ${ring.toFixed(1)} should dominate the body band ${body.toFixed(1)}`);
});

// --- 7i Part 3: ledger cloak, mask, record pages, the stamp moment ---

// Seed the cloak/mask records with their real aspect so geometry assertions
// match production (FakeImage loads 20x10 otherwise).
const seedLedgerArt = () => {
  renderer._auraImageCache.set("/aura/robe-ledger.webp", { img: { src: "/aura/robe-ledger.webp", naturalWidth: 447, naturalHeight: 512 }, ready: true, failed: false });
  renderer._auraImageCache.set("/aura/mask-ledger.webp", { img: { src: "/aura/mask-ledger.webp", naturalWidth: 301, naturalHeight: 384 }, ready: true, failed: false });
};

// The translate op feeding the FIRST drawImage of `src` — that's the piece's
// canvas-space anchor (robe hangs from it, mask floats at it).
const imgAnchor = (out, src) => {
  for (let j = 0; j < out.length; j += 1) {
    if (out[j][0] === "drawImage" && String(out[j][1]).includes(src)) {
      for (let k = j - 1; k >= 0; k -= 1) {
        if (out[k][0] === "translate") return { x: out[k][1], y: out[k][2], draw: out[j] };
        if (out[k][0] === "save") break;
      }
      return { draw: out[j] };
    }
  }
  return null;
};

const figurePointAt = (w, h, lx, ly) => {
  const figH = h / 1.02, figW = figH * (424 / 568), s = figW / 424;
  return { x: (w - figW) / 2 + lx * s, y: 0.02 * figH + ly * s, s };
};

test("ledger renders without throwing in circle and body modes", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  for (const mode of ["circle", "body"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "ledger", w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, overCanvas: over, figure: "/avatars/E.webp" });
    inst.frame(0.01);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.doesNotThrow(() => { for (let i = 0; i < 5; i += 1) inst.frame(0.4); }, `ledger ${mode}`);
    assert.ok(lastImgDraw(canvas.output, "robe-ledger"), `ledger ${mode} cloak drew nothing on the main canvas`);
    assert.ok(lastImgDraw(over.output, "mask-ledger"), `ledger ${mode} mask drew nothing on the over canvas`);
  }
});

test("ledger cloak hangs from each figure's shoulder line", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  const widths = {};
  for (const fig of ["/avatars/E.webp", "/avatars/SS.webp", "/avatars/S-f.webp"]) {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const w = 128, h = 163;
    const inst = renderer.makeAura(canvas, { aura: "ledger", w, h, mode: "body", ringR: 40, overCanvas: over, figure: fig });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const lm = FIGURE_ANCHORS[fig];
    const shoulder = figurePointAt(w, h, lm.shoulder.x, lm.shoulder.y);
    const headHalf = lm.head.half * shoulder.s;
    const anchor = imgAnchor(canvas.output, "robe-ledger");
    assert.ok(anchor, `cloak not drawn on ${fig}`);
    assert.ok(Math.abs(anchor.x - shoulder.x) < 0.5, `${fig} cloak x ${anchor.x.toFixed(2)} vs shoulder ${shoulder.x.toFixed(2)}`);
    const expectedTop = shoulder.y - headHalf * (renderer.AURA_FX.ledger.robeRise ?? 1.6);
    assert.ok(Math.abs(anchor.y - expectedTop) < 0.5, `${fig} cloak top ${anchor.y.toFixed(2)} vs collar line ${expectedTop.toFixed(2)}`);
    widths[fig] = anchor.draw[8]; // 9-arg drawImage: dw is the strip width
  }
  assert.ok(widths["/avatars/SS.webp"] > widths["/avatars/E.webp"] * 1.05, "the broader-shouldered figure must get a wider cloak");
});

test("ledger mask floats clear of the face on every figure", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  for (const fig of ["/avatars/E.webp", "/avatars/SS.webp", "/avatars/S-f.webp"]) {
    const over = stubRendererCanvas();
    const w = 128, h = 163;
    const inst = renderer.makeAura(stubRendererCanvas(), { aura: "ledger", w, h, mode: "body", ringR: 40, overCanvas: over, figure: fig });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const m = imgAnchor(over.output, "mask-ledger");
    assert.ok(m, `mask not drawn on ${fig}`);
    const head = figureHead(w, h, fig);
    const half = Math.hypot(m.draw[4], m.draw[5]) / 2; // rotated bounding radius
    assert.ok(m.x - half > head.x + head.half, `${fig} mask edge ${(m.x - half).toFixed(2)} must clear the head edge ${(head.x + head.half).toFixed(2)}`);
  }
});

test("ledger record pages tumble and one in three carries a red-inked name", () => {
  const canvas = stubRendererCanvas();
  const ctx = canvas.getContext();
  const base = { sz: 3, c: "#E8E0CC", rot: 0.2, ph: 0.5, age: 0.5, life: 2 };
  for (const i of [0, 1, 2]) renderer.drawNewParticleShape(ctx, "page", { ...base, i }, 20 + i * 20, 20, 0.5);
  assert.ok(canvas.output.some(([op]) => op === "fill"), "page drew nothing");
  const inks = canvas.output.filter(([op, key, v]) => op === "set" && key === "strokeStyle" && v === "#A3151F");
  assert.equal(inks.length, 1, "only the i%3===0 page should carry the red name");
});

test("ledger moment flares emblems in order, inks the page, slams the stamp, gates the flash", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const canvas = stubRendererCanvas(), over = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "ledger", w: 141, h: 141, mode: "circle", ringR: 40.8, overCanvas: over });
  inst.frame(1 / 60);
  await new Promise((resolve) => setTimeout(resolve, 0));
  inst.forceMoment();
  // emblem alpha = the globalAlpha set right before each #E03040 stroke
  const emblemAlphas = (out, from) => {
    const found = [];
    for (let j = from; j < out.length; j += 1) {
      if (out[j][0] === "set" && out[j][1] === "strokeStyle" && out[j][2] === "#E03040") {
        for (let k = j - 1; k >= 0; k -= 1) {
          if (out[k][0] === "set" && out[k][1] === "globalAlpha") { found.push(out[k][2]); break; }
          if (out[k][0] === "restore") break;
        }
      }
    }
    return found;
  };
  const stepUntil = (mt) => { for (let i = 0; i < 60 * 8 && (inst.moment == null || inst.moment < mt); i += 1) { pageT += 1 / 60; inst.frame(1 / 60); } };
  stepUntil(0.05); // inside the moment, before the first emblem flare (0.08)
  const idleMax = Math.max(...emblemAlphas(canvas.output, 0));
  let mark = canvas.output.length;
  stepUntil(0.4); // several emblems have flared by now
  const flareMax = Math.max(...emblemAlphas(canvas.output, mark));
  assert.ok(flareMax > idleMax + 0.15, `emblems should flare during the moment (idle max ${idleMax.toFixed(2)} vs flare ${flareMax.toFixed(2)})`);
  stepUntil(0.82); // page inked, stamp down
  const sets = over.output.filter(([op, key]) => op === "set" && key === "strokeStyle").map(([, , v]) => v);
  assert.ok(sets.includes("#A3151F"), "no red-inked name drawn on the record page");
  assert.ok(sets.includes("#C2001F"), "no crimson seal stamp drawn");
  assert.equal(inst.flashes, 1, "stamp flash should fire exactly once");
  assert.equal(inst.flashTimes.length, 1);
});

test("ledger reduced motion suppresses the stamp flash and calms the cloak", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  pageT = 0; renderer.setFlashPageClock(() => pageT);
  const swayRange = async (reduce) => {
    const canvas = stubRendererCanvas(), over = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "ledger", w: 141, h: 141, mode: "circle", ringR: 40.8, overCanvas: over });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (reduce) inst.reduce = true;
    const rots = [];
    for (let i = 0; i < 240; i += 1) {
      inst.frame(1 / 60);
      const start = canvas.output.map((o, j) => (o[0] === "clearRect" ? j : -1)).reduce((a, b) => Math.max(a, b), 0);
      const frame = canvas.output.slice(start);
      const idx = frame.findIndex((o) => o[0] === "drawImage" && String(o[1]).includes("robe-ledger"));
      for (let k = idx - 1; k >= 0; k -= 1) { if (frame[k][0] === "rotate") { rots.push(frame[k][1]); break; } }
    }
    return Math.max(...rots) - Math.min(...rots);
  };
  const full = await swayRange(false), calm = await swayRange(true);
  assert.ok(full > 0.01, `cloak should sway at full motion (range ${full.toFixed(4)})`);
  assert.ok(calm < full * 0.6, `cloak sway should damp under reduce (${calm.toFixed(4)} vs ${full.toFixed(4)})`);
  // forced moment under reduce: no flash ever
  const inst = renderer.makeAura(stubRendererCanvas(), { aura: "ledger", w: 141, h: 141, mode: "circle", ringR: 40.8, overCanvas: stubRendererCanvas() });
  await new Promise((resolve) => setTimeout(resolve, 0));
  inst.reduce = true;
  for (let i = 0; i < 60 * 8; i += 1) { pageT += 1 / 60; inst.frame(1 / 60); if (inst.moment == null) inst.forceMoment(); }
  assert.equal(inst.flashes, 0, "reduced motion must not flash");
  assert.equal(inst.flashTimes.length, 0);
});

test("ledger cloak ends before the canvas bottom edge on the ring", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  seedLedgerArt();
  for (const [size, ringR] of [[141, 40.8], [59, 17.2]]) {
    const canvas = stubRendererCanvas();
    const inst = renderer.makeAura(canvas, { aura: "ledger", w: size, h: size, mode: "circle", ringR });
    inst.frame(1 / 60);
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.frame(1 / 60);
    const strips = canvas.output.filter((o) => o[0] === "drawImage" && String(o[1]).includes("robe-ledger"));
    assert.ok(strips.length, `no cloak strips on a ${size}px ring`);
    const anchor = imgAnchor(canvas.output, "robe-ledger");
    // strips draw local y up to their height — hem = anchor.y + deepest strip bottom
    const hem = anchor.y + Math.max(...strips.map((o) => o[7] + o[9]));
    assert.ok(hem <= size - 2, `cloak hem ${hem.toFixed(1)}px must end inside a ${size}px canvas`);
  }
});

// --- view-scoped overrides: body:/circle: blocks + gallery write path ---

import { applyScopedEdit } from "./specFormat.js";

const seedRng = () => { let st = 0x7f2a11; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; };

// One layer per field type under test; the img layer exercises `rot`.
const scopeSpec = () => ({
  spd: 1,
  layers: [
    { k: "orbit", n: 4, shape: "dot", r: [0.6, 0.9], w: [0.3, 0.3], sz: [3, 3], c: "#FF8800", at: [0, 1.5] },
    // spark strokes record strokeStyle — the colour case lives here (dot
    // particles draw via a cached glow sprite, invisible to the call stream)
    { k: "rise", n: 5, shape: "spark", sp: [10, 12], life: [2, 2], sz: [2, 2], c: ["#00FF88"], sway: 2 },
    { k: "orbit", n: 1, shape: "img", src: "scope-rot.webp", r: [0.5, 0.5], w: [0, 0], sz: [8, 8], rot: 0.1, even: 1, at: 0, x: 0, y: 0 },
  ],
});

// Render a spec through makeAura in one mode and serialise the recorded draw
// calls — identical pixel output produces identical call streams.
const runScope = async (spec, mode) => {
  renderer.AURA_FX.__scope = spec;
  seedRng();
  const canvas = stubRendererCanvas();
  const inst = renderer.makeAura(canvas, { aura: "__scope", w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40, figure: "/avatars/E.webp" });
  inst.frame(1 / 60); // kicks off the lazy img load
  await new Promise((resolve) => setTimeout(resolve, 0));
  const mark = canvas.output.length;
  for (let i = 0; i < 20; i++) inst.frame(1 / 60);
  return JSON.stringify(canvas.output.slice(mark), (k, v) => (typeof v === "function" ? "fn" : v));
};

const SCOPE_CASES = [
  ["position", ["layers", 2, "x"], 0.4],
  ["size", ["layers", 0, "sz", 0], 7],
  ["rotation", ["layers", 2, "rot"], 0.45],
  ["speed", ["layers", 1, "sp", 0], 30],
  ["colour", ["layers", 1, "c", 0], "#FF00FF"],
  ["count", ["layers", 0, "n"], 9],
  ["aura speed (spec-level)", ["spd"], 2.2],
];

for (const [name, path, value] of SCOPE_CASES) {
  test(`view scope: body-only ${name} edit changes the body render and leaves the ring pixel-identical`, async () => {
    globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
    globalThis.Image = FakeImage;
    installAlphaDocument();
    const base = scopeSpec();
    const variant = applyScopedEdit(base, path, value, "body");
    assert.notEqual(await runScope(variant, "body"), await runScope(base, "body"), `body render should change for ${name}`);
    assert.equal(await runScope(variant, "circle"), await runScope(base, "circle"), `ring render must stay identical for ${name}`);
  });
  test(`view scope: ring-only ${name} edit changes the ring render and leaves the body pixel-identical`, async () => {
    globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
    globalThis.Image = FakeImage;
    installAlphaDocument();
    const base = scopeSpec();
    const variant = applyScopedEdit(base, path, value, "circle");
    assert.equal(await runScope(variant, "body"), await runScope(base, "body"), `body render must stay identical for ${name}`);
    assert.notEqual(await runScope(variant, "circle"), await runScope(base, "circle"), `ring render should change for ${name}`);
  });
  test(`view scope: both-views ${name} edit changes both renders`, async () => {
    globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
    globalThis.Image = FakeImage;
    installAlphaDocument();
    const base = scopeSpec();
    const variant = applyScopedEdit(base, path, value, "both");
    assert.notEqual(await runScope(variant, "body"), await runScope(base, "body"), `body render should change for ${name}`);
    assert.notEqual(await runScope(variant, "circle"), await runScope(base, "circle"), `ring render should change for ${name}`);
  });
}

test("view scope: shipped circle: overrides still render and stay out of body mode", async () => {
  globalThis.window = { devicePixelRatio: 1, location: { search: "" } };
  globalThis.Image = FakeImage;
  installAlphaDocument();
  // inferno layer 0 ships circle:{ sz, r } — stripping it must change the ring
  // render (the override is live) but leave the body render untouched.
  const withOv = renderer.AURA_FX.inferno;
  const without = { ...withOv, layers: withOv.layers.map((l) => { const { circle: _drop, ...rest } = l; return rest; }) };
  renderer.AURA_FX.__infernoNoCircle = without;
  const ring = (spec, mode) => { seedRng(); const c = stubRendererCanvas(); const i = renderer.makeAura(c, { aura: spec, w: 141, h: mode === "body" ? 180 : 141, mode, ringR: 40 }); for (let k = 0; k < 20; k++) i.frame(1 / 60); return JSON.stringify(c.output, (k2, v) => (typeof v === "function" ? "fn" : v)); };
  assert.notEqual(ring("inferno", "circle"), ring("__infernoNoCircle", "circle"), "shipped circle: override should change the ring render");
  assert.equal(ring("inferno", "body"), ring("__infernoNoCircle", "body"), "circle: override must not leak into body mode");
  delete renderer.AURA_FX.__infernoNoCircle;
});
