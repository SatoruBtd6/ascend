import { today } from "../../lib/dates.js";
export const crewCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
export async function readCrew(code) {
  try { const r = await window.storage.get(`crew:${code}`, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
export async function listCrewMemberIds(code, rec, rows) {
  const fromCards = (rows || []).filter((r) => r.crew?.code === code).map((r) => r.id).filter(Boolean);
  const fromRec = rec?.members || [];
  let fromKeys = [];
  try {
    const list = await window.storage.list(`crewmem:${code}:`, true);
    fromKeys = (list?.keys || []).map((k) => k.slice(`crewmem:${code}:`.length)).filter(Boolean);
  } catch { /* shared list may fail offline */ }
  return [...new Set([...fromCards, ...fromRec, ...fromKeys])];
}
export async function loadCrewRoster(code, s, rows) {
  const rec = await readCrew(code);
  const ids = await listCrewMemberIds(code, rec, rows);
  if (s?.playerId && !s.test && !ids.includes(s.playerId)) ids.push(s.playerId);
  const byId = new Map();
  (rows || []).forEach((r) => { if (r.id && !r.ghost) byId.set(r.id, r); });
  const missing = ids.filter((id) => !byId.has(id));
  await Promise.all(missing.map(async (id) => {
    try {
      const r = await window.storage.get(`lb:${id}`, true);
      if (r?.value) {
        const card = JSON.parse(r.value);
        if (card.ghost) return;
        byId.set(id, { key: `lb:${id}`, ...card });
      } else if (!(id === s.playerId && s.test)) byId.set(id, { id, name: id === s.playerId ? s.profile.name : "Teammate" });
    } catch { if (!(id === s.playerId && s.test)) byId.set(id, { id, name: id === s.playerId ? s.profile.name : "Teammate" }); }
  }));
  if (s?.playerId && !s.test) {
    const me = byId.get(s.playerId) || {};
    byId.set(s.playerId, { ...me, id: s.playerId, name: s.profile.name || me.name, look: s.profile.look || me.look, avatar: s.profile.avatar || me.avatar, crew: s.crew });
  }
  return { rec, rows: ids.map((id) => byId.get(id)).filter((r) => r && !r.ghost) };
}
export async function writeCrewMembership(code, rec, s, join) {
  const memKey = `crewmem:${code}:${s.playerId}`;
  if (join) {
    try { await window.storage.set(memKey, JSON.stringify({ id: s.playerId, name: s.profile.name, since: today(), uid: window.ascendUserId || null }), true); } catch (e) { /* still joined locally */ }
    const members = [...new Set([...(rec?.members || []), s.playerId])];
    try { await window.storage.set(`crew:${code}`, JSON.stringify({ ...rec, members }), true); } catch (e) { /* owner-only write blocked */ }
    return { ...rec, members };
  }
  try { await window.storage.delete(memKey, true); } catch (e) { /* none */ }
  const members = (rec?.members || []).filter((id) => id !== s.playerId);
  try { if (rec) await window.storage.set(`crew:${code}`, JSON.stringify({ ...rec, members }), true); } catch (e) { /* owner-only */ }
  return rec ? { ...rec, members } : rec;
}
// Cosmetic only: a pennant showing how many weekly crew quests this player has banked
