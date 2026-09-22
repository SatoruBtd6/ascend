import { bodySex } from "../../math.js";
export const TIER_IDS = ["E", "D", "C", "B", "A", "S", "SS"];
export const MUSCLE_SLUG = { Chest: "chest", Back: "back", Legs: "legs", Shoulders: "shoulders", Arms: "arms", Core: "core" };
export const physiqueSrc = (sex, tier) => {
  const id = TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))];
  return `/avatars/${id}${bodySex({ sex }) === "f" ? "-f" : ""}.webp`;
};
export const muscleSrc = (sex, group, tier) => `/muscles/${bodySex({ sex }) === "f" ? "female/" : ""}${MUSCLE_SLUG[group] || "chest"}_${TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))]}.webp`;
export function PhysiquePlaceholder({ female, height, color }) {
  const w = Math.round(height * 0.42);
  return (
    <svg width={w} height={height} viewBox="0 0 80 200" aria-hidden="true" style={{ position: "relative" }}>
      <ellipse cx="40" cy="22" rx="14" ry="16" fill={color} opacity=".85" />
      <path d={female ? "M26 42 Q40 48 54 42 L58 88 Q40 96 22 88 Z" : "M24 42 Q40 46 56 42 L62 90 Q40 98 18 90 Z"} fill={color} opacity=".8" />
      <path d={female ? "M22 86 Q40 100 58 86 L62 188 L50 188 L46 118 L34 118 L30 188 L18 188 Z" : "M18 88 Q40 98 62 88 L66 188 L52 188 L48 118 L32 118 L28 188 L14 188 Z"} fill={color} opacity=".7" />
    </svg>
  );
}
