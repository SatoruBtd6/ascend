export const WEEKLY_POOL = [
  { id: "w-train4", title: "Train 4 times this week", target: 4, unit: "workouts", xp: 300, get: (st) => st.workouts, fixed: true },
  { id: "w-vol", title: "Move 25,000 lb this week", target: 25000, unit: "lb", xp: 350, get: (st) => st.volume },
  { id: "w-quests", title: "Clear 12 daily quests", target: 12, unit: "quests", xp: 300, get: (st) => st.quests },
  { id: "w-fuel", title: "Hit your fuel goal 4 days", target: 4, unit: "days", xp: 350, get: (st) => st.fuel },
  { id: "w-groups", title: "Train 5 different muscle groups", target: 5, unit: "groups", xp: 300, get: (st) => st.groups },
  { id: "w-prs", title: "Set 3 new PRs", target: 3, unit: "PRs", xp: 400, get: (st) => st.prs },
  { id: "w-miles", title: "Cover 8 miles of cardio", target: 8, unit: "mi", xp: 350, get: (st) => st.miles },
  { id: "w-streak", title: "Train 3 days in a row", target: 3, unit: "days", xp: 300, get: (st) => st.streak },
];
export const MONTHLY_POOL = [
  { id: "m-train16", title: "16 workouts this month", target: 16, unit: "workouts", xp: 1500, get: (st) => st.workouts, fixed: true },
  { id: "m-vol", title: "Move 150,000 lb this month", target: 150000, unit: "lb", xp: 2000, get: (st) => st.volume },
  { id: "m-quests", title: "Clear 50 daily quests", target: 50, unit: "quests", xp: 1500, get: (st) => st.quests },
  { id: "m-fuel", title: "Hit your fuel goal 15 days", target: 15, unit: "days", xp: 2000, get: (st) => st.fuel },
  { id: "m-prs", title: "Set 10 new PRs", target: 10, unit: "PRs", xp: 2500, get: (st) => st.prs },
  { id: "m-miles", title: "Cover 30 miles of cardio", target: 30, unit: "mi", xp: 1800, get: (st) => st.miles },
  { id: "m-weigh", title: "Log your weight 12 days", target: 12, unit: "days", xp: 1000, get: (st) => st.weights },
  { id: "m-streak", title: "Train 7 days in a row", target: 7, unit: "days", xp: 2200, get: (st) => st.streak },
];
// Rep challenges ride along as a 4th card every week and month. Card flips count toward them.
export const WEEKLY_REPS = { id: "w-reps", title: "Do 600 reps this week", target: 600, unit: "reps", xp: 350, get: (st) => st.reps };
export const MONTHLY_REPS = { id: "m-reps", title: "Do 2,500 reps this month", target: 2500, unit: "reps", xp: 1800, get: (st) => st.reps };
