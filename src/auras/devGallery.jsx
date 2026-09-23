// Dev-only aura tuning gallery. Loaded from a DEV branch in Auth so production builds drop this module.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveAuraAnchors } from "./anchors.js";
import { AURA_FX, AuraCanvas, AuraLoop, _auraImageCache, auraNeedsOver, drawNewParticleShape } from "./AuraCanvas.jsx";
import { AURAS } from "./catalog.js";
import { cloneSpec, formatAuraEntry, setPath, specFields } from "./specFormat.js";
import { C, applyTheme } from "../theme.js";
import { TIER_IDS, physiqueSrc } from "../tabs/train/physique.js";

const SIZES = [
  { id: "32", label: "32 board", px: 32, ring: 32 / 2.7 },
  { id: "76", label: "76 profile", px: 76, ring: 76 / 2.7 },
  { id: "88", label: "88 studio", px: 88, ring: 28 },
  { id: "160", label: "160 crate", px: 160, ring: 52 },
  { id: "inspect", label: "inspect", px: 320, ring: 104 },
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

const FLAG_KEYS = new Set(["flip", "even", "behind", "tw", "bob", "dash", "ink", "dark", "flash", "strike", "calm", "breathe", "glint", "over", "top", "flick", "fan", "artLate"]);
const HEAD_FROM_EYE = 22.5 / 9;

function sliderRange(path, value) {
  const key = String(path[path.length - 1]);
  if (key === "n" || key === "filigree") return { min: 0, max: Math.max(80, Math.ceil(Math.abs(value) * 2)), step: 1 };
  if (FLAG_KEYS.has(key)) return { min: 0, max: 1, step: 1 };
  if (key === "spd") return { min: 0, max: 8, step: 0.01 };
  if (key === "glow" || key === "a" || key === "flashPeak") return { min: 0, max: 1.5, step: 0.01 };
  if (key === "frameDuration" || key === "fadeLen") return { min: 0, max: 1, step: 0.01 };
  if (key === "cyclePeriod") return { min: 0.5, max: 10, step: 0.1 };
  const abs = Math.abs(value);
  const neg = value < 0;
  if (Number.isInteger(value) && abs >= 2) return { min: neg ? -Math.ceil(abs * 3) : 0, max: Math.max(4, Math.ceil(abs * 3)), step: 1 };
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

function NumSlider({ label, value, min, max, step, onChange }) {
  const shown = Math.min(max, Math.max(min, value));
  return (
    <label style={{ display: "grid", gridTemplateColumns: "118px 1fr 72px", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
      <span title={label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={shown} onChange={(e) => onChange(quantize(Number(e.target.value), step))} />
      <input type="number" value={value} step={step} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(quantize(n, step)); }} style={{ width: 72, background: C.inpBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 4px" }} />
    </label>
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
  const box = Math.max(16, Math.round(px * 0.62));
  if (photo) return <img src={photo} alt="" style={{ width: box, height: box, borderRadius: 999, objectFit: "cover", display: "block" }} />;
  return (
    <div style={{ width: box, height: box, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: C.accentBg, color: C.cyan, fontWeight: 700, fontSize: box * 0.42 }}>
      {letter}
    </div>
  );
}

function CircleStage({ aura, px, ring, canvasKey, photo, letter, showAnchors }) {
  const face = <Face px={px} photo={photo} letter={letter} />;
  return (
    <div className="relative" style={{ width: px, height: px, margin: "0 auto" }}>
      {aura && aura !== "none" ? (
        <AuraCanvas key={canvasKey} aura={aura} w={px} h={px} ringR={ring} style={{ left: 0, top: 0 }}>{face}</AuraCanvas>
      ) : (
        <div className="absolute flex items-center justify-center" style={{ inset: 0 }}>{face}</div>
      )}
      {showAnchors && (
        <AnchorOverlay w={px} h={px} mode="circle" aura={aura} ringR={ring} style={{ position: "absolute", left: 0, top: 0, zIndex: 4 }} />
      )}
    </div>
  );
}

function FigureStage({ aura, px, figure, canvasKey, showAnchors }) {
  const box = bodyBox(px, aura || "ember");
  const [overSlot, setOverSlot] = useState(null);
  const showOver = !!(aura && aura !== "none" && auraNeedsOver(aura));
  const place = { position: "absolute", left: "50%", top: box.top, width: box.aw, height: box.ah, transform: "translateX(-50%)" };
  return (
    <div className="relative" style={{ height: box.height, width: "100%" }}>
      {aura && aura !== "none" && (
        <AuraCanvas key={canvasKey} aura={aura} mode="body" w={box.aw} h={box.ah} overSlot={overSlot} figure={figure} style={place} />
      )}
      <img src={figure} alt="" style={{ height: box.height, width: "auto", display: "block", margin: "0 auto", position: "relative", zIndex: 1, pointerEvents: "none" }} />
      {showOver && <div ref={setOverSlot} style={{ ...place, zIndex: 2, pointerEvents: "none" }} />}
      {showAnchors && (
        <AnchorOverlay w={box.aw} h={box.ah} mode="body" aura={aura} figure={figure} ringR={box.aw / 3} style={{ ...place, zIndex: 4 }} />
      )}
    </div>
  );
}

function Stage({ aura, size, backdrop, photo, canvasKey, showAnchors }) {
  if (backdrop.kind === "figure") {
    return <FigureStage aura={aura} px={size.px} figure={backdrop.src} canvasKey={canvasKey} showAnchors={showAnchors} />;
  }
  return (
    <CircleStage
      aura={aura}
      px={size.px}
      ring={size.ring}
      canvasKey={canvasKey}
      photo={backdrop.kind === "photo" ? photo : null}
      letter="A"
      showAnchors={showAnchors}
    />
  );
}

function rangePair(value, fallback) {
  return Array.isArray(value) ? [...value] : [value ?? fallback, value ?? fallback];
}

function setRangePart(object, key, index, value, fallback) {
  const next = cloneSpec(object);
  const pair = rangePair(next[key], fallback);
  pair[index] = value;
  next[key] = pair;
  return next;
}

function numberAt(value, fallback) {
  const raw = Array.isArray(value) ? value[0] : value;
  return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
}

function ColorField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
      <span>{label}</span>
      <input type="color" value={colorInputValue(value)} onChange={(e) => onChange(e.target.value)} style={{ width: 48, height: 28, padding: 0, border: "none", background: "transparent" }} />
    </label>
  );
}

function ControlTitle({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.cyan, marginTop: 4 }}>{children}</div>;
}

function ImagePlacement({ layer, index, onLayer }) {
  const shoulders = layer.placed === "shoulders";
  const scale = layerScale(layer);
  const single = layer.n === 1;
  const xy = single ? orbitXY(layer) : { x: layer.x || 0, y: layer.y || 0 };
  const isFrameAnim = layer.frames && layer.frames.length > 0;
  const shadow = layer.shadow === true ? {} : layer.shadow || null;
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
      <NumSlider label="x" value={xy.x} min={-2} max={2} step={0.01} onChange={(v) => onLayer(single ? withOrbitXY(layer, v, xy.y) : withOptional(layer, "x", v))} />
      <NumSlider label="y" value={xy.y} min={-2} max={2} step={0.01} onChange={(v) => onLayer(single ? withOrbitXY(layer, xy.x, v) : withOptional(layer, "y", v))} />
      {!shoulders && <NumSlider label="scale" value={scale} min={0.02} max={4} step={0.01} onChange={(v) => onLayer(withScale(layer, v))} />}
      {!shoulders && <NumSlider label="rotation" value={layer.rot || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("rot", v)} />}
      {!shoulders && <NumSlider label="flip" value={layer.flip ? 1 : 0} min={0} max={1} step={1} onChange={(v) => setLayer("flip", v)} />}
      {!single && <div style={{ fontSize: 10, color: C.mute }}>x and y shift every image in this layer. 1 is one ring radius.</div>}

      <div data-control-group="frame-animation" style={{ display: "grid", gap: 4 }}>
        <ControlTitle>Frame animation</ControlTitle>
        <button type="button" onClick={() => setFrames(!isFrameAnim)} style={{ ...chip(!!isFrameAnim), justifySelf: "start", fontSize: 11 }}>{isFrameAnim ? "Disable frame cycle" : "Enable frame cycle"}</button>
        {isFrameAnim && (
          <>
            <NumSlider label="frameDuration" value={layer.frameDuration || 0.12} min={0.01} max={1} step={0.01} onChange={(v) => setLayer("frameDuration", v)} />
            <NumSlider label="fadeLen" value={layer.fadeLen || 0.12} min={0} max={0.5} step={0.01} onChange={(v) => setLayer("fadeLen", v)} />
            <div style={{ fontSize: 10, color: C.mute }}>
              <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                Mode: <select value={layer.frameMode || "loop"} onChange={(e) => setLayer("frameMode", e.target.value)} style={{ fontSize: 10 }}>
                  <option value="loop">loop</option>
                  <option value="pingpong">pingpong</option>
                </select>
              </label>
            </div>
            {layer.frames.map((src, frameIndex) => {
              const offset = layer.frameOffsets?.[frameIndex] || {};
              const updateOffset = (key, value) => {
                const next = cloneSpec(layer);
                next.frameOffsets = [...(next.frameOffsets || [])];
                while (next.frameOffsets.length < next.frames.length) next.frameOffsets.push({});
                next.frameOffsets[frameIndex] = { ...next.frameOffsets[frameIndex], [key]: value };
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
                      next.frameOffsets?.splice(frameIndex, 1);
                      onLayer(next);
                    }} style={{ ...chip(false), padding: "2px 6px", fontSize: 10 }}>Remove</button>}
                  </label>
                  <NumSlider label="offset x" value={offset.x || 0} min={-2} max={2} step={0.01} onChange={(v) => updateOffset("x", v)} />
                  <NumSlider label="offset y" value={offset.y || 0} min={-2} max={2} step={0.01} onChange={(v) => updateOffset("y", v)} />
                  <NumSlider label="offset scale" value={offset.scale ?? 1} min={0.02} max={4} step={0.01} onChange={(v) => updateOffset("scale", v)} />
                  <NumSlider label="offset rotation" value={offset.rotation || 0} min={-1} max={1} step={0.01} onChange={(v) => updateOffset("rotation", v)} />
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
            <NumSlider label="shadow max" value={shadow.max ?? 24} min={0} max={64} step={1} onChange={(v) => setShadow("max", v)} />
            <NumSlider label="shadow rate" value={shadow.rate ?? 10} min={0} max={60} step={0.1} onChange={(v) => setShadow("rate", v)} />
            <NumSlider label="shadow anchors" value={shadow.anchors ?? 48} min={1} max={48} step={1} onChange={(v) => setShadow("anchors", v)} />
            <NumSlider label="life min" value={rangePair(shadow.life, 0.8)[0]} min={0.1} max={5} step={0.1} onChange={(v) => setShadowRange("life", 0, v, 0.8)} />
            <NumSlider label="life max" value={rangePair(shadow.life, 1.6)[1]} min={0.1} max={5} step={0.1} onChange={(v) => setShadowRange("life", 1, v, 1.6)} />
            <NumSlider label="speed min" value={rangePair(shadow.sp, 4)[0]} min={0} max={80} step={0.5} onChange={(v) => setShadowRange("sp", 0, v, 4)} />
            <NumSlider label="speed max" value={rangePair(shadow.sp, 12)[1]} min={0} max={80} step={0.5} onChange={(v) => setShadowRange("sp", 1, v, 12)} />
            <NumSlider label="size min" value={rangePair(shadow.sz, 3)[0]} min={0} max={20} step={0.1} onChange={(v) => setShadowRange("sz", 0, v, 3)} />
            <NumSlider label="size max" value={rangePair(shadow.sz, 8)[1]} min={0} max={20} step={0.1} onChange={(v) => setShadowRange("sz", 1, v, 8)} />
            <NumSlider label="shadow alpha" value={shadow.a ?? 0.38} min={0} max={1} step={0.01} onChange={(v) => setShadow("a", v)} />
            <NumSlider label="edge jitter" value={shadow.jit ?? 0.35} min={0} max={1} step={0.01} onChange={(v) => setShadow("jit", v)} />
            {shadowColors.map((color, i) => <ColorField key={i} label={`shadow colour ${i + 1}`} value={color} onChange={(v) => setShadowColor(i, v)} />)}
            <label style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
              <span>blend</span>
              <select value={shadow.blend || "source-over"} onChange={(e) => setShadow("blend", e.target.value)} style={{ fontSize: 10 }}>
                <option value="source-over">source-over</option>
                <option value="lighter">lighter</option>
                <option value="screen">screen</option>
                <option value="multiply">multiply</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function RingCycleControls({ ring, index, onRing }) {
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
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Ring {index + 1} colour cycle</div>
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Animated colours
      </label>
      {active && (
        <>
          <NumSlider label="cyclePeriod" value={ring.cyclePeriod ?? 3} min={0.5} max={10} step={0.1} onChange={(v) => setRing("cyclePeriod", v)} />
          <label style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
            <span>cycleEasing</span>
            <select value={ring.cycleEasing || "linear"} onChange={(e) => setRing("cycleEasing", e.target.value)} style={{ fontSize: 10 }}>
              <option value="linear">linear</option>
              <option value="step">step</option>
            </select>
          </label>
          {colors.map((color, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4, alignItems: "center" }}>
              <ColorField label={`cycle colour ${i + 1}`} value={color} onChange={(v) => setColor(i, v)} />
              {colors.length > 2 && <button type="button" onClick={() => setRing("colorCycle", colors.filter((_, j) => j !== i))} style={{ ...chip(false), padding: "2px 6px", fontSize: 10 }}>Remove</button>}
            </div>
          ))}
          <button type="button" onClick={() => setRing("colorCycle", [...colors, colors.at(-1) || "#FFFFFF"])} style={{ ...chip(false), justifySelf: "start", fontSize: 11 }}>Add cycle colour</button>
        </>
      )}
    </div>
  );
}

function FlameControls({ layer, index, onLayer, onRemoveLayer }) {
  const setLayer = (key, value) => {
    const next = cloneSpec(layer);
    next[key] = value;
    onLayer(next);
  };
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
      <NumSlider label="count" value={layer.n ?? 1} min={1} max={12} step={1} onChange={(v) => setLayer("n", v)} />
      <NumSlider label="size" value={layerScale(layer)} min={1} max={30} step={0.1} onChange={(v) => onLayer(withScale(layer, v))} />
      <NumSlider label="alpha" value={layer.a ?? 1} min={0} max={1} step={0.01} onChange={(v) => setLayer("a", v)} />
      <NumSlider label="rotation" value={layer.rot || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("rot", v)} />
      <NumSlider label="spin" value={layer.spin || 0} min={-1} max={1} step={0.01} onChange={(v) => setLayer("spin", v)} />
      <NumSlider label="tongues" value={numberAt(layer.tongues, 6)} min={5} max={7} step={1} onChange={(v) => setLayer("tongues", v)} />
      <NumSlider label="flicker" value={layer.flicker ?? 0.22} min={0} max={1} step={0.01} onChange={(v) => setLayer("flicker", v)} />
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={layer.shimmer !== false} onChange={(e) => setLayer("shimmer", e.target.checked)} />
        Base shimmer
      </label>
      {layer.shimmer !== false && <NumSlider label="shimmer arcs" value={layer.shimmerN ?? 3} min={0} max={6} step={1} onChange={(v) => setLayer("shimmerN", v)} />}
      {["outer", "mid", "inner"].map((name, i) => <ColorField key={name} label={`${name} flame`} value={palette[i] || "#FFF6C9"} onChange={(v) => setPalette(i, v)} />)}
      <ControlTitle>Embers</ControlTitle>
      <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: C.mute }}>
        <input type="checkbox" checked={!!layer.embers} onChange={(e) => setLayer("embers", e.target.checked ? emberDefaults : false)} />
        Reuse rise particles
      </label>
      {embers && (
        <>
          <NumSlider label="ember count" value={embers.n ?? 8} min={0} max={40} step={1} onChange={(v) => setEmber("n", v)} />
          <NumSlider label="ember speed min" value={rangePair(embers.sp, 18)[0]} min={0} max={100} step={1} onChange={(v) => setEmberRange("sp", 0, v, 18)} />
          <NumSlider label="ember speed max" value={rangePair(embers.sp, 42)[1]} min={0} max={100} step={1} onChange={(v) => setEmberRange("sp", 1, v, 42)} />
          <NumSlider label="ember life min" value={rangePair(embers.life, 0.5)[0]} min={0.1} max={5} step={0.1} onChange={(v) => setEmberRange("life", 0, v, 0.5)} />
          <NumSlider label="ember life max" value={rangePair(embers.life, 1.1)[1]} min={0.1} max={5} step={0.1} onChange={(v) => setEmberRange("life", 1, v, 1.1)} />
          <NumSlider label="ember size min" value={rangePair(embers.sz, 0.8)[0]} min={0} max={10} step={0.1} onChange={(v) => setEmberRange("sz", 0, v, 0.8)} />
          <NumSlider label="ember size max" value={rangePair(embers.sz, 1.6)[1]} min={0} max={10} step={0.1} onChange={(v) => setEmberRange("sz", 1, v, 1.6)} />
          <NumSlider label="ember sway" value={embers.sway ?? 10} min={0} max={40} step={0.5} onChange={(v) => setEmber("sway", v)} />
          <NumSlider label="ember alpha" value={embers.a ?? 0.8} min={0} max={1} step={0.01} onChange={(v) => setEmber("a", v)} />
          {emberColors.map((color, i) => <ColorField key={i} label={`ember colour ${i + 1}`} value={color} onChange={(v) => setEmberColor(i, v)} />)}
        </>
      )}
    </div>
  );
}

const DEDICATED_LAYER_FIELDS = new Set(["frames", "frameDuration", "fadeLen", "frameMode", "frameOffsets", "shadow", "tongues", "flicker", "shimmer", "shimmerN", "embers"]);
const DEDICATED_RING_FIELDS = new Set(["colorCycle", "cyclePeriod", "cycleEasing"]);

function SpecEditor({ spec, onPath, onLayer, onAddLayer, onRemoveLayer }) {
  if (!spec) return <p style={{ color: C.dim, fontSize: 13 }}>This aura has no particle spec.</p>;
  const rows = (spec.layers || []).map((layer, index) => ({ layer, index }));
  const images = rows.filter((row) => row.layer?.shape === "img");
  const flames = rows.filter((row) => row.layer?.shape === "flame");
  const dedicatedIndexes = new Set(rows.filter((row) => ["img", "flame"].includes(row.layer?.shape)).map((row) => row.index));
  const fields = specFields(spec).filter((field) => {
    if (field.path[0] === "layers" && dedicatedIndexes.has(field.path[1]) && DEDICATED_LAYER_FIELDS.has(field.path[2])) return false;
    if (field.path[0] === "layers" && flames.some((row) => row.index === field.path[1]) && field.path[2] === "c") return false;
    if (field.path[0] === "rings" && DEDICATED_RING_FIELDS.has(field.path[2])) return false;
    return true;
  });
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {images.map(({ layer, index }) => (
        <ImagePlacement key={index} layer={layer} index={index} onLayer={(next) => onLayer(index, next)} />
      ))}
      {flames.map(({ layer, index }) => (
        <FlameControls key={index} layer={layer} index={index} onLayer={(next) => onLayer(index, next)} onRemoveLayer={() => onRemoveLayer(index)} />
      ))}
      {(spec.rings || []).map((ring, index) => (
        <RingCycleControls key={index} ring={ring} index={index} onRing={(next) => onPath(["rings", index], next)} />
      ))}
      <button type="button" onClick={() => onAddLayer({ k: "orbit", n: 1, shape: "flame", r: [0, 0], w: [0, 0], sz: [12, 12], a: 0.96, tongues: 6, c: ["#FF5A1F", "#FFB43C", "#FFF6C9"], flicker: 0.24, shimmerN: 3, embers: { n: 8, sp: [18, 42], life: [0.5, 1.1], sz: [0.8, 1.6], sway: 10, a: 0.8, c: ["#FFB43C", "#FFF6C9"] } })} style={{ ...chip(false), justifySelf: "start", fontSize: 11 }}>Add flame layer</button>
      {fields.map((field) => {
        const label = field.path.join(".");
        if (field.kind === "color") {
          return <ColorField key={label} label={label} value={field.value} onChange={(v) => onPath(field.path, v)} />;
        }
        const range = sliderRange(field.path, field.value);
        return (
          <NumSlider key={label} label={label} value={field.value} min={range.min} max={range.max} step={range.step} onChange={(v) => onPath(field.path, v)} />
        );
      })}
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
  const originals = useRef(null);
  if (!originals.current) originals.current = { ...AURA_FX };
  const [backdropId, setBackdropId] = useState(FIGURES[0].id);
  const [photo, setPhoto] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [custom, setCustom] = useState({ cyan: "#FF5AD9", blue: "#7A3CFF", bg: "#140818" });
  const [sizeId, setSizeId] = useState("88");
  const [reduce, setReduce] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [selected, setSelected] = useState(null);
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
    for (const id of ids) AURA_FX[id] = drafts[id];
    return () => {
      for (const id of ids) AURA_FX[id] = originals.current[id];
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

  const specFor = (id) => drafts[id] || originals.current[id];
  const bump = (id, recipe) => {
    setDrafts((d) => ({ ...d, [id]: recipe(d[id] || cloneSpec(originals.current[id])) }));
    setRevs((r) => ({ ...r, [id]: (r[id] || 0) + 1 }));
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

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={barRef} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10, background: C.navBg, borderBottom: `1px solid ${C.border}` }}>
        <strong style={{ fontSize: 13 }}>Aura gallery</strong>
        <label style={{ fontSize: 12, color: C.dim }}>
          Backdrop{" "}
          <select id="aura-backdrop" value={backdropId} onChange={(e) => setBackdropId(e.target.value)} style={{ background: C.inpBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 6px" }}>
            {FIGURES.map((fig) => <option key={fig.id} value={fig.id}>{fig.label}</option>)}
            <option value="letter">Letter</option>
            <option value="photo">Photo</option>
          </select>
        </label>
        <label style={{ fontSize: 12, color: C.dim }}>
          Photo <input id="aura-photo" type="file" accept="image/*" onChange={onPhoto} />
        </label>
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
            {stageFor(selected)}
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>{selectedAura.name}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{selectedAura.rarity || selectedAura.group} · {selectedAura.id}</div>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 280, maxHeight: "calc(100dvh - 120px)", overflow: "auto", paddingBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button type="button" onClick={() => copySpec(selected)} style={chip(false)}>{copied || "Copy spec"}</button>
              <button type="button" onClick={() => {
                setDrafts((d) => {
                  if (!d[selected]) return d;
                  const next = { ...d };
                  delete next[selected];
                  return next;
                });
                setRevs((r) => ({ ...r, [selected]: (r[selected] || 0) + 1 }));
              }} style={chip(false)}>Reset</button>
            </div>
            <SpecEditor
              spec={specFor(selected)}
              onPath={(path, value) => bump(selected, (base) => setPath(base, path, value))}
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
          gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(112, size.px + (backdrop.kind === "figure" ? 36 : 16))}px, 1fr))`,
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
      <PerfHud />
    </div>
  );
}
