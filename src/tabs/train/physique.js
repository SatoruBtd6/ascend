import { bodySex } from "../../math.js";
export const TIER_IDS = ["E", "D", "C", "B", "A", "S", "SS"];
export const MUSCLE_SLUG = { Chest: "chest", Back: "back", Legs: "legs", Shoulders: "shoulders", Arms: "arms", Core: "core" };
export const physiqueSrc = (sex, tier) => {
  const id = TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))];
  return `/avatars/${id}${bodySex({ sex }) === "f" ? "-f" : ""}.webp`;
};
export const muscleSrc = (sex, group, tier) => `/muscles/${bodySex({ sex }) === "f" ? "female/" : ""}${MUSCLE_SLUG[group] || "chest"}_${TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))]}.webp`;
