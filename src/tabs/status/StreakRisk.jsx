import { Flame } from "lucide-react";
import { today } from "../../lib/dates.js";
import { activeDays, isWorkout, streakOf } from "../../lib/stats.js";
import { usualTrainHour } from "../../math.js";
import { C } from "../../theme.js";
export function StreakRisk({ s, setS, goTrain }) {
  const d = today();
  const streak = streakOf(s);
  if (!streak || activeDays(s).has(d) || s.streakNagDay === d) return null;
  const hour = usualTrainHour((s.workouts || []).filter((w) => w.startedAt && isWorkout(w)).map((w) => new Date(w.startedAt).getHours()));
  if (new Date().getHours() < hour) return null;
  const when = new Date(new Date().setHours(hour, 0, 0, 0)).toLocaleTimeString([], { hour: "numeric" });
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,147,64,.55)" }}>
      <Flame size={22} className="shrink-0" style={{ color: C.orange }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: C.orange }}>{streak} day streak on the line</div>
        <div className="body text-sm" style={{ color: C.sub }}>You usually train by {when} and today is still empty. A workout or a cleared quest keeps it alive.</div>
        <div className="flex gap-3 mt-2">
          <button onClick={goTrain} className="body text-sm font-semibold" style={{ color: C.cyan }}>Train now</button>
          <button onClick={() => setS((p) => ({ ...p, streakNagDay: d }))} className="body text-sm" style={{ color: C.dim }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
