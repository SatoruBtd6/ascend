import { shift, today } from "../../lib/dates.js";
import { isWorkout } from "../../lib/stats.js";
export function dailyStats(s, n = 21) {
  const out = {}, t = today();
  for (let i = n - 1; i >= 0; i--) {
    const d = shift(t, -i);
    out[d] = [Math.round(s.xpLog?.[d] || 0), Math.round(+s.steps?.[d] || 0), (s.workouts || []).filter((w) => w.date === d && isWorkout(w)).length];
  }
  return out;
}
