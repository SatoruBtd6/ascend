import { monthKey, today } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { movedLb } from "../../lib/stats.js";
import { workSets } from "../../math.js";
export function dayDamageMap(s, mk = monthKey()) {
  const out = {};
  (s.workouts || []).filter((w) => w.date.startsWith(mk)).forEach((w) => {
    let dmg = 0;
    w.exercises.forEach((ex) => { const def = findEx(s, ex.name); workSets(ex.sets).forEach((st) => {
      if (def.type === "timed") { if (def.group === "Cardio") dmg += (+st.w || 0) * 800; return; }
      const wt = def.type === "assisted" ? movedLb(s.profile, +st.w || 0) : +st.w || 0;
      dmg += wt * (+st.r || 0) + (+st.r || 0) * 5;
    }); });
    out[w.date] = (out[w.date] || 0) + dmg;
  });
  Object.keys(out).forEach((d) => { out[d] = Math.round(out[d] * buffOn(s, d)); });
  return out;
}
// Sleeping well and feeling good makes you hit harder today
export function buffToday(s) { return buffOn(s, today()); }
export function buffOn(s, d) {
  if (!s) return 1;
  const ci = s.checkins?.[d] || {};
  let m = 1;
  if (ci.sleep >= 8) m += 0.05; else if (ci.sleep === 7) m += 0.02;
  if (ci.mood === "Fired up") m += 0.05; else if (ci.mood === "Good") m += 0.02;
  return Math.round(m * 100) / 100;
}
// Damage from `since` (a date) onward. Your own comes live from your log; others come from their board card.
export const bossDamage = (card, mk, selfState = null, since = `${mk}-01`) => {
  const sumFrom = (dd) => Object.entries(dd || {}).filter(([d]) => d >= since && d.startsWith(mk)).reduce((a, [, v]) => a + (+v || 0), 0);
  if (selfState) return sumFrom(dayDamageMap(selfState, mk));
  if (card?.month?.key !== mk) return 0;
  if (card.month.dd) return sumFrom(card.month.dd);
  // Older app versions only sent a monthly total: count it for the global boss, not for a crew that started later
  return since <= `${mk}-01` ? Math.round((card.month.volume || 0) + (card.month.reps || 0) * 5 + (card.month.miles || 0) * 800) : 0;
};
