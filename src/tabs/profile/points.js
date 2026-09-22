import { AURAS } from "../../auras/catalog.js";
import { rankedLifts, streakOf } from "../../lib/stats.js";
import { unlocked } from "./unlock.js";
/* ---------- Helpers ---------- */

// Score from 0 to 6: E is 0–1, D 1–2 ... S 5–6 (S I is 15% past the S line)
// Score 0–7: E 0–1 … S 5–6, and a hidden SS tier 6–7. S I ends 35% past the S line; SS caps at 75% past it.
export function crateAuraMult(s) {
  let best = 0;
  (AURAS || []).forEach((a) => { if (a.crate && a.ptsMult && unlocked(a, s)) best = Math.max(best, a.ptsMult); });
  return 1 + best;
}
export function crateAuraBest(s) {
  return (AURAS || []).filter((a) => a.crate && a.ptsMult && unlocked(a, s)).sort((a, b) => b.ptsMult - a.ptsMult)[0] || null;
}
export function pointsParts(s) {
  const fromWorkouts = (s.workouts || []).reduce((a, w) => a + (w.xp || 0), 0);
  const fromRanks = rankedLifts(s).reduce((a, r) => a + Math.round(r.score * r.score * 30), 0);
  const fromHustle = Math.max(0, Math.round(s.xp || 0) - fromWorkouts);
  const fromStreak = streakOf(s) * 25;
  const fromCheckins = Object.values(s.checkins || {}).filter((c) => c.sleep && c.mood).length * 15;
  const gross = fromWorkouts + fromRanks + fromHustle + fromStreak + fromCheckins;
  const mult = crateAuraMult(s);
  const boosted = Math.round(gross * mult);
  const spent = crateSpentOf(s);
  return { fromWorkouts, fromRanks, fromHustle, fromStreak, fromCheckins, gross, mult, boosted, spent, total: Math.max(0, boosted - spent) };
}
export function pointsOf(s) {
  return pointsParts(s).total;
}
export const crateSpentOf = (s) => Math.max(0, Math.round(+s.crateSpent || 0));
export const crateBank = (s) => pointsOf(s);

/* ---------- XP, achievements, community ---------- */
