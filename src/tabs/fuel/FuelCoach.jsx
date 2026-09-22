import { useState, useRef, useEffect } from "react";
import { Bot, Loader2, X } from "lucide-react";
import { C } from "../../theme.js";
import { FOODS, GOALS } from "../../data/foods.js";
import { sexLine } from "../../lib/dates.js";
import { askJson, STERLING_SYS } from "../train/sterling.js";
export function FuelCoach({ s, setS, t, tot, onAdd }) {
  const [state, setState] = useState({ status: "idle", picks: [], quip: "" });
  const [hidden, setHidden] = useState(false);
  const remCal = Math.round(t.cal - tot.cal), remP = Math.round(t.protein - tot.p), remC = Math.round(t.carbs - tot.c), remF = Math.round(t.fat - tot.f);
  const close = tot.cal >= t.cal * 0.55 && remCal > 80;
  const key = `${Math.round(tot.cal / 400)}-${Math.round(tot.p / 30)}`;
  const fetchedKey = useRef(null);
  const fetchPicks = async () => {
    setState((x) => ({ ...x, status: "loading" }));
    const menu = [...(s.savedFoods || []).slice(0, 20), ...FOODS.slice(0, 25)].map((f) => `${f.name} (${f.cal} cal, P${f.p} C${f.c} F${f.f})`).join("; ");
    try {
      const r = await askJson(STERLING_SYS, `The user has ${remCal} calories, ${remP}g protein, ${remC}g carbs and ${remF}g fat left today (negative means over). Goal: ${GOALS.find((g) => g.id === s.profile.goal)?.label}. ${sexLine(s.profile)} Suggest 3 things to eat that land them close to their targets, preferring items from this list when they fit: ${menu}. You may also suggest simple common foods. Respond ONLY with JSON: {"quip": "one short funny line", "picks": [{"name": "food with portion", "cal": n, "p": n, "c": n, "f": n, "why": "under 10 words"}]}`);
      setState({ status: "done", picks: (r.picks || []).slice(0, 3).map((p) => ({ name: String(p.name).slice(0, 60), cal: Math.round(+p.cal || 0), p: Math.round(+p.p || 0), c: Math.round(+p.c || 0), f: Math.round(+p.f || 0), why: p.why || "" })), quip: r.quip || "" });
    } catch (e) { setState({ status: "error", picks: [], quip: "" }); }
  };
  useEffect(() => { if (close && !hidden && fetchedKey.current !== key) { fetchedKey.current = key; fetchPicks(); } }, [close, key, hidden]);
  if (!close || hidden) return null;
  return (
    <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center">
        <div className="font-bold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling: finish your macros</div>
        <button aria-label="Hide" onClick={() => setHidden(true)} style={{ color: C.mute }}><X size={16} /></button>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Left today: {remCal} cal · P {remP}g · C {remC}g · F {remF}g</div>
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is rummaging through the pantry…</div>}
      {state.status === "error" && <button onClick={fetchPicks} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
      {state.picks.map((p, i) => (
        <div key={i} className="ghost p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.name}</div><div className="body text-xs" style={{ color: C.dim }}>{p.cal} cal · P {p.p} · C {p.c} · F {p.f}{p.why ? ` · ${p.why}` : ""}</div></div>
          <button onClick={() => onAdd(p)} className="btn px-3 py-1.5 text-xs">Log</button>
        </div>
      ))}
      {state.status === "done" && <button onClick={fetchPicks} className="body text-xs underline" style={{ color: C.mute }}>Different ideas</button>}
    </div>
  );
}

