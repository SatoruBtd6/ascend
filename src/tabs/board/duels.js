import { shift, today } from "../../lib/dates.js";
import { isWorkout } from "../../lib/stats.js";
import { nemesisWins } from "../profile/rivalryStats.js";
import { postFeed, readShared } from "../train/social.js";
export const DUEL_DAYS = 7;
export const DUEL_CONDS = {
  xp: { label: "Most XP", short: "XP", unit: "XP", idx: 0 },
  steps: { label: "Most steps", short: "Steps", unit: "steps", idx: 1 },
  workouts: { label: "Most workouts", short: "Workouts", unit: "workouts", idx: 2 },
};
export const duelCond = (d) => (DUEL_CONDS[d?.cond] ? d.cond : "xp");
// Legacy duels ran the calendar week they were sent in; new ones run 7 days from the day they're accepted
export const duelWindow = (d) => { const start = d?.start || d?.ws; return start ? { start, end: shift(start, DUEL_DAYS - 1) } : null; };
// Last 21 days of [xp, steps, workouts] for the board card. Zeros included, so others can tell the card is current.
export function selfScore(s, cond, start, end) {
  if (cond === "steps") return Object.entries(s.steps || {}).filter(([d]) => d >= start && d <= end).reduce((a, [, v]) => a + Math.round(+v || 0), 0);
  if (cond === "workouts") return (s.workouts || []).filter((w) => w.date >= start && w.date <= end && isWorkout(w)).length;
  return Object.entries(s.xpLog || {}).filter(([d]) => d >= start && d <= end).reduce((a, [, v]) => a + v, 0);
}
// Opponent's score from their board card: { v, final } or null if their card can't tell yet
export function cardScore(card, cond, start, end) {
  if (!card) return null;
  if (card.daily) {
    const idx = DUEL_CONDS[cond].idx;
    const v = Object.entries(card.daily).filter(([d]) => d >= start && d <= end).reduce((a, [, arr]) => a + (+arr?.[idx] || 0), 0);
    return { v, final: Object.keys(card.daily).some((d) => d > end) };
  }
  // Older app versions only publish weekly XP
  if (cond !== "xp") return null;
  if (card.weekOf === start) return { v: card.weekXp || 0, final: false };
  if (card.prevWeek?.key === start) return { v: card.prevWeek.xp || 0, final: true };
  return null;
}
export function duelState(d, s, otherCard) {
  const w = duelWindow(d), cond = duelCond(d), t = today();
  if (!w || d.status !== "on") return { w, cond, phase: d.status === "pending" ? "pending" : "unknown" };
  const mine = selfScore(s, cond, w.start, w.end);
  const th = cardScore(otherCard, cond, w.start, w.end);
  const over = t > w.end;
  const day = Math.min(DUEL_DAYS, Math.max(1, Math.round((new Date(`${t}T12:00`) - new Date(`${w.start}T12:00`)) / 86400000) + 1));
  if (!over) return { w, cond, phase: "live", mine, theirs: th?.v ?? null, day };
  if (!th?.final) return { w, cond, phase: "waiting", mine, theirs: th?.v ?? null };
  const r = mine > th.v ? "w" : th.v > mine ? "l" : "t";
  return { w, cond, phase: "done", mine, theirs: th.v, r };
}
export function rivalRecord(s, id) {
  const rec = { w: 0, l: 0, t: 0 };
  Object.values(s.duelResults || {}).forEach((x) => { if (x.vs === id) rec[x.r] = (rec[x.r] || 0) + 1; });
  return rec;
}
export const isMutualNemesis = (s, card) => !!card && s.nemesis?.id === card.id && card.rivalWith === s.playerId;
export const NEMESIS_REWARDS = [
  { wins: 1, kind: "Badge", name: "Rivalbreaker badge" },
  { wins: 3, kind: "Title", name: "Nemesis Slayer title" },
  { wins: 5, kind: "Aura", name: "Vendetta aura" },
];

// Settles finished duels in the background: records W/L/T in your own save (so the lifetime record survives
// deleted duels), posts Nemesis wins to the feed, and announces newly earned rivalry rewards.
export async function resolveDuels(s, setS, toast) {
  if (!s.playerId) return;
  let duels = [];
  try { duels = (await readShared("duel:")).filter((d) => (d.from === s.playerId || d.to === s.playerId) && d.status === "on" && !(s.duelResults || {})[d.id]); } catch (e) { return; }
  const settled = [];
  for (const d of duels) {
    const w = duelWindow(d);
    if (!w || today() <= w.end) continue;
    const otherId = d.from === s.playerId ? d.to : d.from;
    let card = null;
    try { const r = await window.storage.get(`lb:${otherId}`, true); card = r?.value ? JSON.parse(r.value) : null; } catch (e) { /* not on board */ }
    const st = duelState(d, s, card);
    if (st.phase !== "done") continue;
    settled.push({ id: d.id, r: st.r, vs: otherId, name: d.from === s.playerId ? d.toName : d.fromName, cond: st.cond, nem: !!d.nemesis, mine: st.mine, theirs: st.theirs, end: w.end });
  }
  if (!settled.length) return;
  const before = nemesisWins(s);
  const results = { ...(s.duelResults || {}) };
  settled.forEach((x) => { results[x.id] = x; });
  setS((p) => ({ ...p, duelResults: { ...(p.duelResults || {}), ...Object.fromEntries(settled.map((x) => [x.id, x])) } }));
  settled.filter((x) => x.nem && x.r === "w").forEach((x) => postFeed(s, "duel", `defeated their Nemesis ${x.name} in ${x.cond === "xp" ? "an XP" : x.cond === "steps" ? "a steps" : "a workouts"} duel`, { detail: `${x.mine.toLocaleString()} to ${x.theirs.toLocaleString()} ${DUEL_CONDS[x.cond].unit}` }, `nemwin_${x.id}`));
  const after = nemesisWins({ ...s, duelResults: results });
  const earned = NEMESIS_REWARDS.filter((r) => before < r.wins && after >= r.wins);
  if (earned.length) toast?.(`Nemesis defeated! Unlocked: ${earned.map((r) => r.name).join(", ")}`);
  else if (settled.some((x) => x.r === "w")) toast?.(settled.length === 1 ? `You won your duel against ${settled[0].name}` : "Duel results are in");
}
