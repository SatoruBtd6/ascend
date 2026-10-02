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

// Monthly prize (phase 7p). One aura per month keyed by "YYYY-MM" — a missing
// month means no prize (no loan, no settle award, no banner). The loan: the
// live #1 on the month board may equip the prize while they hold it; the
// settle's place-1 winner gets the permanent auraUnlocks stamp.
// To ship a new month: add the catalog aura, then add its row here.
export const MONTHLY_PRIZE = {
  "2026-10": "descended",
};

// The first month the mechanic existed — the settle floor. Months that closed
// before it never settle: nobody raced them, and settling them retroactively
// crowned a September winner who never entered a September race (phase 7p).
export const MONTH_PRIZE_START = "2026-10";

export function monthlyPrizeId(key = monthKey()) {
  return MONTHLY_PRIZE[key] || null;
}

// Any aura that has ever been a monthly prize — an unstamped wearer of one of
// these is a stale loan holder, never an owner-by-grace.
export function everMonthlyPrize(id) {
  return !!id && (id === monthlyPrizeId() || Object.values(MONTHLY_PRIZE).includes(id));
}

// Pure: after a reigning re-eval, what should profile.look.aura become? An
// unstamped wearer of a monthly-prize aura holds it on loan — it stays on only
// while it is the current month's prize AND they hold #1; losing #1 (or
// wearing an older prize at rollover) reverts to auraPrev. Stamped owners are
// never touched. Returns null when nothing changes.
export function loanStripAura(look, auraUnlocks, on, mk = monthKey()) {
  const aura = look?.aura;
  if (!aura || aura === "none" || auraUnlocks?.[aura] || !everMonthlyPrize(aura)) return null;
  const cur = monthlyPrizeId(mk), prev = monthlyPrizeId(prevMonthKey(mk));
  if (aura !== cur && aura !== prev) return look.auraPrev && !everMonthlyPrize(look.auraPrev) ? look.auraPrev : "none";
  if (aura === cur && on) return null;
  if (aura === prev && on) return null; // pending settle may still stamp them
  return look.auraPrev && !everMonthlyPrize(look.auraPrev) ? look.auraPrev : "none";
}

// Month settle (phase 7o Part A): mirrors the season settle. Any client that
// loads the board after rollover writes the shared `month:<YYYY-MM>` record
// once — including a no-qualifier record, so an empty month stays closed
// instead of retrying. The podium (top 3) stamp monthBadges; only the #1
// winner's own client stamps auraUnlocks for THAT month's prize —
// per-account ownership, never a shared write. Nothing before
// MONTH_PRIZE_START settles: those months closed before the mechanic existed.
export async function settleMonth(s, setS, rows, storage = window.storage, mk = monthKey()) {
  const last = prevMonthKey(mk);
  if (last < MONTH_PRIZE_START) return;
  let rec = null;
  try { const r = await storage.get(`month:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    rec = { key: last, winners: pickMonthWinners(rows, last), t: Date.now() };
    try { await storage.set(`month:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const prize = monthlyPrizeId(last);
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine) setS((p) => ({
    ...p,
    auraUnlocks: mine.place === 1 && prize ? { ...(p.auraUnlocks || {}), [prize]: p.auraUnlocks?.[prize] || today() } : p.auraUnlocks,
    monthBadges: { ...(p.monthBadges || {}), [last]: { place: mine.place, xp: mine.xp } },
  }));
}
