import { useState, useRef, useEffect } from "react";
import { Bot, Loader2, Youtube, X } from "lucide-react";
import { C } from "../../theme.js";
import { findEx, allExercises } from "../../lib/exercises.js";
import { isWorkout, rankedLifts } from "../../lib/stats.js";
import { sexLine } from "../../lib/dates.js";
import { setLabel } from "./helpers.js";
import { askJson, STERLING_SYS, exerciseNameList } from "./sterling.js";
import { ytUrl } from "./yt.js";
export function TrainCoach({ s, a, onAdd }) {
  const [state, setState] = useState({ status: "idle", next: [], tip: "", form: null, quip: "" });
  const [hidden, setHidden] = useState(false);
  const doneEx = a.exercises.filter((e) => e.sets.some((st) => st.done && +st.r > 0));
  const key = `${a.title || ""}|${doneEx.map((e) => e.name).join(",")}`;
  const fetchedKey = useRef(null);
  const fetchNext = async () => {
    setState((x) => ({ ...x, status: "loading" }));
    const done = doneEx.map((e) => { const def = findEx(s, e.name); return `${e.name}: ${e.sets.filter((st) => st.done).map((st) => setLabel(def, st)).join(", ")}`; }).join(" | ");
    const names = exerciseNameList(s);
    const history = s.workouts.filter(isWorkout).slice(-4).map((w) => `${w.date}${w.title ? ` (${w.title})` : ""}: ${w.exercises.map((e) => e.name).join(", ")}`).join("\n");
    const ranks = rankedLifts(s).slice(0, 8).map((r) => `${r.e.name} ${r.label}`).join(", ");
    try {
      const r = await askJson(STERLING_SYS, `Workout title: "${a.title || "untitled"}". Done so far this session: ${done || "nothing yet"}. Recent workouts:\n${history || "none"}\nLift ranks: ${ranks || "none"}. Bodyweight ${s.profile.weight} lb. ${sexLine(s.profile)}
Recommend what to do next to make this workout as effective as possible for the stated title (balance muscle groups, sensible order, reasonable volume, don't repeat what's done unless more sets are warranted). Choose exercise names ONLY from this list, spelled exactly: ${names}.
Respond ONLY with JSON: {"quip": "one short funny line", "tip": "one sentence of practical advice about the session so far", "next": [{"exercise": "exact name from list", "sets": n, "reps": "e.g. 8-10", "why": "under 10 words"}]}`);
      const valid = new Set(allExercises(s).map((e) => e.name));
      setState({ status: "done", quip: r.quip || "", tip: r.tip || "", form: null, next: (r.next || []).filter((n) => valid.has(n.exercise)).slice(0, 3) });
    } catch (e) { setState({ status: "error", next: [], tip: "", form: null, quip: "" }); }
  };
  useEffect(() => {
    if (hidden || doneEx.length === 0 || fetchedKey.current === key) return;
    const t = setTimeout(() => { fetchedKey.current = key; fetchNext(); }, 2500);
    return () => clearTimeout(t);
  }, [key, hidden]);
  if (hidden || doneEx.length === 0 || a.editId) return null;
  return (
    <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center">
        <div className="font-bold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling: what's next</div>
        <button aria-label="Hide" onClick={() => setHidden(true)} style={{ color: C.mute }}><X size={16} /></button>
      </div>
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is consulting the ancient scrolls…</div>}
      {state.status === "error" && <button onClick={fetchNext} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
      {state.tip && <div className="body text-sm" style={{ color: C.text }}>{state.tip}</div>}
      {state.next.map((n, i) => {
        const already = a.exercises.some((e) => e.name === n.exercise);
        return (
          <div key={i} className="ghost p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{n.exercise}</div><div className="body text-xs" style={{ color: C.dim }}>{n.sets} × {n.reps}{n.why ? ` · ${n.why}` : ""}</div></div>
            <a href={ytUrl(n.exercise)} target="_blank" rel="noreferrer" aria-label={`How to ${n.exercise}`} className="px-2" style={{ color: C.mute }}><Youtube size={16} /></a>
            <button onClick={() => onAdd(n.exercise, +n.sets || 3)} className="btn px-3 py-1.5 text-xs">{already ? "Add sets" : "Add"}</button>
          </div>
        );
      })}
    </div>
  );
}
