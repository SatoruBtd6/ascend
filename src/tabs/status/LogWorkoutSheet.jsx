import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { fmtDay, uid } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { workoutGym } from "../../math.js";
import { C } from "../../theme.js";
import { Sheet } from "../../ui/primitives.jsx";
import { gymLabel, setLabel } from "../train/helpers.js";
export function presetFromExercises(name, exercises) {
  return { id: uid(), name, exercises: exercises.map((e) => ({ name: e.name, sets: e.sets.length, plan: e.sets.map((st) => ({ w: st.w ?? "", r: st.r ?? "" })), ...(e.wMode ? { wMode: e.wMode } : {}) })) };
}
export function LogWorkoutSheet({ s, setS, w, onClose }) {
  const [saved, setSaved] = useState(false);
  const savePreset = () => {
    const name = w.title ? `${w.title} (${fmtDay(w.date)})` : `Workout ${fmtDay(w.date)}`;
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), presetFromExercises(name, w.exercises)] }));
    setSaved(true);
  };
  return (
    <Sheet title={`${w.title || "Workout"} · ${fmtDay(w.date)}`} onClose={onClose}>
      {gymLabel(s, workoutGym(w)) ? <div className="body text-xs" style={{ color: C.mute }}>{gymLabel(s, workoutGym(w))}</div> : null}
      <div className="grid grid-cols-3 gap-2">
        {[["XP", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Time", w.minutes ? `${w.minutes} min` : "–"]].map(([l, v]) => <div key={l} className="panel py-2.5 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold">{v}</div></div>)}
      </div>
      {w.exercises.map((ex, i) => {
        const def = findEx(s, ex.name);
        return (
          <div key={i} className="panel p-3">
            <div className="font-semibold" style={{ color: C.cyan }}>{ex.name}</div>
            {ex.sets.map((st, j) => <div key={j} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Set {j + 1}</span><span className="font-semibold">{setLabel(def, st)}</span></div>)}
          </div>
        );
      })}
      <button onClick={savePreset} disabled={saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to presets</> : <><Bookmark size={16} />Save as my preset</>}</button>
    </Sheet>
  );
}

/* ---------- Hydration bar (sits beside the macros) ---------- */
