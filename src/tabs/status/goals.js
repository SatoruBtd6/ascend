import { MONTHLY_POOL, MONTHLY_REPS, WEEKLY_POOL, WEEKLY_REPS } from "../../data/challenges.js";
import { monthKey, shift, today, weekStart } from "../../lib/dates.js";
import { pickChallenges, rangeStats, rankedLifts } from "../../lib/stats.js";
import { pickNextGoal } from "../../math.js";
/* ---------- Status ---------- */
// One line on Status: the single goal you're closest to finishing, across quests, challenges, and lift ranks
export const goalLeft = (n, unit) => {
  const v = unit === "mi" || unit === "workouts" ? Math.round(n * 10) / 10 : Math.ceil(n);
  return `${v.toLocaleString()} ${unit}`;
};
export function nextGoalFor(s) {
  const out = [];
  (s.days?.[today()]?.list || []).forEach((q) => {
    if (q.claimed || !(q.target > 0)) return;
    const v = Math.min(+q.progress || 0, q.target);
    out.push({ kind: "quest", tie: 0, value: v, goal: q.target, label: `${goalLeft(q.target - v, q.unit)} from today's ${q.title}` });
  });
  const ws = weekStart(), mk = monthKey();
  const wc = s.weekly?.[ws], wClaimed = wc === true ? { "w-train4": true } : (wc || {});
  const mClaimed = s.monthly?.[mk] || {};
  const add = (list, stats, claimed, word) => list.forEach((c) => {
    if (claimed[c.id]) return;
    const v = Math.min(c.get(stats), c.target);
    out.push({ kind: "challenge", tie: 1, value: v, goal: c.target, label: `${goalLeft(c.target - v, c.unit)} from the ${word}` });
  });
  add([...pickChallenges(WEEKLY_POOL, ws, 3), WEEKLY_REPS], rangeStats(s, ws, shift(ws, 6)), wClaimed, "weekly");
  add([...pickChallenges(MONTHLY_POOL, mk, 3), MONTHLY_REPS], rangeStats(s, `${mk}-01`, `${mk}-31`), mClaimed, "monthly");
  rankedLifts(s).forEach((r) => {
    if (!r.next) return;
    out.push({ kind: "lift", tie: 2, name: r.e.name, value: r.best, goal: r.next, label: `${goalLeft(r.next - r.best, r.e.type === "bodyweight" ? "reps" : "lb")} from ${r.nextLabel} ${r.e.name}` });
  });
  return pickNextGoal(out);
}
// Streak about to break: past your usual training hour with nothing logged today
