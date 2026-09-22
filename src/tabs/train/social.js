import { overallInfo } from "../../lib/stats.js";
import { findEx } from "../../lib/exercises.js";
export const publishShared = async (key, obj) => { try { if (window.__ascendNoPersist) return; if (window.storage?.set) await window.storage.set(key, JSON.stringify(obj), true); } catch (e) { /* offline or preview */ } };
export const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export function liveBoard(rows) { return (rows || []).filter((r) => !r?.ghost); }
export function postFeed(s, type, text, extra = {}, eventId = null) {
  if (!s.lb || !s.profile.name) return;
  const key = eventId ? `feed:${s.playerId}_${eventId}` : `feed:${Date.now()}_${s.playerId}`;
  const oi = overallInfo(s);
  publishShared(key, { type, text, name: s.profile.name, from: s.playerId, look: s.profile.look || null, rank: oi.rank.id, div: oi.div, t: Date.now(), ...extra });
  return key;
}
// Full, shareable copy of a logged workout (exercises, every set's weight and reps)
export function workoutPayload(s, w) {
  return {
    id: w.id, title: w.title || "", date: w.date, xp: w.xp || 0, volume: Math.round(w.volume || 0), minutes: w.minutes || null,
    exercises: w.exercises.slice(0, 20).map((e) => ({ name: e.name, type: findEx(s, e.name).type, ...(e.wMode ? { wMode: e.wMode } : {}), sets: e.sets.slice(0, 15).map((st) => ({ w: st.w ?? "", r: st.r ?? "" })) })),
  };
}
export async function readShared(prefix) {
  if (!window.storage?.list) return [];
  try {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
    const got = items.filter(Boolean);
    return prefix === "lb:" ? liveBoard(got) : got;
  } catch { return []; }
}
