import { useState } from "react";
import { Bot } from "lucide-react";
import { today } from "../../lib/dates.js";
import { isWorkout } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { stalledLifts } from "../train/helpers.js";
export function daysSinceTraining(s) {
  const last = [...s.workouts].reverse().find(isWorkout);
  if (!last) return null;
  return Math.round((new Date(today() + "T12:00") - new Date(last.date + "T12:00")) / 86400000);
}
export function Nudges({ s, openExercise, goTrain }) {
  const [more, setMore] = useState(false);
  const stalled = stalledLifts(s).slice(0, 2);
  const gap = daysSinceTraining(s);
  const lines = [];
  if (gap !== null && gap >= 3) lines.push({ text: `Right then. ${gap} days without training. The iron has feelings too.`, action: "Train now", onClick: goTrain });
  stalled.forEach((x) => lines.push({ text: `${x.name} has been stuck around ${x.best} for 3 sessions. Drop 10%, do 5 sets of 5, rebuild.`, action: "See lift", onClick: () => openExercise(x.name) }));
  if (!lines.length) return null;
  const shown = more ? lines : lines.slice(0, 1);
  return (
    <div className="panel p-3 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="font-bold text-sm flex items-center gap-2"><Bot size={16} style={{ color: C.cyan }} />Sterling</div>
      {shown.map((l, i) => (
        <div key={i} className="flex items-center gap-2"><div className="body text-sm flex-1" style={{ color: C.sub }}>{l.text}</div><button onClick={l.onClick} className="ghost px-3 py-1.5 text-xs font-bold whitespace-nowrap" style={{ color: C.cyan }}>{l.action}</button></div>
      ))}
      {lines.length > 1 && <button onClick={() => setMore((v) => !v)} className="body text-xs" style={{ color: C.mute }}>{more ? "Show less" : `${lines.length - 1} more`}</button>}
    </div>
  );
}
