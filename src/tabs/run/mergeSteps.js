import { today } from "../../lib/dates.js";
export function mergeSteps(s, inbox) {
  const cur = s.steps || {};
  let changed = false;
  const steps = { ...cur };
  Object.entries(inbox || {}).forEach(([d, n]) => { const v = Math.round(+n || 0); if (v > (steps[d] || 0)) { steps[d] = v; changed = true; } });
  if (!changed) return null;
  const d = today();
  let next = { ...s, steps };
  const day = next.days?.[d];
  if (day && steps[d]) next = { ...next, days: { ...next.days, [d]: { ...day, list: day.list.map((q) => (q.qid === "steps" && !q.claimed ? { ...q, progress: Math.max(q.progress, steps[d]) } : q)) } } };
  return next;
}
