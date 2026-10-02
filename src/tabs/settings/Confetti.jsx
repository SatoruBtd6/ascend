import { useEffect } from "react";
import { SFX } from "../train/sfx.js";
export function Confetti({ onDone }) {
  useEffect(() => { SFX.levelUp(); const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  const cols = ["#FFD447", "#3DF08A", "#38C6FF", "#B14BFF", "#FF2D6F", "#FFFFFF"];
  return (
    <div className="fixed inset-0 z-[68] pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: 70 }, (_, i) => (
        <span key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: -20, width: i % 3 ? 8 : 12, height: i % 4 ? 12 : 6, background: cols[i % cols.length], borderRadius: i % 3 ? 2 : 999, "--sx": `${((i * 53) % 120) - 60}px`, "--rot": `${(i * 97) % 720}deg`, animation: `confetti ${1.6 + ((i * 13) % 10) / 10}s ${(i % 8) * 0.07}s cubic-bezier(.2,.6,.4,1) forwards` }} />
      ))}
    </div>
  );
}
