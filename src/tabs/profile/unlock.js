import { auraById } from "../../auras/catalog.js";
import { shift } from "../../lib/dates.js";
import { activeDays, groupScores } from "../../lib/stats.js";
import { stripGhostCosmeticsState, countRaidClears } from "../../math.js";
import { nemesisWins } from "./rivalryStats.js";
import { backToBackSeasonFirsts, equippedTitle } from "./titles.js";
export const BORDERS = [
  { id: "none", name: "Default", how: "" },
  { id: "steel", name: "Steel", how: "Any lift at D", tier: 1, css: "linear-gradient(135deg,#dfe6ee,#6f7c8c,#dfe6ee)" },
  { id: "gold", name: "Gold", how: "Any lift at B", tier: 3, css: "linear-gradient(135deg,#fff1b8,#c9962e,#fff1b8)" },
  { id: "prism", name: "Prism", how: "Any lift at A", tier: 4, css: "conic-gradient(#ff3cac,#ffb43c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)", spin: true },
  { id: "obsidian", name: "Obsidian", how: "Any lift at S", tier: 5, css: "conic-gradient(#000,#FFD447,#000,#FFD447,#000)", spin: true },
  { id: "bone", name: "Bone crown", how: "Defeat any boss", loot: "any", css: "linear-gradient(135deg,#f4ead2,#8a7a5c,#f4ead2)" },
  { id: "laurel", name: "Laurel", how: "Top 3 in a season", season: true, css: "linear-gradient(135deg,#caffb0,#2f8f3a,#caffb0)" },
  { id: "seraph", name: "Ophanim", how: "Finish a season as global #1", seasonFirst: true, img: "/season-one.svg", spin: true },
  { id: "relic", name: "Pulse", how: "Aura Spin · rare", crate: true, effect: "pulse", css: "linear-gradient(135deg,#7DF9FF,#38C6FF)" },
  { id: "orbit", name: "Orbit", how: "Aura Spin · rare", crate: true, effect: "orbit", css: "conic-gradient(#38C6FF,transparent,#FFD447,transparent,#38C6FF)" },
  { id: "chase", name: "Chase", how: "Aura Spin · rare", crate: true, effect: "chase", css: "conic-gradient(from 0deg,transparent 0 70%,#fff 88%,#38C6FF 100%)" },
  { id: "fracture", name: "Fracture", how: "Aura Spin · rare", crate: true, effect: "fracture", css: "repeating-conic-gradient(#ec4899 0 24deg,transparent 24deg 45deg)" },
  { id: "crate_tide", name: "Tide", how: "Aura Spin · rare", crate: true, effect: "tide", css: "conic-gradient(#38C6FF,#a855f7,#38C6FF)" },
];
export const bestTier = (s) => Math.floor(Object.values(groupScores(s)).reduce((a, b) => Math.max(a, b), 0));
export const longestRun = (days) => { let best = 0, run = 0, prev = null; [...days].sort().forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }); return best; };
// Feat auras: each has a check and a progress readout. Once met, the unlock is saved to s.auraUnlocks for good.
export const AURA_TASKS = {
  streak30: (s) => { const v = longestRun(activeDays(s)); return { done: v >= 30, v: Math.min(v, 30), goal: 30, label: `Best streak ${Math.min(v, 30)} / 30 days` }; },
  weatherRun: (s) => { const hit = (s.workouts || []).some((w) => w.run?.wx && (w.run.wx.wet || w.run.wx.t <= 40)); return { done: hit, v: hit ? 1 : 0, goal: 1, label: hit ? "Braved the weather" : "Runs record the weather where you start" }; },
  dawn: (s) => { const hit = (s.workouts || []).some((w) => { if (!w.startedAt) return false; const h = new Date(w.startedAt).getHours(); return h >= 4 && h < 6; }); return { done: hit, v: hit ? 1 : 0, goal: 1, label: hit ? "Up before the sun" : "Counts from when you tap Start" }; },
  steps7: (s) => { const v = longestRun(Object.keys(s.steps || {}).filter((d) => (+s.steps[d] || 0) >= 10000)); return { done: v >= 7, v: Math.min(v, 7), goal: 7, label: `Best run ${Math.min(v, 7)} / 7 days at 10k` }; },
  raids10: (s) => { const v = countRaidClears(s); return { done: v >= 10, v: Math.min(v, 10), goal: 10, label: `Crew raids cleared ${Math.min(v, 10)} / 10` }; },
};
export function unlocked(item, s) {
  if (item.id === "none") return true;
  if (s.test) return true;
  if (item.crate && s.crateUnlocks?.[item.id]) return true;
  if (item.soon) return false;
  if (item.reigning) return !!s.lbReigning;
  if (item.worldFirst) return Object.keys(s.worldFirsts || {}).length > 0;
  if (item.seraph) return backToBackSeasonFirsts(s);
  if (item.seasonFirst) return Object.values(s.seasonBadges || {}).some((b) => b.place === 1);
  if (item.task) return !!s.auraUnlocks?.[item.id] || AURA_TASKS[item.task](s).done;
  if (item.nemesis) return nemesisWins(s) >= item.nemesis;
  if (item.tier !== undefined) return bestTier(s) >= item.tier;
  if (item.loot) return item.loot === "any" ? (s.loot?.bosses || []).length > 0 : (s.loot?.bosses || []).includes(item.loot);
  if (item.ach) return !!s.ach?.[item.ach];
  if (item.season) return item.id === "champion" ? Object.values(s.seasonBadges || {}).some((b) => b.place === 1) : Object.keys(s.seasonBadges || {}).length > 0;
  return false;
}
export function stripGhostCosmetics(s) {
  const real = { ...s, test: false };
  const auraOk = (id) => {
    const a = auraById(id);
    return !id || id === "none" || (a && unlocked(a, real));
  };
  const borderOk = (id) => {
    const b = BORDERS.find((x) => x.id === id);
    return !id || id === "none" || (b && unlocked(b, real));
  };
  const title = equippedTitle(real);
  return stripGhostCosmeticsState(s, { allowAura: auraOk, allowBorder: borderOk, titleId: title?.id || "none" });
}


/* ---------- Anime Crate ---------- */
