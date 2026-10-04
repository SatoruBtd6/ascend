import { C } from "../../theme.js";

// Elevation profile sparkline — a single thin line with a faint fill below,
// no axes or labels. profile is an array of feet from the DEM lookup.
export function ElevSpark({ profile, color = C.cyan, height = 40 }) {
  if (!profile?.length) return null;
  const W = 300, H = 40;
  const min = Math.min(...profile), max = Math.max(...profile), span = Math.max(1, max - min);
  const pts = profile.map((v, i) => [(i / Math.max(1, profile.length - 1)) * W, H - 4 - ((v - min) / span) * (H - 8)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={color} opacity={0.14} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
    </svg>
  );
}
