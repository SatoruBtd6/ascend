import { useState } from "react";
import { Activity, Loader2, Check, ChevronDown } from "lucide-react";
import { C } from "../../theme.js";
import { askJson, STERLING_SYS } from "./sterling.js";
export const WARMUP_FALLBACK = {
  upper: [["Arm circles", 30, "Big slow circles, both directions"], ["Band pull-aparts", 40, "Squeeze shoulder blades"], ["Cat-cow", 30, "Move through the whole spine"], ["Push-up to downward dog", 40, "Slow and controlled"], ["Light set of first lift", 40, "50% of working weight"]],
  lower: [["Leg swings", 30, "Front-to-back, then side-to-side"], ["Bodyweight squats", 40, "Pause at the bottom"], ["Hip 90/90 switches", 40, "Keep chest tall"], ["Glute bridges", 30, "Squeeze at the top"], ["Walking lunges", 40, "Long stride, knee soft"]],
  full: [["Jumping jacks", 30, "Easy pace"], ["World's greatest stretch", 50, "Alternate sides"], ["Bodyweight squats", 30, "Full depth"], ["Arm circles", 30, "Both directions"], ["Inchworms", 40, "Walk hands out and back"]],
};
export function WarmUp({ s, a, setActive, compact = false, open: openProp, onOpenChange }) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (v) => { onOpenChange?.(v); if (openProp === undefined) setInnerOpen(v); };
  const steps = a.warmup;
  const build = async () => {
    setOpen(true); if (steps) return;
    setBusy(true);
    const names = a.exercises.map((e) => e.name).join(", ");
    const lower = /leg|lower|squat|dead/i.test(`${a.title} ${names}`), upper = /push|pull|upper|chest|back|arm|shoulder/i.test(`${a.title} ${names}`);
    let out = WARMUP_FALLBACK[lower && !upper ? "lower" : upper && !lower ? "upper" : "full"].map(([name, secs, cue]) => ({ name, secs, cue }));
    const cacheKey = `ascend-warmup:${(a.title || "full").toLowerCase()}`;
    let cached = false;
    try { const hit = JSON.parse(localStorage.getItem(cacheKey) || "null"); if (hit?.length >= 3) { out = hit; cached = true; } } catch (e) { /* */ }
    if (!cached) {
      try {
        const r = await askJson(STERLING_SYS, `Workout title: "${a.title || "untitled"}". Exercises planned: ${names || "not chosen yet"}. Give a 3-minute dynamic mobility warm-up of 5 or 6 moves that prepares the joints and muscles used today. Respond ONLY with JSON: {"steps": [{"name": "move", "secs": seconds, "cue": "under 8 words"}]}`, 280);
        const st = (r.steps || []).slice(0, 7).map((x) => ({ name: String(x.name).slice(0, 40), secs: Math.max(15, Math.min(60, +x.secs || 30)), cue: String(x.cue || "").slice(0, 60) }));
        if (st.length >= 3) { out = st; try { localStorage.setItem(cacheKey, JSON.stringify(st)); } catch (e) { /* */ } }
      } catch (e) { /* fallback */ }
    }
    setActive((w) => ({ ...w, warmup: out }));
    setBusy(false);
  };
  const done = a.warmupDone || [];
  const chip = (
    <button type="button" onClick={build} className={compact ? "ghost px-2.5 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0" : "ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"} style={{ color: C.cyan, minHeight: 40 }}>
      <Activity size={compact ? 14 : 16} />{compact ? "3-min warm-up" : "3-minute warm-up"}
    </button>
  );
  if (compact) return chip;
  if (!open) return chip;
  return (
    <div className="panel p-4 space-y-2">
      <div className="flex justify-between items-center"><div className="font-semibold text-sm flex items-center gap-2"><Activity size={16} style={{ color: C.cyan }} />Warm-up</div><button aria-label="Hide warm-up" onClick={() => setOpen(false)} style={{ color: C.mute, minWidth: 40, minHeight: 40 }}><ChevronDown size={16} style={{ transform: "rotate(180deg)" }} /></button></div>
      {busy || (open && !steps) ? <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is picking your moves…</div> : null}
      {(steps || []).map((x, i) => { const on = done.includes(i); return (
        <button key={i} onClick={() => setActive((w) => ({ ...w, warmupDone: on ? (w.warmupDone || []).filter((j) => j !== i) : [...(w.warmupDone || []), i] }))} className="w-full flex items-center gap-3 text-left py-1">
          <span className="shrink-0 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${on ? C.green : C.border}`, background: on ? C.green : "transparent", color: "#02040B" }}>{on && <Check size={13} />}</span>
          <span className="flex-1 min-w-0"><span className="text-sm font-medium" style={{ color: on ? C.dim : C.text, textDecoration: on ? "line-through" : "none" }}>{x.name}</span><span className="body text-xs block" style={{ color: C.dim }}>{x.cue}</span></span>
          <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{x.secs}s</span>
        </button>
      ); })}
    </div>
  );
}
