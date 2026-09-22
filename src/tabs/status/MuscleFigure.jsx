import { C } from "../../theme.js";
export function MuscleFigure({ group, score, color }) {
  const k = 1 + Math.min(6, score) * 0.11; // muscles grow with rank
  const def = 0.15 + Math.min(6, score) * 0.12; // definition lines get sharper
  const on = (g) => g === group;
  const base = C.mute, skin = "#1a2436";
  const M = (g, el) => <g style={{ transformOrigin: "100px 130px", transform: on(g) ? `scale(${k})` : "none", transition: "transform .6s" }} opacity={on(g) ? 1 : 0.35}>{el}</g>;
  const fill = (g) => (on(g) ? color : base);
  const lat = on("Back") ? 12 * (k - 1) + 4 : 0;
  return (
    <svg viewBox="0 0 200 300" width="100%" style={{ maxHeight: 340 }} role="img" aria-label={`${group} muscle model`}>
      <defs>
        <radialGradient id="mgl" cx="50%" cy="45%" r="50%"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
        <linearGradient id="msk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3852" /><stop offset="1" stopColor={skin} /></linearGradient>
      </defs>
      <circle cx="100" cy="130" r="120" fill="url(#mgl)" />
      {/* body silhouette */}
      <circle cx="100" cy="36" r="17" fill="url(#msk)" />
      <rect x="93" y="50" width="14" height="14" fill="url(#msk)" />
      <path d={`M${60 - lat},70 Q100,58 ${140 + lat},70 L${132 + lat * 0.4},150 Q100,165 ${68 - lat * 0.4},150 Z`} fill="url(#msk)" stroke={on("Back") ? color : "none"} strokeWidth="2" />
      <path d="M72,152 Q100,160 128,152 L124,215 L106,215 L100,190 L94,215 L76,215 Z" fill="url(#msk)" />
      <path d="M78,216 L94,216 L92,290 L76,290 Z M106,216 L122,216 L124,290 L108,290 Z" fill="url(#msk)" />
      <path d={`M${58 - lat},72 Q42,80 38,120 L32,165 L46,168 L54,120 Q56,95 ${68 - lat},88 Z`} fill="url(#msk)" />
      <path d={`M${142 + lat},72 Q158,80 162,120 L168,165 L154,168 L146,120 Q144,95 ${132 + lat},88 Z`} fill="url(#msk)" />
      {/* muscle overlays */}
      {M("Shoulders", <><ellipse cx="62" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /><ellipse cx="138" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /></>)}
      {M("Chest", <><path d="M70,84 Q98,80 99,105 Q90,118 72,110 Z" fill={fill("Chest")} /><path d="M130,84 Q102,80 101,105 Q110,118 128,110 Z" fill={fill("Chest")} /><line x1="100" y1="84" x2="100" y2="112" stroke="#000" strokeOpacity={def} strokeWidth="1.5" /></>)}
      {M("Arms", <><ellipse cx="50" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(8 50 112)" /><ellipse cx="150" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(-8 150 112)" /><ellipse cx="42" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /><ellipse cx="158" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /></>)}
      {M("Core", <>{[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={90 + c * 11} y={118 + r * 13} width="9" height="11" rx="2" fill={fill("Core")} opacity={0.9 - r * 0.15} />))}<line x1="100" y1="116" x2="100" y2="156" stroke="#000" strokeOpacity={def} /></>)}
      {M("Legs", <><path d="M78,160 Q92,158 98,170 L96,212 L80,212 Z" fill={fill("Legs")} /><path d="M122,160 Q108,158 102,170 L104,212 L120,212 Z" fill={fill("Legs")} /><path d="M80,222 L92,222 L90,270 L80,270 Z" fill={fill("Legs")} opacity=".8" /><path d="M108,222 L120,222 L120,270 L110,270 Z" fill={fill("Legs")} opacity=".8" /></>)}
      {on("Back") && <>
        <path d={`M${64 - lat},72 L${76 - lat * 0.3},140 L100,150 L${124 + lat * 0.3},140 L${136 + lat},72 Q100,66 ${64 - lat},72 Z`} fill={color} opacity=".85" />
        <line x1="100" y1="70" x2="100" y2="150" stroke="#000" strokeOpacity={def + 0.2} strokeWidth="2" />
        {[0, 1, 2].map((i) => <line key={i} x1={78 - lat * 0.2} y1={88 + i * 18} x2={122 + lat * 0.2} y2={88 + i * 18} stroke="#000" strokeOpacity={def} />)}
      </>}
      {score > 0 && <g opacity={def}>{[74, 84, 94, 106, 116, 126].map((x) => <line key={x} x1={x} y1="160" x2={x} y2="164" stroke={color} strokeWidth="1" />)}</g>}
    </svg>
  );
}
/* ---------- Weekly + monthly challenges ---------- */
