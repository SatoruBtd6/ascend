import { C } from "../../theme.js";
export function LineChart({ pts, color, unit = "", fmt = (v) => Math.round(v) }) {
  if (!pts || pts.length < 2) return <div className="body text-sm" style={{ color: C.dim }}>Log this at least twice to see a trend.</div>;
  const W = 320, H = 130, padL = 38, padR = 10, padT = 12, padB = 22;
  const vs = pts.map((p) => p.v), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR), y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const fd = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Trend chart">
      {[lo, (lo + hi) / 2, hi].map((v, i) => <g key={i}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{fmt(v)}</text></g>)}
      <path d={`${path} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={color} opacity=".12" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="3" fill={C.bg} stroke={color} strokeWidth="2" />)}
      <text x={padL} y={H - 6} fontSize="10" fill={C.dim}>{fd(pts[0].d)}</text>
      <text x={W - padR} y={H - 6} fontSize="10" fill={C.dim} textAnchor="end">{fd(pts[pts.length - 1].d)}{unit ? ` · ${unit}` : ""}</text>
    </svg>
  );
}
