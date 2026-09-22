import { Plus, Minus, Droplets } from "lucide-react";
import { C } from "../../theme.js";
import { WATER_XP } from "../train/xpConstants.js";
import { SFX } from "../train/sfx.js";
export function HydrationBar({ s, setS, gainXp, d }) {
  const target = Math.max(8, Math.round((+s.profile.weight || 170) / 2 / 8));
  const w = s.water?.[d] || { n: 0, xp: false };
  const pct = Math.min(100, (w.n / target) * 100);
  // Going under the goal after hitting it takes the water XP back; hitting it again gives it back.
  const set = (n) => {
    const cur = s.water?.[d] || { n: 0, xp: false };
    const next = { ...cur, n: Math.max(0, Math.min(40, n)) };
    const k = cur.k || 0;
    if (!cur.xp && next.n >= target) { next.xp = true; setTimeout(() => { gainXp(WATER_XP, "Water goal", k ? `water_${d}_${k}` : `water_${d}`); SFX.water(); }, 0); }
    else if (cur.xp && next.n < target) { next.xp = false; next.k = k + 1; setTimeout(() => gainXp(-WATER_XP, "Water goal undone", `water_${d}_undo${k + 1}`), 0); }
    setS((p) => ({ ...p, water: { ...(p.water || {}), [d]: next } }));
  };
  const btn = { width: 34, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.glassLine}`, background: C.glass };
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 54 }}>
      <button aria-label="Add a cup of water" onClick={() => set(w.n + 1)} style={{ ...btn, color: C.cyan, borderColor: `${C.cyan}66` }}><Plus size={16} /></button>
      <button aria-label="Add a cup of water" onClick={() => set(w.n + 1)} className="relative overflow-hidden" style={{ width: 34, height: 84, borderRadius: 10, border: `1px solid ${C.glassLine}`, background: C.track }}>
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`, background: `linear-gradient(180deg, ${C.cyan}, #2F6BFF)`, transition: "height .4s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 12px ${C.glow}` }} />
        <span style={{ position: "absolute", left: 0, right: 0, bottom: `calc(${pct}% - 3px)`, height: 3, background: "rgba(255,255,255,.55)", opacity: pct > 0 && pct < 100 ? 1 : 0 }} />
        <Droplets size={15} style={{ position: "absolute", left: "50%", top: 6, transform: "translateX(-50%)", color: pct > 85 ? "#fff" : C.dim }} />
      </button>
      <button aria-label="Remove a cup of water" disabled={w.n <= 0} onClick={() => set(w.n - 1)} style={{ ...btn, color: w.n > 0 ? C.text : C.mute, opacity: w.n > 0 ? 1 : 0.5 }}><Minus size={16} /></button>
      <div className="body text-xs text-center leading-tight tabular-nums" style={{ color: w.n >= target ? C.green : C.dim }}>{w.n}/{target}<br />cups</div>
    </div>
  );
}
