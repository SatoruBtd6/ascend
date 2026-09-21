export const QUEST_POOL = [
  { qid: "pushups", title: "push-ups", target: 100, unit: "reps", xp: 60 },
  { qid: "squats", title: "air squats", target: 100, unit: "reps", xp: 60 },
  { qid: "situps", title: "sit-ups", target: 100, unit: "reps", xp: 60 },
  { qid: "run", title: "Run or walk", target: 3, unit: "mi", xp: 80 },
  { qid: "water", title: "Drink water", target: 16, unit: "cups", xp: 40 },
  { qid: "plank", title: "Plank (total)", target: 5, unit: "min", xp: 50 },
  { qid: "pullups", title: "pull-ups", target: 30, unit: "reps", xp: 70 },
  { qid: "steps", title: "Walk", target: 10000, unit: "steps", xp: 50 },
  { qid: "stretch", title: "Stretch", target: 15, unit: "min", xp: 30 },
  { qid: "lunges", title: "walking lunges", target: 60, unit: "reps", xp: 55 },
  { qid: "burpees", title: "burpees", target: 40, unit: "reps", xp: 70 },
  { qid: "jumprope", title: "Jump rope", target: 10, unit: "min", xp: 60 },
  { qid: "dips", title: "dips", target: 40, unit: "reps", xp: 60 },
  { qid: "hang", title: "Dead hang (total)", target: 3, unit: "min", xp: 45 },
];
export const DAILY_REROLLS = 3;
// Which quests are the same as a logged exercise (quest progress and workout sets feed each other)
export const QUEST_EX = { pushups: "Push-up", squats: "Air Squat", situps: "Sit-up", pullups: "Pull-up", plank: "Plank", lunges: "Walking Lunge", burpees: "Burpee", jumprope: "Jump Rope", dips: "Dip", hang: "Dead Hang" };
export const questStep = (q) => (q.target >= 1000 ? 1000 : q.target >= 50 ? 10 : q.unit === "min" ? 1 : 5);
export const FUEL_XP = 75;
