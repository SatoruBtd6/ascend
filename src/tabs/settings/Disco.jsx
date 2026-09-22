export function DiscoIcon({ size = 24, spinning }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ animation: spinning ? "discospin 2s linear infinite" : "none" }}>
      <defs><radialGradient id="dball" cx="35%" cy="30%"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#b9c6d6" /><stop offset="1" stopColor="#5d6b7d" /></radialGradient></defs>
      <circle cx="12" cy="12" r="10" fill="url(#dball)" stroke="#fff" strokeWidth=".6" />
      {[-6, -2, 2, 6].map((y) => <line key={y} x1="2.5" x2="21.5" y1={12 + y} y2={12 + y} stroke="#3a4656" strokeWidth=".5" />)}
      {[-6, -2, 2, 6].map((x) => <ellipse key={x} cx="12" cy="12" rx={Math.abs(x) + 0.01} ry="10" fill="none" stroke="#3a4656" strokeWidth=".5" />)}
    </svg>
  );
}

export function DiscoParty() {
  const spots = ["#ff3cac", "#3cc8ff", "#f7ff3c", "#3cff9e", "#9b5cff", "#ffb43c", "#ff3cac", "#3cc8ff"];
  const tiles = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = 6 + c * 12, y = 6 + r * 12;
    if ((x - 54) ** 2 + (y - 54) ** 2 < 50 * 50) tiles.push([x, y, (r * 7 + c * 3) % 5]);
  }
  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes discodrop{0%{transform:translate(-50%,-260px)}70%{transform:translate(-50%,12px)}100%{transform:translate(-50%,0)}}
        @keyframes discospin{to{transform:rotate(360deg)}}
        @keyframes sparkle{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes sweep{0%{transform:translate(-10vw,10vh) scale(1)}25%{transform:translate(70vw,40vh) scale(1.4)}50%{transform:translate(30vw,85vh) scale(.9)}75%{transform:translate(85vw,15vh) scale(1.2)}100%{transform:translate(-10vw,10vh) scale(1)}}
        @keyframes beams{to{transform:translateX(-50%) rotate(360deg)}}
        .dspot{position:absolute;top:0;left:0;width:120px;height:120px;border-radius:999px;mix-blend-mode:screen;filter:blur(18px);opacity:.55}
      `}</style>
      <div className="absolute left-1/2 top-0" style={{ width: 600, height: 600, marginTop: -180, transform: "translateX(-50%)", animation: "beams 9s linear infinite",
        background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 4deg, transparent 4deg 22deg)", maskImage: "radial-gradient(circle, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, black 20%, transparent 70%)" }} />
      {spots.map((c, i) => (
        <div key={i} className="dspot" style={{ background: c, animation: `sweep ${7 + i * 1.3}s ${-i * 1.7}s ease-in-out infinite` }} />
      ))}
      <div className="absolute left-1/2 top-0 flex flex-col items-center" style={{ animation: "discodrop .9s cubic-bezier(.2,.8,.3,1.2) both" }}>
        <div style={{ width: 2, height: 46, background: "linear-gradient(#999,#ddd)" }} />
        <svg width="108" height="108" viewBox="0 0 108 108" style={{ animation: "discospin 6s linear infinite", filter: "drop-shadow(0 0 22px rgba(255,255,255,.7)) drop-shadow(0 0 40px rgba(255,60,172,.5))" }}>
          <defs>
            <radialGradient id="ballbase" cx="38%" cy="32%"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#aab6c5" /><stop offset="1" stopColor="#3b4655" /></radialGradient>
            <clipPath id="ballclip"><circle cx="54" cy="54" r="50" /></clipPath>
          </defs>
          <circle cx="54" cy="54" r="50" fill="url(#ballbase)" />
          <g clipPath="url(#ballclip)">
            {tiles.map(([x, y, k], i) => (
              <rect key={i} x={x - 5.5} y={y - 5.5} width="11" height="11" rx="1" fill={spots[k]} opacity=".35" style={{ animation: `sparkle ${0.6 + k * 0.25}s ${i * 0.05}s ease-in-out infinite`, mixBlendMode: "screen" }} />
            ))}
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" x2="108" y1={i * 12} y2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
            {[...Array(9)].map((_, i) => <line key={`v${i}`} y1="0" y2="108" x1={i * 12} x2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
          </g>
          <circle cx="38" cy="34" r="9" fill="#fff" opacity=".8" style={{ animation: "sparkle 1.1s ease-in-out infinite" }} />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Beeps ---------- */

/* ---------- Interval timer ---------- */
