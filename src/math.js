// Pure helpers shared by App.jsx and the simulation tests in math.test.mjs.
// Keep everything here free of React and browser APIs so it can run under `node --test`.

// World First: every player who lands a killing blow writes their own claim row, so upsert
// storage can't let one overwrite another. Everyone then resolves the same winner from the
// full set: earliest claim, ties broken by player id so the answer never flip-flops.
export function resolveWorldFirst(claims) {
  const ok = (claims || []).filter((c) => c && c.id && Number.isFinite(+c.t));
  if (!ok.length) return null;
  return [...ok].sort((a, b) => (+a.t - +b.t) || String(a.id).localeCompare(String(b.id)))[0];
}

// Crew weekly quests. Targets scale with the crew, progress is pooled from members' cards.
// Nothing here touches boss HP or boss damage.
export const CREW_QUESTS = [
  { id: "sessions", title: "workouts", per: 4, unit: "workouts", get: (wk) => wk.workouts },
  { id: "miles", title: "cardio miles", per: 8, unit: "mi", get: (wk) => wk.miles },
  { id: "fuel", title: "fuel goal days", per: 4, unit: "days", get: (wk) => wk.fuel },
];
export function crewQuestProgress(cards, weekKey, members) {
  const weeks = (cards || []).map((c) => (c && c.wk && c.wk.key === weekKey ? c.wk : null)).filter(Boolean);
  const n = Math.max(1, members || (cards || []).length || 1);
  const quests = CREW_QUESTS.map((q) => {
    const value = Math.round(weeks.reduce((a, wk) => a + (+q.get(wk) || 0), 0) * 10) / 10;
    const target = q.per * n;
    return { id: q.id, title: q.title, unit: q.unit, value, target, done: value >= target };
  });
  return { quests, members: n, done: quests.every((q) => q.done) };
}

// Warm-up sets are saved and shown, but count for nothing: no XP, PRs, boss damage,
// volume, rank scores, rep challenges, or next-weight suggestions.
export function workSets(sets) {
  return (sets || []).filter((st) => st && !st.warm);
}

// Your usual training hour, as a median of the hours you've started past workouts.
// Falls back to 8pm until there's enough history to be meaningful.
export function usualTrainHour(hours, { fallback = 20, min = 5 } = {}) {
  const list = (hours || []).filter((h) => Number.isFinite(h) && h >= 0 && h <= 23).sort((a, b) => a - b);
  if (list.length < min) return fallback;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round((list[mid - 1] + list[mid]) / 2);
}

// Closest-to-done goal out of a mixed list.
// Each candidate: { value, goal, tie, ... }. Lower `tie` wins when two are equally close.
// Anything already finished, empty, or malformed is ignored. Returns null when nothing is worth showing.
export function pickNextGoal(candidates, { min = 0.1 } = {}) {
  const usable = (candidates || []).filter((c) => c && +c.goal > 0 && +c.value >= 0 && +c.value < +c.goal);
  if (!usable.length) return null;
  const frac = (c) => +c.value / +c.goal;
  const sorted = [...usable].sort((a, b) => frac(b) - frac(a) || (a.tie ?? 0) - (b.tie ?? 0));
  return sorted.find((c) => frac(c) >= min) || sorted.find((c) => +c.value > 0) || null;
}
