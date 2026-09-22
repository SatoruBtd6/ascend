import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { C } from "../../theme.js";
import { lastWorkout, fmtShort } from "./helpers.js";
export const WORKOUT_TITLES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full body", "Chest & back", "Arms", "Shoulders", "Core", "Cardio"];
export function TitlePicker({ s, onPick, onBack }) {
  const [custom, setCustom] = useState("");
  const mine = [...new Set((s?.workouts || []).map((w) => w.title).filter(Boolean))].filter((t) => !WORKOUT_TITLES.includes(t));
  const titles = [...WORKOUT_TITLES, ...mine];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">What are you training?</h1>
      </div>
      <div className="body text-sm" style={{ color: C.dim }}>The title helps Sterling plan your next moves and keeps your history sorted. Pick one and you can load that same session again on the next screen.</div>
      <div className="grid grid-cols-3 gap-2">
        {titles.map((t) => {
          const prev = lastWorkout(s, t, true);
          return (
            <button key={t} onClick={() => onPick(t)} className="ghost py-3 font-bold text-sm flex flex-col items-center gap-0.5">
              {t}
              {prev && <span className="body text-xs font-normal" style={{ color: C.mute }}>last {fmtShort(prev.date)}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input autoFocus className="inp" placeholder="Or type your own" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onPick(custom.trim())} />
        <button onClick={() => onPick(custom.trim())} className="btn px-4 text-sm">Go</button>
      </div>
      <button onClick={() => onPick("")} className="body text-sm underline w-full" style={{ color: C.mute }}>Skip, no title</button>
    </div>
  );
}

