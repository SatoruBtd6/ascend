// Pure helpers shared by App.jsx and the simulation tests in math.test.mjs.
// Keep everything here free of React and browser APIs so it can run under `node --test`.

const clone = (v) => {
  if (v == null || typeof v !== "object") return v;
  try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
};
const eq = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const hasId = (x) => x && typeof x === "object" && x.id != null;
const isIdList = (v) => Array.isArray(v) && v.length > 0 && v.every(hasId);
const asIdList = (a, b, c) => isIdList(a) || isIdList(b) || isIdList(c);

// Three-way merge for the whole ascend-state blob (local vs server vs last-ack snapshot).
// Rules — keep these if you add fields; do not special-case last-write-wins:
// 1. If this device changed a value since the snapshot, keep local.
// 2. Otherwise take the server's value (other device's update, or unchanged).
// 3. Maps (weightLog, meals-by-day, water, …) and id-lists (workouts, presets, meals[day])
//    use the same rule per key/id: local edit wins; server-only key not in snapshot is kept;
//    key that was in the snapshot and is gone locally stays deleted.
export function mergeState(local, server, snapshot) {
  if (!server) return clone(local);
  if (!local) return clone(server);
  const snap = snapshot && typeof snapshot === "object" ? snapshot : {};
  const loc = isObj(local) ? local : {};
  const ser = isObj(server) ? server : {};
  const out = mergeMap(loc, ser, isObj(snap) ? snap : {});
  if (out.rev == null) out.rev = Math.max(+loc.rev || 0, +ser.rev || 0);
  return out;
}

function mergeMap(local, server, snap) {
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(server || {}), ...Object.keys(snap || {})]);
  const out = {};
  keys.forEach((k) => {
    if (k === "rev") return;
    const got = mergeValue(local?.[k], server?.[k], snap?.[k], keyIn(local, k), keyIn(server, k), keyIn(snap, k));
    if (got !== undefined) out[k] = got;
  });
  return out;
}

function keyIn(obj, k) {
  return !!(obj && Object.prototype.hasOwnProperty.call(obj, k));
}

function mergeValue(local, server, snap, lHas, sHas, pHas) {
  if (lHas && !eq(local, snap)) {
    if (asIdList(local, server, snap)) return mergeIdList(lHas ? local : [], sHas ? server : [], pHas ? snap : []);
    if (isObj(local) || isObj(server) || isObj(snap)) return mergeMap(isObj(local) ? local : {}, isObj(server) ? server : {}, isObj(snap) ? snap : {});
    return clone(local);
  }
  if (!lHas && pHas) return undefined;
  if (sHas) return clone(server);
  if (lHas) return clone(local);
  return undefined;
}

function mergeIdList(local, server, snap) {
  const l = Array.isArray(local) ? local : [];
  const s = Array.isArray(server) ? server : [];
  const p = Array.isArray(snap) ? snap : [];
  const lMap = new Map(l.filter(hasId).map((x) => [String(x.id), x]));
  const sMap = new Map(s.filter(hasId).map((x) => [String(x.id), x]));
  const pMap = new Map(p.filter(hasId).map((x) => [String(x.id), x]));
  const ids = new Set([...lMap.keys(), ...sMap.keys(), ...pMap.keys()]);
  const order = [];
  const seen = new Set();
  const take = (id) => { if (!seen.has(id)) { seen.add(id); order.push(id); } };
  l.forEach((x) => hasId(x) && take(String(x.id)));
  s.forEach((x) => hasId(x) && take(String(x.id)));
  p.forEach((x) => hasId(x) && take(String(x.id)));
  ids.forEach((id) => take(id));
  const out = [];
  order.forEach((id) => {
    const got = mergeValue(lMap.get(id), sMap.get(id), pMap.get(id), lMap.has(id), sMap.has(id), pMap.has(id));
    if (got !== undefined) out.push(got);
  });
  return out;
}


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
