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
const HAIR = "1px solid rgba(255,255,255,.08)";
export function LogWorkoutSheet({ s, setS, w, onClose }) {
  const [saved, setSaved] = useState(false);
  const savePreset = () => {
    const name = w.title ? `${w.title} (${fmtDay(w.date)})` : `Workout ${fmtDay(w.date)}`;
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), presetFromExercises(name, w.exercises)] }));
    setSaved(true);
  };
  const gym = gymLabel(s, workoutGym(w));
  const stats = [["XP", `+${w.xp || 0}`, C.gold], ...(w.volume ? [["Volume", `${Math.round(w.volume).toLocaleString()} lb`, C.text]] : []), ["Time", w.minutes ? `${w.minutes} min` : "–", C.text]];
  return (
    <Sheet
      title={w.title || "Workout"}
      subtitle={`${fmtDay(w.date)}${gym ? ` · ${gym}` : ""}`}
      onClose={onClose}
      footer={<button onClick={savePreset} disabled={saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to presets</> : <><Bookmark size={16} />Save as my preset</>}</button>}
    >
      <div className="flex pb-2">
        {stats.map(([l, v, col]) => (
          <div key={l} className="flex-1 min-w-0">
            <div className="font-bold" style={{ fontSize: 17, color: col }}>{v}</div>
            <div className="body" style={{ fontSize: 14, color: C.dim }}>{l}</div>
          </div>
        ))}
      </div>
      {w.exercises.map((ex, i) => {
        const def = findEx(s, ex.name);
        return (
          <div key={i} style={{ padding: "12px 0", borderTop: HAIR }}>
            <div className="truncate" style={{ fontSize: 16, fontWeight: 600, color: C.cyan }}>{ex.name}</div>
            <div className="body" style={{ fontSize: 14, color: C.text, marginTop: 2 }}>{ex.sets.map((st) => setLabel(def, st)).join(" · ")}</div>
          </div>
        );
      })}
    </Sheet>
  );
}

/* ---------- Hydration bar (sits beside the macros) ---------- */
