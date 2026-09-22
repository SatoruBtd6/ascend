import { monthKey, shift, today, weekStart } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { groupScores, isWorkout, lifetimeStats, overallInfo, overallRank, rangeStats, rankedLifts, streakOf } from "../../lib/stats.js";
import { LB_XP_VERSION, bodySex, levelFromXp, workSets } from "../../math.js";
import { dayDamageMap } from "./bossDamage.js";
import { dailyStats } from "./dailyStats.js";
import { pointsOf } from "./points.js";
import { nemesisWins } from "./rivalryStats.js";
import { prevSeasonKey, seasonKey, seasonXp } from "./season.js";
import { equippedTitle } from "./titles.js";
import { bestTier } from "./unlock.js";
export function profileCard(s) {
  const ws = weekStart();
  const st = lifetimeStats(s);
  const wl = Object.entries(s.weightLog || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-40);
  return {
    id: s.playerId, name: s.profile.name, avatar: s.profile.avatar || null, goal: s.profile.goal, look: s.profile.look || null, song: s.profile.song || null,
    sex: bodySex(s.profile),
    title: equippedTitle(s).name,
    weekXp: Object.entries(s.xpLog || {}).filter(([d]) => d >= ws).reduce((a, [, v]) => a + v, 0),
    prevWeek: (() => { const pw = shift(ws, -7); return { key: pw, xp: Object.entries(s.xpLog || {}).filter(([d]) => d >= pw && d < ws).reduce((a, [, v]) => a + v, 0) }; })(),
    xp: s.xp, points: pointsOf(s), lvl: levelFromXp(s.xp).lvl, rank: overallRank(s).id, div: overallInfo(s).div,
    xpV: s.xpV || LB_XP_VERSION,
    streak: streakOf(s), week: s.workouts.filter((w) => w.date >= ws && isWorkout(w)).length, weekOf: ws, updated: Date.now(),
    ach: Object.keys(s.ach || {}), stats: st, weightLog: s.profile.shareWeight ? Object.fromEntries(wl) : null,
    month: (() => { const mk = monthKey(); let volume = 0, reps = 0, miles = 0; s.workouts.filter((w) => w.date.startsWith(mk)).forEach((w) => w.exercises.forEach((ex) => { const d = findEx(s, ex.name); workSets(ex.sets).forEach((st) => { if (d.type === "timed") { if (d.group === "Cardio") miles += +st.w || 0; } else { reps += +st.r || 0; volume += (+st.w || 0) * (+st.r || 0); } }); })); return { key: mk, dd: dayDamageMap(s, mk), xp: Object.entries(s.xpLog || {}).filter(([d]) => d.startsWith(mk)).reduce((a, [, v]) => a + v, 0), workouts: s.workouts.filter((w) => w.date.startsWith(mk) && isWorkout(w)).length, volume: Math.round(volume), reps, miles: Math.round(miles * 10) / 10 }; })(),
    uid: window.ascendUserId || null, tier: bestTier(s), crew: s.crew?.code ? { code: s.crew.code, since: s.crew.since || today() } : null, daily: dailyStats(s), rivalWith: s.nemesis?.id || null, nemWins: nemesisWins(s),
    season: { key: seasonKey(), xp: seasonXp(s, seasonKey()) }, prevSeason: { key: prevSeasonKey(seasonKey()), xp: seasonXp(s, prevSeasonKey(seasonKey())) },
    badges: s.seasonBadges || {},
    reigning: !!s.lbReigning,
    ghost: !!s.test,
    // Crew weekly quest pool + how many crew banners this player has earned
    wk: (() => { const st = rangeStats(s, ws, shift(ws, 6)); return { key: ws, workouts: st.workouts, miles: Math.round(st.miles * 10) / 10, fuel: st.fuel }; })(),
    cb: Object.keys(s.crewBanners || {}).length,
    groups: groupScores(s),
    lifts: rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 6).map((r) => ({ name: r.e.name, label: r.label, rank: r.rank.id, best: Math.round(r.best), bw: r.e.type === "bodyweight" })),
  };
}
