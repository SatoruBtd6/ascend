import { Footprints, Weight, Repeat, CalendarCheck, Flame, Activity, Zap, Dumbbell, Shield, Swords, Star } from "lucide-react";
export const TIER_STYLE = [null,
  { name: "Bronze", color: "#D08A4A", glow: "rgba(208,138,74,.55)", xp: 100 },
  { name: "Silver", color: "#D9E2EE", glow: "rgba(217,226,238,.6)", xp: 250 },
  { name: "Gold", color: "#FFD447", glow: "rgba(255,212,71,.7)", xp: 600 },
  { name: "Platinum", color: "#7CF0FF", glow: "rgba(124,240,255,.75)", xp: 1500 },
  { name: "Mythic", color: "#FF5AD9", glow: "rgba(255,90,217,.85)", xp: 4000 },
];
export const ACH_ICONS = { Footprints, Weight, Repeat, CalendarCheck, Flame, Activity, Zap, Dumbbell, Shield, Swords, Star };
export const ACH_SERIES = [
  { key: "miles", icon: "Footprints", title: "Road Runner", unit: "miles", steps: [10, 50, 100, 250, 1000], get: (st) => st.miles },
  { key: "volume", icon: "Weight", title: "Iron Mover", unit: "lb lifted", steps: [50000, 250000, 1000000, 5000000, 20000000], get: (st) => st.volume },
  { key: "reps", icon: "Repeat", title: "Rep Machine", unit: "total reps", steps: [1000, 5000, 25000, 100000, 500000], get: (st) => st.reps },
  { key: "workouts", icon: "CalendarCheck", title: "Show Up", unit: "workouts", steps: [10, 50, 150, 365, 1000], get: (st) => st.workouts },
  { key: "streak", icon: "Flame", title: "Unbroken", unit: "day streak", steps: [7, 30, 100, 365], get: (st) => st.longestStreak },
  { key: "pushups", icon: "Activity", title: "Push-up King", unit: "push-ups", steps: [500, 2500, 10000, 50000], get: (st) => st.pushups },
  { key: "pullups", icon: "Zap", title: "Bar Hanger", unit: "pull-ups", steps: [100, 1000, 5000, 25000], get: (st) => st.pullups },
  { key: "bench", icon: "Dumbbell", title: "Bench Club", unit: "lb bench (est. max)", steps: [135, 225, 315, 405, 495], get: (st) => st.bench },
  { key: "squat", icon: "Dumbbell", title: "Squat Club", unit: "lb squat (est. max)", steps: [225, 315, 405, 495, 600], get: (st) => st.squat },
  { key: "deadlift", icon: "Dumbbell", title: "Deadlift Club", unit: "lb deadlift (est. max)", steps: [225, 315, 405, 495, 600], get: (st) => st.deadlift },
  { key: "rank", icon: "Shield", title: "Ascension", labels: ["First C-rank lift", "First B-rank lift", "First A-rank lift", "First S-rank lift", "Overall S-rank"], steps: [1, 2, 3, 4, 5], get: (st) => st.rankTier },
  { key: "quests", icon: "Swords", title: "Quest Hunter", unit: "quests cleared", steps: [10, 50, 250, 1000], get: (st) => st.quests },
  { key: "level", icon: "Star", title: "Leveler", unit: "level", steps: [10, 25, 50, 100], get: (st) => st.level },
  { key: "steps", icon: "Footprints", title: "Wanderer", unit: "lifetime steps", steps: [100000, 500000, 1000000, 5000000, 10000000], get: (st) => st.steps || 0 },
  { key: "yogurt", icon: "Star", title: "Yogurt Male", names: ["Yogurt Male"], unit: "yogurts logged", steps: [100], tierOffset: 2, get: (st) => st.yogurt || 0 },
];
export const ROMAN = ["I", "II", "III", "IV", "V"];
