// Lossless JS for an AURA_FX entry. A copied spec parses back to the same value.

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function cloneSpec(value) {
  if (Array.isArray(value)) return value.map(cloneSpec);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = cloneSpec(value[key]);
    return out;
  }
  return value;
}

function ident(key) {
  return IDENT.test(key) ? key : JSON.stringify(key);
}

function fmt(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "null";
    return Object.is(value, -0) ? "-0" : String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "null";
  if (Array.isArray(value)) return `[${value.map(fmt).join(", ")}]`;
  const keys = Object.keys(value);
  return `{ ${keys.map((key) => `${ident(key)}: ${fmt(value[key])}`).join(", ")} }`;
}

export function formatAuraEntry(id, spec) {
  return `${ident(id)}: ${fmt(spec)}`;
}

export function parseAuraEntry(src) {
  const text = String(src).trim().replace(/;\s*$/, "");
  const match = text.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
  if (!match) throw new Error("aura entry must look like id: { ... }");
  const spec = Function(`"use strict"; return (${match[2]});`)();
  return { id: match[1], spec };
}

export function setPath(root, path, value) {
  const next = cloneSpec(root);
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
  return next;
}

// setPath can't create missing intermediate objects — view override blocks
// don't exist until first written.
export function setDeep(root, path, value) {
  const next = cloneSpec(root);
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) cur[path[i]] = typeof path[i + 1] === "number" ? [] : {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
  return next;
}

// Removes a key and prunes empty parents (e.g. deleting the last override).
export function deleteDeep(root, path) {
  const next = cloneSpec(root);
  const stack = [];
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) return next;
    stack.push([cur, path[i]]);
    cur = cur[path[i]];
  }
  delete cur[path[path.length - 1]];
  for (let i = stack.length - 1; i >= 0; i--) {
    const [parent, key] = stack[i];
    if (parent[key] && typeof parent[key] === "object" && !Array.isArray(parent[key]) && Object.keys(parent[key]).length === 0) delete parent[key];
    else break;
  }
  return next;
}

export const walkPath = (root, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), root);

// --- View-scoped overrides -------------------------------------------------
// `body:` fields apply only to body/figure renders, `circle:` only to the
// avatar ring, `small:` on top of the active view block whenever the canvas
// is under SMALL_VIEW_PX wide (a size scope — it fires in either mode; no
// <110px body canvas exists today, so body rendering is byte-identical),
// `large:` on top of the active view block whenever the canvas is at or over
// LARGE_VIEW_PX (crate160 only — ring141 stays under it, so `large:` is how a
// fix reaches the crate without moving a pixel on the tested sizes).
// The same merge runs in the renderer (per frame mode) and in the editor
// (the merged view a scope edits): plain-object fields merge one level deep
// so a partial override inherits the rest of a nested block (bolts, wander,
// ...); arrays and scalars replace wholesale.
export const VIEW_BLOCKS = ["body", "circle", "small", "large"];
export const SMALL_VIEW_PX = 110;
export const LARGE_VIEW_PX = 150;

// Ordered view blocks for a render: base -> view -> small|large, most specific last.
export function viewBlocksFor(mode, w) {
  const view = mode === "body" ? "body" : "circle";
  if (w < SMALL_VIEW_PX) return [view, "small"];
  if (w >= LARGE_VIEW_PX) return [view, "large"];
  return [view];
}

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

export function mergeViewObject(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over)) {
    const b = base[k], o = over[k];
    out[k] = isPlainObject(b) && isPlainObject(o) ? { ...b, ...o } : o;
  }
  return out;
}
export function mergeViewSpec(spec, view) {
  const ov = spec?.[view];
  return isPlainObject(ov) ? mergeViewObject(spec, ov) : spec;
}
export function mergeViewLayer(layer, view) {
  const ov = layer?.[view];
  return isPlainObject(ov) ? mergeViewObject(layer, ov) : layer;
}

// Full chain for one render: base -> view -> small (<110 px) | large (>=150 px).
export function mergeSpecForView(spec, mode, w) {
  let out = spec;
  for (const v of viewBlocksFor(mode, w)) out = mergeViewSpec(out, v);
  return out;
}
export function mergeLayerForView(layer, mode, w) {
  let out = layer;
  for (const v of viewBlocksFor(mode, w)) out = mergeViewLayer(out, v);
  return out;
}

// `small: { scale: k }` — the one-number opt-in: multiplies the merged
// layer's particle size (sz) and count (n), plus shadow sz/max (locked keys
// scale can't override). Call only when the small block applies; `factor` is
// spec.small.scale x layer.small.scale combined by the caller. An explicit
// key inside the layer's own small: block beats scale for that field.
const mulScaled = (v, k) => (Array.isArray(v) ? v.map((x) => (typeof x === "number" ? x * k : x)) : typeof v === "number" ? v * k : v);
export function applySmallScale(layer, factor) {
  if (!isPlainObject(layer) || !Number.isFinite(factor) || factor === 1) return layer;
  const own = isPlainObject(layer.small) ? layer.small : {};
  const out = { ...layer };
  if (out.n != null && !("n" in own)) {
    out.n = mulScaled(out.n, factor);
    // even distribution needs integer counts
    if (out.even) out.n = Array.isArray(out.n) ? out.n.map((x) => Math.max(1, Math.round(x))) : Math.max(1, Math.round(out.n));
  }
  if (out.sz != null && !("sz" in own)) out.sz = mulScaled(out.sz, factor);
  const s = out.shadow;
  if (isPlainObject(s)) {
    const s2 = { ...s };
    for (const f of ["sz", "max"]) if (s2[f] != null) s2[f] = mulScaled(s2[f], factor);
    out.shadow = s2;
  }
  return out;
}

// What small: may change — size, count and speed only (7m decision). Any
// other key keeps the aura recognisably the same aura at 52 px as at 141 px.
export const SMALL_ALLOWED_KEYS = new Set([
  "n", "max", "anchors", "ringN", // count
  "sz", "r", "spawnR", "sway", "jit", "headSz", "rimSz", "glyphS", "mR", "mScale", "sx", "sy", // size
  "sp", "spd", "w", "spin", "rotW", "drift", "life", "every", "gap", "rate", "dur", "period", "cyclePeriod", // speed/timing
  "scale", // meta: the one-number multiplier
  "treatRim", // edge-lighting override on an existing treated sprite (7m amendment)
]);

// Rim appearance only — colour, offset, alpha. A dark silhouette needs more
// rim at 52px than at 141px to read at all; this does not open small: to
// palette or shape changes (the sprite itself is unchanged).
const RIM_KEYS = new Set(["c", "dx", "dy", "a"]);
function isRimBlock(v) {
  if (!isPlainObject(v)) return false;
  for (const k of Object.keys(v)) {
    if (!RIM_KEYS.has(k)) return false;
    if (k === "c" ? !HEX.test(v[k]) : !Number.isFinite(v[k])) return false;
  }
  return true;
}

// Returns a list of violations; empty = valid. Runs over every AURA_FX entry
// in tests, so a bad small: block fails `check`. Not on the render hot path.
export function validateSpec(spec) {
  const violations = [];
  if (!isPlainObject(spec)) return violations;
  const walk = (block, path) => {
    for (const k of Object.keys(block)) {
      const v = block[k];
      const p = path.concat(k).join(".");
      if (k === "layers" || VIEW_LOCKED_LAYER_KEYS.has(k)) {
        violations.push(`${p}: structural/locked key — not allowed inside small:`);
        continue;
      }
      if (k === "treatRim") {
        if (!isRimBlock(v)) violations.push(`${p}: rim keys are c/dx/dy/a — hex colour, numeric offset and alpha`);
        continue;
      }
      if (isPlainObject(v)) { walk(v, path.concat(k)); continue; }
      if (Array.isArray(v) && v.some((x) => isPlainObject(x))) {
        v.forEach((item, i) => { if (isPlainObject(item)) walk(item, path.concat(k, i)); });
        continue;
      }
      const numeric = typeof v === "number" ? Number.isFinite(v) : Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isFinite(x));
      if (!numeric) { violations.push(`${p}: small: values must be numbers or numeric ranges`); continue; }
      if (!SMALL_ALLOWED_KEYS.has(k)) violations.push(`${p}: not a size/count/speed key`);
      else if (k === "scale" && !(Array.isArray(v) ? v.every((x) => x > 0) : v > 0)) violations.push(`${p}: scale must be > 0`);
    }
  };
  if (isPlainObject(spec.small)) walk(spec.small, ["small"]);
  (spec.layers || []).forEach((L, i) => {
    if (isPlainObject(L?.small)) walk(L.small, ["layers", i, "small"]);
  });
  return violations;
}

// Layer keys that stay structural/shared — never written into a view block.
export const VIEW_LOCKED_LAYER_KEYS = new Set(["k", "shape", "src", "frames", "frameMode", "frameOffsets", "frameDuration", "fadeLen", "shadow", "embers", "placed", "blend", "e", "body", "circle", "small", "large"]);

// The override-block path a field writes to in a scoped view — null when the
// field must write the shared value instead ("both" scope, or a structural
// layer key). honorLocks=false reports where an override would live even for
// locked keys, so markers/clear can still find hand-written ones.
export function scopedPath(path, view, honorLocks = true) {
  if (!VIEW_BLOCKS.includes(view)) return null;
  if (VIEW_BLOCKS.includes(path[0])) return null;
  if (path[0] === "layers") {
    if (path.length < 3) return null;
    if (honorLocks && VIEW_LOCKED_LAYER_KEYS.has(path[2])) return null;
    return ["layers", path[1], view, ...path.slice(2)];
  }
  return [view, ...path];
}

// View-aware write shared by the editor and the effect test. "both" writes
// the shared value and drops any per-view override on that field so it
// actually reaches both views; a scoped write lands in the matching block.
export function applyScopedEdit(spec, path, value, view) {
  const block = scopedPath(path, view);
  if (!block) {
    let next = setDeep(spec, path, value);
    if (view === "both") {
      for (const v of VIEW_BLOCKS) {
        const p = scopedPath(path, v, false);
        if (p && walkPath(next, p) !== undefined) next = deleteDeep(next, p);
      }
    }
    return next;
  }
  const isLayer = path[0] === "layers";
  const merged = isLayer ? mergeViewLayer(spec.layers?.[path[1]], view) : mergeViewSpec(spec, view);
  const prefix = isLayer ? block.slice(0, 3) : block.slice(0, 1);
  const rel = isLayer ? path.slice(2) : path;
  // Every array-valued ancestor on the write path must be cloned wholesale
  // into the block — merged arrays replace rather than merge, so a partial
  // block would otherwise produce a sparse/corrupt array. This also seeds
  // range pairs: editing one end keeps the other end's effective value.
  let next = spec;
  const acc = [...prefix];
  for (let j = 0; j < rel.length - 1; j++) {
    acc.push(rel[j]);
    const mv = walkPath(merged, rel.slice(0, j + 1));
    if (walkPath(next, acc) == null && Array.isArray(mv)) next = setDeep(next, acc, cloneSpec(mv));
  }
  return setDeep(next, block, value);
}

// Drop the view override for a field — the field falls back to the shared
// value. "both" clears whichever blocks hold one.
export function clearScopedOverride(spec, path, view) {
  let next = spec;
  for (const v of view === "both" ? VIEW_BLOCKS : [view]) {
    const p = scopedPath(path, v, false);
    if (p && walkPath(next, p) !== undefined) next = deleteDeep(next, p);
  }
  return next;
}

export function hasScopedOverride(spec, path, view) {
  return (view === "both" ? VIEW_BLOCKS : [view]).some((v) => {
    const p = scopedPath(path, v, false);
    return !!p && walkPath(spec, p) !== undefined;
  });
}

// Which view blocks hold an override for a field — for marker tooltips.
export function scopedOverrideViews(spec, path) {
  return VIEW_BLOCKS.filter((v) => {
    const p = scopedPath(path, v, false);
    return !!p && walkPath(spec, p) !== undefined;
  });
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function specFields(value, path = [], out = []) {
  if (typeof value === "number" && Number.isFinite(value)) out.push({ path, kind: "number", value });
  else if (typeof value === "string" && HEX.test(value)) out.push({ path, kind: "color", value });
  else if (Array.isArray(value)) value.forEach((item, i) => specFields(item, path.concat(i), out));
  else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) specFields(value[key], path.concat(key), out);
  }
  return out;
}
