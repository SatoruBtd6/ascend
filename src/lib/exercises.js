import { exKey, pickPreferredExercise, exerciseHistoryCounts } from "../math.js";
import { EXERCISES } from "../data/exercises.js";
import { FACTOR_FLOOR } from "../data/ranks.js";
export let exMemo = { token: null, list: null, byName: null, byKey: null };
export const allExercises = (s) => {
  const custom = s.custom || [];
  const cex = s.community?.ex || [];
  const hist = exerciseHistoryCounts(s);
  const token = `${custom.length}\n${cex.length}\n${[...hist.entries()].map(([n, c]) => `${n}:${c}`).join("\n")}`;
  if (exMemo.token === token && exMemo.list) return exMemo.list;
  const buckets = new Map();
  const add = (ex, source) => {
    if (!ex?.name) return;
    const k = exKey(ex.name);
    if (!k) return;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({ ex, source });
  };
  EXERCISES.forEach((e) => add(e, "catalog"));
  custom.forEach((e) => add(e, "custom"));
  cex.forEach((e) => add(e, "community"));
  const list = [];
  const byName = new Map();
  const byKey = new Map();
  buckets.forEach((group, k) => {
    const preferred = pickPreferredExercise(group, hist);
    if (!preferred) return;
    const row = preferred.type === "weighted" ? { ...preferred, factor: Math.max(preferred.factor || 0.5, (FACTOR_FLOOR[preferred.group] || 0.2) * (preferred.perHand ? 0.4 : 1)) } : preferred;
    list.push(row);
    byKey.set(k, row);
    group.forEach((g) => byName.set(g.ex.name, row));
    byName.set(row.name, row);
  });
  exMemo = { token, list, byName, byKey };
  return list;
};
export const findEx = (s, name) => {
  allExercises(s);
  return exMemo.byName.get(name) || exMemo.byKey.get(exKey(name)) || { name, group: "Core", type: "weighted", factor: 1.2, xp: 8 };
};
