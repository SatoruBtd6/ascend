import { recountPrBonuses, gymSpecificNamesIn, retaggedWorkouts, nextXpFloor, unionAchievements, RAID_XP } from "../../math.js";
import { findEx } from "../../lib/exercises.js";
import { today, shift, dkey } from "../../lib/dates.js";
import { earnedAchievements, allAchievements } from "../../lib/stats.js";
import { FUEL_XP } from "../../data/quests.js";
import { WEEKLY_POOL, MONTHLY_POOL, WEEKLY_REPS, MONTHLY_REPS } from "../../data/challenges.js";
import { runXpLabel } from "../../run.js";
import { WATER_XP, STEP_GOAL_XP, MOG_XP, DUEL_XP } from "./xpConstants.js";
import { BOSS_XP, bossFor, monthEnd, minDay, revertBossExploit } from "./bosses.js";
import { withSilentRankSnap } from "./helpers.js";
import { XpSync } from "../../lib/xpSync.js";
export function xpFromRecords(s) {
  const rows = [];
  const add = (e, a, m, d, find = false) => { a = Math.round(+a || 0); if (a && d) rows.push({ e, a, m, d, find }); };
  const t = today();
  (s.workouts || []).forEach((w) => add(`wo_${w.id}`, w.xp, w.run ? runXpLabel(w.run) : w.source === "deck" ? "Card deck" : `Workout${w.title ? `: ${w.title}` : ""}`, w.date));
  Object.entries(s.xpDone || {}).forEach(([e, v]) => {
    if (!v || !e.startsWith("raid_")) return;
    const parts = e.split("_");
    const start = +parts[parts.length - 1];
    add(e, RAID_XP, "Raid night clear", Number.isFinite(start) && start > 0 ? dkey(new Date(start)) : t);
  });
  Object.entries(s.days || {}).forEach(([d, day]) => {
    (day?.list || []).forEach((q) => { if (q.claimed) add(`quest_${d}_${q.id}`, q.xp, `Quest: ${q.title}`, d); });
    const top = Math.max(0, ...(day?.list || []).map((q) => q.tier || 0));
    for (let i = 0; i < (day?.bonuses || 0); i++) add(`bonus_${d}_${i}`, 100 * top, "Set cleared", d);
  });
  Object.entries(s.fuelClaimed || {}).forEach(([d, v]) => v && add(`fuel_${d}`, FUEL_XP, "Fuel goal hit", d));
  Object.entries(s.water || {}).forEach(([d, v]) => v?.xp && add(`water_${d}`, WATER_XP, "Water goal", d));
  Object.entries(s.stepXp || {}).forEach(([d, v]) => v && add(`steps_${d}`, STEP_GOAL_XP, "Step goal", d));
  Object.entries(s.weekly || {}).forEach(([ws, v]) => {
    const got = v === true ? { "w-train4": true } : v || {};
    Object.keys(got).filter((id) => got[id]).forEach((id) => { const c = [...WEEKLY_POOL, WEEKLY_REPS].find((x) => x.id === id); if (c) add(`wk_${ws}_${id}`, c.xp, `Weekly: ${c.title}`, minDay(shift(ws, 6), t), true); });
  });
  Object.entries(s.monthly || {}).forEach(([mk, v]) => Object.keys(v || {}).filter((id) => v[id]).forEach((id) => { const c = [...MONTHLY_POOL, MONTHLY_REPS].find((x) => x.id === id); if (c) add(`mo_${mk}_${id}`, c.xp, `Monthly: ${c.title}`, minDay(monthEnd(mk), t), true); }));
  const achs = Object.fromEntries(allAchievements().map((a) => [a.id, a]));
  Object.entries(s.ach || {}).forEach(([id, d]) => { const a = achs[id]; if (a) add(`ach_${id}`, a.xp, `Achievement: ${a.title}`, typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : t, typeof d !== "string"); });
  Object.keys(s.loot?.claimed || {}).forEach((k) => { const mk = k.slice(0, 7); const b = bossFor(mk, k.endsWith("_crew") ? "crew" : "global"); add(`boss_${k}`, BOSS_XP, `Defeated ${b.name}`, minDay(monthEnd(mk), t), true); });
  Object.entries(s.mogClaimed || {}).forEach(([id, v]) => v && add(`mog_${id}`, MOG_XP, "Mog-off win", t, true));
  Object.entries(s.duelClaimed || {}).forEach(([id, v]) => v && add(`duel_${id}`, DUEL_XP, "Duel win", t, true));
  if (s.xpFloor?.amount) add(`floor_v${s.xpFloor.v || XP_VERSION}`, s.xpFloor.amount, "Level floor", s.xpFloor.d || t);
  // Borrow real timestamps (and real days for undated awards) from the old per-day detail log where they match
  const pool = Object.entries(s.xpDetail || {}).flatMap(([d, list]) => (list || []).map((x) => ({ ...x, d, used: false })));
  const byDay = {};
  pool.forEach((x) => { (byDay[x.d] = byDay[x.d] || []).push(x); });
  rows.forEach((r) => {
    const hit = r.find ? pool.find((x) => !x.used && x.m === r.m && x.a === r.a) : (byDay[r.d] || []).find((x) => !x.used && x.a === r.a && (x.m === r.m || (r.e.startsWith("wo_") && /^(Workout|Card deck|[\d.]+ mi)/.test(x.m))));
    if (hit) { hit.used = true; r.t = hit.t; if (r.find) r.d = hit.d; }
    if (!r.t) r.t = new Date(`${r.d}T12:00:00`).getTime();
  });
  return rows.sort((a, b) => a.t - b.t);
}
export const XP_VERSION = 3;
export function grantAchievementsKeep(s) {
  const earned = earnedAchievements(s).map((a) => a.id);
  const ach = unionAchievements(s.ach, earned, today());
  return ach === s.ach ? s : { ...s, ach };
}
export function applyPrXpRecount(s, { names = null, banner = true } = {}) {
  return recountXp(recountPrBonuses(s, findEx, names ? { names } : {}), { banner });
}
export function commitGymRetag(prev, tagged, banner = false) {
  const names = gymSpecificNamesIn(tagged, retaggedWorkouts(prev, tagged), findEx);
  if (!names.length) return withSilentRankSnap(tagged);
  const r = applyPrXpRecount(tagged, { names, banner });
  try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
  return withSilentRankSnap(r.s);
}
export function recountXp(s, { banner = true } = {}) {
  const before = s.xp || 0;
  const { s: fixed, reverted } = revertBossExploit(s);
  const keepFloor = fixed.xpFloor;
  let st = { ...fixed, xpFloor: null };
  for (let i = 0; i < 4; i++) {
    const recomputed = Math.max(0, xpFromRecords({ ...st, xpFloor: null }).reduce((a, r) => a + r.a, 0));
    const floor = nextXpFloor(recomputed, { xpFloor: keepFloor, beforeXp: before, version: XP_VERSION, day: keepFloor?.d || today() });
    const next = grantAchievementsKeep({ ...st, xp: recomputed + floor.amount, xpFloor: floor });
    const same = Object.keys(next.ach || {}).length === Object.keys(st.ach || {}).length;
    st = next;
    if (same) break;
  }
  const rows = xpFromRecords(st);
  const xpLog = {}, xpDetail = {};
  rows.forEach((r) => { xpLog[r.d] = (xpLog[r.d] || 0) + r.a; (xpDetail[r.d] = xpDetail[r.d] || []).push({ m: r.m, a: r.a, t: r.t }); });
  Object.keys(xpDetail).forEach((d) => { xpDetail[d] = xpDetail[d].slice(-120); });
  const after = Math.max(0, rows.reduce((a, r) => a + r.a, 0));
  const xpDone = { ...(st.xpDone || {}) };
  rows.forEach((r) => { xpDone[r.e] = 1; });
  const floorAmt = st.xpFloor?.amount || 0;
  const xpRecount = banner
    ? { at: Date.now(), before, after, floor: floorAmt, gravemaw: reverted ? BOSS_XP : 0, seen: false }
    : (s.xpRecount || { at: Date.now(), before, after, floor: floorAmt, gravemaw: reverted ? BOSS_XP : 0, seen: true });
  const next = { ...st, xp: after, xpLog, xpDetail, xpDone, xpV: XP_VERSION, xpRecount };
  return { s: next, rows };
}
