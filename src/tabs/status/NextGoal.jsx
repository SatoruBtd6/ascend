import { useMemo } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { C } from "../../theme.js";
import { Bar } from "../../ui/primitives.jsx";
import { nextGoalFor } from "./goals.js";
export function NextGoal({ s, openExercise, goQuests }) {
  const goal = useMemo(() => nextGoalFor(s), [s]);
  if (!goal) return null;
  return (
    <button onClick={() => (goal.kind === "lift" ? openExercise(goal.name) : goQuests())} className="panel p-3 w-full text-left flex items-center gap-3">
      <TrendingUp size={18} className="shrink-0" style={{ color: C.cyan }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{goal.label}</div>
        <div className="mt-1.5"><Bar pct={(goal.value / goal.goal) * 100} color={C.cyan} /></div>
      </div>
      <ChevronRight size={18} className="shrink-0" style={{ color: C.mute }} />
    </button>
  );
}
