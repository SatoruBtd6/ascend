import { RANKS } from "../../data/ranks.js";
import { darken } from "./darken.js";
export function RankBadge({ rank, size = 44, still = false }) {
  const tier = Math.max(0, RANKS.indexOf(rank));
  const id = `rk${rank.id}`;
  const hex = (r, cx = 50, cy = 50, rot = 0) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2 + rot; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const anim = !still;
  const c2 = rank.alt || rank.color;
  const sparks = tier >= 3 ? 6 + tier * 2 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" role="img" aria-label={`${rank.id} rank`} style={{ filter: `drop-shadow(0 0 ${5 + tier * 3}px ${rank.glow})`, overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}core`} cx="50%" cy="42%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity={0.35 + tier * 0.08} /><stop offset=".35" stopColor={rank.color} stopOpacity=".55" /><stop offset="1" stopColor="#02040c" /></radialGradient>
        <linearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor={rank.color} /><stop offset=".65" stopColor={c2} /><stop offset="1" stopColor="#fff" /></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor={rank.color} /><stop offset=".55" stopColor={darken(rank.color, 0.55)} /><stop offset=".75" stopColor={c2} /><stop offset="1" stopColor="#ffffff" /></linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={`${id}c`}><polygon points={hex(42)} /></clipPath>
      </defs>
      {tier >= 4 && (
        <g style={anim ? { transformOrigin: "50px 50px", animation: `rkspin ${16 - tier * 2}s linear infinite` } : null} opacity=".7">
          {Array.from({ length: 16 }, (_, i) => <line key={i} x1="50" y1="50" x2={50 + 66 * Math.cos((Math.PI / 8) * i)} y2={50 + 66 * Math.sin((Math.PI / 8) * i)} stroke={i % 2 ? c2 : rank.color} strokeWidth={i % 4 === 0 ? 3 : 1.2} strokeLinecap="round" opacity={i % 2 ? 0.5 : 0.95} />)}
        </g>
      )}
      {tier >= 5 && <circle cx="50" cy="50" r="58" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 14" opacity=".9" style={anim ? { transformOrigin: "50px 50px", animation: "rkspin 4s linear infinite reverse" } : null} />}
      {tier >= 2 && <polygon points={hex(52, 50, 50, Math.PI / 6)} fill="none" stroke={`url(#${id}ring)`} strokeWidth={tier >= 4 ? 2.5 : 1.5} strokeDasharray={tier >= 4 ? "18 8" : "8 8"} opacity=".9" style={anim ? { transformOrigin: "50px 50px", animation: `rkspin ${12 - tier}s linear infinite reverse` } : null} />}
      {tier >= 1 && <polygon points={hex(48)} fill="none" stroke={rank.color} strokeWidth="1" opacity=".5" style={anim ? { transformOrigin: "50px 50px", animation: `rkbreathe 2.6s ease-in-out infinite` } : null} />}
      <polygon points={hex(42)} fill={`url(#${id}core)`} stroke={`url(#${id}ring)`} strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points={hex(34)} fill="none" stroke="#fff" strokeWidth={0.6 + tier * 0.25} opacity={0.25 + tier * 0.08} strokeDasharray={tier >= 3 ? "4 3" : "0"} style={anim && tier >= 3 ? { transformOrigin: "50px 50px", animation: "rkspin 20s linear infinite" } : null} />
      {tier >= 2 && <polygon points={hex(38, 50, 50, Math.PI / 6)} fill="none" stroke={c2} strokeWidth="1" opacity=".55" />}
      <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="900" fontFamily="'Cinzel', 'Oxanium', serif" fill={`url(#${id}m)`} stroke={darken(rank.color, 0.3)} strokeWidth="1.4" paintOrder="stroke" style={anim && tier >= 1 ? { animation: `rkpulse ${3.5 - tier * 0.35}s ease-in-out infinite` } : null}>{rank.id}</text>
      {anim && tier >= 1 && <g clipPath={`url(#${id}c)`}><rect x="-60" y="0" width="34" height="100" fill={`url(#${id}s)`} transform="skewX(-22)" style={{ animation: `rkshine ${4.2 - tier * 0.45}s ease-in-out infinite` }} /></g>}
      {sparks > 0 && Array.from({ length: sparks }, (_, i) => {
        const a = (2 * Math.PI * i) / sparks, r = 46 + (i % 3) * 6;
        return <circle key={i} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r={i % 3 === 0 ? 2.2 : 1.3} fill={i % 2 ? "#fff" : c2} style={anim ? { transformOrigin: "50px 50px", animation: `rkorbit ${7 + (i % 4) * 2}s linear infinite${i % 2 ? " reverse" : ""}, rktwinkle ${1 + (i % 5) * 0.3}s ease-in-out infinite` } : null} />;
      })}
      {tier >= 5 && <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="6" opacity=".18" style={anim ? { transformOrigin: "50px 50px", animation: "rkhalo 2.2s ease-out infinite" } : null} />}
    </svg>
  );
}
