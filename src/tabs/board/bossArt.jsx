import { useEffect, useId, useState } from "react";
export const OL = "#0A0E18"; // outline
export function Grad({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, radial, cx = 0.5, cy = 0.5, r = 0.5 }) {
  const kids = stops.map(([o, c, a = 1], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a} />);
  return radial ? <radialGradient id={id} cx={cx} cy={cy} r={r}>{kids}</radialGradient> : <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{kids}</linearGradient>;
}
export const Eye = ({ x, y, r = 3.2, c, slit }) => (
  <g className="bs-eye">
    <circle cx={x} cy={y} r={r * 2.4} fill={c} opacity=".28" />
    {slit ? <ellipse cx={x} cy={y} rx={r} ry={r * 0.9} fill={c} /> : <circle cx={x} cy={y} r={r} fill={c} />}
    {slit ? <ellipse cx={x} cy={y} rx={r * 0.28} ry={r * 0.85} fill={OL} /> : <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#fff" opacity=".9" />}
  </g>
);

export function WyrmSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}st`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E3EAF2"], [0.45, "#8C99AA"], [1, "#2D3644"]]} />
        <Grad id={`${u}belly`} stops={[[0, "#B6FFD9"], [1, "#2E9F63"]]} />
        <Grad id={`${u}horn`} x1={0} y1={1} x2={1} y2={0} stops={[[0, "#3A2A12"], [1, "#FFE9A8"]]} />
      </defs>
      <g className="bs-sway">
        <path d="M18 104 C4 86 10 62 30 58 C48 54 44 78 62 80 C84 82 96 64 92 46" fill="none" stroke={OL} strokeWidth="23" strokeLinecap="round" />
        <path d="M18 104 C4 86 10 62 30 58 C48 54 44 78 62 80 C84 82 96 64 92 46" fill="none" stroke={`url(#${u}st)`} strokeWidth="19" strokeLinecap="round" />
        <path d="M22 100 C12 86 16 68 30 64 C44 61 42 82 62 86 C82 88 94 72 90 56" fill="none" stroke={`url(#${u}belly)`} strokeWidth="6" strokeLinecap="round" opacity=".85" />
        {[[14, 86], [22, 64], [40, 60], [52, 76], [70, 80], [86, 68]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 9} l4 -8 l3 8 z`} fill="#6FD9A0" stroke={OL} strokeWidth="1" transform={`rotate(${i * 18 - 40} ${x} ${y})`} />)}
        {[[18, 80], [26, 62], [44, 66], [58, 80], [76, 78]].map(([x, y], i) => <path key={i} d={`M${x - 5} ${y} q5 -4 10 0`} stroke="#4B5563" strokeWidth="1.2" fill="none" />)}
      </g>
      <g className="bs-breathe">
        {/* horns */}
        <path d="M70 30 C62 14 72 4 84 2 C76 10 76 18 80 26 Z" fill={`url(#${u}horn)`} stroke={OL} strokeWidth="1.6" />
        <path d="M86 24 C92 10 90 4 82 -2 C86 8 84 16 80 22 Z" fill="#6B5424" stroke={OL} strokeWidth="1.4" />
        {/* skull */}
        <path d="M64 36 C64 22 78 18 88 20 C102 22 108 32 106 44 L112 52 C114 58 108 62 100 60 L74 60 C66 58 62 48 64 36 Z" fill={`url(#${u}st)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 32 C76 26 88 24 98 28" stroke="#fff" strokeWidth="1.5" opacity=".55" fill="none" strokeLinecap="round" />
        <path d="M74 42 L98 40 M78 48 L102 47" stroke="#4B5563" strokeWidth="1" opacity=".7" />
        {/* brow ridge */}
        <path d="M78 34 L96 32 L100 38 L82 40 Z" fill="#5B6676" stroke={OL} strokeWidth="1.2" />
        <Eye x={92} y={38} r={3.2} c={eye} slit />
        <circle cx="108" cy="52" r="1.3" fill={OL} />
        {/* jaw */}
        <g className="bs-jaw">
          <path d="M74 58 L104 60 C108 62 106 68 100 68 L78 66 C72 64 70 60 74 58 Z" fill="#6B7888" stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
          {[80, 86, 92, 98].map((x) => <path key={x} d={`M${x} 60 l1.6 -4 l1.6 4 z`} fill="#F4F0E0" />)}
        </g>
        {[82, 88, 94, 100].map((x) => <path key={x} d={`M${x} 60 l1.6 4 l1.6 -4 z`} fill="#F4F0E0" stroke={OL} strokeWidth=".6" />)}
        <path d="M66 50 C58 50 54 58 58 64" stroke={OL} strokeWidth="2" fill="none" />
      </g>
      <g className="bs-rise" opacity=".7"><circle cx="112" cy="46" r="3" fill="#9FB0C4" opacity=".5" /><circle cx="116" cy="41" r="2" fill="#9FB0C4" opacity=".35" /></g>
    </>
  );
}

export function ColossusSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}ice`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2FCFF"], [0.5, "#9FDDF5"], [1, "#2F7FA8"]]} />
        <Grad id={`${u}dark`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#7CC4E4"], [1, "#1A4A66"]]} />
        <Grad id={`${u}core`} radial stops={[[0, "#FFFFFF"], [0.4, eye], [1, eye, 0]]} />
      </defs>
      <g className="bs-breathe">
        {/* arms */}
        <path d="M12 52 L26 46 L30 86 L16 96 L8 82 Z" fill={`url(#${u}dark)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M108 52 L94 46 L90 86 L104 96 L112 82 Z" fill={`url(#${u}dark)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 92 L22 88 L30 100 L20 112 L6 106 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M114 92 L98 88 L90 100 L100 112 L114 106 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        {/* torso */}
        <path d="M28 44 L60 34 L92 44 L96 80 L78 104 L42 104 L24 80 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M28 44 L60 34 L60 70 L24 80 Z" fill="#fff" opacity=".22" />
        <path d="M60 70 L96 80 L78 104 L60 104 Z" fill="#0B3550" opacity=".28" />
        <path d="M42 60 L50 76 M78 58 L70 74 M52 92 L60 84 L68 92" stroke="#2F7FA8" strokeWidth="1.2" fill="none" opacity=".7" />
        {/* core */}
        <circle cx="60" cy="66" r="14" fill={`url(#${u}core)`} className="bs-glow" />
        <path d="M60 56 L66 66 L60 76 L54 66 Z" fill="#fff" stroke={eye} strokeWidth="1.2" className="bs-glow" />
        {/* shoulder crystals */}
        {[[24, 44, -25], [32, 38, -10], [96, 44, 25], [88, 38, 10]].map(([x, y, r], i) => <path key={i} d={`M${x - 5} ${y} L${x} ${y - 20} L${x + 5} ${y} Z`} fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.4" transform={`rotate(${r} ${x} ${y})`} />)}
        {/* head */}
        <path d="M46 22 L60 14 L74 22 L72 38 L60 42 L48 38 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M49 28 L71 28 L69 33 L51 33 Z" fill="#0B2536" />
        <rect x="52" y="29.5" width="6" height="2" fill={eye} className="bs-eye" /><rect x="62" y="29.5" width="6" height="2" fill={eye} className="bs-eye" />
        <path d="M60 14 L58 6 L62 2 L64 10 Z" fill="#fff" stroke={OL} strokeWidth="1" />
        {/* icicles */}
        {[[36, 104, 8], [48, 104, 11], [72, 104, 9], [84, 104, 7]].map(([x, y, l], i) => <path key={i} d={`M${x - 2.5} ${y} L${x} ${y + l} L${x + 2.5} ${y} Z`} fill="#DDF6FF" stroke={OL} strokeWidth=".8" />)}
      </g>
    </>
  );
}

export function GravemawSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}bone`} x1={0} y1={0} x2={0.6} y2={1} stops={[[0, "#FFF8E6"], [0.55, "#D8C9A3"], [1, "#7A6A4A"]]} />
        <Grad id={`${u}fl`} stops={[[0, "#FF7AE0", 0], [0.4, "#B14BFF"], [1, "#4A0FA8"]]} />
      </defs>
      <g className="bs-flicker">
        <path d="M30 34 C24 18 34 10 36 0 C42 12 46 14 48 4 C54 14 58 10 60 0 C62 10 66 14 72 4 C74 14 78 12 84 0 C86 10 96 18 90 34 Z" fill={`url(#${u}fl)`} opacity=".9" />
        <path d="M40 34 C38 24 44 20 46 12 C50 20 54 20 56 12 C58 22 64 22 66 12 C68 20 74 22 76 14 C80 22 82 28 80 34 Z" fill="#E6BFFF" opacity=".6" />
      </g>
      <g className="bs-breathe">
        {/* spine */}
        {[96, 104, 111].map((y, i) => <rect key={y} x={54 - i} y={y} width={12 + i * 2} height="6" rx="2" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="1.4" />)}
        {/* cranium */}
        <path d="M22 56 C18 30 38 20 60 20 C82 20 102 30 98 56 C96 66 90 70 86 74 L34 74 C30 70 24 66 22 56 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="2.2" />
        <path d="M34 30 C44 24 56 23 66 24" stroke="#fff" strokeWidth="2" opacity=".7" fill="none" strokeLinecap="round" />
        <path d="M70 22 L66 32 L72 38 L68 46" stroke={OL} strokeWidth="1.4" fill="none" />
        <path d="M30 60 C26 50 30 46 34 44" stroke="#7A6A4A" strokeWidth="1.2" fill="none" />
        {/* sockets */}
        <path d="M32 50 C32 40 42 38 50 42 C54 46 52 58 44 60 C36 62 32 56 32 50 Z" fill="#12061E" stroke={OL} strokeWidth="1.5" />
        <path d="M88 50 C88 40 78 38 70 42 C66 46 68 58 76 60 C84 62 88 56 88 50 Z" fill="#12061E" stroke={OL} strokeWidth="1.5" />
        <Eye x={43} y={50} r={3.4} c={eye} /><Eye x={77} y={50} r={3.4} c={eye} />
        <path d="M56 58 L60 66 L64 58 Z" fill="#12061E" stroke={OL} strokeWidth="1.2" />
        {/* upper teeth */}
        <path d="M34 74 L86 74 L84 80 L36 80 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="1.5" />
        {[38, 44, 50, 56, 62, 68, 74, 80].map((x) => <path key={x} d={`M${x} 80 l2.5 6 l2.5 -6`} fill="#FFF8E6" stroke={OL} strokeWidth=".9" />)}
      </g>
      <g className="bs-jaw">
        <path d="M32 88 C34 100 44 104 60 104 C76 104 86 100 88 88 L84 90 L36 90 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="2" />
        {[38, 44, 50, 56, 62, 68, 74, 80].map((x) => <path key={x} d={`M${x} 90 l2.5 -6 l2.5 6`} fill="#FFF8E6" stroke={OL} strokeWidth=".9" />)}
      </g>
    </>
  );
}

export function ChudSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}skin`} x1={0} y1={0} x2={0.4} y2={1} stops={[[0, "#FFE0C4"], [1, "#D9986E"]]} />
        <Grad id={`${u}robe`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E0304F"], [1, "#6E0F24"]]} />
        <Grad id={`${u}gold`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF1A8"], [0.5, "#FFD447"], [1, "#B8860B"]]} />
        <Grad id={`${u}bun`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#F6B25E"], [1, "#B8681F"]]} />
      </defs>
      {/* burger throne */}
      <ellipse cx="60" cy="112" rx="50" ry="6" fill="#000" opacity=".3" />
      <path d="M10 96 C10 88 110 88 110 96 L110 104 C110 110 10 110 10 104 Z" fill={`url(#${u}bun)`} stroke={OL} strokeWidth="1.8" />
      <path d="M8 92 L112 92 L106 97 L96 94 L86 98 L74 94 L62 98 L50 94 L38 98 L26 94 L14 97 Z" fill="#6BBF3A" stroke={OL} strokeWidth="1.2" />
      <rect x="10" y="84" width="100" height="9" rx="4" fill="#6B3418" stroke={OL} strokeWidth="1.6" />
      <path d="M12 84 L108 84 L104 88 L94 85 L84 89 L72 85 L60 89 L48 85 L36 89 L24 85 L16 88 Z" fill="#FFC928" />
      <g className="bs-breathe">
        {/* robe body */}
        <path d="M22 86 C18 56 34 44 60 44 C86 44 102 56 98 86 Z" fill={`url(#${u}robe)`} stroke={OL} strokeWidth="2" />
        <path d="M60 46 L60 86" stroke="#FFF6E8" strokeWidth="9" />
        {[52, 62, 72, 82].map((y) => <circle key={y} cx="60" cy={y} r="1.2" fill={OL} />)}
        <path d="M22 84 L98 84" stroke="#FFF6E8" strokeWidth="5" strokeLinecap="round" />
        {/* belly */}
        <ellipse cx="60" cy="70" rx="20" ry="15" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="1.6" />
        <path d="M46 66 C52 62 60 62 66 64" stroke="#fff" strokeWidth="1.6" opacity=".55" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="74" r="1.8" fill="#9C5A38" />
        {/* arms */}
        <path d="M28 58 C16 64 16 78 26 82" stroke={OL} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M28 58 C16 64 16 78 26 82" stroke={`url(#${u}robe)`} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M92 58 C104 62 106 70 102 76" stroke={OL} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M92 58 C104 62 106 70 102 76" stroke={`url(#${u}robe)`} strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* burger scepter */}
        <g transform="translate(103 70)">
          <rect x="-1.5" y="-4" width="3" height="18" fill={`url(#${u}gold)`} stroke={OL} strokeWidth=".8" />
          <path d="M-9 -6 C-9 -14 9 -14 9 -6 Z" fill={`url(#${u}bun)`} stroke={OL} strokeWidth="1" />
          <rect x="-9.5" y="-6.5" width="19" height="2.4" fill="#6BBF3A" /><rect x="-9" y="-4.3" width="18" height="3" rx="1.2" fill="#6B3418" /><rect x="-9" y="-1.6" width="18" height="2.6" rx="1.2" fill={`url(#${u}bun)`} stroke={OL} strokeWidth=".8" />
        </g>
        {/* head */}
        <ellipse cx="60" cy="42" rx="17" ry="8" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="1.5" />
        <circle cx="60" cy="30" r="16" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="2" />
        <path d="M50 20 C54 17 60 16 66 18" stroke="#fff" strokeWidth="1.5" opacity=".6" fill="none" strokeLinecap="round" />
        <path d="M49 26 L56 27 M64 27 L71 26" stroke={OL} strokeWidth="1.8" strokeLinecap="round" />
        <g className="bs-eye"><circle cx="53" cy="30" r="2.2" fill={eye === "#FF2D2D" ? eye : OL} /><circle cx="67" cy="30" r="2.2" fill={eye === "#FF2D2D" ? eye : OL} /></g>
        <path d="M53 38 Q60 42 68 37" stroke="#8A4B2A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="46" cy="35" rx="3.5" ry="2.5" fill="#F29A9A" opacity=".6" /><ellipse cx="74" cy="35" rx="3.5" ry="2.5" fill="#F29A9A" opacity=".6" />
        <path d="M77 22 q2 4 0 6 q-2 -2 0 -6" fill="#9BE7FF" stroke={OL} strokeWidth=".6" className="bs-drip" />
        {/* crown */}
        <path d="M44 16 L46 2 L53 10 L60 -1 L67 10 L74 2 L76 16 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="44" y="13" width="32" height="4" fill="#B8860B" stroke={OL} strokeWidth="1" />
        <circle cx="60" cy="8" r="2.2" fill="#FF2D6F" stroke={OL} strokeWidth=".6" /><circle cx="50" cy="11" r="1.6" fill="#38C6FF" /><circle cx="70" cy="11" r="1.6" fill="#3DF08A" />
      </g>
    </>
  );
}

export function RustSVG({ u, eye }) {
  const gear = (cx, cy, r, n) => { let d = ""; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.22; d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `; } return `${d}Z`; };
  return (
    <>
      <defs>
        <Grad id={`${u}met`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E7A26A"], [0.45, "#A8592B"], [1, "#4A2410"]]} />
        <Grad id={`${u}plate`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#8E9AA8"], [1, "#3B4250"]]} />
      </defs>
      <g className="bs-rise" opacity=".55"><circle cx="30" cy="20" r="5" fill="#C8C8C8" /><circle cx="26" cy="12" r="3.5" fill="#C8C8C8" opacity=".7" /></g>
      <g className="bs-breathe">
        {/* legs */}
        <rect x="36" y="88" width="16" height="22" rx="2" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" /><rect x="68" y="88" width="16" height="22" rx="2" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" />
        <rect x="32" y="106" width="24" height="8" rx="2" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" /><rect x="64" y="106" width="24" height="8" rx="2" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" />
        {/* arms */}
        <path d="M18 48 L30 44 L32 80 L20 84 Z" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" /><path d="M102 48 L90 44 L88 80 L100 84 Z" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" />
        <rect x="12" y="80" width="22" height="16" rx="4" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.8" /><rect x="86" y="80" width="22" height="16" rx="4" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.8" />
        {/* torso */}
        <path d="M28 40 L92 40 L88 90 L32 90 Z" fill={`url(#${u}met)`} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M32 44 L88 44" stroke="#FFD2A8" strokeWidth="1.4" opacity=".6" />
        <rect x="44" y="56" width="32" height="24" rx="3" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.6" />
        {[48, 54, 60, 66, 72].map((x) => <rect key={x} x={x} y="60" width="3" height="16" fill="#1F242E" />)}
        {[[34, 46], [86, 46], [34, 84], [86, 84], [46, 52], [74, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#FFD2A8" stroke={OL} strokeWidth=".6" />)}
        <path d="M36 70 C40 66 38 62 42 60" stroke="#6B8E6A" strokeWidth="2.5" opacity=".6" fill="none" />
        <path d="M80 86 C84 82 82 78 86 74" stroke="#6B8E6A" strokeWidth="2" opacity=".55" fill="none" />
        {/* head */}
        <rect x="44" y="18" width="32" height="24" rx="4" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="2" />
        <rect x="47" y="26" width="26" height="8" rx="4" fill="#12151C" />
        <g className="bs-eye"><ellipse cx="60" cy="30" rx="9" ry="4.5" fill={eye} opacity=".35" /><ellipse cx="60" cy="30" rx="4.5" ry="2.6" fill={eye} /><circle cx="58.5" cy="29" r="1" fill="#fff" /></g>
        <path d="M30 34 L30 22 L36 22 L36 38" fill="none" stroke={OL} strokeWidth="5" /><path d="M30 34 L30 22 L36 22 L36 38" fill="none" stroke="#6F7885" strokeWidth="3" />
      </g>
      {/* shoulder gears */}
      <g className="bs-spin"><path d={gear(96, 40, 10, 10)} fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="96" cy="40" r="4" fill="#2A160A" stroke={OL} strokeWidth="1" /></g>
      <g className="bs-spin-r"><path d={gear(22, 44, 7, 8)} fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" /><circle cx="22" cy="44" r="2.6" fill="#1F242E" /></g>
    </>
  );
}

export function HarpySVG({ u, eye }) {
  const wing = (
    <>
      <path d="M48 44 C36 28 20 18 2 18 C8 26 10 32 8 38 L16 42 L8 50 L20 52 L14 60 L28 61 L24 70 L38 66 L40 74 L50 62 Z" fill={`url(#${u}fe)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M48 44 C38 36 28 32 18 32 C24 38 26 42 24 46 L34 48 L30 56 L44 56 Z" fill={`url(#${u}fe2)`} stroke={OL} strokeWidth="1.1" strokeLinejoin="round" opacity=".95" />
      <path d="M46 46 L16 42 M46 48 L20 52 M46 50 L28 61 M46 54 L38 66" stroke="#1E4E8C" strokeWidth=".9" opacity=".7" />
      <path d="M12 22 C24 22 36 28 44 38" stroke="#fff" strokeWidth="1.3" opacity=".6" fill="none" strokeLinecap="round" />
    </>
  );
  return (
    <>
      <defs>
        <Grad id={`${u}fe`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#E8F7FF"], [0.5, "#7DD3FC"], [1, "#1E4E8C"]]} />
        <Grad id={`${u}fe2`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#B8E6FF"], [1, "#2A5DA8"]]} />
        <Grad id={`${u}body`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#5C7FB8"], [1, "#1B2A4E"]]} />
        <Grad id={`${u}beak`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF27A"], [1, "#C79A12"]]} />
      </defs>
      <g className="bs-flicker"><path d="M10 20 L20 34 L14 36 L26 54" stroke="#FFF27A" strokeWidth="2.4" fill="none" strokeLinejoin="round" /><path d="M110 24 L100 38 L106 40 L94 58" stroke="#FFF27A" strokeWidth="2.4" fill="none" strokeLinejoin="round" /></g>
      <g className="bs-flap-l">{wing}</g>
      <g className="bs-flap-r"><g transform="translate(120 0) scale(-1 1)">{wing}</g></g>
      <g className="bs-breathe">
        {/* talons */}
        <path d="M50 94 L46 108 M50 94 L50 110 M50 94 L54 108 M70 94 L66 108 M70 94 L70 110 M70 94 L74 108" stroke={`url(#${u}beak)`} strokeWidth="3" strokeLinecap="round" />
        <path d="M44 98 L56 98 M64 98 L76 98" stroke={OL} strokeWidth="1" />
        {/* body */}
        <path d="M44 40 C38 60 40 86 52 96 L68 96 C80 86 82 60 76 40 Z" fill={`url(#${u}body)`} stroke={OL} strokeWidth="2" />
        {[54, 62, 70, 78, 86].map((y, i) => <path key={y} d={`M${48 + i} ${y} q12 6 ${24 - i * 2} 0`} stroke="#9BC6F0" strokeWidth="1.2" fill="none" opacity=".6" />)}
        {/* head + crest */}
        <path d="M50 18 L40 2 L54 12 L56 0 L62 12 L70 2 L68 18 Z" fill={`url(#${u}fe)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M44 32 C44 16 76 16 76 32 C76 42 70 46 60 46 C50 46 44 42 44 32 Z" fill={`url(#${u}body)`} stroke={OL} strokeWidth="2" />
        <path d="M49 26 L57 30 M71 26 L63 30" stroke={OL} strokeWidth="2.2" strokeLinecap="round" />
        <Eye x={53} y={32} r={2.6} c={eye} slit /><Eye x={67} y={32} r={2.6} c={eye} slit />
        <path d="M55 36 L65 36 L60 48 Z" fill={`url(#${u}beak)`} stroke={OL} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </>
  );
}

export function WardenSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}arm`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2F5FA"], [0.4, "#A3AEBE"], [1, "#39414F"]]} />
        <Grad id={`${u}cape`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#3A2C4E"], [1, "#120C1C"]]} />
        <Grad id={`${u}blade`} x1={0} y1={0} x2={1} y2={0} stops={[[0, "#E9EEF5"], [0.5, "#FFFFFF"], [1, "#8A95A6"]]} />
      </defs>
      <g className="bs-float">
        <g className="bs-sway"><path d="M30 44 C22 70 24 98 20 112 L34 106 L44 114 L54 104 L66 114 L76 104 L86 114 L100 106 C96 94 98 70 90 44 Z" fill={`url(#${u}cape)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" /></g>
        {/* greatsword */}
        <path d="M57 50 L63 50 L63 108 L60 116 L57 108 Z" fill={`url(#${u}blade)`} stroke={OL} strokeWidth="1.4" />
        <rect x="48" y="46" width="24" height="5" rx="2" fill="#8A6A2A" stroke={OL} strokeWidth="1.2" />
        {/* body plates */}
        <path d="M36 44 L84 44 L80 80 L60 88 L40 80 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 50 L76 50 M46 58 L74 58" stroke="#5B6676" strokeWidth="1.2" />
        <path d="M60 44 L60 86" stroke="#FFFFFF" strokeWidth="1.2" opacity=".5" />
        {/* pauldrons */}
        <path d="M20 44 C20 32 34 28 42 34 L44 50 C36 54 24 54 20 44 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.8" />
        <path d="M100 44 C100 32 86 28 78 34 L76 50 C84 54 96 54 100 44 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.8" />
        {[[24, 42], [30, 38], [96, 42], [90, 38]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#3B4250" />)}
        {/* gauntlets on pommel */}
        <path d="M46 46 C44 40 52 38 56 42 L58 50 L48 52 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.4" /><path d="M74 46 C76 40 68 38 64 42 L62 50 L72 52 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.4" />
        {/* helm */}
        <path d="M44 22 C44 6 76 6 76 22 L76 38 C70 44 50 44 44 38 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="2.2" />
        <path d="M60 4 L60 42" stroke="#39414F" strokeWidth="1.5" />
        <path d="M48 12 C52 8 58 7 62 8" stroke="#fff" strokeWidth="1.6" opacity=".7" fill="none" strokeLinecap="round" />
        <path d="M46 24 L74 24 L72 30 L48 30 Z" fill="#05070C" />
        <Eye x={53} y={27} r={2} c={eye} /><Eye x={67} y={27} r={2} c={eye} />
        {[50, 54, 66, 70].map((x) => <rect key={x} x={x} y="33" width="1.6" height="5" fill="#05070C" />)}
        <path d="M60 4 C66 -2 76 0 80 6 C72 4 66 6 62 10" fill="#8E1B2E" stroke={OL} strokeWidth="1" />
      </g>
    </>
  );
}

export function LeviathanSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}sk`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6FB2FF"], [0.5, "#2F6BFF"], [1, "#0B1E5C"]]} />
        <Grad id={`${u}fin`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#9BF6FF"], [1, "#0A6E8A"]]} />
        <Grad id={`${u}sea`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#1A5CC8"], [1, "#061A45"]]} />
      </defs>
      {/* tentacles */}
      <g className="bs-sway"><path d="M16 104 C4 80 16 62 26 66 C34 70 26 82 30 88" fill="none" stroke={OL} strokeWidth="9" strokeLinecap="round" /><path d="M16 104 C4 80 16 62 26 66 C34 70 26 82 30 88" fill="none" stroke={`url(#${u}sk)`} strokeWidth="6" strokeLinecap="round" />{[76, 84, 92].map((y, i) => <circle key={y} cx={10 + i} cy={y} r="1.2" fill="#BFE3FF" />)}</g>
      <g className="bs-sway-r"><path d="M104 104 C118 84 106 64 96 68 C88 72 96 84 92 90" fill="none" stroke={OL} strokeWidth="9" strokeLinecap="round" /><path d="M104 104 C118 84 106 64 96 68 C88 72 96 84 92 90" fill="none" stroke={`url(#${u}sk)`} strokeWidth="6" strokeLinecap="round" /></g>
      <g className="bs-breathe">
        {/* neck */}
        <path d="M44 110 C40 80 44 56 54 42 L78 42 C84 60 80 86 76 110 Z" fill={`url(#${u}sk)`} stroke={OL} strokeWidth="2" />
        {[60, 70, 80, 90, 100].map((y) => <path key={y} d={`M${50} ${y} q12 5 24 0`} stroke="#9BCBFF" strokeWidth="1.3" fill="none" opacity=".55" />)}
        {/* frills */}
        <path d="M46 30 L24 16 L30 30 L16 32 L34 40 L22 50 L46 46 Z" fill={`url(#${u}fin)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M86 30 L106 14 L102 30 L116 30 L98 40 L110 50 L86 46 Z" fill={`url(#${u}fin)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        {/* head */}
        <path d="M40 34 C40 18 54 10 66 10 C80 10 92 20 92 34 C92 44 86 52 76 54 L56 54 C46 52 40 44 40 34 Z" fill={`url(#${u}sk)`} stroke={OL} strokeWidth="2.2" />
        <path d="M50 18 C56 14 64 13 70 14" stroke="#CFE6FF" strokeWidth="1.6" opacity=".7" fill="none" strokeLinecap="round" />
        {[[52, 22], [60, 18], [70, 20], [80, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill="#9BF6FF" opacity=".8" />)}
        <path d="M50 30 C54 24 64 24 66 30 C64 38 54 38 50 30 Z" fill="#FFF8D6" stroke={OL} strokeWidth="1.4" />
        <Eye x={58} y={31} r={3.4} c={eye} slit />
        <path d="M72 30 C76 26 82 26 84 30" stroke={OL} strokeWidth="1.8" fill="none" />
        <path d="M52 46 C60 50 74 50 84 42" stroke={OL} strokeWidth="2" fill="none" />
        {[58, 64, 70, 76].map((x) => <path key={x} d={`M${x} ${47 + (x > 70 ? -1 : 0)} l2 4 l2 -4`} fill="#fff" stroke={OL} strokeWidth=".6" />)}
      </g>
      {/* waves */}
      <g className="bs-bob">
        <path d="M0 102 Q10 94 20 102 T40 102 T60 102 T80 102 T100 102 T120 102 L120 120 L0 120 Z" fill={`url(#${u}sea)`} stroke={OL} strokeWidth="1.6" />
        <path d="M0 102 Q10 94 20 102 T40 102 T60 102 T80 102 T100 102 T120 102" stroke="#BFF4FF" strokeWidth="2" fill="none" opacity=".8" />
        {[[14, 108], [50, 112], [92, 108]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#BFF4FF" opacity=".6" />)}
      </g>
    </>
  );
}

export function BehemothSVG({ u, eye }) {
  const cracks = "M40 56 L48 64 L44 74 M76 54 L70 64 L78 72 M54 86 L60 78 L66 88 M34 80 L40 88 M86 80 L80 90";
  return (
    <>
      <defs>
        <Grad id={`${u}rock`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6A4A40"], [0.5, "#3A2622"], [1, "#160C0A"]]} />
        <Grad id={`${u}lava`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF2A8"], [0.4, "#FFB43C"], [1, "#FF3A0F"]]} />
      </defs>
      <g className="bs-breathe">
        {/* arms */}
        <path d="M22 46 L34 44 L36 84 L18 96 L10 80 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M98 46 L86 44 L84 84 L102 96 L110 80 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 70 L26 74 L22 84 M102 70 L94 74 L98 84" stroke={`url(#${u}lava)`} strokeWidth="2.2" fill="none" className="bs-glow" />
        {/* torso */}
        <path d="M30 42 L60 30 L90 42 L96 96 L24 96 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
        <path d={cracks} stroke="#FF3A0F" strokeWidth="5" fill="none" opacity=".45" strokeLinecap="round" className="bs-glow" />
        <path d={cracks} stroke={`url(#${u}lava)`} strokeWidth="2.2" fill="none" strokeLinecap="round" className="bs-glow" />
        <path d="M34 46 L60 36" stroke="#9A7266" strokeWidth="1.5" opacity=".6" />
        {/* base */}
        <path d="M20 96 L100 96 L106 110 L14 110 Z" fill="#241412" stroke={OL} strokeWidth="1.8" />
        <path d="M30 104 C40 100 50 106 60 102 C70 98 80 106 92 102" stroke={`url(#${u}lava)`} strokeWidth="2.4" fill="none" className="bs-glow" />
        {/* head */}
        <path d="M44 20 L60 12 L76 20 L78 38 L60 46 L42 38 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 22 C36 14 30 6 28 0 C38 6 44 10 50 16 Z" fill="#2A1A16" stroke={OL} strokeWidth="1.4" /><path d="M76 22 C84 14 90 6 92 0 C82 6 76 10 70 16 Z" fill="#2A1A16" stroke={OL} strokeWidth="1.4" />
        <path d="M47 26 L57 29 M73 26 L63 29" stroke={OL} strokeWidth="2.4" strokeLinecap="round" />
        <Eye x={52} y={30} r={2.6} c={eye} /><Eye x={68} y={30} r={2.6} c={eye} />
        <path d="M52 38 L68 38 L64 42 L56 42 Z" fill={`url(#${u}lava)`} stroke={OL} strokeWidth="1" className="bs-glow" />
      </g>
      <g className="bs-drip"><path d="M36 96 q2 6 0 9 q-2 -3 0 -9" fill="#FFB43C" /><path d="M84 96 q2 5 0 8 q-2 -3 0 -8" fill="#FF7A2D" /></g>
    </>
  );
}

export function RatlordSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}fur`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#9A8F80"], [0.5, "#5E554A"], [1, "#2A241E"]]} />
        <Grad id={`${u}cloak`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#4E6B26"], [1, "#1A2A0C"]]} />
        <Grad id={`${u}gold`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#E8D37A"], [1, "#7A5A12"]]} />
        <Grad id={`${u}mist`} radial stops={[[0, "#B6F06A", 0.55], [1, "#8BC34A", 0]]} />
      </defs>
      <ellipse cx="60" cy="104" rx="56" ry="14" fill={`url(#${u}mist)`} className="bs-glow" />
      <g className="bs-sway"><path d="M84 100 C104 104 116 90 110 76 C106 68 98 72 102 80" stroke={OL} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M84 100 C104 104 116 90 110 76 C106 68 98 72 102 80" stroke="#D9A39A" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
      <g className="bs-breathe">
        {/* cloak body */}
        <path d="M26 110 C24 80 36 62 60 60 C84 62 96 80 94 110 Z" fill={`url(#${u}cloak)`} stroke={OL} strokeWidth="2" />
        <path d="M40 110 L44 96 L48 110 M70 110 L74 98 L78 110" stroke={OL} strokeWidth="1.2" fill="none" />
        <path d="M44 66 C52 72 68 72 76 66" stroke="#8BC34A" strokeWidth="1.5" fill="none" opacity=".6" />
        {/* claws holding staff */}
        <rect x="26" y="40" width="3" height="68" fill="#5A3A1A" stroke={OL} strokeWidth=".8" />
        <circle cx="27.5" cy="38" r="5" fill="#C6F07A" stroke={OL} strokeWidth="1.2" className="bs-glow" />
        <path d="M24 76 C30 70 36 74 34 80 C32 84 26 82 24 76 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.2" />
        {/* ears */}
        <path d="M34 30 C22 18 26 4 38 8 C46 12 46 22 44 30 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.8" /><path d="M36 26 C30 18 32 10 38 12 C42 14 42 20 41 26 Z" fill="#D9A39A" />
        <path d="M86 30 C98 18 94 4 82 8 C74 12 74 22 76 30 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.8" /><path d="M84 26 C90 18 88 10 82 12 C78 14 78 20 79 26 Z" fill="#D9A39A" /><path d="M92 12 L88 16 L94 18" stroke={OL} strokeWidth="1.2" fill="none" />
        {/* head */}
        <path d="M36 40 C36 22 84 22 84 40 C84 50 74 56 68 64 C64 70 56 70 52 64 C46 56 36 50 36 40 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="2" />
        <path d="M44 30 C50 26 58 25 64 26" stroke="#C9C0B0" strokeWidth="1.5" opacity=".6" fill="none" strokeLinecap="round" />
        <Eye x={49} y={40} r={2.8} c={eye} /><Eye x={71} y={40} r={2.8} c={eye} />
        <ellipse cx="60" cy="64" rx="4" ry="3" fill="#E08A8A" stroke={OL} strokeWidth="1" />
        <path d="M58 68 L58 72 L60 71 L62 72 L62 68" fill="#FFF3C4" stroke={OL} strokeWidth=".7" />
        <g className="bs-whisk"><path d="M54 62 L36 58 M54 64 L34 66 M66 62 L84 58 M66 64 L86 66" stroke="#E6DDCB" strokeWidth=".9" /></g>
        {/* crooked crown */}
        <g transform="rotate(-12 60 22)"><path d="M46 24 L48 12 L54 18 L60 8 L66 18 L72 12 L74 24 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.5" strokeLinejoin="round" /><circle cx="60" cy="16" r="1.8" fill="#8BC34A" /></g>
      </g>
      <g className="bs-rise" opacity=".8"><circle cx="18" cy="96" r="3" fill="none" stroke="#C6F07A" strokeWidth="1" /><circle cx="100" cy="92" r="2.2" fill="none" stroke="#C6F07A" strokeWidth="1" /></g>
    </>
  );
}

export function PharaohSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}gold`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#FFF1B8"], [0.45, "#E8C872"], [1, "#8A6212"]]} />
        <Grad id={`${u}lapis`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#3E6FD8"], [1, "#132E6E"]]} />
        <Grad id={`${u}wrap`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2E6C8"], [1, "#9C8A62"]]} />
      </defs>
      <g className="bs-sway" opacity=".55"><path d="M4 96 C30 84 50 104 76 92 C96 84 110 94 118 88" stroke="#E8C872" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M10 106 C36 96 60 112 88 102" stroke="#D9B45A" strokeWidth="2" fill="none" strokeLinecap="round" /></g>
      <g className="bs-float">
        {/* shoulders + collar */}
        <path d="M18 108 C18 84 34 74 60 74 C86 74 102 84 102 108 Z" fill={`url(#${u}wrap)`} stroke={OL} strokeWidth="2" />
        <path d="M30 84 C44 94 76 94 90 84 L94 92 C78 104 42 104 26 92 Z" fill={`url(#${u}lapis)`} stroke={OL} strokeWidth="1.4" />
        <path d="M28 88 C44 98 76 98 92 88" stroke={`url(#${u}gold)`} strokeWidth="2.2" fill="none" />
        {[34, 60, 86].map((x) => <path key={x} d={`M${x - 10} 100 L${x + 10} 96`} stroke="#9C8A62" strokeWidth="1" />)}
        {/* crook + flail */}
        <path d="M44 110 L72 80" stroke={OL} strokeWidth="5" strokeLinecap="round" /><path d="M44 110 L72 80" stroke={`url(#${u}gold)`} strokeWidth="3" strokeLinecap="round" /><path d="M72 80 C78 72 70 66 66 72" stroke={`url(#${u}gold)`} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M76 110 L48 80" stroke={OL} strokeWidth="5" strokeLinecap="round" /><path d="M76 110 L48 80" stroke={`url(#${u}lapis)`} strokeWidth="3" strokeLinecap="round" />{[-5, 0, 5].map((d) => <path key={d} d={`M48 80 L${42 + d} 90`} stroke={`url(#${u}gold)`} strokeWidth="1.8" strokeLinecap="round" />)}
        {/* nemes headdress */}
        <clipPath id={`${u}nm`}><path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" /></clipPath>
        <path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" fill={`url(#${u}gold)`} />
        <g clipPath={`url(#${u}nm)`}>{[18, 26, 34, 42, 50, 58, 66, 74].map((y) => <rect key={y} x="0" y={y} width="120" height="4" fill={`url(#${u}lapis)`} />)}<path d="M30 10 C40 20 44 40 42 70 L30 80 Z M90 10 C80 20 76 40 78 70 L90 80 Z" fill="#000" opacity=".18" /></g>
        <path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" fill="none" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M36 16 C46 10 60 9 70 10" stroke="#fff" strokeWidth="1.6" opacity=".6" fill="none" strokeLinecap="round" />
        <path d="M40 24 C48 20 72 20 80 24 L80 28 L40 28 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.2" />
        {/* face */}
        <path d="M42 28 L78 28 L76 56 C72 64 48 64 44 56 Z" fill={`url(#${u}wrap)`} stroke={OL} strokeWidth="1.8" />
        {[34, 42, 50].map((y) => <path key={y} d={`M43 ${y} L77 ${y + 3}`} stroke="#9C8A62" strokeWidth=".9" opacity=".8" />)}
        <path d="M46 36 L56 36 L56 42 L46 42 Z M64 36 L74 36 L74 42 L64 42 Z" fill="#1A1206" />
        <Eye x={51} y={39} r={2.3} c={eye} /><Eye x={69} y={39} r={2.3} c={eye} />
        <path d="M44 40 L40 42 M76 40 L80 42" stroke="#1A1206" strokeWidth="1.8" />
        {/* beard */}
        <path d="M56 60 L64 60 L63 72 L57 72 Z" fill={`url(#${u}lapis)`} stroke={OL} strokeWidth="1.2" />
        {/* uraeus */}
        <path d="M60 22 C54 20 56 12 60 12 C64 12 66 18 62 22 L60 30" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.2" /><circle cx="60" cy="16" r="1.3" fill="#FF2D2D" />
      </g>
    </>
  );
}

export function VoidSVG({ u, eye }) {
  const stars = [[42, 58], [70, 48], [52, 76], [78, 70], [60, 88], [38, 70], [84, 58], [48, 46], [66, 80]];
  return (
    <>
      <defs>
        <Grad id={`${u}orb`} radial cx={0.4} cy={0.35} r={0.65} stops={[[0, "#3A1070"], [0.55, "#12002A"], [1, "#030006"]]} />
        <Grad id={`${u}rim`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#C9A8FF"], [0.5, "#6A00FF"], [1, "#2A0060"]]} />
        <Grad id={`${u}obs`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6A5A8A"], [1, "#0A0414"]]} />
      </defs>
      {/* halo ring behind */}
      <g className="bs-spin-slow"><ellipse cx="60" cy="62" rx="54" ry="54" fill="none" stroke={`url(#${u}rim)`} strokeWidth="1.5" strokeDasharray="3 7" opacity=".8" /></g>
      {/* tendrils */}
      <g className="bs-sway">{[34, 48, 62, 76, 88].map((x, i) => <path key={x} d={`M${x} 88 C${x - 6 + i * 2} 100 ${x + 8 - i * 3} 106 ${x - 2} 118`} stroke={OL} strokeWidth="6" fill="none" strokeLinecap="round" />)}{[34, 48, 62, 76, 88].map((x, i) => <path key={x} d={`M${x} 88 C${x - 6 + i * 2} 100 ${x + 8 - i * 3} 106 ${x - 2} 118`} stroke="#2A0A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" />)}</g>
      <g className="bs-breathe">
        {/* crown spikes */}
        {[-50, -30, -12, 0, 12, 30, 50].map((a, i) => <path key={i} d={`M56 30 L60 ${i === 3 ? 0 : 8 + Math.abs(a) * 0.12} L64 30 Z`} fill={`url(#${u}obs)`} stroke={OL} strokeWidth="1.2" transform={`rotate(${a} 60 62)`} />)}
        {/* orb */}
        <circle cx="60" cy="62" r="32" fill={`url(#${u}orb)`} stroke={`url(#${u}rim)`} strokeWidth="2.4" />
        {stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.8 : 1.3} fill="#fff" opacity={0.5 + (i % 3) * 0.2} className={i % 2 ? "bs-eye" : ""} />)}
        <path d="M40 46 C46 38 56 35 64 36" stroke="#C9A8FF" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round" />
        {/* the eye */}
        <g className="bs-eye">
          <ellipse cx="60" cy="62" rx="14" ry="7" fill={eye} opacity=".25" />
          <path d="M46 62 C52 54 68 54 74 62 C68 70 52 70 46 62 Z" fill="#F4ECFF" stroke={OL} strokeWidth="1.4" />
          <ellipse cx="60" cy="62" rx="4.5" ry="5.5" fill={eye} />
          <ellipse cx="60" cy="62" rx="1.3" ry="4.8" fill={OL} />
        </g>
      </g>
    </>
  );
}

export const BOSS_SVGS = { wyrm: WyrmSVG, colossus: ColossusSVG, gravemaw: GravemawSVG, chud: ChudSVG, rust: RustSVG, harpy: HarpySVG, warden: WardenSVG, leviathan: LeviathanSVG, behemoth: BehemothSVG, ratlord: RatlordSVG, pharaoh: PharaohSVG, void: VoidSVG };
export function BossFigure({ boss, size, rage, dead }) {
  const u = `b${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Art = BOSS_SVGS[boss.id];
  const eye = rage ? "#FF2D2D" : boss.eye || boss.color;
  if (!Art) return <span style={{ fontSize: size * 0.62 }}>{boss.icon}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={boss.name} className={`bossfig${rage ? " bs-rage" : ""}${dead ? " bs-dead" : ""}`} style={{ overflow: "visible" }}>
      <Art u={u} eye={eye} />
    </svg>
  );
}
// Painted art, if present in /public/bosses, replaces the SVG. We check once per session and remember the answer.
export const bossImgCache = {};
export function useBossImage(id) {
  const [ok, setOk] = useState(bossImgCache[id] === true);
  useEffect(() => {
    if (bossImgCache[id] !== undefined) { setOk(bossImgCache[id] === true); return; }
    const img = new Image();
    img.onload = () => { bossImgCache[id] = img.naturalWidth > 0; setOk(bossImgCache[id]); };
    img.onerror = () => { bossImgCache[id] = false; };
    img.src = `/bosses/${id}.webp`;
  }, [id]);
  return ok;
}

/* ---------- Support ---------- */
export function BossArt({ boss, pct, dead, hit, size = 84 }) {
  const enraged = pct <= 0.5 && !dead;
  const img = useBossImage(boss.id);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {!dead && <div style={{ position: "absolute", inset: -size * 0.08, borderRadius: "50%", background: `radial-gradient(closest-side, ${enraged ? "rgba(255,45,45,.38)" : `${boss.color}40`}, transparent)`, animation: `aurapulse ${enraged ? 1.1 : 2.6}s ease-in-out infinite` }} />}
      {enraged && Array.from({ length: 8 }, (_, i) => <span key={i} style={{ position: "absolute", left: `${30 + ((i * 37) % 40)}%`, top: "62%", width: 5, height: 5, borderRadius: 999, background: i % 2 ? "#FF7A2D" : "#FF2D2D", boxShadow: "0 0 6px #FF2D2D", "--dx": `${((i * 47) % 70) - 35}px`, "--dy": `${-size * 0.35 - ((i * 23) % 40)}px`, "--rot": "0deg", animation: `juicespark ${1.2 + (i % 3) * 0.3}s ${i * 0.18}s linear infinite` }} />)}
      <div className="absolute inset-0 flex items-center justify-center" style={{ filter: dead ? "none" : `drop-shadow(0 0 ${enraged ? 14 : 8}px ${enraged ? "rgba(255,45,45,.8)" : `${boss.color}AA`})`, opacity: dead ? 0.55 : 1, animation: hit ? "bosshit .45s ease-out" : "none" }}>
        {img
          ? <img src={`/bosses/${boss.id}.webp`} alt={boss.name} className={`bossimg${enraged ? " bs-rage" : ""}${dead ? " bs-dead" : ""}`} style={{ width: size, height: size, objectFit: "contain" }} />
          : <div className={dead ? "" : "bs-hover"}><BossFigure boss={boss} size={size} rage={enraged} dead={dead} /></div>}
      </div>
    </div>
  );
}

/* ---------- XP ledger ---------- */
/* ---------- XP ledger ---------- */
// Every XP award is one row with a stable event id. The same id can never count twice (enforced by
// the xp_logs primary key on the server). Totals on the boards are sums of these rows by day.
// Rebuild every award from the records that prove it happened

// One-time (per version) rebuild: totals, per-day log and detail all come from the rows above

// Offline-safe sync to the xp_logs table. Rows wait in localStorage until the server has them.

// What the server saw from this person's Shortcut: last attempts + whether their code is registered

// Card flips roll into one session: a flip within 15 minutes of the previous flip extends it.
