import { useState, useEffect } from "react";
import { bodySex } from "../../math.js";
import { RANKS } from "../../data/ranks.js";
import { TIER_IDS, muscleSrc, PhysiquePlaceholder } from "./physique.jsx";
export function MusclePhoto({ group, tier = 0, height = 300, sex }) {
  const t = Math.max(0, Math.min(6, Math.floor(tier)));
  const id = TIER_IDS[t], rank = RANKS[t];
  const female = bodySex({ sex }) === "f";
  const [fail, setFail] = useState(false);
  useEffect(() => { setFail(false); }, [group, id, female]);
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <div className="absolute" style={{ width: "70%", height: "80%", borderRadius: "50%", background: `radial-gradient(closest-side, ${rank.glow}, transparent)`, filter: "blur(14px)" }} />
      {fail ? <PhysiquePlaceholder female={female} height={height} color={rank.color} /> : <img key={`${group}-${id}-${female}`} src={muscleSrc(sex, group, t)} alt={`${group} at ${id} rank`} onError={() => setFail(true)} style={{ maxHeight: height, maxWidth: "100%", width: "auto", position: "relative", objectFit: "contain", animation: "musclein .35s ease-out", filter: "drop-shadow(0 10px 28px rgba(0,0,0,.55))" }} />}
    </div>
  );
}
