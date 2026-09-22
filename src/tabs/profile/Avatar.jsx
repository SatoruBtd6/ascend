import { Award, Lock, Sparkle } from "lucide-react";
import { AuraRing } from "../../auras/AuraCanvas.jsx";
import { ACH_ICONS, TIER_STYLE } from "../../data/achievements.js";
import { C, RAINBOW } from "../../theme.js";
import { NAME_FONTS } from "./lookConsts.js";
import { BORDERS } from "./unlock.js";
export function Avatar({ src, name, size = 48, ring, look }) {
  const color = ring || C.cyan;
  const border = BORDERS.find((b) => b.id === look?.border && (b.css || b.img));
  const inner = src ? (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: border ? "none" : `2px solid ${color}`, flexShrink: 0, display: "block" }} />
  ) : (
    <div className="flex items-center justify-center font-bold shrink-0" style={{ width: size, height: size, borderRadius: 999, background: C.accentBg, color, border: border ? "none" : `2px solid ${color}`, fontSize: size * 0.42 }}>{((name || "?").trim()[0] || "?").toUpperCase()}</div>
  );
  if (!border && (!look?.aura || look.aura === "none")) return inner;
  const pad = border ? Math.max(3, Math.round(size / (border.img ? 10 : 22))) : 0;
  const ringScale = look?.aura === "ascended" ? 1.34 : 1.45;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      {border?.img && <img src={border.img} alt="" aria-hidden="true" style={{ position: "absolute", inset: -Math.round(size * 0.08), width: size + pad * 2 + Math.round(size * 0.16), height: size + pad * 2 + Math.round(size * 0.16), objectFit: "contain", pointerEvents: "none", animation: "rkspin 14s linear infinite", filter: "drop-shadow(0 0 8px rgba(255,212,71,.8))" }} />}
      {border?.css && <AnimatedBorder border={border} color={look?.accent || color} />}
      {look?.aura && look.aura !== "none" && <AuraRing aura={look.aura} size={(size + pad * 2) * ringScale} style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />}
      <div className="relative" style={{ borderRadius: 999, overflow: "hidden" }}>{inner}</div>
    </div>
  );
}

export function AnimatedBorder({ border, color }) {
  const base = { position: "absolute", inset: 0, borderRadius: 999, background: border.effect === "fracture" ? "transparent" : border.effect === "tide" ? `conic-gradient(${color},#a855f7,${color})` : border.css, pointerEvents: "none" };
  const animation = border.effect === "pulse" ? "borderpulse 2s ease-in-out infinite" : border.effect === "fracture" ? "borderfracture 4s ease-in-out infinite" : border.effect ? "borderchase 3s linear infinite" : border.spin ? "rkspin 4s linear infinite" : "none";
  return (
    <div aria-hidden="true" className="anime-border" style={{ ...base, animation }}>
      {border.effect === "orbit" && [0, 1, 2].map((i) => <span key={i} className="anime-border-dot" style={{ position: "absolute", inset: -2 - i * 2, borderRadius: 999, animation: `borderorbit ${2.4 + i * 0.8}s linear ${i % 2 ? "reverse" : "normal"} infinite` }}><span style={{ position: "absolute", left: "50%", top: -2, width: 4 + i, height: 4 + i, borderRadius: 999, background: i === 1 ? "#FFD447" : color, boxShadow: `0 0 7px ${color}` }} /></span>)}
      {border.effect === "fracture" && Array.from({ length: 8 }, (_, i) => <span key={i} style={{ position: "absolute", inset: i % 2 ? -2 : 0, borderRadius: 999, border: "2px solid transparent", borderTopColor: i % 2 ? "#ec4899" : "#fff", transform: `rotate(${i * 45}deg) translateY(${i % 2 ? -1 : 1}px)` }} />)}
    </div>
  );
}

// Shrinks an uploaded photo to a small square JPEG so it fits in storage and loads fast on the board
export function shrinkImage(file, size = 112) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function AchBadge({ a, earned, size = 60, onClick }) {
  const t = TIER_STYLE[a.tier];
  const Icon = ACH_ICONS[a.series.icon] || Award;
  const mythic = a.tier === 5;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" style={{ width: size + 16 }} aria-label={`${a.title}: ${a.desc}${earned ? ", earned" : ", locked"}`}>
      <div className="flex items-center justify-center relative" style={{ width: size, height: size, borderRadius: a.tier >= 4 ? 12 : 999, transform: a.tier >= 4 ? "rotate(45deg)" : "none",
        background: earned ? (mythic ? RAINBOW : `radial-gradient(circle at 35% 30%, ${t.color}, ${C.bg} 85%)`) : C.soft, backgroundSize: mythic ? "300% auto" : undefined,
        border: `2px solid ${earned ? t.color : C.border}`, boxShadow: earned ? `0 0 ${8 + a.tier * 5}px ${t.glow}` : "none", opacity: earned ? 1 : 0.45, animation: earned && mythic ? "rainbow 3s linear infinite" : "none" }}>
        <div style={{ transform: a.tier >= 4 ? "rotate(-45deg)" : "none", color: earned ? (a.tier === 2 ? "#0B1220" : mythic ? "#fff" : "#0B1220") : C.mute }}>
          {earned ? <Icon size={size * 0.45} strokeWidth={2.2} /> : <Lock size={size * 0.38} />}
        </div>
        {earned && a.tier >= 3 && !mythic && <span className="absolute" style={{ top: -4, right: -4, transform: a.tier >= 4 ? "rotate(-45deg)" : "none" }}><Sparkle size={14} style={{ color: t.color, filter: `drop-shadow(0 0 4px ${t.color})` }} /></span>}
      </div>
      <div className="text-xs font-bold text-center leading-tight" style={{ color: earned ? t.color : C.mute }}>{a.title}</div>
    </button>
  );
}

export function WeightChart({ log, target }) {
  const pts = Object.entries(log || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-60).map(([d, w]) => ({ d, w: +w })).filter((p) => p.w > 0);
  if (pts.length < 2) return <div className="body text-sm" style={{ color: C.dim }}>Log your weight on at least two days to see a trend line.</div>;
  const W = 320, H = 130, padL = 34, padR = 10, padT = 12, padB = 22;
  const ws = pts.map((p) => p.w), lo = Math.floor(Math.min(...ws) - 2), hi = Math.ceil(Math.max(...ws) + 2);
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (w) => padT + (1 - (w - lo) / (hi - lo)) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const diff = Math.round((last.w - first.w) * 10) / 10;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Weight from ${first.w} to ${last.w} lb`}>
        {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{Math.round(v)}</text></g>)}
        <path d={`${path} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={C.cyan} opacity=".12" />
        <path d={path} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${C.glow})` }} />
        {pts.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.w)} r="3" fill={C.bg} stroke={C.cyan} strokeWidth="2" />)}
        <text x={padL} y={H - 6} fontSize="10" fill={C.dim}>{new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
        <text x={W - padR} y={H - 6} fontSize="10" fill={C.dim} textAnchor="end">{new Date(last.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
      </svg>
      <div className="body text-xs flex justify-between" style={{ color: C.dim }}>
        <span>{pts.length} entries</span>
        <span style={{ color: diff === 0 ? C.dim : (target === "cut" ? diff < 0 : diff > 0) ? C.green : C.orange }}>{diff > 0 ? "+" : ""}{diff} lb since {new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

export function FancyName({ name, look, className = "", style = {}, size }) {
  const font = NAME_FONTS.find((f) => f.id === look?.font) || NAME_FONTS[0];
  const anim = look?.anim && look.anim !== "none" ? look.anim : null;
  const color = look?.accent || style.color;
  const base = { ...style, fontFamily: font.family, "--nf": font.family, color, fontSize: size, display: "inline-block", maxWidth: "100%" };
  className = `fancyname ${className}`;
  if (anim) className = className.replace("glowtext", "").trim();
  if (look?.font === "pixel") base.fontSize = size ? size * 0.7 : "0.8em";
  const text = name || "Unnamed";
  if (anim === "wave" || anim === "shake") {
    return (
      <span className={className} style={base} aria-label={text}>
        {[...text].map((ch, i) => <span key={i} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "pre", animation: `nm-${anim} ${anim === "wave" ? 1.6 : 0.5}s ${i * (anim === "wave" ? 0.08 : 0.03)}s ease-in-out infinite` }}>{ch}</span>)}
      </span>
    );
  }
  const cls = anim ? `nm-${anim}` : "";
  if (anim === "rainbow") return <span className={`${className} ${cls}`} style={{ ...base, color: undefined }}>{text}</span>;
  return <span className={`${className} ${cls}`} style={{ ...base, "--nc": color || C.cyan }}>{text}</span>;
}

/* ---------- Look studio: tabbed profile customization ---------- */
