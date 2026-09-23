// Dev-only aura tuning gallery. Loaded from a DEV branch in Auth so production builds drop this module.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveAuraAnchors } from "./anchors.js";
import { AURA_FX, AuraCanvas, AuraLoop, _auraImageCache, auraNeedsOver } from "./AuraCanvas.jsx";
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

const FLAG_KEYS = new Set(["flip", "even", "behind", "tw", "bob", "dash", "ink", "dark", "flash", "strike", "calm", "breathe", "glint", "over", "top", "flick", "fan", "artLate"]);
const HEAD_FROM_EYE = 22.5 / 9;

function sliderRange(path, value) {
  const key = String(path[path.length - 1]);
  if (key === "n" || key === "filigree") return { min: 0, max: Math.max(80, Math.ceil(Math.abs(value) * 2)), step: 1 };
  if (FLAG_KEYS.has(key)) return { min: 0, max: 1, step: 1 };
  if (key === "spd") return { min: 0, max: 8, step: 0.01 };
  if (key === "glow" || key === "a" || key === "flashPeak") return { min: 0, max: 1.5, step: 0.01 };
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

function ImagePlacement({ layer, index, onLayer }) {
  const shoulders = layer.placed === "shoulders";
  const scale = layerScale(layer);
  const single = layer.n === 1;
  const xy = single ? orbitXY(layer) : { x: layer.x || 0, y: layer.y || 0 };
  return (
    <div style={{ display: "grid", gap: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{shoulders ? "Pauldrons" : `Image layer ${index + 1}`}</div>
      <NumSlider label="x" value={xy.x} min={-2} max={2} step={0.01} onChange={(v) => onLayer(single ? withOrbitXY(layer, v, xy.y) : withOptional(layer, "x", v))} />
      <NumSlider label="y" value={xy.y} min={-2} max={2} step={0.01} onChange={(v) => onLayer(single ? withOrbitXY(layer, xy.x, v) : withOptional(layer, "y", v))} />
      {!shoulders && <NumSlider label="scale" value={scale} min={0.02} max={4} step={0.01} onChange={(v) => onLayer(withScale(layer, v))} />}
      {!shoulders && <NumSlider label="rotation" value={layer.rot || 0} min={-1} max={1} step={0.01} onChange={(v) => onLayer(withOptional(layer, "rot", v))} />}
      {!shoulders && <NumSlider label="flip" value={layer.flip ? 1 : 0} min={0} max={1} step={1} onChange={(v) => onLayer(withOptional(layer, "flip", v))} />}
      {!single && <div style={{ fontSize: 10, color: C.mute }}>x and y shift every image in this layer. 1 is one ring radius.</div>}
    </div>
  );
}

function SpecEditor({ spec, onPath, onLayer }) {
  if (!spec) return <p style={{ color: C.dim, fontSize: 13 }}>This aura has no particle spec.</p>;
  const fields = specFields(spec);
  const images = (spec.layers || []).map((layer, index) => ({ layer, index })).filter((row) => row.layer?.shape === "img");
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {images.map(({ layer, index }) => (
        <ImagePlacement key={index} layer={layer} index={index} onLayer={(next) => onLayer(index, next)} />
      ))}
      {fields.map((field) => {
        const label = field.path.join(".");
        if (field.kind === "color") {
          return (
            <label key={label} style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 6, alignItems: "center", fontSize: 11, color: C.dim }}>
              <span title={label} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
              <input type="color" value={colorInputValue(field.value)} onChange={(e) => onPath(field.path, e.target.value)} style={{ width: 48, height: 28, padding: 0, border: "none", background: "transparent" }} />
            </label>
          );
        }
        const range = sliderRange(field.path, field.value);
        return (
          <NumSlider key={label} label={label} value={field.value} min={range.min} max={range.max} step={range.step} onChange={(v) => onPath(field.path, v)} />
        );
      })}
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
      let live = 0;
      AuraLoop.set.forEach((inst) => { if (inst.visible) live += 1; });
      let images = 0;
      _auraImageCache.forEach((rec) => { if (rec.ready && !rec.failed) images += 1; });
      const frame = stat("frame");
      const work = stat("work");
      const fmt = (n) => (n == null ? "—" : n.toFixed(1));
      const hud = {
        frameAvg: frame.avg, frameP95: frame.p95, workAvg: work.avg, workP95: work.p95,
        live, mounted: AuraLoop.set.size, images,
      };
      window.__auraGalleryHud = hud;
      if (ref.current) {
        ref.current.textContent = `frame ${fmt(frame.avg)} avg · ${fmt(frame.p95)} p95 ms\nwork ${fmt(work.avg)} avg · ${fmt(work.p95)} p95 ms\nlive ${live} · canvases ${AuraLoop.set.size}\nimages ${images}`;
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
                next.layers[index] = layer;
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
      <PerfHud />
    </div>
  );
}
