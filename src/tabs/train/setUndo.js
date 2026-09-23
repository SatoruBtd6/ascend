// One set per undo. The snapshot lives in memory with the toast, never in saved state.

export function deleteSetAt(exercises, ei, si) {
  if (!Array.isArray(exercises)) return null;
  const ex = exercises[ei];
  if (!ex || !Array.isArray(ex.sets) || !Number.isInteger(si) || si < 0 || si >= ex.sets.length) return null;
  const set = { ...ex.sets[si] };
  const next = exercises.map((e, i) => (i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e));
  return { exercises: next, undo: { ei, si, set } };
}

export function restoreSetAt(exercises, undo) {
  if (!Array.isArray(exercises) || !undo || !undo.set || !Number.isInteger(undo.ei) || !Number.isInteger(undo.si)) return exercises;
  const ex = exercises[undo.ei];
  if (!ex || !Array.isArray(ex.sets)) return exercises;
  const at = Math.max(0, Math.min(undo.si, ex.sets.length));
  const sets = ex.sets.slice();
  sets.splice(at, 0, { ...undo.set });
  return exercises.map((e, i) => (i === undo.ei ? { ...e, sets } : e));
}
