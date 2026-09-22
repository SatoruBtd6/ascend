import { useEffect } from "react";
import { RankBadge } from "../train/RankBadge.jsx";
import { SFX } from "../train/sfx.js";
export function Ceremony({ c, onClose }) {
  const rank = c.rank;
  useEffect(() => { SFX.rankUp(); const t = setTimeout(onClose, 9000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(0,0,0,.6), rgba(0,0,0,.95))", backdropFilter: "blur(6px)" }} onClick={onClose} role="dialog" aria-label="Rank up">
      <style>{`@keyframes cerein{0%{transform:scale(.3) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}
        @keyframes ceretext{0%{transform:translateY(20px);opacity:0}100%{transform:none;opacity:1}}
        @keyframes cerespark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}`}</style>
      {Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2, d = 120 + (i % 5) * 40; return <span key={i} className="absolute rounded-full" style={{ left: "50%", top: "45%", width: i % 3 ? 6 : 10, height: i % 3 ? 6 : 10, background: i % 2 ? "#fff" : rank.color, boxShadow: `0 0 10px ${rank.color}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px`, animation: `cerespark ${1.2 + (i % 4) * 0.3}s ${(i % 6) * 0.08}s ease-out forwards` }} />; })}
      <div style={{ animation: "cerein .9s cubic-bezier(.2,.9,.3,1.3) both" }}><RankBadge rank={rank} size={170} /></div>
      <div className="text-4xl font-extrabold tracking-widest mt-6" style={{ color: rank.color, textShadow: `0 0 24px ${rank.glow}`, animation: "ceretext .6s .5s ease-out both", fontFamily: "'Oxanium', sans-serif" }}>RANK UP</div>
      <div className="text-xl font-bold mt-2 text-center" style={{ color: "#fff", animation: "ceretext .6s .7s ease-out both" }}>{c.kind === "overall" ? "Overall rank" : c.name}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: rank.color, animation: "ceretext .6s .85s ease-out both" }}>{c.label}</div>
      <div className="body text-sm mt-8" style={{ color: "#9DB2CC", animation: "ceretext .6s 1.2s ease-out both" }}>Tap anywhere to continue</div>
    </div>
  );
}

/* ---------- Titles ---------- */
