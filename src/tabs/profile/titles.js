import { allAchievements, overallInfo } from "../../lib/stats.js";
import { nemesisWins } from "./rivalryStats.js";
import { prevSeasonKey } from "./season.js";
export const TITLE_NONE = { id: "none", name: "" };
export const TITLES = [
  { id: "showup", name: "Regular", req: (s) => !!s.ach?.["workouts-0"], how: "Show Up I" },
  { id: "roadrunner", name: "Road Runner", req: (s) => !!s.ach?.["miles-1"], how: "Road Runner II" },
  { id: "cardio", name: "Cardio Menace", req: (s) => !!s.ach?.["miles-2"], how: "Road Runner III" },
  { id: "iron", name: "Iron Mover", req: (s) => !!s.ach?.["volume-1"], how: "Iron Mover II" },
  { id: "rep", name: "Rep Machine", req: (s) => !!s.ach?.["reps-1"], how: "Rep Machine II" },
  { id: "unbroken", name: "Unbroken", req: (s) => !!s.ach?.["streak-1"], how: "Unbroken II (30-day streak)" },
  { id: "barhanger", name: "Bar Hanger", req: (s) => !!s.ach?.["pullups-1"], how: "Bar Hanger II" },
  { id: "plates", name: "Two Plates", req: (s) => !!s.ach?.["bench-1"], how: "Bench Club II (225)" },
  { id: "squatlord", name: "Squat Lord", req: (s) => !!s.ach?.["squat-2"], how: "Squat Club III (405)" },
  { id: "deadking", name: "Deadlift King", req: (s) => !!s.ach?.["deadlift-2"], how: "Deadlift Club III (405)" },
  { id: "quester", name: "Quest Hunter", req: (s) => !!s.ach?.["quests-1"], how: "Quest Hunter II" },
  { id: "ascended", name: "Ascended", req: (s) => !!s.ach?.["rank-2"], how: "First A-rank lift" },
  { id: "mythic", name: "Mythic", req: (s) => Object.keys(s.ach || {}).some((id) => allAchievements().find((a) => a.id === id)?.tier === 5), how: "Any Mythic achievement" },
  { id: "elite", name: "Elite", req: (s) => overallInfo(s).score >= 5, how: "Reach S overall" },
  { id: "gymgod", name: "Gym God", req: (s) => overallInfo(s).score >= 6, how: "????" },
  { id: "boss_wyrm", name: "Wyrmslayer", req: (s) => (s.loot?.bosses || []).includes("wyrm"), how: "Defeat The Iron Wyrm" },
  { id: "boss_colossus", name: "Icebreaker", req: (s) => (s.loot?.bosses || []).includes("colossus"), how: "Defeat Frost Colossus" },
  { id: "boss_gravemaw", name: "Gravebane", req: (s) => (s.loot?.bosses || []).includes("gravemaw"), how: "Defeat Gravemaw" },
  { id: "boss_chud", name: "Chud King", req: (s) => (s.loot?.bosses || []).includes("chud"), how: "Defeat The Chud King" },
  { id: "boss_rust", name: "Titanbreaker", req: (s) => (s.loot?.bosses || []).includes("rust"), how: "Defeat The Rust Titan" },
  { id: "boss_harpy", name: "Stormbound", req: (s) => (s.loot?.bosses || []).includes("harpy"), how: "Defeat Stormcaller Harpy" },
  { id: "boss_warden", name: "Wardenbane", req: (s) => (s.loot?.bosses || []).includes("warden"), how: "Defeat The Hollow Warden" },
  { id: "boss_leviathan", name: "Tidebreaker", req: (s) => (s.loot?.bosses || []).includes("leviathan"), how: "Defeat Leviathan of the Deep" },
  { id: "boss_behemoth", name: "Magmaforged", req: (s) => (s.loot?.bosses || []).includes("behemoth"), how: "Defeat Molten Behemoth" },
  { id: "boss_ratlord", name: "Ratcatcher", req: (s) => (s.loot?.bosses || []).includes("ratlord"), how: "Defeat The Plague Rat Lord" },
  { id: "boss_pharaoh", name: "Sunbreaker", req: (s) => (s.loot?.bosses || []).includes("pharaoh"), how: "Defeat Sandstorm Pharaoh" },
  { id: "boss_void", name: "Voidwalker", req: (s) => (s.loot?.bosses || []).includes("void"), how: "Defeat The Void Sovereign" },
  { id: "yogurtmale", name: "Yogurt Male", req: (s) => !!s.ach?.["yogurt-0"], how: "Log 100 yogurts" },
  { id: "chud", name: "OG", req: (s) => !!s.crateUnlocks?.chud, how: "Aura Spin · common", crate: true },
  { id: "crate_rookie", name: "Rookie", req: (s) => !!s.crateUnlocks?.crate_rookie, how: "Aura Spin · common", crate: true },
  { id: "crate_grinder", name: "Grinder", req: (s) => !!s.crateUnlocks?.crate_grinder, how: "Aura Spin · common", crate: true },
  { id: "crate_no_days_off", name: "No Days Off", req: (s) => !!s.crateUnlocks?.crate_no_days_off, how: "Aura Spin · common", crate: true },
  { id: "crate_certified", name: "Certified", req: (s) => !!s.crateUnlocks?.crate_certified, how: "Aura Spin · common", crate: true },
  { id: "crate_ascended", name: "Ascended", req: (s) => !!s.crateUnlocks?.crate_ascended, how: "Aura Spin · uncommon", crate: true },
  { id: "crate_built_different", name: "Built Different", req: (s) => !!s.crateUnlocks?.crate_built_different, how: "Aura Spin · uncommon", crate: true },
  { id: "champion", name: "Season Champion", req: (s) => Object.values(s.seasonBadges || {}).some((b) => b.place === 1), how: "Finish a season in 1st" },
  { id: "contender", name: "Contender", req: (s) => Object.keys(s.seasonBadges || {}).length > 0, how: "Finish a season in the top 3" },
  { id: "reigning", name: "Reigning", req: (s) => !!s.lbReigning, how: "Hold #1 on the season board" },
  { id: "nemesis_slayer", name: "Nemesis Slayer", req: (s) => nemesisWins(s) >= 3, how: "Beat your Nemesis in 3 duels" },
  { id: "world_first", name: "World First", req: (s) => Object.keys(s.worldFirsts || {}).length > 0, how: "Land the killing blow on a global boss" },
  { id: "seraph_title", name: "Seraph", req: (s) => backToBackSeasonFirsts(s), how: "Finish #1 two seasons in a row" },
];
// Two seasons back to back at the top of the board
export function backToBackSeasonFirsts(s) {
  const b = s.seasonBadges || {};
  return Object.entries(b).some(([k, v]) => v?.place === 1 && b[prevSeasonKey(k)]?.place === 1);
}
export const TITLE_LEGACY = { wyrmslayer: "boss_wyrm", icebreaker: "boss_colossus", gravebane: "boss_gravemaw", rookie: "none" };
export function titleIdOf(s) {
  return TITLE_LEGACY[s.profile?.title] || s.profile?.title || "none";
}
export function equippedTitle(s) {
  const want = TITLES.find((t) => t.id === titleIdOf(s));
  if (want && !want.soon && titleEarned(want, s)) return want;
  return TITLE_NONE;
}
export function titleEarned(t, s) {
  return !!t && (s.test || t.req(s));
}

/* ---------- Progression + coaching helpers ---------- */
