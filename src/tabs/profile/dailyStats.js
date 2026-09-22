import { shift, today } from "../../lib/dates.js";
import { isWorkout, workoutCredit } from "../../lib/stats.js";
import { round2 } from "../../math.js";
export function dailyStats(s, n = 21) {
  const out = {}, t = today();
  for (let i = n - 1; i >= 0; i--) {
    const d = shift(t, -i);
    const day = (s.workouts || []).filter((w) => w.date === d);
    out[d] = [Math.round(s.xpLog?.[d] || 0), Math.round(+s.steps?.[d] || 0), day.filter(isWorkout).length, round2(day.reduce((a, w) => a + workoutCredit(s, w), 0))];
  }
  return out;
}
