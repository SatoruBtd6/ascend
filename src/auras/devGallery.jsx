// Dev-only aura tuning gallery. Loaded from a DEV branch in Auth so production builds drop this module.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { resolveAuraAnchors, HEAD_FROM_EYE } from "./anchors.js";
import { AURA_FX, AuraCanvas, AuraLoop, _auraImageCache, auraNeedsOver, drawNewParticleShape, fireAuraMoment } from "./AuraCanvas.jsx";
import { AURAS, resolveAuraId } from "./catalog.js";
import { cloneSpec, formatAuraEntry, specFields } from "./specFormat.js";
import { C, applyTheme } from "../theme.js";
import { Avatar } from "../tabs/profile/Avatar.jsx";
import { TIER_IDS, physiqueSrc } from "../tabs/train/physique.js";

// Circle stages use production Avatar -> AuraRing geometry so tuned values
// clip exactly like the real app: canvas = round(avatar*1.45*1.28), ring
// radius = avatar*1.45/2.7 (canvas/ring = 3.456), face = avatar (~0.54 canvas).
const ringGeom = (avatar) => ({ avatar, cpx: Math.round(avatar * 1.45 * 1.28), ring: (avatar * 1.45) / 2.7 });
const SIZES = [
  { id: "32", label: "32 board", px: 32, ...ringGeom(32) },
  { id: "76", label: "76 profile", px: 76, ...ringGeom(76) },
  { id: "88", label: "88 studio", px: 88, ...ringGeom(88) },
  { id: "160", label: "160 crate", px: 160, ...ringGeom(160) },
  { id: "inspect", label: "inspect", px: 320, ...ringGeom(172) },
];

const FIGURES = [];
for (let tier = 0; tier < TIER_IDS.length; tier++) {
  for (const sex of ["m", "f"]) {
    const src = physiqueSrc(sex, tier);
    FIGURES.push({ id: src, label: sex === "f" ? `${TIER_IDS[tier]} female` : TIER_IDS[tier], src });
  }
}

const SHAPE_SHEET = {
  ash: "#9CA3AF",
  feather: "#F8FAFC",
  bonechip: "#F0EAD2",
  coin: "#FFD447",
  crescent: "#FFF1B8",
  pulse: "#7DF9FF",
  sandgrain: "#E8C872",
  chainlink: "#CBD5E1",
};

export const FLAG_KEYS = new Set(["flip", "even", "behind", "tw", "bob", "dash", "ink", "dark", "flash", "strike", "calm", "breathe", "glint", "over", "top", "flick", "fan", "artLate", "rim", "frontOnly"]);


// Semantic ranges per field — keyed by spec path so overloaded keys get the
// range the renderer actually expects in that section. For pair fields
// (w[0], sp[1], ...) the last path element is the array index, so the key is
// the second-to-last element.
const FIELD_RANGES = {
  spd: { min: 0, max: 8, step: 0.01 },
  glow: { min: 0, max: 1.5, step: 0.01 },
  jit: { min: 0, max: 1, step: 0.01 },
  a: { min: 0, max: 1, step: 0.01 },
  n: { min: 0, max: 120, step: 1 },
  sp: { min: 0, max: 160, step: 0.5 },
  life: { min: 0.05, max: 8, step: 0.05 },
  r: { min: 0, max: 2.2, step: 0.01 },
  at: { min: -1, max: 1, step: 0.005 },
  x: { min: -2, max: 2, step: 0.01 },
  y: { min: -2, max: 2, step: 0.01 },
  hover: { min: -0.5, max: 0.8, step: 0.005 },
  rot: { min: -1, max: 1, step: 0.005 },
  spin: { min: -1, max: 1, step: 0.005 },
  flicker: { min: 0, max: 1, step: 0.01 },
  wave: { min: 0, max: 0.6, step: 0.005 },
  wobble: { min: 0, max: 0.4, step: 0.005 },
  sway: { min: 0, max: 60, step: 0.5 },
  drift: { min: -60, max: 60, step: 0.5 },
  sz: { min: 0.02, max: 30, step: 0.02 },
  tongues: { min: 3, max: 10, step: 1 },
  shimmerN: { min: 0, max: 8, step: 1 },
  frameDuration: { min: 0.01, max: 2, step: 0.01 },
  fadeLen: { min: 0, max: 0.5, step: 0.01 },
  cyclePeriod: { min: 0.5, max: 15, step: 0.1 },
  filigree: { min: 0, max: 40, step: 1 },
  every: { min: 0.05, max: 6, step: 0.05 },
  burst: { min: 1, max: 8, step: 1 },
  burstSpan: { min: 0.05, max: 2, step: 0.01 },
  gap: { min: 0.1, max: 10, step: 0.1 },
  flashPeak: { min: 0, max: 1.5, step: 0.01 },
  flashLife: { min: 0.02, max: 1, step: 0.01 },
  span: { min: 0, max: 3, step: 0.01 },
  len: { min: 0, max: 3, step: 0.01 },
  scale: { min: 0.02, max: 6, step: 0.01 },
};
// Section-aware overrides: `w` is ring/sweep thickness there but orbit speed
// in layers; `spd` can run backwards in a sweep; rays have far fewer items.
const SECTION_RANGES = {
  rings: { w: { min: 0.2, max: 12, step: 0.1 } },
  rays: { n: { min: 0, max: 32, step: 1 } },
  sweep: { w: { min: 0.2, max: 6, step: 0.05 }, spd: { min: -5, max: 5, step: 0.01 } },
  layers: { w: { min: -3, max: 3, step: 0.01 }, headSz: { min: 0.1, max: 3, step: 0.01 }, rimSz: { min: 0.1, max: 1.2, step: 0.01 }, rimSink: { min: -0.5, max: 0.8, step: 0.01 }, rimX: { min: -1, max: 1, step: 0.01 } },
};

// Shape-aware overrides: `sz` on a flame is silhouette px (up to ~150), on an
// img layer it's a multiplier of the ring size (same range ImagePlacement uses).
const SHAPE_SZ_RANGES = { flame: { min: 1, max: 150, step: 0.1 }, img: { min: 0.02, max: 4, step: 0.02 } };

// Fixed slider bounds per field — resolved from the range table plus the
// spec's own default value, NEVER the live draft value, so the pixel↔value
// mapping can't move mid-drag (the old value-derived bounds caused the
// runaway-range / release-snap-back bugs).
export function fieldBounds(path, shape, base) {
  const last = path[path.length - 1];
  const key = String(typeof last === "number" ? path[path.length - 2] : last);
  if (FLAG_KEYS.has(key)) return { min: 0, max: 1, step: 1 };
  let named = SECTION_RANGES[String(path[0])]?.[key] || FIELD_RANGES[key];
  if (key === "sz" && SHAPE_SZ_RANGES[shape]) named = SHAPE_SZ_RANGES[shape];
  if (named) {
    // Extend to fit the spec default once — still fixed for the field's life.
    const range = { ...named };
    if (Number.isFinite(base)) {
      if (base < range.min) range.min = Math.floor(base * 100) / 100;
      if (base > range.max) range.max = Math.ceil(base * 100) / 100;
    }
    return range;
  }
  const v = Number.isFinite(base) ? base : 0;
  const abs = Math.abs(v);
  const neg = v < 0;
  if (Number.isInteger(v) && abs >= 2) return { min: neg ? -Math.ceil(abs * 3) : 0, max: Math.max(4, Math.ceil(abs * 3)), step: 1 };
  if (abs <= 1) return { min: neg ? -2 : 0, max: 2, step: 0.01 };
  if (abs <= 8) return { min: neg ? -Math.ceil(abs * 3) : 0, max: Math.max(2, Number((abs * 3).toFixed(2))), step: 0.01 };
  return { min: neg ? -Math.ceil(abs * 2) : 0, max: Math.ceil(Math.max(abs * 3, abs + 1)), step: abs > 20 ? 1 : 0.1 };
}

function quantize(n, step) {
  if (!Number.isFinite(n)) return 0;
  if (step >= 1) return Math.round(n);
  const places = Math.max(0, Math.min(6, Math.round(-Math.log10(step))));
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

function colorInputValue(hex) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.slice(0, 6).padEnd(6, "0")}`;
}

function geometry(mode, w, h, aura, ringR) {
  const fit = aura === "ascended" ? 1 : (mode === "body" ? 0.84 : 1);
  const rx = Math.max(10, (mode === "body" ? w * 0.28 : ringR) * fit);
  const ry = Math.max(10, (mode === "body" ? h * 0.36 : ringR) * fit);
  return { w, h, cx: w / 2, cy: mode === "body" ? h * 0.52 : h / 2, rx, ry };
}

function bodyBox(px, aura) {
  const height = px / 0.8;
  const aw = Math.round(height * (aura === "ascended" ? 0.48 : 0.8));
  const ah = Math.round(height * (aura === "ascended" ? 0.66 : 1.02));
  return { height, aw, ah, top: -height * 0.02 };
}

function withOptional(layer, key, value) {
  const next = cloneSpec(layer);
  if (!value) delete next[key];
  else next[key] = value;
  return next;
}

function q6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function orbitXY(layer) {
  const r = Array.isArray(layer.r) ? Number(layer.r[0]) : Number(layer.r ?? 1);
  const ang = Number(layer.at ?? 0) * Math.PI * 2;
  return { x: q6(Math.cos(ang) * r), y: q6(Math.sin(ang) * r) };
}

function withOrbitXY(layer, x, y) {
  const next = cloneSpec(layer);
  const r = Math.hypot(x, y);
  next.at = r < 1e-8 ? 0 : q6(Math.atan2(y, x) / (Math.PI * 2));
  const radius = q6(r);
  next.r = Array.isArray(next.r) ? [radius, radius] : radius;
  return next;
}

function withScale(layer, scale) {
  const next = cloneSpec(layer);
  next.sz = Array.isArray(next.sz) ? [scale, scale] : scale;
  return next;
}

function layerScale(layer) {
  if (Array.isArray(layer.sz)) return Number(layer.sz[0]) || 0;
  return Number(layer.sz) || 0;
}

function chip(on) {
  return {
    border: `1px solid ${on ? C.cyan : C.border}`,
    background: on ? C.accentBg : "transparent",
    color: C.text,
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 650,
    cursor: "pointer",
  };
}

const SHAPE_NAMES = {
  dot: "Dots", ember: "Embers", smoke: "Smoke", flake: "Snowflakes", shard: "Shards",
  leaf: "Leaves", square: "Squares", star: "Stars", drop: "Droplets", glyph: "Glyphs",
  gem: "Gems", petal: "Petals", eye: "Eyes", spark: "Sparks", ash: "Ash motes",
  feather: "Feathers", bonechip: "Bone chips", coin: "Coins", crescent: "Crescents",
  pulse: "Pulses", sandgrain: "Sand grains", chainlink: "Chain links",
  emoji: "Icons", img: "Image art", flame: "Flames",
};
const KIND_NAMES = { rise: "Rising", fall: "Falling", orbit: "Orbiting", inward: "Drifting inward", bubble: "Bubbling up" };
const KIND_SHORT = { rise: "rising", fall: "falling", orbit: "orbiting", inward: "inward-drifting", bubble: "bubbling" };

function titleCase(key) {
  return String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (ch) => ch.toUpperCase());
}

// Plain-English labels per spec section. Anything missing falls back to a
// prettified key — raw spec paths must never reach the owner.
const TOP_LABELS = { spd: "Speed", glow: "Glow strength", dark: "Dark backdrop", artLate: "Draw art last", foldW: "Blindfold width", foldY: "Blindfold height", foldGlow: "Blindfold edge glow", hairN: "Hair strands", hairLen: "Hair length", hairDrift: "Hair drift" };
const RAY_LABELS = { n: "Count", c: "Colour", spin: "Spin speed", len: "Length", a: "Opacity", fan: "Fan out" };
const BOLT_LABELS = { every: "Seconds between strikes", burst: "Strikes per burst", burstSpan: "Burst spacing (s)", gap: "Rest between bursts (s)", c: "Colour", flash: "Flash on strike", flashPeak: "Flash brightness", flashLife: "Flash length (s)", from: "Strike direction", strike: "Strike marker", calm: "Calmer under reduced motion" };
const SWEEP_LABELS = { c: "Colour", a: "Opacity", spd: "Speed", r: "Distance from centre", w: "Thickness", span: "Arc width" };
const RING_LABELS = { r: "Distance from centre", c: "Colour", spin: "Spin speed", a: "Opacity", w: "Thickness", ink: "Ink outline", dash: "Dashed", filigree: "Filigree marks" };
const CORONA_LABELS = { inner: "Inner colour", outer: "Outer colour" };
const LAYER_LABELS = {
  n: "Count", sz: "Size", sp: "Speed range", a: "Opacity", w: "Orbit speed",
  r: "Distance from centre", jit: "Randomness", c: "Colour", life: "Lifetime (s)",
  sway: "Sway", drift: "Sideways drift", wave: "Wave strength", spin: "Spin speed",
  at: "Start angle (0–1)", x: "Shift sideways", y: "Shift up/down", rot: "Rotation",
  tw: "Twinkle", glint: "Glint", flick: "Flicker", bob: "Bobbing", wobble: "Wobble",
  breathe: "Breathing", even: "Evenly spaced", flip: "Mirror", behind: "Behind figure",
  over: "Over figure", top: "On top", placed: "Placement", e: "Icons",
  rate: "Wisps per second", max: "Most at once", anchors: "Edge samples",
  hover: "Hover gap", flicker: "Flicker", tongues: "Tongues", shimmer: "Shimmer",
  headSz: "Size on head", rimSz: "Size on ring", rimSink: "Sink into ring", rimX: "Shift along ring",
  tremble: "Tremble", frontOnly: "Front only", eject: "Throw particles", wander: "Wander box",
};
const FLARE_LABELS = { every: "Seconds between flares", bolt: "Fire a bolt on flare", flashPeak: "Flash brightness", flashLife: "Flash length (s)", flashC: "Flash colour" };
const SECTION_LABELS = { rays: RAY_LABELS, bolts: BOLT_LABELS, sweep: SWEEP_LABELS, rings: RING_LABELS, corona: CORONA_LABELS, flare: FLARE_LABELS };
const SECTION_TITLES = { rays: "Rays", bolts: "Lightning", sweep: "Sweep", corona: "Corona glow", flare: "Halo flare" };
const RANGE_SUFFIX = [" — min", " — max"];

// One-line hints for controls whose name doesn't explain itself.
const FIELD_HINTS = {
  spd: "Overall animation speed",
  glow: "Ambient light around the aura",
  jit: "Randomness applied to even spacing",
  at: "Lock the orbit to one angle (0–1 = a full turn)",
  hover: "Gap between the piece and the head",
  tw: "Particles fade in and out",
  sway: "Side-to-side drift while rising",
  drift: "Sideways push while falling",
  wave: "Radius wobble while orbiting",
  even: "Space particles evenly instead of random angles",
  over: "Draw above the figure/photo instead of behind",
  headSz: "Width in head-widths — follows the figure",
  rimSz: "Size on the avatar ring's top edge",
  foldW: "Blindfold width in head half-widths — follows the figure",
  foldY: "Blindfold offset below the eye line, in head half-widths",
  foldGlow: "Faint light bleeding along the blindfold's lower edge",
  hairN: "Procedural hair strand count (hair: strands)",
  hairLen: "Strand length below the eye line, in head half-widths",
  hairDrift: "How much the strands sway with the aura's slow motion",
  rimSink: "How far the piece dips into the ring",
  rimX: "Slide the piece along the ring's top edge",
  flashPeak: "Brightness of the strike flash",
  flashLife: "How long the flash lingers",
  eject: "Throw particles outward on a timer",
  tremble: "Fine position jitter",
  frontOnly: "Hide while orbiting behind the figure",
  breathe: "Gentle grow/shrink cycle",
  wobble: "Slow rotation wobble",
  bob: "Small up/down bob",
  fan: "Spread rays across the top half",
  filigree: "Decorative marks around the ring",
  ink: "Dark outline inside the ring",
  dash: "Dashed instead of solid ring",
  calm: "Simpler motion under reduced motion",
};

function fieldLabel(field, section) {
  const last = field.path[field.path.length - 1];
  const isIndex = typeof last === "number";
  const name = isIndex ? field.path[field.path.length - 2] : last;
  const map = section === "layer" ? LAYER_LABELS : section === "overall" ? TOP_LABELS : SECTION_LABELS[section];
  const base = map?.[name] ?? titleCase(name);
  if (!isIndex) return base;
  if (name === "c" || name === "e") return `${base} ${last + 1}`;
  return `${base}${RANGE_SUFFIX[Math.min(last, 1)] || ` ${last + 1}`}`;
}

// Layer fields grouped under plain headings.
const LAYER_GROUPS = [
  ["motion", "Motion", new Set(["w", "sp", "drift", "sway", "wave", "spin", "at", "x", "y", "even", "bob", "wobble", "breathe", "rot", "flip", "r"])],
  ["particles", "Particles", new Set(["n", "sz", "jit", "e"])],
  ["appearance", "Appearance", new Set(["c", "a", "tw", "glint", "flick", "behind", "over", "top", "blend"])],
  ["timing", "Timing", new Set(["life"])],
];
function layerGroupOf(key) {
  for (const [id, , keys] of LAYER_GROUPS) if (keys.has(key)) return id;
  return "other";
}
const LAYER_GROUP_TITLES = Object.fromEntries(LAYER_GROUPS.map(([id, title]) => [id, title]));
LAYER_GROUP_TITLES.other = "Other";

function describeLayer(layer) {
  if (layer.shape === "img") return layer.placed === "shoulders" ? "pauldron art" : "image art";
  if (layer.shape === "flame") return "flames";
  const kind = KIND_SHORT[layer.k] || "floating";
  const shape = (SHAPE_NAMES[layer.shape] || "particles").toLowerCase();
  return `${kind} ${shape}`;
}

function FlagField({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />
      {label}
    </label>
  );
}

// Slider/color drags fire `input` at pointer rate — committing each one used to
// remount the live canvas and re-render the whole editor ~60x/sec. Local state
// keeps the thumb smooth; the parent sees at most one commit per COMMIT_MS, and
// one per DRAG_MS while a drag is continuously in flight.
const COMMIT_MS = 120;
const DRAG_MS = 300;
// Count of sliders currently mid-drag — the gallery renders a reduced-count
// preview spec while >0 and restores the real spec on release.
let liveDrags = 0;
const dragSubs = new Set();
function changeDrags(d) {
  liveDrags = Math.max(0, liveDrags + d);
  dragSubs.forEach((f) => f());
}
// Reactive read of liveDrags so the "preview simplified while dragging" hint
// appears while any drag is in flight.
function useDragging() {
  return useSyncExternalStore(
    (cb) => { dragSubs.add(cb); return () => dragSubs.delete(cb); },
    () => liveDrags > 0,
  );
}
const PREVIEW_N_CAP = 24;
function clampForPreview(spec) {
  if (!spec || !Array.isArray(spec.layers)) return spec;
  const next = cloneSpec(spec);
  for (const L of next.layers) {
    if (typeof L.n === "number" && L.n > PREVIEW_N_CAP) L.n = PREVIEW_N_CAP;
    if (L.embers && typeof L.embers === "object" && typeof L.embers.n === "number" && L.embers.n > PREVIEW_N_CAP) L.embers.n = PREVIEW_N_CAP;
    if (L.shadow && typeof L.shadow === "object" && typeof L.shadow.max === "number" && L.shadow.max > 8) L.shadow.max = 8;
  }
  return next;
}
function useLiveCommit(value, onChange) {
  const [live, setLive] = useState(null);
  const refs = useRef({ timer: 0, pending: null, lastAt: 0, active: false, value, onChange });
  refs.current.value = value;
  refs.current.onChange = onChange;
  useEffect(() => () => {
    clearTimeout(refs.current.timer);
    if (refs.current.active) { refs.current.active = false; changeDrags(-1); }
  }, []);
  // Timer path — commits the pending value but the drag is still in flight.
  const commit = () => {
    refs.current.timer = 0;
    const v = refs.current.pending;
    refs.current.pending = null;
    if (v == null || v === refs.current.value) return;
    refs.current.lastAt = performance.now();
    refs.current.onChange(v);
  };
  // Release/blur path — ends the drag, then commits. The drag flag clears first
  // so the release render restores the unclamped spec. If nothing new is pending
  // we still ping onChange to force that restore remount.
  const flush = () => {
    clearTimeout(refs.current.timer);
    refs.current.timer = 0;
    const wasActive = refs.current.active;
    if (wasActive) { refs.current.active = false; changeDrags(-1); }
    setLive(null);
    const v = refs.current.pending;
    if (v == null || v === refs.current.value) {
      refs.current.pending = null;
      if (wasActive) refs.current.onChange(refs.current.value);
      return;
    }
    commit();
  };
  const push = (v) => {
    if (!refs.current.active) { refs.current.active = true; changeDrags(1); }
    setLive(v);
    refs.current.pending = v;
    const wait = Math.max(0, (refs.current.active ? DRAG_MS : COMMIT_MS) - (performance.now() - refs.current.lastAt));
    if (!refs.current.timer) refs.current.timer = setTimeout(commit, wait);
  };
  return [live, push, flush];
}

const numRow = { display: "grid", gridTemplateColumns: "140px 1fr 72px 22px", gap: 6, alignItems: "center", fontSize: 11, color: C.dim };

function ResetBtn({ onClick, dirty }) {
  return (
    <button type="button" title="Reset to default" aria-label="Reset to default" disabled={!dirty} onClick={onClick}
      style={{ ...chip(false), padding: "0 4px", fontSize: 11, lineHeight: "18px", opacity: dirty ? 1 : 0.35, cursor: dirty ? "pointer" : "default" }}>⟲</button>
  );
}

// One field row: label + range slider + number box + per-control reset.
// min/max/step are FIXED bounds — they never change while dragging.
// capMin/capMax clamp only the VALUE (used to keep min<=max inside a pair);
// the slider's own bounds attributes stay fixed.
function NumSlider({ label, value, min, max, step, onChange, defaultValue, onReset, capMin, capMax, smallLabel, hint }) {
  const [live, push, flush] = useLiveCommit(value, onChange);
  const [text, setText] = useState(null);
  const lo = capMin != null ? Math.max(min, capMin) : min;
  const hi = capMax != null ? Math.min(max, capMax) : max;
  const clamp = (n) => Math.min(hi, Math.max(lo, n));
  const shown = clamp(live ?? value);
  const drag = (raw) => {
    const n = Number(raw);
    if (Number.isFinite(n)) push(quantize(clamp(n), step));
  };
  // The number box is free text while focused; committing clamps + quantizes.
  const commitText = () => {
    if (text != null) {
      const n = Number(text);
      if (Number.isFinite(n)) onChange(quantize(clamp(n), step));
      setText(null);
    }
    flush();
  };
  const dirty = defaultValue != null && quantize(clamp(value), step) !== quantize(clamp(defaultValue), step);
  return (
    <label style={{ ...numRow, gridTemplateColumns: smallLabel ? `44px 1fr 72px 22px` : numRow.gridTemplateColumns }}>
      <span title={label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ position: "relative", display: "block" }}>
        <input type="range" min={min} max={max} step={step} value={shown} onChange={(e) => drag(e.target.value)} onPointerUp={flush} onKeyUp={flush} onBlur={flush} style={{ width: "100%" }} />
        <span style={{ position: "absolute", left: 0, right: 0, top: 12, display: "flex", justifyContent: "space-between", fontSize: 8, color: C.mute, pointerEvents: "none" }}>
          <span>{min}</span><span>{max}</span>
        </span>
      </span>
      <input type="number" min={min} max={max} step={step} value={text ?? shown} onChange={(e) => setText(e.target.value)} onBlur={commitText} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} style={{ width: 72, background: C.inpBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 4px" }} />
      {onReset ? <ResetBtn dirty={dirty} onClick={onReset} /> : <span />}
      {hint && <span style={{ gridColumn: "1 / -1", fontSize: 9, color: C.mute, marginTop: -2 }}>{hint}</span>}
    </label>
  );
}

// Keys whose [a, b] array form is a min/max range — grouped into one frame
// with min <= max enforced. Other numeric arrays (keyframe rows like
// mShake [[t, v], ...], colour/icon lists) keep individual rows.
const RANGE_PAIR_KEYS = new Set(["sz", "sp", "life", "w", "r", "a", "n", "every", "burst", "gap", "scale", "sway", "drift", "hover"]);

function pairKeyOf(field) {
  const last = field.path[field.path.length - 1];
  if (typeof last !== "number" || field.kind !== "number") return null;
  const key = String(field.path[field.path.length - 2]);
  return RANGE_PAIR_KEYS.has(key) ? field.path.slice(0, -1).join(".") : null;
}

// A min/max pair in one frame: two stacked rows, each with its own slider,
// number box and reset. The min side's value is capped at max (and vice
// versa) so the pair can never invert; slider bounds stay fixed.
function PairField({ title, lo, hi, bounds, onLo, onHi, loDefault, hiDefault, onResetPair }) {
  const row = (side, value, other, onChange, def) => (
    <NumSlider
      label={side}
      smallLabel
      value={value}
      min={bounds.min} max={bounds.max} step={bounds.step}
      capMax={side === "min" ? other : undefined}
      capMin={side === "max" ? other : undefined}
      onChange={onChange}
      defaultValue={def}
      onReset={onResetPair ? () => onResetPair(side) : undefined}
    />
  );
  return (
    <div data-pair={title} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px 10px", display: "grid", gap: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 650, color: C.text }}>{title}<span style={{ color: C.mute, fontWeight: 400 }}> — min / max</span></div>
      {row("min", lo, hi, onLo, loDefault)}
      {row("max", hi, lo, onHi, hiDefault)}
    </div>
  );
}

function AnchorOverlay({ w, h, mode, aura, ringR, figure, style }) {
  const anchors = resolveAuraAnchors(mode, geometry(mode, w, h, aura, ringR), figure);
  if (!anchors) return null;
  const sw = Math.max(1, w / 140);
  const headHalf = anchors.face.eyeX * HEAD_FROM_EYE;
  const mark = Math.max(4, w / 28);
  return (
    <svg width={w} height={h} aria-hidden="true" style={{ pointerEvents: "none", ...style }}>
      <circle cx={anchors.face.x} cy={anchors.face.y} r={Math.max(2, headHalf)} fill="none" stroke="#FF2D6F" strokeWidth={sw} />
      <circle cx={anchors.face.x} cy={anchors.face.y} r={sw} fill="#FF2D6F" />
      <line x1={anchors.shoulderX - anchors.shoulderHalf} y1={anchors.shoulderY} x2={anchors.shoulderX + anchors.shoulderHalf} y2={anchors.shoulderY} stroke="#FFD447" strokeWidth={sw} />
      <line x1={anchors.torso.x - mark} y1={anchors.torso.y} x2={anchors.torso.x + mark} y2={anchors.torso.y} stroke="#7DF9FF" strokeWidth={sw} />
      <line x1={anchors.torso.x} y1={anchors.torso.y - mark} x2={anchors.torso.x} y2={anchors.torso.y + mark} stroke="#7DF9FF" strokeWidth={sw} />
    </svg>
  );
}

function Face({ px, photo, letter }) {
  const box = Math.max(16, Math.round(px));
  if (photo) return <img src={photo} alt="" style={{ width: box, height: box, borderRadius: 999, objectFit: "cover", display: "block" }} />;
  return (
    <div style={{ width: box, height: box, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: C.accentBg, color: C.cyan, fontWeight: 700, fontSize: box * 0.42 }}>
      {letter}
    </div>
  );
}

function CircleStage({ aura, px, ring, facePx, canvasKey, photo, letter, showAnchors, onInstance }) {
  const face = <Face px={facePx} photo={photo} letter={letter} />;
  return (
    <div className="relative" style={{ width: px, height: px, margin: "0 auto" }}>
      {aura && aura !== "none" ? (
        <AuraCanvas key={canvasKey} aura={aura} w={px} h={px} ringR={ring} style={{ left: 0, top: 0 }} onInstance={onInstance}>{face}</AuraCanvas>
      ) : (
        <div className="absolute flex items-center justify-center" style={{ inset: 0 }}>{face}</div>
      )}
      {showAnchors && (
        <AnchorOverlay w={px} h={px} mode="circle" aura={aura} ringR={ring} style={{ position: "absolute", left: 0, top: 0, zIndex: 4 }} />
      )}
    </div>
  );
}

function FigureStage({ aura, px, figure, canvasKey, showAnchors, onInstance }) {
  const box = bodyBox(px, aura || "ember");
  const [overSlot, setOverSlot] = useState(null);
  const showOver = !!(aura && aura !== "none" && auraNeedsOver(aura));
  const place = { position: "absolute", left: "50%", top: box.top, width: box.aw, height: box.ah, transform: "translateX(-50%)" };
  return (
    <div className="relative" style={{ height: box.height, width: "100%" }}>
      {aura && aura !== "none" && (
        <AuraCanvas key={canvasKey} aura={aura} mode="body" w={box.aw} h={box.ah} overSlot={overSlot} figure={figure} style={place} onInstance={onInstance} />
      )}
      <img src={figure} alt="" style={{ height: box.height, width: "auto", display: "block", margin: "0 auto", position: "relative", zIndex: 1, pointerEvents: "none" }} />
      {showOver && <div ref={setOverSlot} style={{ ...place, zIndex: 2, pointerEvents: "none" }} />}
      {showAnchors && (
        <AnchorOverlay w={box.aw} h={box.ah} mode="body" aura={aura} figure={figure} ringR={box.aw / 3} style={{ ...place, zIndex: 4 }} />
      )}
    </div>
  );
}

function Stage({ aura, size, backdrop, photo, canvasKey, showAnchors, onInstance }) {
  if (backdrop.kind === "figure") {
    return <FigureStage aura={aura} px={size.px} figure={backdrop.src} canvasKey={canvasKey} showAnchors={showAnchors} onInstance={onInstance} />;
  }
  return (
    <CircleStage
      aura={aura}
      px={size.cpx}
      ring={size.ring}
      facePx={size.avatar}
      canvasKey={canvasKey}
      photo={backdrop.kind === "photo" ? photo : null}
      letter="A"
      showAnchors={showAnchors}
      onInstance={onInstance}
    />
  );
}

// setPath can't create missing intermediate objects — circle override blocks
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

// Removes a key and prunes empty parents (e.g. deleting the last circle override).
function deleteDeep(root, path) {
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

function rangePair(value, fallback) {
  return Array.isArray(value) ? [...value] : [value ?? fallback, value ?? fallback];
}

function setRangePart(object, key, index, value, fallback) {
  const next = cloneSpec(object);
  const pair = rangePair(next[key], fallback);
  // enforce min <= max — the edited side clamps against the other
  pair[index] = index === 0 ? Math.min(value, pair[1]) : Math.max(value, pair[0]);
  next[key] = pair;
  return next;
}

function numberAt(value, fallback) {
  const raw = Array.isArray(value) ? value[0] : value;
  return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
}

function ColorField({ label, value, onChange }) {
  const [live, push, flush] = useLiveCommit(value, onChange);
  return (
    <label style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
      <span>{label}</span>
      <input type="color" value={colorInputValue(live ?? value)} onChange={(e) => push(e.target.value)} onBlur={flush} style={{ width: 48, height: 28, padding: 0, border: "none", background: "transparent" }} />
    </label>
  );
}

function ControlTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.cyan, marginTop: 4 }}>{children}</div>;
}

function ImagePlacement({ layer, index, onLayer, original, overCount = 0 }) {
  const shoulders = layer.placed === "shoulders";
  const headPlaced = layer.placed === "head";
  const scale = layerScale(layer);
  // placed:head layers take their position from the head anchor — `at`/`r` are
  // dead there, so a single placed image shifts via the x/y offset instead.
  const single = layer.n === 1 && !headPlaced;
  const xy = single ? orbitXY(layer) : { x: layer.x || 0, y: layer.y || 0 };
  const headSized = headPlaced && layer.headSz != null;
  const headScale = Number(layer.headSz) || 1;
  const isFrameAnim = layer.frames && layer.frames.length > 0;
  const shadow = layer.shadow === true ? {} : layer.shadow || null;
  const orig = original || layer;
  const oShadow = orig.shadow === true ? {} : orig.shadow || null;
  const origXY = single ? orbitXY(orig) : { x: orig.x || 0, y: orig.y || 0 };
  const oScale = layerScale(orig);
  const oHeadScale = Number(orig.headSz) || 1;
  const setLayer = (key, value) => {
    const next = cloneSpec(layer);
    next[key] = value;
    onLayer(next);
  };
  const setShadow = (key, value) => {
    const next = cloneSpec(layer);
    next.shadow = { ...(shadow || { rate: 10, max: 24 }), [key]: value };
    onLayer(next);
  };
  const setShadowRange = (key, part, value, fallback) => setShadow(key, setRangePart(shadow || {}, key, part, value, fallback)[key]);
  const setFrames = (on) => {
    const next = cloneSpec(layer);
    if (on) {
      next.frames = [].concat(next.src || next.frames || []).filter(Boolean);
      if (!next.frames.length) next.frames = [""];
      delete next.src;
      next.frameDuration ??= 0.12;
      next.fadeLen ??= 0.12;
      next.frameMode ??= "loop";
    } else {
      next.src = next.frames?.find(Boolean) || "";
      delete next.frames;
      delete next.frameDuration;
      delete next.fadeLen;
      delete next.frameMode;
      delete next.frameOffsets;
    }
    onLayer(next);
  };
  const setFrameSrc = (frameIndex, src) => {
    const next = cloneSpec(layer);
    next.frames = [...next.frames];
    next.frames[frameIndex] = src;
    onLayer(next);
  };
  const shadowColors = Array.isArray(shadow?.c) ? shadow.c : [shadow?.c || "#111827"];
  const setShadowColor = (i, color) => {
    const colors = [...shadowColors];
    colors[i] = color;
    setShadow("c", colors.length === 1 ? colors[0] : colors);
  };
  return (
    <div style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{shoulders ? "Pauldrons" : `Image layer ${index + 1}`}</div>
      {!isFrameAnim && layer.src && (
        <FixedNote>{Array.isArray(layer.src)
          ? `Images — ${layer.src.length} files cycle across particles (${[...new Set(layer.src)].map((s) => s.split("/").pop()).join(", ")}) — set in the spec, not editable here.`
          : `Image — ${layer.src} — set in the spec, not editable here.`}</FixedNote>
      )}
      <NumSlider label="Shift sideways" value={xy.x} min={-2} max={2} step={0.01} hint={headPlaced ? "Offset from the figure's head" : undefined} onChange={(v) => onLayer(single ? withOrbitXY(layer, v, xy.y) : withOptional(layer, "x", v))} defaultValue={origXY.x} onReset={() => onLayer(single ? withOrbitXY(layer, origXY.x, xy.y) : withOptional(layer, "x", origXY.x))} />
      <NumSlider label="Shift up/down" value={xy.y} min={-2} max={2} step={0.01} hint={headPlaced ? "Offset from the figure's head" : undefined} onChange={(v) => onLayer(single ? withOrbitXY(layer, xy.x, v) : withOptional(layer, "y", v))} defaultValue={origXY.y} onReset={() => onLayer(single ? withOrbitXY(layer, xy.x, origXY.y) : withOptional(layer, "y", origXY.y))} />
      {!shoulders && headSized && <NumSlider label="Size on head" value={headScale} min={0.1} max={3} step={0.01} hint="Width in head-widths — follows the figure" onChange={(v) => setLayer("headSz", v)} defaultValue={oHeadScale} onReset={() => setLayer("headSz", oHeadScale)} />}
      {!shoulders && !headSized && <NumSlider label="Size" value={scale} min={0.02} max={4} step={0.01} onChange={(v) => onLayer(withScale(layer, v))} defaultValue={oScale} onReset={() => onLayer(withScale(layer, oScale))} />}
      {!shoulders && layer.rim && <FixedNote>On the avatar ring this piece sizes via “Size on ring” — switch to the avatar-ring view to adjust it.</FixedNote>}
      {!shoulders && <NumSlider label="Rotation" value={layer.rot || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("rot", v)} defaultValue={orig.rot || 0} onReset={() => setLayer("rot", orig.rot || 0)} />}
      {!shoulders && <FlagField label="Mirror image" checked={layer.flip} onChange={(v) => setLayer("flip", v)} />}
      {layer.blend != null && !(layer.over && overCount <= 1) && <BlendSelect value={layer.blend} onChange={(v) => setLayer("blend", v)} />}
      {layer.blend != null && layer.over && overCount <= 1 && <FixedNote>Blend mode — nothing else draws on the over canvas, so it has no visible effect here.</FixedNote>}
      {!single && !headPlaced && <div style={{ fontSize: 10, color: C.mute }}>Sideways/up-down shifts every image in this layer. 1 is one ring radius.</div>}

      <div data-control-group="frame-animation" style={{ display: "grid", gap: 4 }}>
        <ControlTitle>Frame animation</ControlTitle>
        <button type="button" onClick={() => setFrames(!isFrameAnim)} style={{ ...chip(!!isFrameAnim), justifySelf: "start", fontSize: 11 }}>{isFrameAnim ? "Disable frame cycle" : "Enable frame cycle"}</button>
        {isFrameAnim && (
          <>
            <NumSlider label="Seconds per frame" value={layer.frameDuration || 0.12} min={0.01} max={1} step={0.01} onChange={(v) => setLayer("frameDuration", v)} defaultValue={orig.frameDuration || 0.12} onReset={() => setLayer("frameDuration", orig.frameDuration || 0.12)} />
            <NumSlider label="Crossfade (s)" value={layer.fadeLen || 0.12} min={0} max={0.5} step={0.01} onChange={(v) => setLayer("fadeLen", v)} defaultValue={orig.fadeLen || 0.12} onReset={() => setLayer("fadeLen", orig.fadeLen || 0.12)} />
            <div style={{ fontSize: 10, color: C.mute }}>
              <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                Cycle: <select value={layer.frameMode || "loop"} onChange={(e) => setLayer("frameMode", e.target.value)} style={{ fontSize: 10 }}>
                  <option value="loop">Looping</option>
                  <option value="pingpong">Back and forth</option>
                </select>
              </label>
            </div>
            {layer.frames.map((src, frameIndex) => {
              const offset = layer.frameOffsets?.[frameIndex] || {};
              const updateOffset = (key, value) => {
                const next = cloneSpec(layer);
                // frameOffsets is stored as an object keyed by frame index —
                // object-spread keeps both object and legacy array forms working.
                const offsets = { ...(next.frameOffsets || {}) };
                offsets[frameIndex] = { ...offsets[frameIndex], [key]: value };
                next.frameOffsets = offsets;
                onLayer(next);
              };
              return (
                <div key={`${src}:${frameIndex}`} style={{ display: "grid", gap: 3, paddingTop: 4, borderTop: `1px dashed ${C.border}` }}>
                  <label style={{ display: "grid", gridTemplateColumns: "58px 1fr auto", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
                    Frame {frameIndex + 1}
                    <input value={src} onChange={(e) => setFrameSrc(frameIndex, e.target.value)} style={{ minWidth: 0, background: C.inpBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 4px", fontSize: 10 }} />
                    {layer.frames.length > 1 && <button type="button" onClick={() => {
                      const next = cloneSpec(layer);
                      next.frames.splice(frameIndex, 1);
                      if (next.frameOffsets) {
                        const offsets = { ...next.frameOffsets };
                        delete offsets[frameIndex];
                        // renumber keys above the removed frame down by one
                        for (const k of Object.keys(offsets)) if (+k > frameIndex) { offsets[k - 1] = offsets[k]; delete offsets[k]; }
                        next.frameOffsets = offsets;
                      }
                      onLayer(next);
                    }} style={{ ...chip(false), padding: "2px 6px", fontSize: 10 }}>Remove</button>}
                  </label>
                  <NumSlider label="Nudge sideways" value={offset.x || 0} min={-2} max={2} step={0.01} onChange={(v) => updateOffset("x", v)} defaultValue={(orig.frameOffsets?.[frameIndex] || {}).x || 0} onReset={() => updateOffset("x", (orig.frameOffsets?.[frameIndex] || {}).x || 0)} />
                  <NumSlider label="Nudge up/down" value={offset.y || 0} min={-2} max={2} step={0.01} onChange={(v) => updateOffset("y", v)} defaultValue={(orig.frameOffsets?.[frameIndex] || {}).y || 0} onReset={() => updateOffset("y", (orig.frameOffsets?.[frameIndex] || {}).y || 0)} />
                  <NumSlider label="Size multiplier" value={offset.scale ?? 1} min={0.02} max={4} step={0.01} onChange={(v) => updateOffset("scale", v)} defaultValue={(orig.frameOffsets?.[frameIndex] || {}).scale ?? 1} onReset={() => updateOffset("scale", (orig.frameOffsets?.[frameIndex] || {}).scale ?? 1)} />
                  <NumSlider label="Extra rotation" value={offset.rotation || 0} min={-1} max={1} step={0.01} onChange={(v) => updateOffset("rotation", v)} defaultValue={(orig.frameOffsets?.[frameIndex] || {}).rotation || 0} onReset={() => updateOffset("rotation", (orig.frameOffsets?.[frameIndex] || {}).rotation || 0)} />
                </div>
              );
            })}
            <button type="button" onClick={() => {
              const next = cloneSpec(layer);
              next.frames.push(next.frames.at(-1) || "");
              onLayer(next);
            }} style={{ ...chip(false), justifySelf: "start", fontSize: 11 }}>Add frame</button>
          </>
        )}
      </div>

      <div data-control-group="shadow-emission" style={{ display: "grid", gap: 4 }}>
        <ControlTitle>Shadow emission</ControlTitle>
        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
          <input type="checkbox" checked={!!layer.shadow} onChange={(e) => setLayer("shadow", e.target.checked ? { rate: 10, max: 24 } : false)} />
          Shadow wisps
        </label>
        {shadow && (
          <>
            <NumSlider label="Most wisps at once" value={shadow.max ?? 24} min={0} max={64} step={1} onChange={(v) => setShadow("max", v)} defaultValue={oShadow?.max ?? 24} onReset={() => setShadow("max", oShadow?.max ?? 24)} />
            <NumSlider label="Wisps per second" value={shadow.rate ?? 10} min={0} max={60} step={0.1} onChange={(v) => setShadow("rate", v)} defaultValue={oShadow?.rate ?? 10} onReset={() => setShadow("rate", oShadow?.rate ?? 10)} />
            <NumSlider label="Edge sample points" value={shadow.anchors ?? 48} min={1} max={48} step={1} onChange={(v) => setShadow("anchors", v)} defaultValue={oShadow?.anchors ?? 48} onReset={() => setShadow("anchors", oShadow?.anchors ?? 48)} />
            <PairField title="Wisp lifetime (s)" lo={rangePair(shadow.life, 0.8)[0]} hi={rangePair(shadow.life, 1.6)[1]} bounds={{ min: 0.1, max: 5, step: 0.1 }}
              onLo={(v) => setShadowRange("life", 0, v, 0.8)} onHi={(v) => setShadowRange("life", 1, v, 1.6)}
              loDefault={rangePair(oShadow?.life, 0.8)[0]} hiDefault={rangePair(oShadow?.life, 1.6)[1]}
              onResetPair={(side) => setShadowRange("life", side === "min" ? 0 : 1, rangePair(oShadow?.life, side === "min" ? 0.8 : 1.6)[side === "min" ? 0 : 1], side === "min" ? 0.8 : 1.6)} />
            <PairField title="Drift speed" lo={rangePair(shadow.sp, 4)[0]} hi={rangePair(shadow.sp, 12)[1]} bounds={{ min: 0, max: 80, step: 0.5 }}
              onLo={(v) => setShadowRange("sp", 0, v, 4)} onHi={(v) => setShadowRange("sp", 1, v, 12)}
              loDefault={rangePair(oShadow?.sp, 4)[0]} hiDefault={rangePair(oShadow?.sp, 12)[1]}
              onResetPair={(side) => setShadowRange("sp", side === "min" ? 0 : 1, rangePair(oShadow?.sp, side === "min" ? 4 : 12)[side === "min" ? 0 : 1], side === "min" ? 4 : 12)} />
            <PairField title="Wisp size" lo={rangePair(shadow.sz, 3)[0]} hi={rangePair(shadow.sz, 8)[1]} bounds={{ min: 0, max: 20, step: 0.1 }}
              onLo={(v) => setShadowRange("sz", 0, v, 3)} onHi={(v) => setShadowRange("sz", 1, v, 8)}
              loDefault={rangePair(oShadow?.sz, 3)[0]} hiDefault={rangePair(oShadow?.sz, 8)[1]}
              onResetPair={(side) => setShadowRange("sz", side === "min" ? 0 : 1, rangePair(oShadow?.sz, side === "min" ? 3 : 8)[side === "min" ? 0 : 1], side === "min" ? 3 : 8)} />
            <NumSlider label="Wisp opacity" value={shadow.a ?? 0.38} min={0} max={1} step={0.01} onChange={(v) => setShadow("a", v)} defaultValue={oShadow?.a ?? 0.38} onReset={() => setShadow("a", oShadow?.a ?? 0.38)} />
            <NumSlider label="Edge randomness" value={shadow.jit ?? 0.35} min={0} max={1} step={0.01} onChange={(v) => setShadow("jit", v)} defaultValue={oShadow?.jit ?? 0.35} onReset={() => setShadow("jit", oShadow?.jit ?? 0.35)} />
            {shadowColors.map((color, i) => <ColorField key={i} label={`Wisp colour ${i + 1}`} value={color} onChange={(v) => setShadowColor(i, v)} />)}
            <label style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
              <span>Blend style</span>
              <select value={shadow.blend || "source-over"} onChange={(e) => setShadow("blend", e.target.value)} style={{ fontSize: 10 }}>
                <option value="source-over">Normal</option>
                <option value="lighter">Additive glow</option>
                <option value="screen">Screen</option>
                <option value="multiply">Multiply</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function RingCycleControls({ ring, index, onRing, original }) {
  const active = Array.isArray(ring.colorCycle) && ring.colorCycle.length > 1;
  const colors = ring.colorCycle || [];
  const setRing = (key, value) => {
    const next = cloneSpec(ring);
    next[key] = value;
    onRing(next);
  };
  const setActive = (on) => {
    const next = cloneSpec(ring);
    if (on) {
      next.colorCycle = [ring.c || "#FFD447", "#FFFFFF"];
      next.cyclePeriod ??= 3;
      next.cycleEasing ??= "linear";
    } else {
      delete next.colorCycle;
      delete next.cyclePeriod;
      delete next.cycleEasing;
    }
    onRing(next);
  };
  const setColor = (i, color) => {
    const nextColors = [...colors];
    nextColors[i] = color;
    setRing("colorCycle", nextColors);
  };
  return (
    <div data-control-group={`ring-cycle-${index}`} style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <ControlTitle>Ring colour cycle</ControlTitle>
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Animate this ring's colours
      </label>
      {active && (
        <>
          <NumSlider label="Seconds per cycle" value={ring.cyclePeriod ?? 3} min={0.5} max={10} step={0.1} onChange={(v) => setRing("cyclePeriod", v)} defaultValue={original?.cyclePeriod ?? 3} onReset={() => setRing("cyclePeriod", original?.cyclePeriod ?? 3)} />
          <label style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
            <span>Colour change</span>
            <select value={ring.cycleEasing || "linear"} onChange={(e) => setRing("cycleEasing", e.target.value)} style={{ fontSize: 10 }}>
              <option value="linear">Smooth fade</option>
              <option value="step">Sharp steps</option>
            </select>
          </label>
          {colors.map((color, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, alignItems: "center" }}>
              <ColorField label={`Colour ${i + 1}`} value={color} onChange={(v) => setColor(i, v)} />
              {colors.length > 2 && <button type="button" onClick={() => setRing("colorCycle", colors.filter((_, j) => j !== i))} style={{ ...chip(false), padding: "2px 6px", fontSize: 10 }}>Remove</button>}
            </div>
          ))}
          <button type="button" onClick={() => setRing("colorCycle", [...colors, colors.at(-1) || "#FFFFFF"])} style={{ ...chip(false), justifySelf: "start", fontSize: 11 }}>Add colour</button>
        </>
      )}
    </div>
  );
}

function FlameControls({ layer, index, onLayer, onRemoveLayer, original }) {
  const setLayer = (key, value) => {
    const next = cloneSpec(layer);
    next[key] = value;
    onLayer(next);
  };
  const orig = original || layer;
  const oEmbers = orig.embers === true ? {} : orig.embers || null;
  const embers = layer.embers === true ? {} : layer.embers || null;
  const emberDefaults = { n: 8, sp: [18, 42], life: [0.5, 1.1], sz: [0.8, 1.6], sway: 10, a: 0.8, c: ["#FFB43C", "#FFF6C9"] };
  const setEmber = (key, value) => {
    const next = cloneSpec(layer);
    next.embers = { ...(embers || emberDefaults), [key]: value };
    onLayer(next);
  };
  const setEmberRange = (key, part, value, fallback) => setEmber(key, setRangePart(embers || {}, key, part, value, fallback)[key]);
  const palette = Array.isArray(layer.c) ? layer.c : [layer.c || "#FF5A1F", "#FFB43C", "#FFF6C9"];
  const setPalette = (i, color) => {
    const next = cloneSpec(layer);
    next.c = [...palette];
    while (next.c.length < 3) next.c.push(["#FF5A1F", "#FFB43C", "#FFF6C9"][next.c.length]);
    next.c[i] = color;
    onLayer(next);
  };
  const emberColors = Array.isArray(embers?.c) ? embers.c : [embers?.c || "#FFB43C"];
  const setEmberColor = (i, color) => {
    const colors = [...emberColors];
    colors[i] = color;
    setEmber("c", colors.length === 1 ? colors[0] : colors);
  };
  return (
    <div data-control-group="flame" style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Flame layer {index + 1}</div>
        <button type="button" onClick={onRemoveLayer} style={{ ...chip(false), padding: "2px 6px", fontSize: 10 }}>Remove</button>
      </div>
      <NumSlider label="Count" value={layer.n ?? 1} min={1} max={40} step={1} onChange={(v) => setLayer("n", v)} defaultValue={orig.n ?? 1} onReset={() => setLayer("n", orig.n ?? 1)} />
      <NumSlider label="Flame size" value={layerScale(layer)} min={1} max={150} step={0.1} onChange={(v) => onLayer(withScale(layer, v))} defaultValue={layerScale(orig)} onReset={() => onLayer(withScale(layer, layerScale(orig)))} />
      <NumSlider label="Opacity" value={layer.a ?? 1} min={0} max={1} step={0.01} onChange={(v) => setLayer("a", v)} defaultValue={orig.a ?? 1} onReset={() => setLayer("a", orig.a ?? 1)} />
      <NumSlider label="Rotation" value={layer.rot || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("rot", v)} defaultValue={orig.rot || 0} onReset={() => setLayer("rot", orig.rot || 0)} />
      <NumSlider label="Spin speed" value={layer.spin || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("spin", v)} defaultValue={orig.spin || 0} onReset={() => setLayer("spin", orig.spin || 0)} />
      <NumSlider label="Tongues per flame" value={numberAt(layer.tongues, 6)} min={3} max={10} step={1} onChange={(v) => setLayer("tongues", v)} defaultValue={numberAt(orig.tongues, 6)} onReset={() => setLayer("tongues", numberAt(orig.tongues, 6))} />
      <NumSlider label="Flicker" value={layer.flicker ?? 0.22} min={0} max={1} step={0.01} onChange={(v) => setLayer("flicker", v)} defaultValue={orig.flicker ?? 0.22} onReset={() => setLayer("flicker", orig.flicker ?? 0.22)} />
      {layer.blend != null && <BlendSelect value={layer.blend} onChange={(v) => setLayer("blend", v)} />}
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={layer.shimmer !== false} onChange={(e) => setLayer("shimmer", e.target.checked)} />
        Sparkle shimmer
      </label>
      {layer.shimmer !== false && <NumSlider label="Shimmer arcs" value={layer.shimmerN ?? 3} min={0} max={6} step={1} onChange={(v) => setLayer("shimmerN", v)} defaultValue={orig.shimmerN ?? 3} onReset={() => setLayer("shimmerN", orig.shimmerN ?? 3)} />}
      {["Outer", "Middle", "Inner"].map((name, i) => <ColorField key={name} label={`${name} flame colour`} value={palette[i] || "#FFF6C9"} onChange={(v) => setPalette(i, v)} />)}
      <ControlTitle>Ember sparks</ControlTitle>
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={!!layer.embers} onChange={(e) => setLayer("embers", e.target.checked ? emberDefaults : false)} />
        Rising embers
      </label>
      {embers && (
        <>
          <NumSlider label="Count" value={embers.n ?? 8} min={0} max={40} step={1} onChange={(v) => setEmber("n", v)} defaultValue={oEmbers?.n ?? 8} onReset={() => setEmber("n", oEmbers?.n ?? 8)} />
          <PairField title="Speed" lo={rangePair(embers.sp, 18)[0]} hi={rangePair(embers.sp, 42)[1]} bounds={{ min: 0, max: 100, step: 1 }}
            onLo={(v) => setEmberRange("sp", 0, v, 18)} onHi={(v) => setEmberRange("sp", 1, v, 42)}
            loDefault={rangePair(oEmbers?.sp, 18)[0]} hiDefault={rangePair(oEmbers?.sp, 42)[1]}
            onResetPair={(side) => setEmberRange("sp", side === "min" ? 0 : 1, rangePair(oEmbers?.sp, side === "min" ? 18 : 42)[side === "min" ? 0 : 1], side === "min" ? 18 : 42)} />
          <PairField title="Lifetime (s)" lo={rangePair(embers.life, 0.5)[0]} hi={rangePair(embers.life, 1.1)[1]} bounds={{ min: 0.1, max: 5, step: 0.1 }}
            onLo={(v) => setEmberRange("life", 0, v, 0.5)} onHi={(v) => setEmberRange("life", 1, v, 1.1)}
            loDefault={rangePair(oEmbers?.life, 0.5)[0]} hiDefault={rangePair(oEmbers?.life, 1.1)[1]}
            onResetPair={(side) => setEmberRange("life", side === "min" ? 0 : 1, rangePair(oEmbers?.life, side === "min" ? 0.5 : 1.1)[side === "min" ? 0 : 1], side === "min" ? 0.5 : 1.1)} />
          <PairField title="Size" lo={rangePair(embers.sz, 0.8)[0]} hi={rangePair(embers.sz, 1.6)[1]} bounds={{ min: 0, max: 10, step: 0.1 }}
            onLo={(v) => setEmberRange("sz", 0, v, 0.8)} onHi={(v) => setEmberRange("sz", 1, v, 1.6)}
            loDefault={rangePair(oEmbers?.sz, 0.8)[0]} hiDefault={rangePair(oEmbers?.sz, 1.6)[1]}
            onResetPair={(side) => setEmberRange("sz", side === "min" ? 0 : 1, rangePair(oEmbers?.sz, side === "min" ? 0.8 : 1.6)[side === "min" ? 0 : 1], side === "min" ? 0.8 : 1.6)} />
          <NumSlider label="Sway" value={embers.sway ?? 10} min={0} max={40} step={0.5} onChange={(v) => setEmber("sway", v)} defaultValue={oEmbers?.sway ?? 10} onReset={() => setEmber("sway", oEmbers?.sway ?? 10)} />
          <NumSlider label="Opacity" value={embers.a ?? 0.8} min={0} max={1} step={0.01} onChange={(v) => setEmber("a", v)} defaultValue={oEmbers?.a ?? 0.8} onReset={() => setEmber("a", oEmbers?.a ?? 0.8)} />
          {emberColors.map((color, i) => <ColorField key={i} label={`Colour ${i + 1}`} value={color} onChange={(v) => setEmberColor(i, v)} />)}
        </>
      )}
    </div>
  );
}

const DEDICATED_LAYER_FIELDS = new Set(["frames", "frameDuration", "fadeLen", "frameMode", "frameOffsets", "shadow", "tongues", "flicker", "shimmer", "shimmerN", "embers"]);
const IMG_PLACEMENT_FIELDS = new Set(["x", "y", "sz", "rot", "flip", "headSz"]);
const FLAME_PANEL_FIELDS = new Set(["n", "sz", "a", "rot", "spin"]);

// Moment internals (mY/mRot/mOrbit/…) are spec-level keyframe data — editing
// them blind produces paths the phase never samples, so they stay out of the
// slider list entirely (tune via Copy spec instead).
const MOMENT_INTERNAL = new Set(["mX", "mY", "mRot", "mScale", "mShake", "mSpin", "mR", "mDim", "mOrbit", "mFlings", "mTrail", "mside", "mAmp", "mBurst"]);

// Fields that do nothing in this layer's context — hidden to keep the editor
// honest: a visible control must change rendered pixels in the current view.
// `view` is "figure" (body/photo) or "ring" (avatar circle); `overCount` is how
// many layers share the over canvas (blend is meaningless on a lone layer).
export function isDeadField(layer, key, { view = "figure", overCount = 0 } = {}) {
  if (key === "even" && (layer.n ?? 1) === 1) return true; // spacing a single particle
  if (key === "jit" && (!layer.even || layer.at != null || layer.placed)) return true; // jitter only applies to even spacing without a fixed angle
  if (key === "behind") return true; // the renderer never reads it — `over` picks the canvas
  if (key === "spin" && layer.shape !== "img" && layer.shape !== "flame") return true; // non-image shapes only read truthiness, not the value
  if (key === "c" && layer.shape === "eye") return true; // eye palette is fixed in drawNewParticleShape
  if (key === "n" && layer.placed === "shoulders") return true; // pauldrons are a fixed pair
  if (key === "blend" && layer.over && overCount <= 1) return true; // nothing else to blend with on the over canvas
  if (MOMENT_INTERNAL.has(key)) return true;
  // hover sets the gap above the head anchor — dead when the piece isn't
  // head-placed, when wander overrides the anchor position every frame, or on
  // the avatar ring where the rim branch places it instead.
  if (key === "hover" && (layer.placed !== "head" || layer.wander || (view === "ring" && layer.rim))) return true;
  if (layer.k === "orbit" && (key === "sp" || key === "life" || key === "sway" || key === "drift")) return true; // rise/fall fields unused by orbit
  if (key === "w" && (layer.at != null || layer.placed) && (Array.isArray(layer.w) ? layer.w : [layer.w]).every((v) => !v)) return true; // anchored — orbit speed would un-anchor it
  if (layer.placed === "head") {
    // head-anchored pieces take position and size from anchors — orbit radius,
    // fixed angle, and the generic size field never reach the draw.
    if (key === "r" || key === "at") return true;
    if (key === "sz" && (view === "ring" ? (layer.rim && layer.rimSz != null) : layer.headSz != null)) return true;
    // on the avatar ring a `rim` piece uses rimSz/rimSink — head fields are dead there
    if (view === "ring" && layer.rim && (key === "headSz" || key === "hover")) return true;
  }
  // rim* only takes effect on the avatar ring's top edge — dead on figures
  if (view !== "ring" && (key === "rim" || key === "rimSz" || key === "rimSink" || key === "rimX")) return true;
  return false;
}
export const DEDICATED_RING_FIELDS = new Set(["colorCycle", "cyclePeriod", "cycleEasing"]);
export const LAYER_SHAPE_OPTIONS = ["spark", "dot", "ember", "smoke", "flake", "shard", "leaf", "square", "star", "drop", "glyph", "gem", "petal", "eye", "ash", "feather", "bonechip", "coin", "crescent", "pulse", "sandgrain", "chainlink"];
export const LAYER_KIND_OPTIONS = ["rise", "fall", "orbit", "inward", "bubble"];

// The exact field list SpecEditor renders for a spec — exported so the
// gallery effect test can cover every visible control without duplicating
// the filter rules.
export function editorFields(spec, circleMode) {
  const view = circleMode ? "ring" : "figure";
  const viewLayers = circleMode
    ? (spec.layers || []).map((l) => { const v = { ...l, ...(l.circle || {}) }; delete v.circle; return v; })
    : spec.layers || [];
  const imgIndexes = new Set(viewLayers.map((l, i) => (l?.shape === "img" ? i : -1)).filter((i) => i >= 0));
  const flameIndexes = new Set(viewLayers.map((l, i) => (l?.shape === "flame" ? i : -1)).filter((i) => i >= 0));
  const overCount = viewLayers.filter((l) => l?.over).length;
  return specFields(circleMode ? { layers: viewLayers } : spec).filter((field) => {
    if (circleMode && field.path[0] !== "layers") return false; // only layer fields are per-mode
    const topKey = field.path[field.path.length - 1];
    const named = typeof topKey === "number" ? field.path[field.path.length - 2] : topKey;
    // moment internals are spec-level keyframe data — not slider material
    if (field.path[0] === "moment") return false;
    // glow is ignored by the dark-mode branch
    if (field.path[0] === "glow" && spec.dark) return false;
    // flare.bolt only does anything when a bolts spec exists to spawn from
    if (field.path[0] === "flare" && named === "bolt" && !spec.bolts) return false;
    if (field.path[0] === "layers") {
      const i = field.path[1], key = field.path[2];
      if (key === "circle") return false; // managed via the Avatar-ring mode toggle
      if (circleMode && CIRCLE_LOCKED_KEYS.has(key)) return false;
      if (!circleMode && imgIndexes.has(i)) {
        if (DEDICATED_LAYER_FIELDS.has(key) || IMG_PLACEMENT_FIELDS.has(key)) return false;
        if (viewLayers[i].n === 1 && (key === "at" || key === "r")) return false;
      }
      if (!circleMode && flameIndexes.has(i) && (DEDICATED_LAYER_FIELDS.has(key) || FLAME_PANEL_FIELDS.has(key) || key === "c")) return false;
      // on the small avatar ring the wander roam is clamped to a horizontal
      // line — the vertical-roam fields (sy/top/bot) can't move it there
      if (key === "wander" && view === "ring" && ["sy", "top", "bot"].includes(field.path[3])) return false;
      if (isDeadField(viewLayers[i], key, { view, overCount })) return false;
    }
    if (field.path[0] === "rings") {
      if (DEDICATED_RING_FIELDS.has(field.path[2])) return false;
      // a cycling ring colour overrides the static one every frame
      if (named === "c" && spec.rings?.[field.path[1]]?.colorCycle) return false;
    }
    return true;
  });
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ fontSize: 11, background: C.inpBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 4px" }}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

// Spec values that exist but have no control — named so nothing looks missing.
function FixedNote({ children }) {
  return <div style={{ fontSize: 10, color: C.mute, fontStyle: "italic" }}>{children}</div>;
}

export const BLEND_OPTIONS = [["source-over", "Normal"], ["lighter", "Additive glow"], ["screen", "Screen"], ["multiply", "Multiply"]];
function BlendSelect({ label = "Blend mode", value, onChange }) {
  const options = BLEND_OPTIONS.some(([v]) => v === value) ? BLEND_OPTIONS : [[value, titleCase(value)], ...BLEND_OPTIONS];
  return <SelectRow label={label} value={value || "source-over"} options={options} onChange={onChange} />;
}

// specFields() rebuilds field objects every render, so compare by value.
const SpecField = memo(function SpecField({ field, section, onPath, shape, defaultValue, onReset }) {
  const label = fieldLabel(field, section);
  const key = field.path[field.path.length - 1];
  if (field.kind === "color") {
    return <ColorField label={label} value={field.value} onChange={(v) => onPath(field.path, v)} />;
  }
  if (typeof key === "string" && key !== "jit" && FLAG_KEYS.has(key)) {
    return <FlagField label={label} checked={field.value} onChange={(v) => onPath(field.path, v)} />;
  }
  // Bounds resolve from the spec default (never the live value); for fields
  // with no default the first-seen value is pinned so bounds still never move.
  const baseRef = useRef();
  if (baseRef.current === undefined) baseRef.current = Number.isFinite(defaultValue) ? defaultValue : field.value;
  const bounds = fieldBounds(field.path, shape, baseRef.current);
  const hintKey = typeof key === "number" ? field.path[field.path.length - 2] : key;
  return <NumSlider label={label} value={field.value} min={bounds.min} max={bounds.max} step={bounds.step}
    onChange={(v) => onPath(field.path, v)} defaultValue={defaultValue} onReset={onReset} hint={FIELD_HINTS[hintKey]} />;
}, (prev, next) =>
  prev.section === next.section && prev.onPath === next.onPath && prev.shape === next.shape &&
  prev.defaultValue === next.defaultValue && prev.onReset === next.onReset &&
  prev.field.kind === next.field.kind && prev.field.value === next.field.value &&
  prev.field.path.length === next.field.path.length &&
  prev.field.path.every((part, i) => part === next.field.path[i]));

// Group adjacent [key,0]/[key,1] range fields into a single PairField frame;
// anything else (scalars, non-range arrays) renders as a plain field row.
function groupPairs(list) {
  const out = [];
  const byKey = new Map();
  for (const f of list) {
    const pk = pairKeyOf(f);
    if (!pk) { out.push({ type: "field", field: f }); continue; }
    let item = byKey.get(pk);
    if (!item) { item = { type: "pair", key: pk, lo: null, hi: null, extra: [] }; byKey.set(pk, item); out.push(item); }
    const idx = f.path[f.path.length - 1];
    if (idx === 0 && !item.lo) item.lo = f;
    else if (idx === 1 && !item.hi) item.hi = f;
    else item.extra.push(f);
  }
  const flat = [];
  for (const item of out) {
    if (item.type === "field") { flat.push(item); continue; }
    if (item.lo && item.hi) flat.push(item);
    else [item.lo, item.hi, ...item.extra].filter(Boolean).forEach((f) => flat.push({ type: "field", field: f }));
    if (item.lo && item.hi) item.extra.forEach((f) => flat.push({ type: "field", field: f }));
  }
  return flat;
}

function SpecSection({ title, children }) {
  return (
    <div style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{title}</div>
      {children}
    </div>
  );
}

// "Basic" = size, position, colour, speed, count — everything else tucks into
// a collapsed Advanced block so the common controls stay one glance away.
const BASIC_KEYS = new Set(["spd", "glow", "n", "sz", "headSz", "rimSz", "x", "y", "at", "r", "hover", "c", "a", "w", "sp", "spin", "rot", "len"]);
function isBasicItem(item) {
  const f = item.type === "pair" ? item.lo : item.field;
  const last = f.path[f.path.length - 1];
  const key = typeof last === "number" ? f.path[f.path.length - 2] : last;
  return BASIC_KEYS.has(key);
}
function AdvBlock({ items, render }) {
  if (!items.length) return null;
  return (
    <details style={{ marginTop: 2 }}>
      <summary style={{ fontSize: 10, color: C.mute, cursor: "pointer", userSelect: "none" }}>Advanced ({items.length})</summary>
      <div style={{ display: "grid", gap: 4, paddingTop: 4 }}>{items.map(render)}</div>
    </details>
  );
}
function BasicAdv({ items, render }) {
  const basics = items.filter(isBasicItem), advs = items.filter((i) => !isBasicItem(i));
  return <>{basics.map(render)}<AdvBlock items={advs} render={render} /></>;
}

// Layer keys that stay structural/shared — not overridable per render mode.
const CIRCLE_LOCKED_KEYS = new Set(["k", "shape", "src", "frames", "frameMode", "frameOffsets", "frameDuration", "fadeLen", "shadow", "embers", "placed", "blend", "e", "circle"]);

function SpecEditor({ spec, original, onPath, onLayer, onAddLayer, onRemoveLayer, circleMode, onDelete }) {
  if (!spec) return <p style={{ color: C.dim, fontSize: 13 }}>This aura has no particle spec.</p>;
  // Circle mode edits against a merged view (base + layer.circle) so sliders
  // show effective values; writes are redirected into the circle block.
  const mergeView = (s) => circleMode
    ? (s.layers || []).map((l) => { const v = { ...l, ...(l.circle || {}) }; delete v.circle; return v; })
    : s.layers || [];
  const viewLayers = mergeView(spec);
  const origSpec = original || spec;
  const origViewLayers = mergeView(origSpec);
  const walk = (root, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), root);
  // Per-control reset target: the original spec's value at this path (merged
  // view for circle-mode layer fields).
  const defaultAt = (path) => {
    if (circleMode && path[0] === "layers") return walk(origViewLayers[path[1]], path.slice(2));
    return walk(origSpec, path);
  };
  const rows = viewLayers.map((layer, index) => ({ layer, index }));
  const baseLayers = spec.layers || [];
  const isOverridden = (i, key) => !!(baseLayers[i]?.circle && Object.prototype.hasOwnProperty.call(baseLayers[i].circle, key));
  const imgIndexes = new Set(rows.filter((row) => row.layer?.shape === "img").map((row) => row.index));
  const flameIndexes = new Set(rows.filter((row) => row.layer?.shape === "flame").map((row) => row.index));
  const overCount = viewLayers.filter((l) => l?.over).length;
  const fields = editorFields(spec, circleMode);
  const overall = fields.filter((f) => f.path.length === 1);
  const layerFields = new Map();
  const ringFields = new Map();
  const sectioned = { rays: [], bolts: [], sweep: [], corona: [], flare: [] };
  for (const f of fields) {
    if (f.path.length === 1) continue;
    if (f.path[0] === "layers") {
      if (!layerFields.has(f.path[1])) layerFields.set(f.path[1], []);
      layerFields.get(f.path[1]).push(f);
    } else if (f.path[0] === "rings") {
      if (!ringFields.has(f.path[1])) ringFields.set(f.path[1], []);
      ringFields.get(f.path[1]).push(f);
    } else if (sectioned[f.path[0]]) sectioned[f.path[0]].push(f);
  }
  // Fields a motion kind needs to spawn without crashing — merged in when the
  // Motion dropdown switches a layer to a kind it doesn't yet carry fields for.
  const KIND_NEEDS = {
    rise: { sp: [6, 12], life: [1.8, 2.8], sway: 6 },
    bubble: { sp: [4, 9], life: [2, 3.5], sway: 9 },
    fall: { sp: [8, 16], life: [1.5, 3], drift: 4 },
    inward: { sp: [0.4, 0.9], life: [1.5, 2.5] },
    orbit: { w: [0.1, 0.4], r: [1, 1.2] },
  };
  const setLayerKey = (index, key, value) => {
    const next = cloneSpec(rows[index].layer);
    next[key] = value;
    if (key === "k") for (const [need, def] of Object.entries(KIND_NEEDS[value] || {})) if (next[need] == null) next[need] = cloneSpec(def);
    onLayer(index, next);
  };
  // Stable callback so memoized SpecField rows skip unchanged controls.
  // In circle mode, layer paths are rewritten into the layer's circle block.
  const onPathRef = useRef(onPath);
  onPathRef.current = onPath;
  const circleRef = useRef(circleMode);
  circleRef.current = circleMode;
  const baseRef = useRef(baseLayers);
  baseRef.current = baseLayers;
  const stablePath = useCallback((p, v) => {
    if (circleRef.current && p[0] === "layers") {
      const i = p[1], key = p[2];
      // First write into a pair field seeds circle[key] with the base pair, so
      // editing one end never produces a half-overridden [v] array.
      if (p.length > 3 && baseRef.current?.[i]?.circle?.[key] == null && baseRef.current?.[i]?.[key] != null) {
        onPathRef.current([p[0], i, "circle", key], cloneSpec(baseRef.current[i][key]));
      }
      onPathRef.current([p[0], i, "circle", ...p.slice(2)], v);
      return;
    }
    onPathRef.current(p, v);
  }, []);
  // Per-control reset. Circle mode restores the original override state:
  // re-set the original circle value if the spec shipped one, else delete the
  // override so the field inherits the base value again.
  const resetField = (field) => {
    const p = field.path;
    if (circleRef.current && p[0] === "layers") {
      const i = p[1], key = p[2];
      const origCircle = origSpec.layers?.[i]?.circle;
      const hasOrigOverride = !!(origCircle && Object.prototype.hasOwnProperty.call(origCircle, key));
      if (p.length === 3) {
        if (hasOrigOverride) onPathRef.current(["layers", i, "circle", key], cloneSpec(origCircle[key]));
        else onDelete(["layers", i, "circle", key]);
        return;
      }
      // pair element — write the default element into the circle pair, and
      // drop the override entirely once it matches the base pair again.
      const idx = p[3];
      const basePair = rangePair(baseLayers[i]?.[key], 0);
      const origPair = hasOrigOverride ? rangePair(origCircle[key], 0) : basePair;
      const curPair = rangePair(baseLayers[i]?.circle?.[key] ?? baseLayers[i]?.[key], 0);
      curPair[idx] = origPair[Math.min(idx, origPair.length - 1)] ?? basePair[idx];
      if (hasOrigOverride) {
        onPathRef.current(["layers", i, "circle", key], cloneSpec(origCircle[key]));
      } else if (curPair[0] === basePair[0] && curPair[1] === basePair[1]) {
        onDelete(["layers", i, "circle", key]);
      } else {
        onPathRef.current(["layers", i, "circle", key], curPair);
      }
      return;
    }
    onPathRef.current(p, defaultAt(p));
  };
  const CircleField = ({ field }) => {
    const key = field.path[2];
    const over = isOverridden(field.path[1], key);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}><SpecField field={field} section="layer" onPath={stablePath} shape={layerShape(field)} defaultValue={defaultAt(field.path)} onReset={() => resetField(field)} /></div>
        <span title={over ? "Overridden for avatar ring" : "Inherits base value"} style={{ fontSize: 11, width: 14, textAlign: "center", color: over ? C.cyan : C.mute }}>{over ? "●" : "○"}</span>
        {over && <button type="button" title="Revert to base value" onClick={() => onDelete(["layers", field.path[1], "circle", key])} style={{ ...chip(false), padding: "0 6px", fontSize: 10 }}>×</button>}
      </div>
    );
  };
  const layerShape = (field) => field.path[0] === "layers" ? rows[field.path[1]]?.layer?.shape : undefined;
  // One [min,max] range pair in a single frame; bounds merge both elements'
  // fixed ranges (still never derived from the live value).
  const renderPair = (item, section, shape) => {
    const { lo, hi } = item;
    const loDef = defaultAt(lo.path), hiDef = defaultAt(hi.path);
    const a = fieldBounds(lo.path, shape, Number.isFinite(loDef) ? loDef : lo.value);
    const b = fieldBounds(hi.path, shape, Number.isFinite(hiDef) ? hiDef : hi.value);
    const bounds = { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max), step: Math.min(a.step, b.step) };
    const title = fieldLabel({ path: lo.path.slice(0, -1), value: 0, kind: "number" }, section);
    const frame = (
      <PairField key={item.key} title={title} lo={Number(lo.value)} hi={Number(hi.value)} bounds={bounds}
        onLo={(v) => stablePath(lo.path, v)} onHi={(v) => stablePath(hi.path, v)}
        loDefault={loDef} hiDefault={hiDef}
        onResetPair={(side) => resetField(side === "min" ? lo : hi)} />
    );
    if (!circleMode || lo.path[0] !== "layers") return frame;
    const over = isOverridden(lo.path[1], lo.path[2]);
    return (
      <div key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{frame}</div>
        <span title={over ? "Overridden for avatar ring" : "Inherits base value"} style={{ fontSize: 11, width: 14, textAlign: "center", color: over ? C.cyan : C.mute }}>{over ? "●" : "○"}</span>
        {over && <button type="button" title="Revert to base value" onClick={() => onDelete(["layers", lo.path[1], "circle", lo.path[2]])} style={{ ...chip(false), padding: "0 6px", fontSize: 10 }}>×</button>}
      </div>
    );
  };
  const renderItem = (item, section) => item.type === "pair"
    ? renderPair(item, section, layerShape(item.lo))
    : (section === "layer" && circleMode
      ? <CircleField key={item.field.path.join(".")} field={item.field} />
      : <SpecField key={item.field.path.join(".")} field={item.field} section={section} onPath={stablePath}
        shape={section === "layer" ? layerShape(item.field) : undefined}
        defaultValue={defaultAt(item.field.path)} onReset={() => resetField(item.field)} />);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {circleMode && (
        <div style={{ fontSize: 11, color: C.cyan, background: C.accentBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px" }}>
          <b>Avatar-ring overrides</b> — these apply only to the profile/ring view. ● = overridden, ○ = inherits the body-figure value. Switch to “Body figure” to edit the base spec.
        </div>
      )}
      {overall.length > 0 && (
        <SpecSection title="Overall">
          <BasicAdv items={groupPairs(overall)} render={(item) => renderItem(item, "overall")} />
        </SpecSection>
      )}
      {spec.art === "ophanim" && (
        <SpecSection title="Wings">
          <FixedNote>Rendered as images (art: ophanim) — not tunable here.</FixedNote>
        </SpecSection>
      )}
      {rows.map(({ layer, index }) => {
        const own = layerFields.get(index) || [];
        const groups = new Map();
        for (const f of own) {
          const key = typeof f.path[f.path.length - 1] === "number" ? f.path[f.path.length - 2] : f.path[f.path.length - 1];
          const g = layerGroupOf(key);
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g).push(f);
        }
        const isParticles = !imgIndexes.has(index) && !flameIndexes.has(index);
        const overrideCount = baseLayers[index]?.circle ? Object.keys(baseLayers[index].circle).length : 0;
        return (
          <div key={index} data-control-group={`layer-${index}`} style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Layer {index + 1} — {describeLayer(layer)}</div>
            {!circleMode && overrideCount > 0 && (
              <FixedNote>{overrideCount} avatar-ring override{overrideCount === 1 ? "" : "s"} — switch to “Avatar ring” mode to edit.</FixedNote>
            )}
            {!circleMode && imgIndexes.has(index) && <ImagePlacement layer={layer} index={index} original={origViewLayers[index]} overCount={overCount} onLayer={(next) => onLayer(index, next)} />}
            {!circleMode && flameIndexes.has(index) && <FlameControls layer={layer} index={index} original={origViewLayers[index]} onLayer={(next) => onLayer(index, next)} onRemoveLayer={() => onRemoveLayer(index)} />}
            {!circleMode && isParticles && (
              <>
                <SelectRow label="Motion" value={layer.k || "orbit"} options={LAYER_KIND_OPTIONS.map((k) => [k, KIND_NAMES[k] || titleCase(k)])} onChange={(v) => setLayerKey(index, "k", v)} />
                <SelectRow label="Shape" value={layer.shape || "dot"} options={(LAYER_SHAPE_OPTIONS.includes(layer.shape) ? LAYER_SHAPE_OPTIONS : [layer.shape, ...LAYER_SHAPE_OPTIONS]).map((s) => [s, SHAPE_NAMES[s] || titleCase(s)])} onChange={(v) => setLayerKey(index, "shape", v)} />
                {layer.blend != null && !(layer.over && overCount <= 1) && <BlendSelect value={layer.blend} onChange={(v) => setLayerKey(index, "blend", v)} />}
                {layer.blend != null && layer.over && overCount <= 1 && <FixedNote>Blend mode — nothing else draws on the over canvas, so it has no visible effect here.</FixedNote>}
              </>
            )}
            {!circleMode && Array.isArray(layer.e) && layer.e.length > 0 && (
              <FixedNote>Icons — {layer.e.join(" ")} — set in the spec, not editable here.</FixedNote>
            )}
            {LAYER_GROUPS.map(([gid]) => groups.has(gid) && (
              <div key={gid}>
                <ControlTitle>{LAYER_GROUP_TITLES[gid]}</ControlTitle>
                <BasicAdv items={groupPairs(groups.get(gid))} render={(item) => renderItem(item, "layer")} />
              </div>
            ))}
            {groups.has("other") && (
              <div>
                <ControlTitle>{LAYER_GROUP_TITLES.other}</ControlTitle>
                <BasicAdv items={groupPairs(groups.get("other"))} render={(item) => renderItem(item, "layer")} />
              </div>
            )}
          </div>
        );
      })}
      {!circleMode && <button type="button" onClick={() => onAddLayer({ k: "orbit", n: 1, shape: "flame", r: [0, 0], w: [0, 0], sz: [12, 12], a: 0.96, tongues: 6, c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], flicker: 0.24, shimmerN: 3, embers: { n: 8, sp: [18, 42], life: [0.5, 1.1], sz: [0.8, 1.6], sway: 10, a: 0.8, c: ["#FFB43C", "#FFF6C9"] } })} style={{ ...chip(false), justifySelf: "start", fontSize: 11 }}>Add flame layer</button>}
      {!circleMode && Object.entries(sectioned).map(([id, list]) => (list.length > 0 || (id === "bolts" && spec.bolts?.from)) && (
        <SpecSection key={id} title={SECTION_TITLES[id]}>
          <BasicAdv items={groupPairs(list)} render={(item) => renderItem(item, id)} />
          {id === "bolts" && spec.bolts?.from && (
            <FixedNote>Strike direction — “{spec.bolts.from}” — set in the spec, not editable here.</FixedNote>
          )}
        </SpecSection>
      ))}
      {!circleMode && (spec.rings || []).map((ring, index) => (
        <div key={index} data-control-group={`ring-${index}`} style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Ring {index + 1}</div>
          <BasicAdv items={groupPairs(ringFields.get(index) || [])} render={(item) => renderItem(item, "rings")} />
          <RingCycleControls ring={ring} index={index} original={origSpec.rings?.[index]} onRing={(next) => onPath(["rings", index], next)} />
        </div>
      ))}
    </div>
  );
}

function ShapeCell({ shape, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 160 * dpr; canvas.height = 160 * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const particle = { sz: 17, c: color, rot: -0.35, ph: 0.8, age: 0.45, life: 1, ang: 0.4, w: 0.3, ashBlobs: [[-0.22, -0.08, 0.34], [0.18, 0.12, 0.28], [0.02, 0.28, 0.22]] };
    drawNewParticleShape(g, shape, particle, 80, 80, 0.8);
  }, [shape, color]);
  return (
    <div style={{ textAlign: "center" }}>
      <canvas ref={ref} width={160} height={160} style={{ width: 160, height: 160, margin: "0 auto", background: "rgba(0,0,0,0.3)", borderRadius: 12 }} />
      <div style={{ marginTop: 6, fontSize: 11, color: C.text }}>{shape}</div>
    </div>
  );
}

function PerfHud() {
  const ref = useRef(null);
  useEffect(() => {
    const samples = [];
    const orig = AuraLoop.tick;
    let last = 0;
    AuraLoop.tick = function (t) {
      const frame = last ? t - last : 0;
      last = t;
      const t0 = performance.now();
      try { orig.call(this, t); }
      finally {
        if (frame > 0) samples.push({ at: performance.now(), frame, work: performance.now() - t0 });
      }
    };
    const publish = () => {
      const now = performance.now();
      const win = samples.filter((s) => now - s.at <= 5000);
      samples.splice(0, samples.length, ...win);
      const stat = (key) => {
        if (!win.length) return { avg: null, p95: null };
        const xs = win.map((s) => s[key]).sort((a, b) => a - b);
        const avg = xs.reduce((sum, n) => sum + n, 0) / xs.length;
        const p95 = xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(xs.length * 0.95) - 1))];
        return { avg, p95 };
      };
      let live = 0, shadows = 0;
      AuraLoop.set.forEach((inst) => { if (inst.visible) live += 1; shadows += inst.shadowWisps || 0; });
      let images = 0;
      _auraImageCache.forEach((rec) => { if (rec.ready && !rec.failed) images += 1; });
      const frame = stat("frame");
      const work = stat("work");
      const fmt = (n) => (n == null ? "—" : n.toFixed(1));
      const hud = {
        frameAvg: frame.avg, frameP95: frame.p95, workAvg: work.avg, workP95: work.p95,
        live, mounted: AuraLoop.set.size, images, shadows,
      };
      window.__auraGalleryHud = hud;
      if (ref.current) {
        ref.current.textContent = `frame ${fmt(frame.avg)} avg · ${fmt(frame.p95)} p95 ms\nwork ${fmt(work.avg)} avg · ${fmt(work.p95)} p95 ms\nlive ${live} · canvases ${AuraLoop.set.size}\nimages ${images} · shadows ${shadows}`;
      }
    };
    publish();
    const id = setInterval(publish, 250);
    return () => {
      AuraLoop.tick = orig;
      clearInterval(id);
    };
  }, []);
  return (
    <pre ref={ref} aria-live="polite" style={{ position: "fixed", right: 8, bottom: 8, zIndex: 40, margin: 0, pointerEvents: "none", font: "11px/1.35 ui-monospace, monospace", color: "#F2F8FF", background: "rgba(0,0,0,.78)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "8px 10px", whiteSpace: "pre" }}>
      frame —
    </pre>
  );
}

export function DevAuraGallery() {
  const dragging = useDragging();
  const originals = useRef(null);
  if (!originals.current) originals.current = { ...AURA_FX };
  // Refs survive Fast Refresh, so this snapshot can predate an aura-id rename —
  // top up any key it missed from the live table rather than trusting it wholesale.
  for (const k of Object.keys(AURA_FX)) if (!(k in originals.current)) originals.current[k] = AURA_FX[k];
  // Every id lookup goes through resolveAuraId: drafts and the snapshot may
  // still hold a pre-rename key, and callers may pass the legacy spelling.
  const origFor = (id) => originals.current[resolveAuraId(id)] || originals.current[id] || AURA_FX[resolveAuraId(id)];
  const [backdropId, setBackdropId] = useState(FIGURES[0].id);
  const [photo, setPhoto] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [custom, setCustom] = useState({ cyan: "#FF5AD9", blue: "#7A3CFF", bg: "#140818" });
  const [sizeId, setSizeId] = useState("88");
  const [reduce, setReduce] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState("base");
  const lastFig = useRef(FIGURES[0].id);
  const [drafts, setDrafts] = useState({});
  const [revs, setRevs] = useState({});
  const [copied, setCopied] = useState("");
  const [showShapes, setShowShapes] = useState(false);
  const barRef = useRef(null);
  const [barH, setBarH] = useState(64);

  if (theme === "custom") applyTheme({ theme: "dark", custom: { on: true, cyan: custom.cyan, blue: custom.blue, bg: custom.bg } });
  else if (theme === "zesty") applyTheme({ theme: "dark", zesty: true });
  else applyTheme({ theme: theme === "light" ? "light" : "dark" });

  useEffect(() => () => applyTheme({ theme: "dark" }), []);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const watch = () => setBarH(el.offsetHeight);
    const ro = new ResizeObserver(watch);
    ro.observe(el);
    watch();
    return () => ro.disconnect();
  }, [theme, showAnchors, sizeId, backdropId, custom]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  useLayoutEffect(() => {
    const ids = Object.keys(drafts);
    // Mid-drag the stage renders a particle-capped preview spec; the committed
    // draft itself is untouched and restored in full on release.
    for (const id of ids) AURA_FX[id] = liveDrags > 0 ? clampForPreview(drafts[id]) : drafts[id];
    return () => {
      for (const id of ids) AURA_FX[id] = origFor(id);
    };
  }, [drafts]);

  useLayoutEffect(() => {
    const prev = window.matchMedia;
    window.matchMedia = (query) => {
      if (String(query).includes("prefers-reduced-motion")) {
        return {
          matches: reduce,
          media: String(query),
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; },
        };
      }
      return prev.call(window, query);
    };
    return () => { window.matchMedia = prev; };
  }, [reduce]);

  const backdrop = backdropId === "letter"
    ? { kind: "letter" }
    : backdropId === "photo"
      ? { kind: "photo" }
      : { kind: "figure", src: backdropId };
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[2];
  // Ring preview never drops below studio-88 geometry — it's the view users
  // actually see most, so it stays at least as large as the figure preview.
  const ringPrev = ringGeom(Math.max(size.avatar, 88));
  const boardPrev = ringGeom(32);

  const specFor = (id) => drafts[resolveAuraId(id)] || drafts[id] || origFor(id);
  const bump = (id, recipe) => {
    const rid = resolveAuraId(id);
    setDrafts((d) => {
      const next = { ...d };
      const seed = next[rid] || next[id] || cloneSpec(origFor(rid));
      if (rid !== id) delete next[id];
      next[rid] = recipe(seed);
      return next;
    });
    setRevs((r) => ({ ...r, [rid]: (r[rid] || 0) + 1 }));
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBackdropId("photo");
  };

  const copySpec = async (id) => {
    const text = formatAuraEntry(id, specFor(id));
    // Legacy copy has to run inside the click, before any await drops the gesture.
    let legacy = false;
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      legacy = document.execCommand("copy");
      area.remove();
    } catch { legacy = false; }
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied");
    } catch {
      setCopied(legacy ? "Copied" : "Copy failed");
    }
  };

  const barBtn = (on, label, onClick) => (
    <button type="button" aria-pressed={on} onClick={onClick} style={chip(on)}>{label}</button>
  );

  const stageFor = (id) => (
    <Stage
      aura={id}
      size={size}
      backdrop={backdrop}
      photo={photo}
      showAnchors={showAnchors}
      canvasKey={`${id}:${revs[id] || 0}:${reduce ? 1 : 0}`}
    />
  );

  const selectedAura = AURAS.find((a) => a.id === selected);

  // Real 76px profile path — Avatar wraps the photo in AuraRing with the
  // production ringScale/k, so this is exactly what the app renders.
  const profilePreview = selected && selectedAura ? (
    <div style={{ marginTop: 12, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.panel }}>
      <div style={{ fontSize: 10, color: C.mute, marginBottom: 10 }}>Profile avatar (76px, real chrome)</div>
      <div style={{ padding: 14, display: "inline-block" }}>
        <Avatar
          key={`pv-${selected}-${revs[selected] || 0}-${reduce ? 1 : 0}`}
          src={photo || undefined}
          name="Preview"
          size={76}
          ring={selectedAura.colors?.[0]}
          look={{ aura: selected }}
        />
      </div>
    </div>
  ) : null;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={barRef} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10, background: C.navBg, borderBottom: `1px solid ${C.border}` }}>
        <strong style={{ fontSize: 13 }}>Aura gallery</strong>
        <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: C.dim }}>
          Backdrop
          {barBtn(backdrop.kind === "figure", "Figure", () => setBackdropId(lastFig.current))}
          {barBtn(backdrop.kind === "letter", "Default avatar", () => setBackdropId("letter"))}
          {barBtn(backdrop.kind === "photo", "My photo", () => setBackdropId("photo"))}
          <input id="aura-photo" type="file" accept="image/*" onChange={onPhoto} title="Load your own photo" style={{ fontSize: 10, maxWidth: 140, color: C.mute }} />
          {/* hidden select kept so automated shot scripts can drive the backdrop */}
          <select id="aura-backdrop" value={backdropId} onChange={(e) => setBackdropId(e.target.value)} aria-hidden="true" tabIndex={-1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}>
            {FIGURES.map((fig) => <option key={fig.id} value={fig.id}>{fig.label}</option>)}
            <option value="letter">Letter</option>
            <option value="photo">Photo</option>
          </select>
        </span>
        {backdrop.kind === "figure" && (() => {
          const idx = Math.max(0, FIGURES.findIndex((f) => f.id === backdropId));
          const tier = Math.floor(idx / 2), sex = idx % 2 ? "f" : "m";
          const pick = (s, t) => { lastFig.current = physiqueSrc(s, t); setBackdropId(lastFig.current); };
          const step = (d) => setBackdropId((cur) => {
            const i = Math.max(0, FIGURES.findIndex((f) => f.id === cur));
            lastFig.current = FIGURES[(i + d + FIGURES.length) % FIGURES.length].id;
            return lastFig.current;
          });
          return (
            <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: C.dim }}>
              Body {barBtn(sex === "m", "Male", () => pick("m", tier))} {barBtn(sex === "f", "Female", () => pick("f", tier))}
              <span style={{ marginLeft: 6 }}>Rank</span>
              {TIER_IDS.map((t, ti) => <span key={t}>{barBtn(ti === tier, t, () => pick(sex, ti))}</span>)}
              {barBtn(false, "◀", () => step(-1))} {barBtn(false, "▶", () => step(1))}
            </span>
          );
        })()}
        <span style={{ display: "flex", gap: 4 }}>
          {barBtn(theme === "dark", "Dark", () => setTheme("dark"))}
          {barBtn(theme === "light", "Light", () => setTheme("light"))}
          {barBtn(theme === "zesty", "Zesty", () => setTheme("zesty"))}
          {barBtn(theme === "custom", "Custom", () => setTheme("custom"))}
        </span>
        {theme === "custom" && (
          <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
            Cyan <input type="color" value={custom.cyan} onChange={(e) => setCustom((c) => ({ ...c, cyan: e.target.value }))} />
            Blue <input type="color" value={custom.blue} onChange={(e) => setCustom((c) => ({ ...c, blue: e.target.value }))} />
            Background <input type="color" value={custom.bg} onChange={(e) => setCustom((c) => ({ ...c, bg: e.target.value }))} />
          </span>
        )}
        <span style={{ display: "flex", gap: 4 }}>
          {SIZES.map((s) => <span key={s.id}>{barBtn(sizeId === s.id, s.label, () => setSizeId(s.id))}</span>)}
        </span>
        <label style={{ fontSize: 12, color: C.dim, display: "flex", gap: 4, alignItems: "center" }}>
          <input id="aura-reduce" type="checkbox" checked={reduce} onChange={(e) => setReduce(e.target.checked)} />
          Reduced motion
        </label>
        <label style={{ fontSize: 12, color: C.dim, display: "flex", gap: 4, alignItems: "center" }}>
          <input id="aura-anchors" type="checkbox" checked={showAnchors} onChange={(e) => setShowAnchors(e.target.checked)} />
          Anchors
        </label>
        <button type="button" onClick={() => setShowShapes(!showShapes)} style={{ ...chip(showShapes), fontSize: 12 }}>{showShapes ? "Hide shapes" : "Show shapes"}</button>
        {showAnchors && <span style={{ fontSize: 11, color: C.mute }}>Head circle, shoulder line, torso cross</span>}
        <span style={{ fontSize: 11, color: C.mute }}>Preview only. Nothing is saved.</span>
      </div>

      {selected && selectedAura ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", paddingTop: barH + 12, paddingRight: 16, paddingBottom: 88, paddingLeft: 16, scrollMarginTop: barH + 12 }}>
          <div style={{ flex: "0 0 auto" }}>
            <button type="button" onClick={() => { setSelected(null); setCopied(""); }} style={{ ...chip(false), marginBottom: 8 }}>All auras</button>
            {/* All three views stay mounted — drafts write AURA_FX + bump revs,
                so every preview re-renders live, and Play moment hits every
                live instance of the aura at once. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10, color: C.mute, marginBottom: 4 }}>Body figure{editMode === "base" ? " — editing" : ""}</div>
                <FigureStage
                  aura={selected}
                  px={size.px}
                  figure={backdrop.kind === "photo" && photo ? photo : backdrop.kind === "figure" ? backdrop.src : lastFig.current}
                  canvasKey={`vf-${selected}:${revs[selected] || 0}:${reduce ? 1 : 0}`}
                  showAnchors={showAnchors}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.mute, marginBottom: 4 }}>Avatar ring{editMode === "circle" ? " — editing" : ""}</div>
                <CircleStage
                  aura={selected}
                  px={ringPrev.cpx}
                  ring={ringPrev.ring}
                  facePx={ringPrev.avatar}
                  canvasKey={`vr-${selected}:${revs[selected] || 0}:${reduce ? 1 : 0}`}
                  photo={backdrop.kind === "photo" ? photo : null}
                  letter="A"
                  showAnchors={showAnchors}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.mute, marginBottom: 4 }}>Board 32</div>
                <CircleStage
                  aura={selected}
                  px={boardPrev.cpx}
                  ring={boardPrev.ring}
                  facePx={boardPrev.avatar}
                  canvasKey={`vb-${selected}:${revs[selected] || 0}:${reduce ? 1 : 0}`}
                  photo={backdrop.kind === "photo" ? photo : null}
                  letter="A"
                  showAnchors={false}
                />
              </div>
            </div>
            {specFor(selected)?.moment && (
              <button type="button" onClick={() => fireAuraMoment(selected)} style={{ ...chip(false), marginTop: 8, fontSize: 12 }}>▶ Play moment (all previews)</button>
            )}
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>{selectedAura.name}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{selectedAura.rarity || selectedAura.group} · {selectedAura.id}</div>
            {profilePreview}
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 280, maxHeight: "calc(100dvh - 120px)", overflow: "auto", paddingBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <button type="button" onClick={() => copySpec(selected)} style={{ ...chip(true), fontWeight: 700, padding: "6px 14px" }}>{copied || "⧉ Copy spec"}</button>
              <button type="button" onClick={() => {
                setDrafts((d) => {
                  if (!d[selected]) return d;
                  const next = { ...d };
                  delete next[selected];
                  return next;
                });
                setRevs((r) => ({ ...r, [selected]: (r[selected] || 0) + 1 }));
              }} style={chip(false)}>Reset</button>
              <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11, color: C.mute, marginLeft: "auto" }}>
                Editing:
                {barBtn(editMode === "base", "Body figure", () => setEditMode("base"))}
                {barBtn(editMode === "circle", "Avatar ring", () => setEditMode("circle"))}
              </span>
            </div>
            <SpecEditor
              spec={specFor(selected)}
              original={origFor(selected)}
              circleMode={editMode === "circle"}
              onPath={(path, value) => bump(selected, (base) => setDeep(base, path, value))}
              onDelete={(path) => bump(selected, (base) => deleteDeep(base, path))}
              onLayer={(index, layer) => bump(selected, (base) => {
                const next = cloneSpec(base);
                if (layer == null) next.layers.splice(index, 1);
                else next.layers[index] = layer;
                return next;
              })}
              onAddLayer={(layer) => bump(selected, (base) => {
                const next = cloneSpec(base);
                next.layers = [...(next.layers || []), layer];
                return next;
              })}
              onRemoveLayer={(index) => bump(selected, (base) => {
                const next = cloneSpec(base);
                next.layers.splice(index, 1);
                return next;
              })}
            />
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(112, (backdrop.kind === "figure" ? size.px : size.cpx) + (backdrop.kind === "figure" ? 36 : 16))}px, 1fr))`,
          gap: 12,
          paddingTop: barH + 12,
          paddingRight: 12,
          paddingBottom: 88,
          paddingLeft: 12,
          scrollMarginTop: barH + 12,
        }}>
          {AURAS.map((aura) => (
            <button key={aura.id} type="button" onClick={() => { setCopied(""); setSelected(aura.id); }} style={{ background: "transparent", color: "inherit", border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, cursor: "pointer", textAlign: "center" }}>
              {stageFor(aura.id)}
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700 }}>{aura.name}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{aura.rarity || aura.group} · {aura.id}</div>
            </button>
          ))}
        </div>
      )}
      {showShapes && (
        <div data-control-group="shape-sheet" style={{
          position: "fixed",
          top: barH + 12,
          left: 12,
          right: 12,
          bottom: 88,
          background: C.bg,
          zIndex: 40,
          padding: 16,
          overflow: "auto",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
        }}>
          <button type="button" onClick={() => setShowShapes(false)} style={{ ...chip(false), marginBottom: 12 }}>Close</button>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>New particle shapes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
            {Object.entries(SHAPE_SHEET).map(([shape, color]) => <ShapeCell key={shape} shape={shape} color={color} />)}
          </div>
        </div>
      )}
      {dragging && (
        <div data-testid="drag-preview-hint" aria-live="polite" style={{ position: "fixed", left: 12, bottom: 12, zIndex: 40, fontSize: 11, color: "#F2F8FF", background: "rgba(0,0,0,.78)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "5px 10px", pointerEvents: "none" }}>
          Preview simplified while dragging
        </div>
      )}
      <PerfHud />
    </div>
  );
}
