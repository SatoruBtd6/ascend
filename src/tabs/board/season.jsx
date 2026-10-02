import { C } from "../../theme.js";
import { nextSeasonStart, prevSeasonKey, seasonKey, seasonXp } from "../profile/season.js";
export async function settleSeason(s, setS, rows) {
  const last = prevSeasonKey(seasonKey());
  let rec = null;
  try { const r = await window.storage.get(`season:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    const ranked = rows.filter((r) => r.prevSeason?.key === last && r.prevSeason.xp > 0).sort((a, b) => b.prevSeason.xp - a.prevSeason.xp).slice(0, 3);
    if (!ranked.length) return;
    rec = { key: last, winners: ranked.map((r, i) => ({ id: r.id, name: r.name, xp: r.prevSeason.xp, place: i + 1 })), t: Date.now() };
    try { await window.storage.set(`season:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine && !s.seasonBadges?.[last]) setS((p) => ({ ...p, seasonBadges: { ...(p.seasonBadges || {}), [last]: { place: mine.place, xp: mine.xp } } }));
}
export function applyReigning(s, setS, rows) {
  const sk = seasonKey();
  const xpOf = (r) => (r?.season?.key === sk ? r.season.xp : 0) || 0;
  const mine = seasonXp(s, sk);
  const myId = s.playerId;
  const bestOther = (rows || []).filter((r) => (r.id || (r.key || "").slice(3)) !== myId).reduce((m, r) => Math.max(m, xpOf(r)), 0);
  const on = !!s.lb && !s.test && mine > 0 && mine > bestOther;
  // Ascended is a permanent award now — holding it no longer rides on #1, and
  // losing #1 must never unequip it. The aura swap was the only runtime strip
  // path; it is gone on purpose (phase 7o Part A). lbReigning still updates
  // for the Reigning title and board highlights.
  setS((p) => (!!p.lbReigning === on ? p : { ...p, lbReigning: on }));
}
export function SeasonBanner() {
  const key = seasonKey();
  const days = Math.max(0, Math.ceil((new Date(nextSeasonStart(key) + "T00:00") - new Date()) / 86400000));
  return (
    <div className="panel px-4 py-3 flex items-center justify-between">
      <div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Season {key.split("-S")[1]} · {key.slice(0, 4)}</div><div className="text-sm font-semibold">Finish the season #1 to keep the Ophanim border.</div></div>
      <div className="text-right"><div className="text-xl font-bold tabular-nums">{days}</div><div className="body text-xs" style={{ color: C.dim }}>days left</div></div>
    </div>
  );
}
