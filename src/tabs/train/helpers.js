import { exKey, workSets, inGymBucket, workoutGym, isLegacyAssisted } from "../../math.js";
import { findEx } from "../../lib/exercises.js";
import { overallInfo, rankedLifts, isWorkout, bestValue } from "../../lib/stats.js";
export const namesMatch = (a, b) => { const k = exKey(a); return !!k && k === exKey(b); };
export function gymLabel(s, id) {
  if (id == null || id === "") return "";
  return (s.gyms || []).find((g) => g.id === id)?.name || "";
}
export function pastSessions(s, name, excludeId, n = 3) {
  const def = findEx(s, name);
  const out = [];
  for (let i = (s.workouts || []).length - 1; i >= 0 && out.length < n; i--) {
    const w = s.workouts[i];
    if (w.id === excludeId || !isWorkout(w)) continue;
    if (!inGymBucket(s, w, def)) continue;
    if (isLegacyAssisted(w, def)) continue;
    const ex = (w.exercises || []).find((e) => namesMatch(e.name, name));
    if (!ex) continue;
    const sets = workSets(ex.sets).filter((st) => +st.r > 0 || +st.w > 0);
    if (!sets.length) continue;
    out.push({ date: w.date, sets, id: w.id, title: w.title || "", gym: workoutGym(w) });
  }
  return out;
}
export function cloneSets(sets) {
  return (sets || []).map((st) => ({ w: st.w === 0 || st.w ? String(st.w) : "", r: st.r === 0 || st.r ? String(st.r) : "", done: false, drop: !!st.drop, ...(st.warm ? { warm: true } : {}) }));
}
export function lastWorkingSets(s, name, excludeId) {
  for (const ps of pastSessions(s, name, excludeId, 8)) {
    const sets = (ps.sets || []).filter((st) => +st.r > 0 || +st.w > 0);
    if (sets.length) return { date: ps.date, sets };
  }
  return null;
}
export function loggedWorkouts(s) {
  return [...(s.workouts || [])].reverse().filter((w) => isWorkout(w) && (w.exercises || []).some((e) => (e.sets || []).some((st) => +st.r > 0 || +st.w > 0)));
}
// strict: only ever return a session with the same title, so Push never offers your last Legs day
export function lastWorkout(s, titleHint, strict = false) {
  const list = loggedWorkouts(s);
  if (!list.length) return null;
  const t = (titleHint || "").trim().toLowerCase();
  const hit = list.find((w) => (w.title || "").trim().toLowerCase() === t);
  if (hit) return hit;
  return strict ? null : list[0];
}
// Most recent finished workout that was started from this preset
export function lastPresetWorkout(s, preset) {
  const p = (preset || "").trim().toLowerCase();
  if (!p) return null;
  return loggedWorkouts(s).find((w) => (w.preset || "").trim().toLowerCase() === p) || null;
}
export function copyWorkoutExercises(w) {
  return (w.exercises || []).map((e) => ({ name: e.name, ...(e.wMode ? { wMode: e.wMode } : {}), ss: !!e.ss, sets: cloneSets(e.sets) }));
}
export function applyTargetSets(lastSets, target) {
  const base = (lastSets || []).filter((st) => +st.r > 0 || +st.w > 0);
  if (!target) return cloneSets(base);
  if (!base.length) return [{ w: target.w != null ? String(target.w) : "", r: target.r != null ? String(target.r) : "", done: false }];
  return base.map((st) => {
    if (st.drop) return { w: target.w != null && +target.w > 0 ? String(Math.round(+target.w * 0.8)) : String(st.w ?? ""), r: String(st.r ?? target.r ?? ""), done: false, drop: true };
    return { w: target.w != null ? String(target.w) : String(st.w ?? ""), r: String(target.r ?? st.r ?? ""), done: false, drop: false };
  });
}
export const setLabel = (def, st) => {
  const core = def.type === "assisted" ? `${st.r} (−${+st.w || 0})` : def.type === "timed" ? `${st.w ? `${st.w}mi ` : ""}${st.r}m` : st.w ? `${st.w}×${st.r}` : `${st.r}`;
  return st.warm ? `${core} W` : st.drop ? `${core} drop` : core;
};
export function rankSnapshot(s) {
  const o = overallInfo(s);
  const lifts = {};
  rankedLifts(s).forEach((r) => { lifts[r.e.name] = Math.floor(r.score); });
  return { overall: Math.floor(o.score), od: Math.min(20, Math.floor(o.score * 3)), lifts };
}
export function withSilentRankSnap(s) {
  return { ...s, rankSnap: rankSnapshot(s) };
}
export function suggestNext(s, name, excludeId, stalled = null) {
  const def = findEx(s, name);
  if (def.type === "timed") return null;
  const last = lastWorkingSets(s, name, excludeId);
  if (!last) return null;
  const sets = last.sets.filter((st) => +st.r > 0);
  if (!sets.length) return null;
  const stalledList = stalled || stalledLifts(s);
  const isStalled = stalledList.some((x) => namesMatch(x.name, name));
  if (def.type === "bodyweight") {
    const minR = Math.min(...sets.map((st) => +st.r));
    const w = Math.max(...sets.map((st) => +st.w || 0));
    if (isStalled) return { w, r: Math.max(1, Math.round(minR * 0.8)), why: "stalled — drop reps, rebuild" };
    if (minR >= 10) return { w, r: minR + 1, why: "add a rep" };
    return { w, r: minR, why: "repeat, get every set" };
  }
  const w = Math.max(...sets.map((st) => +st.w || 0));
  const reps = sets.filter((st) => (+st.w || 0) === w).map((st) => +st.r);
  const minR = Math.min(...reps);
  const big = (def.group === "Legs" || def.group === "Back") && def.factor >= 1;
  const step = def.perHand ? 5 : big ? 10 : 5;
  if (isStalled && def.type === "weighted") {
    const dw = Math.max(step, Math.round((w * 0.9) / 5) * 5);
    return { w: dw, r: 5, why: "stalled 3 sessions — deload ~10%" };
  }
  if (minR >= 8) return { w: w + step, r: Math.max(5, minR - 2), why: `all sets hit ${minR}+` };
  if (minR >= 5) return { w, r: minR + 1, why: "add a rep" };
  return { w, r: minR, why: "repeat, get every set" };
}
export function stalledLifts(s) {
  const out = [];
  rankedLifts(s).forEach((r) => {
    const sess = pastSessions(s, r.e.name, null, 3);
    if (sess.length < 3) return;
    const bests = sess.map((ps) => Math.max(...ps.sets.map((st) => bestValue(r.e, st, s.profile))));
    if (bests[0] <= bests[1] && bests[1] <= bests[2]) out.push({ name: r.e.name, best: Math.round(bests[0]) });
  });
  return out;
}
export const fmtShort = (d) => new Date(`${d}T12:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
