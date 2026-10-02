import { monthKey, today } from "../../lib/dates.js";
export const seasonKey = (d = today()) => `${d.slice(0, 4)}-S${Math.floor((parseInt(d.slice(5, 7), 10) - 1) / 3) + 1}`;
export const seasonStart = (key) => { const [y, q] = key.split("-S"); return `${y}-${String((+q - 1) * 3 + 1).padStart(2, "0")}-01`; };
export const nextSeasonStart = (key) => { const [y, q] = key.split("-S").map(Number); return q === 4 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`; };
export const prevSeasonKey = (key) => { const [y, q] = key.split("-S").map(Number); return q === 1 ? `${y - 1}-S4` : `${y}-S${q - 1}`; };
export const seasonXp = (s, key) => { const a = seasonStart(key), b = nextSeasonStart(key); return Object.entries(s.xpLog || {}).filter(([d]) => d >= a && d < b).reduce((t, [, v]) => t + v, 0); };
// Monthly cycle (phase 7o Part A): YYYY-MM, runs alongside the quarterly
// seasons — nothing below touches seasonKey/seasonBadges/settleSeason.
// monthKey itself lives in lib/dates.js and is re-exported here for callers
// that only import the cycle helpers.
export { monthKey };
export const prevMonthKey = (key) => { const [y, m] = key.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
export const nextMonthStart = (key) => { const [y, m] = key.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; };
export const monthXp = (s, key) => Object.entries(s.xpLog || {}).filter(([d]) => d.startsWith(key)).reduce((t, [, v]) => t + v, 0);
// Pure: the month's podium off the published board cards, top 3. Ordered by
// month XP desc; ties go to the card whose ledger reached the tied total on
// the earliest day (xpLog is per-day, so a same-day tie falls back to id for
// determinism — no coin flips). A republished card contributes its prevMonth
// snapshot. (phase 7p: month is the season — top-3 feeds laurel/contender.)
export function pickMonthWinners(rows, key) {
  const stat = (r) => {
    const m = r.month?.key === key ? r.month : (r.prevMonth?.key === key ? r.prevMonth : null);
    return { xp: m?.xp || 0, xpd: m?.xpd || {} };
  };
  const reach = (xpd, total) => {
    let acc = 0;
    for (const d of Object.keys(xpd).sort()) { acc += xpd[d] || 0; if (acc >= total) return d; }
    return "9999-99"; // no day data — loses every tie
  };
  return (rows || []).map((r) => ({ r, ...stat(r) })).filter((c) => c.xp > 0)
    .sort((a, b) => b.xp - a.xp
      || reach(a.xpd, a.xp).localeCompare(reach(b.xpd, b.xp))
      || String(a.r.id || a.r.key).localeCompare(String(b.r.id || b.r.key)))
    .slice(0, 3)
    .map((c, i) => ({ id: c.r.id || (c.r.key || "").slice(3), name: c.r.name, xp: c.xp, place: i + 1 }));
}
export function pickMonthWinner(rows, key) {
  const w = pickMonthWinners(rows, key)[0];
  return w ? { id: w.id, name: w.name, xp: w.xp } : null;
}
// Month settle (phase 7o Part A): mirrors the season settle. Any client that
// loads the board after rollover writes the shared `month:<YYYY-MM>` record
// once — including a no-qualifier record, so an empty month stays closed
// instead of retrying. The podium (top 3) stamp monthBadges; only the #1
// winner's own client stamps auraUnlocks.descended — per-account ownership,
// never a shared write.
export async function settleMonth(s, setS, rows, storage = window.storage) {
  const last = prevMonthKey(monthKey());
  let rec = null;
  try { const r = await storage.get(`month:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    rec = { key: last, winners: pickMonthWinners(rows, last), t: Date.now() };
    try { await storage.set(`month:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine) setS((p) => ({
    ...p,
    auraUnlocks: mine.place === 1 ? { ...(p.auraUnlocks || {}), descended: p.auraUnlocks?.descended || today() } : p.auraUnlocks,
    monthBadges: { ...(p.monthBadges || {}), [last]: { place: mine.place, xp: mine.xp } },
  }));
}
