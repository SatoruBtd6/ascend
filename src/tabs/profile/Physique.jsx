import { useEffect, useState } from "react";
import { AuraCanvas, auraNeedsOver } from "../../auras/AuraCanvas.jsx";
import { RANKS } from "../../data/ranks.js";
import { bodySex } from "../../math.js";
import { C } from "../../theme.js";
import { PhysiquePlaceholder, TIER_IDS, physiqueSrc } from "../train/physique.jsx";
export function Physique({ tier = 0, height = 220, aura, caption, sex }) {
  const id = TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))];
  const rank = RANKS[Math.max(0, Math.min(6, Math.floor(tier)))];
  const female = bodySex({ sex }) === "f";
  const src = physiqueSrc(sex, tier);
  const [fail, setFail] = useState(false);
  const [overSlot, setOverSlot] = useState(null);
  useEffect(() => { setFail(false); }, [src]);
  const aw = Math.round(height * (aura === "ascended" ? 0.48 : 0.8));
  const ah = Math.round(height * (aura === "ascended" ? 0.66 : 1.02));
  const place = { left: "50%", top: -height * 0.02, width: aw, height: ah, transform: "translateX(-50%)" };
  const showOver = aura && aura !== "none" && auraNeedsOver(aura);
  return (
    <div className="relative flex flex-col items-center" style={{ height: height + (caption ? 24 : 0) }}>
      <div className="absolute" style={{ top: height * 0.08, width: height * 0.62, height: height * 0.8, borderRadius: "50%", background: `radial-gradient(closest-side, ${rank.glow}, transparent)`, filter: "blur(10px)" }} />
      {aura && aura !== "none" && <AuraCanvas aura={aura} mode="body" w={aw} h={ah} overSlot={overSlot} figure={src} style={place} />}
      {fail && <PhysiquePlaceholder female={female} height={height} color={rank.color} />}
      <img src={src} alt={`${id}-rank physique`} onError={() => setFail(true)} onLoad={() => setFail(false)} style={{ height, width: "auto", position: fail ? "absolute" : "relative", zIndex: 1, opacity: fail ? 0 : 1, pointerEvents: "none", filter: `drop-shadow(0 8px 24px rgba(0,0,0,.6))` }} />
      {showOver && <div ref={setOverSlot} style={{ position: "absolute", ...place, zIndex: 2, pointerEvents: "none" }} />}
      {caption && <div className="body text-xs mt-1" style={{ color: C.dim }}>{caption}</div>}
    </div>
  );
}

/* ---------- Auras + borders ---------- */
