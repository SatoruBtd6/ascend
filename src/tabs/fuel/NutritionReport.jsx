import { useState } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { C } from "../../theme.js";
import { targets } from "../../math.js";
import { mealTotals } from "../../lib/stats.js";
import { today, shift } from "../../lib/dates.js";
export function NutritionReport({ s }) {
  const [open, setOpen] = useState(false);
  const t = targets(s.profile);
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = shift(today(), -i); const m = s.meals?.[d] || []; if (m.length) days.push({ d, ...mealTotals(m) }); }
  if (days.length < 2) return null;
  const avg = (k) => Math.round(days.reduce((a, x) => a + x[k], 0) / days.length);
  const closeness = (x) => Math.abs(x.cal - t.cal) / t.cal + Math.max(0, t.protein - x.p) / t.protein;
  const best = [...days].sort((a, b) => closeness(a) - closeness(b))[0], worst = [...days].sort((a, b) => closeness(b) - closeness(a))[0];
  const dp = avg("p") - t.protein, dc = avg("cal") - t.cal;
  const tip = dp < -15 ? `Protein runs ${-dp}g short per day. Add a shake or an extra 6 oz of chicken.` : dc > t.cal * 0.1 ? `About ${dc} calories over target on average. Trim the biggest snack.` : dc < -t.cal * 0.1 ? `About ${-dc} calories under. Add a carb source to your post-workout meal.` : "Dialed in this week. Keep it steady.";
  const fd = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} style={{ color: C.cyan }} />7-day nutrition report</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
          <div>Average: {avg("cal")} cal · P {avg("p")} · C {avg("c")} · F {avg("f")} ({days.length} days logged)</div>
          <div style={{ color: C.green }}>Best day: {fd(best.d)} ({Math.round(best.cal)} cal, {Math.round(best.p)}g protein)</div>
          <div style={{ color: C.orange }}>Roughest day: {fd(worst.d)} ({Math.round(worst.cal)} cal, {Math.round(worst.p)}g protein)</div>
          <div style={{ color: C.cyan }}>{tip}</div>
        </div>
      )}
    </div>
  );
}
