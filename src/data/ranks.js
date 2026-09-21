/* ---------- Game data ---------- */
export const RANKS = [
  { id: "E", color: "#9AA7BD", alt: "#DDE6F2", glow: "rgba(154,167,189,.4)" },
  { id: "D", color: "#3DF08A", alt: "#B6FFD9", glow: "rgba(61,240,138,.55)" },
  { id: "C", color: "#38C6FF", alt: "#B3ECFF", glow: "rgba(56,198,255,.6)" },
  { id: "B", color: "#B14BFF", alt: "#E6BFFF", glow: "rgba(177,75,255,.65)" },
  { id: "A", color: "#FF2D6F", alt: "#FF9A3D", glow: "rgba(255,45,111,.7)" },
  { id: "S", color: "#FFD447", alt: "#FFFFFF", glow: "rgba(255,212,71,.85)" },
  { id: "SS", color: "#F4FBFF", alt: "#7DF9FF", glow: "rgba(200,240,255,.95)" },
];
export const DIVS = ["III", "II", "I"];
export const RANK_INFO = {
  E: ["Awakening", "Just getting started. Everyone begins here."],
  D: ["Beginner", "The habit is forming and form is dialed in."],
  C: ["Regular", "Consistent lifter with a real foundation."],
  B: ["Strong", "Clearly trained. Stronger than most people in any gym."],
  A: ["Advanced", "Years of serious, disciplined training."],
  S: ["Elite", "Genuinely strong for your frame. Very few ever get here."],
  SS: ["Gym God", "Beyond elite. Nobody is supposed to get here."],
};
// Minimum strength factor per group so custom lifts (especially machines) can't be rated too easy
export const FACTOR_FLOOR = { Chest: 0.35, Back: 0.4, Legs: 0.5, Shoulders: 0.25, Arms: 0.3, Core: 1.3 };
// How much each muscle group counts toward overall rank; groups you haven't trained count as zero
export const GROUP_WEIGHT = { Legs: 3, Back: 3, Chest: 3, Shoulders: 2, Arms: 1, Core: 1 };

export const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
