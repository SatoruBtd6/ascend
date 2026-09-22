import { Droplets, Minus, Plus } from "lucide-react";
import { C } from "../../theme.js";
import { Bar } from "../../ui/primitives.jsx";
import { SFX } from "../train/sfx.js";
import { WATER_XP } from "../train/xpConstants.js";
export function WaterTracker({ s, setS, gainXp, d }) {
  const target = Math.max(8, Math.round((+s.profile.weight || 170) / 2 / 8));
  const w = s.water?.[d] || { n: 0, xp: false };
  const set = (n) => setS((p) => {
    const cur = p.water?.[d] || { n: 0, xp: false };
    const next = { ...cur, n: Math.max(0, n) };
    let hit = false;
    if (!cur.xp && next.n >= target) { next.xp = true; hit = true; }
    if (hit) setTimeout(() => { gainXp(WATER_XP, "Water goal", `water_${d}`); SFX.water(); }, 0);
    return { ...p, water: { ...(p.water || {}), [d]: next } };
  });
  return (
    <div className="panel p-3 flex items-center gap-3">
      <Droplets size={20} style={{ color: C.cyan }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm"><span className="font-semibold">Water</span><span className="body" style={{ color: w.n >= target ? C.green : C.dim }}>{w.n} / {target} cups{w.xp ? " · +25 XP" : ""}</span></div>
        <div className="mt-1"><Bar pct={(w.n / target) * 100} color={C.cyan} /></div>
      </div>
      <button aria-label="Less water" onClick={() => set(w.n - 1)} className="ghost w-8 h-8 flex items-center justify-center"><Minus size={14} /></button>
      <button aria-label="Add a cup" onClick={() => set(w.n + 1)} className="btn w-8 h-8 flex items-center justify-center"><Plus size={14} /></button>
    </div>
  );
}

/* ---------- Body tracking ---------- */
