import { workSets, thresholds, inGymBucket, isLegacyAssisted, PR_BONUS, collectPrHistory, scoreExercisePrs, prKey, levelFromXp, effW, workoutCredit as creditOf, cardioMinutesOf, round1, round2 } from "../math.js";
import { QUEST_POOL, QUEST_EX } from "../data/quests.js";
import { TIER_STYLE, ACH_SERIES, ROMAN } from "../data/achievements.js";
import { RANKS, DIVS, GROUP_WEIGHT } from "../data/ranks.js";
import { findEx, allExercises } from "./exercises.js";
import { today, shift, uid, e1rm } from "./dates.js";
// Add a finished workout and push its reps into matching daily quests
export function fillQuests(p, d, exercises) {
  const day = p.days?.[d] || newDay();
  const list = (day.list || []).map((q) => {
    if (q.qid === "run" && !q.claimed) {
      const mi = exercises.filter((e) => /^(Running|Walking|Incline Walk)$/.test(e.name)).reduce((a, e) => a + workSets(e.sets).reduce((b, st) => b + (+st.w || 0), 0), 0);
      return mi ? { ...q, progress: Math.round((q.progress + mi) * 100) / 100, fromWorkout: Math.round(((q.fromWorkout || 0) + mi) * 100) / 100 } : q;
    }
    const exName = QUEST_EX[q.qid];
    if (q.claimed || !exName) return q;
    const amt = exercises.filter((e) => e.name === exName).reduce((a, e) => a + workSets(e.sets).reduce((b, st) => b + (+st.r || 0), 0), 0);
    return amt ? { ...q, progress: q.progress + amt, fromWorkout: (q.fromWorkout || 0) + amt } : q;
  });
  return { ...p, days: { ...p.days, [d]: { ...day, list } } };
}
export function addWorkout(p, workout) {
  return { ...fillQuests(p, workout.date, workout.exercises), workouts: [...p.workouts, workout] };
}
// Add one completed card to today's deck session workout (creates it on the first card)
export function addDeckSet(p, sessionId, name, reps, xp) {
  const d = today();
  const set = { w: "", r: reps, done: true };
  const existing = p.workouts.find((w) => w.id === sessionId);
  let workouts;
  if (existing) {
    workouts = p.workouts.map((w) => {
      if (w.id !== sessionId) return w;
      const has = w.exercises.some((e) => e.name === name);
      const exercises = has ? w.exercises.map((e) => (e.name === name ? { ...e, sets: [...e.sets, set] } : e)) : [...w.exercises, { name, sets: [set] }];
      return { ...w, exercises, xp: (w.xp || 0) + xp };
    });
  } else {
    workouts = [...p.workouts, { id: sessionId, date: d, source: "deck", exercises: [{ name, sets: [set] }], xp, volume: 0 }];
  }
  return { ...fillQuests(p, d, [{ name, sets: [set] }]), workouts };
}
export function scoreFor(best, steps) {
  if (best < steps[0]) return best / steps[0];
  for (let i = 1; i < steps.length; i++) if (best < steps[i]) return i + (best - steps[i - 1]) / (steps[i] - steps[i - 1]);
  const s6 = steps[4] * 1.35, s7 = steps[4] * 1.75;
  if (best < s6) return 5 + (best - steps[4]) / (s6 - steps[4]);
  return Math.min(7, 6 + (best - s6) / (s7 - s6));
}
export function valueAt(t, steps) {
  if (t <= 1) return t * steps[0];
  if (t <= 5) { const i = Math.floor(t); return i === 5 ? steps[4] : steps[i - 1] + (t - i) * (steps[i] - steps[i - 1]); }
  if (t <= 6) return steps[4] * (1 + 0.35 * (t - 5));
  return steps[4] * (1.35 + 0.4 * (t - 6));
}
export function rankFromScore(score) {
  const i = Math.min(6, Math.floor(score));
  const frac = Math.min(0.999, score - i);
  const d = Math.min(2, Math.floor(frac * 3));
  return { rank: RANKS[i], div: DIVS[d], label: `${RANKS[i].id} ${DIVS[d]}`, divPct: Math.round(((frac * 3) - d) * 100) };
}
export function rankFor(ex, best, p) {
  const steps = thresholds(ex, p);
  const score = scoreFor(best, steps);
  const r = rankFromScore(score);
  const nextT = Math.floor(score * 3 + 1e-9) / 3 + 1 / 3;
  const next = score >= 6.999 ? null : Math.ceil(valueAt(Math.min(7, nextT), steps));
  const nextLabel = next ? rankFromScore(Math.min(6.999, nextT + 1e-6)).label : null;
  return { ...r, score, pct: r.divPct, next, nextLabel, steps };
}
// Assisted machines: the weight entered is the help you got. What you actually moved is bodyweight minus that.
export const movedLb = (p, assist) => Math.max(0, Math.max(80, +p.weight || 170) - (+assist || 0));
export const assistedReps = (p, st) => (+st.r || 0) * (movedLb(p, st.w) / Math.max(80, +p.weight || 170));
export function bestValue(def, st, p, ex) {
  if (def.type === "assisted") return assistedReps(p, st);
  if (def.type === "bodyweight") return (+st.r || 0) * (1 + (+st.w || 0) / Math.max(80, +p.weight || 170));
  return e1rm(effW(def, ex, +st.w || 0), +st.r);
}
export function computeBests(s) {
  const b = {};
  s.workouts.forEach((w) => w.exercises.forEach((ex) => {
    const def = findEx(s, ex.name);
    if (def.type === "timed") return;
    if (!inGymBucket(s, w, def)) return;
    if (isLegacyAssisted(w, def)) return;
    workSets(ex.sets).forEach((st) => {
      const v = bestValue(def, st, s.profile, ex);
      const k = def.type === "assisted" ? def.rankAs : ex.name;
      if (v > (b[k] || 0)) b[k] = v;
    });
  }));
  return b;
}
export function rankedLifts(s) {
  const bests = computeBests(s);
  return allExercises(s).filter((e) => e.type !== "timed" && bests[e.name]).map((e) => ({ e, best: bests[e.name], ...rankFor(e, bests[e.name], s.profile) }));
}
export function groupScores(s) {
  const g = {};
  rankedLifts(s).forEach((r) => { if (GROUP_WEIGHT[r.e.group]) g[r.e.group] = Math.max(g[r.e.group] || 0, r.score); });
  return g;
}
export function overallInfo(s) {
  const g = groupScores(s);
  const total = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);
  const score = Object.entries(GROUP_WEIGHT).reduce((a, [k, w]) => a + (g[k] || 0) * w, 0) / total;
  return { score, groups: g, ...rankFromScore(score) };
}
export const overallRank = (s) => overallInfo(s).rank;
// Leaderboard points: workout XP + lift ranks + hustle XP, then vault aura, then crate spends.
// A "workout" is a real session. Card-deck flips and quest top-ups still give XP and reps, but don't count as one.
export const isWorkout = (w) => w.source !== "quest" && w.source !== "deck";
export const workoutCredit = (s, w) => creditOf(s, w, findEx);
export const fmtCredit = (n) => round1(n).toFixed(1);
export function activeDays(s) {
  const days = new Set();
  (s.workouts || []).forEach((w) => { if (workoutCredit(s, w) > 0) days.add(w.date); });
  Object.entries(s.days || {}).forEach(([d, v]) => v.list?.some((q) => q.claimed) && days.add(d));
  return days;
}
export function streakOf(s) {
  const days = activeDays(s);
  let n = 0, d = today();
  if (!days.has(d)) d = shift(d, -1);
  while (days.has(d)) { n++; d = shift(d, -1); }
  return n;
}
export const mealTotals = (meals = []) => meals.reduce((a, m) => {
  const q = +m.qty || 0;
  return { cal: a.cal + m.cal * q, p: a.p + m.p * q, c: a.c + m.c * q, f: a.f + m.f * q };
}, { cal: 0, p: 0, c: 0, f: 0 });

export function makeQuest(exclude = [], tier = 1) {
  const pool = QUEST_POOL.filter((q) => !exclude.includes(q.qid));
  const q = pool[Math.floor(Math.random() * pool.length)] || QUEST_POOL[0];
  const mult = tier === 1 ? 1 : 1 + 0.5 * (tier - 1);
  const target = q.target >= 1000 ? Math.round((q.target * mult) / 1000) * 1000 : Math.round(q.target * mult);
  return { id: uid(), qid: q.qid, title: q.title, target, unit: q.unit, xp: Math.round(q.xp * mult), progress: 0, claimed: false, tier };
}
export const newDay = () => {
  const list = [];
  while (list.length < 3) list.push(makeQuest(list.map((q) => q.qid)));
  return { list, rerolls: 0, bonuses: 0 };
};

export function setXp(s, def, st, ex) {
  if (def.type === "assisted") {
    const base = findEx(s, def.rankAs), eq = assistedReps(s.profile, st);
    const out = setXp(s, { ...base, xp: def.xp }, { r: eq, w: 0 }, ex);
    return { ...out, note: `${Math.round(movedLb(s.profile, st.w))} lb moved · ${out.note}` };
  }
  const p = s.profile, r = +st.r || 0, w = def.type === "weighted" ? effW(def, ex, +st.w || 0) : +st.w || 0;
  if (r <= 0) return { xp: 0, note: "" };
  if (def.type === "timed") {
    const mi = def.group === "Cardio" ? w : 0;
    return { xp: Math.round(r * def.xp + mi * 10), note: `${r} min × ${def.xp}${mi ? ` + ${mi} mi × 10` : ""}` };
  }
  const steps = thresholds(def, p), sTop = steps[4];
  const bw = Math.max(80, +p.weight || 170);
  const val = def.type === "bodyweight" ? r * (1 + w / bw) : e1rm(w, r);
  const effort = def.type === "bodyweight" ? (val / sTop) * 6 : (w * r) / sTop;
  const score = scoreFor(val, steps);
  const mult = 0.5 + score * 0.3;
  const xp = Math.max(Math.ceil(def.xp / 2), Math.round(def.xp * 0.7 * effort * mult));
  return { xp, note: `${rankFromScore(score).label}-level set`, score };
}
export const prNote = (pr) => (pr === "weight" ? " · weight PR" : pr === "reps" ? " · rep PR" : pr ? " · PR" : "");
export function workoutXp(s, exercises, bests, opts = {}) {
  void bests;
  const skipPr = opts.skipPr || bests == null;
  const workout = opts.workout || { gym: s.currentGym ?? null, date: opts.date || today() };
  const history = skipPr ? null : (opts.history || collectPrHistory(s, findEx, { excludeId: opts.excludeId }));
  const usedByName = new Map();
  let xp = 0, prs = 0, volume = 0, sets = 0;
  const lines = [];
  exercises.forEach((ex) => {
    const def = findEx(s, ex.name);
    const line = { name: ex.name, xp: 0, sets: [] };
    if (!usedByName.has(ex.name)) usedByName.set(ex.name, { weight: false, reps: false });
    const flags = skipPr ? [] : scoreExercisePrs(def, ex, history?.get(prKey(s, def, workout)) || [], workout, usedByName.get(ex.name));
    let si = 0;
    workSets(ex.sets).forEach((st) => {
      sets++;
      const { xp: sx, note } = setXp(s, def, st, ex);
      line.xp += sx; xp += sx;
      const label = (def.type === "timed" ? `${st.w ? `${st.w} mi · ` : ""}${st.r} min` : def.type === "assisted" ? `${st.r} reps, ${+st.w || 0} lb assist` : st.w ? `${st.w}×${st.r}` : `${st.r} reps`) + (st.drop ? " drop" : "");
      const pr = flags[si]?.pr || false;
      si++;
      if (pr) prs++;
      if (def.type !== "timed") volume += (def.type === "assisted" ? movedLb(s.profile, st.w) : (+st.w || 0)) * (+st.r || 0);
      line.sets.push({ label, xp: sx, note, pr });
    });
    lines.push(line);
  });
  return { xp: xp + prs * PR_BONUS, prs, volume, sets, lines, prBonus: prs * PR_BONUS };
}
export function workoutRecap(s, workout) {
  const lifts = (workout.exercises || []).map((ex) => {
    const def = findEx(s, ex.name);
    const working = workSets(ex.sets).filter((st) => +st.r > 0);
    let rank = null, best = 0;
    if (def.type !== "timed" && working.length) {
      best = Math.max(...working.map((st) => bestValue(def, st, s.profile, ex)));
      rank = rankFor(def, best, s.profile);
    }
    const vol = working.reduce((a, st) => a + (def.type === "assisted" ? movedLb(s.profile, st.w) : (+st.w || 0)) * (+st.r || 0), 0);
    return { name: ex.name, group: def.group, rank, best, vol, sets: working, drops: working.filter((st) => st.drop).length };
  }).filter((l) => l.sets.length);
  const scored = lifts.filter((l) => l.rank);
  const avg = scored.length ? scored.reduce((a, l) => a + l.rank.score, 0) / scored.length : 0;
  return { lifts, overall: scored.length ? rankFromScore(avg) : null };
}
export function allAchievements() {
  return ACH_SERIES.flatMap((series) => series.steps.map((v, i) => ({ id: `${series.key}-${i}`, series, tier: i + 1 + (series.tierOffset || 0), value: v, title: series.names ? series.names[i] : `${series.title} ${ROMAN[i]}`, desc: series.labels ? series.labels[i] : `${v.toLocaleString()} ${series.unit}`, xp: TIER_STYLE[i + 1 + (series.tierOffset || 0)].xp })));
}
export function lifetimeStats(s) {
  let miles = 0, volume = 0, reps = 0, workouts = 0, pushups = 0, pullups = 0, yogurt = 0;
  Object.values(s.meals || {}).forEach((list) => (list || []).forEach((m) => {
    const q = +m.qty || 0;
    if (/yogh?urt/i.test(m.name || "")) yogurt += q;
    else if (m.ingredients) m.ingredients.forEach((it) => { if (/yogh?urt/i.test(it.name || "")) yogurt += q * (+it.qty || 1); });
  }));
  const bests = computeBests(s);
  s.workouts.forEach((w) => {
    workouts += workoutCredit(s, w);
    w.exercises.forEach((ex) => {
      const def = findEx(s, ex.name);
      workSets(ex.sets).forEach((st) => {
        const r = +st.r || 0, wt = +st.w || 0;
        if (def.type === "timed") { if (def.group === "Cardio") miles += wt; return; }
        reps += r; volume += (def.type === "assisted" ? movedLb(s.profile, wt) : wt) * r;
        if (/push-?up/i.test(ex.name)) pushups += r;
        if (/pull-?up|chin-?up/i.test(ex.name)) pullups += r;
      });
    });
  });
  let quests = 0;
  Object.values(s.days || {}).forEach((day) => (day.list || []).forEach((q) => { if (q.claimed) { quests++; if (q.qid === "run") miles += q.progress || q.target || 0; } }));
  const days = [...activeDays(s)].sort();
  let longest = 0, run = 0, prev = null;
  days.forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
  const ranked = rankedLifts(s);
  const maxScore = ranked.reduce((a, r) => Math.max(a, r.score), 0);
  const overall = overallInfo(s).score;
  const rankTier = overall >= 5 ? 5 : maxScore >= 5 ? 4 : maxScore >= 4 ? 3 : maxScore >= 3 ? 2 : maxScore >= 2 ? 1 : 0;
  return {
    yogurt: Math.round(yogurt * 10) / 10, steps: Object.values(s.steps || {}).reduce((a, n) => a + (+n || 0), 0), miles: Math.round(miles * 10) / 10, volume: Math.round(volume), reps, workouts: round2(workouts), pushups, pullups, quests, longestStreak: longest,
    bench: Math.round(bests["Bench Press"] || 0), squat: Math.round(bests["Squat"] || 0), deadlift: Math.round(bests["Deadlift"] || 0),
    rankTier, level: levelFromXp(s.xp).lvl, since: s.workouts[0]?.date || null,
  };
}
// Drop achievements that no longer hold up (e.g. ranks earned under the old, easier scale) and take back their XP
export function reconcileAchievements(s, rankOnly = false) {
  const earned = new Set(earnedAchievements(s).map((a) => a.id));
  const all = Object.fromEntries(allAchievements().map((a) => [a.id, a]));
  const lost = Object.keys(s.ach || {}).filter((id) => !earned.has(id) && !id.startsWith("workouts-") && (!rankOnly || id.startsWith("rank-")));
  if (!lost.length) return { ...s, achV: 3 };
  const refund = lost.reduce((a, id) => a + (all[id]?.xp || 0), 0);
  const ach = { ...s.ach }; lost.forEach((id) => delete ach[id]);
  return { ...s, ach, achV: 3, xp: Math.max(0, s.xp - refund) };
}
export function earnedAchievements(s) {
  const st = lifetimeStats(s);
  return allAchievements().filter((a) => a.series.get(st) >= a.value);
}
export const rangeStats = (s, from, to = "9999") => {
  const inRange = s.workouts.filter((w) => w.date >= from && w.date <= to);
  const ws = inRange.filter(isWorkout);
  // Reps count from everything, card decks and quest top-ups included
  let reps = 0;
  inRange.forEach((w) => w.exercises.forEach((ex) => { if (findEx(s, ex.name).type !== "timed") workSets(ex.sets).forEach((st) => { reps += Math.max(0, Math.round(+st.r || 0)); }); }));
  const groups = new Set();
  let volume = 0, prs = 0, miles = 0, credit = 0, cardioMin = 0;
  const creditDays = new Set();
  ws.forEach((w) => {
    volume += w.volume || 0; prs += Math.round((w.prBonus || 0) / 40);
    const creditNow = workoutCredit(s, w);
    credit += creditNow;
    if (creditNow > 0) creditDays.add(w.date);
    const cm = cardioMinutesOf(w);
    cardioMin += cm.run + cm.walk;
    w.exercises.forEach((ex) => { const d = findEx(s, ex.name); if (d.type !== "timed") { if (workSets(ex.sets).length) groups.add(d.group); } else if (d.group === "Cardio") workSets(ex.sets).forEach((st) => { miles += +st.w || 0; }); });
  });
  const quests = Object.entries(s.days || {}).filter(([d]) => d >= from && d <= to).reduce((a, [, day]) => a + (day.list || []).filter((q) => q.claimed).length, 0);
  const fuel = Object.keys(s.fuelClaimed || {}).filter((d) => d >= from && d <= to).length;
  const xp = Object.entries(s.xpLog || {}).filter(([d]) => d >= from && d <= to).reduce((a, [, v]) => a + v, 0);
  const weights = Object.keys(s.weightLog || {}).filter((d) => d >= from && d <= to).length;
  let best = 0, run = 0, prev = null;
  [...creditDays].sort().forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return { workouts: round1(credit), cardioMin: round1(cardioMin), volume, prs, miles, quests, fuel, xp, groups: groups.size, weights, streak: best, reps };
};
export function pickChallenges(pool, seedStr, n) {
  let seed = [...seedStr].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const fixed = pool.filter((c) => c.fixed), rest = pool.filter((c) => !c.fixed), out = [...fixed];
  while (out.length < n && rest.length) { seed = (seed * 1103515245 + 12345) >>> 0; out.push(rest.splice(seed % rest.length, 1)[0]); }
  return out;
}
