// Dev-only large-state fixture. Imported from a `import.meta.env.DEV` branch so
// production builds drop this module. Marker: PHASE1_BIG_FIXTURE
const LIFTS = 6;
const SETS = 4;
const WORKOUTS = 400;
const MEAL_DAYS = 365;
const CHATS = 300;
const XP_DAYS = 365;

const dayKey = (offset) => {
  const x = new Date();
  x.setDate(x.getDate() - offset);
  return x.toLocaleDateString("en-CA");
};

export function buildBigFixture(base, catalog) {
  const lifts = (catalog || []).filter((e) => e.type === "weighted").slice(0, LIFTS);
  const names = lifts.length ? lifts : [{ name: "Bench Press", type: "weighted" }];
  const workouts = [];
  for (let i = 0; i < WORKOUTS; i++) {
    const date = dayKey(i % 400);
    const exercises = names.map((ex, ei) => ({
      name: ex.name,
      sets: Array.from({ length: SETS }, (_, si) => ({
        w: String(95 + ei * 20 + (i % 15) + si * 5),
        r: String(6 + (si % 4)),
        done: true,
      })),
    }));
    const volume = exercises.reduce((a, ex) => a + ex.sets.reduce((b, st) => b + (+st.w || 0) * (+st.r || 0), 0), 0);
    workouts.push({
      id: `fixw${i}`,
      date,
      title: ["Push", "Pull", "Legs", "Upper"][i % 4],
      preset: "",
      exercises,
      volume,
      xp: 40 + (i % 30),
      minutes: 40 + (i % 25),
      startedAt: Date.now() - i * 86400000,
    });
  }

  const meals = {};
  const foods = [
    { name: "Oats", cal: 150, p: 5, c: 27, f: 3 },
    { name: "Chicken", cal: 230, p: 42, c: 0, f: 5 },
    { name: "Rice", cal: 200, p: 4, c: 45, f: 1 },
  ];
  for (let i = 0; i < MEAL_DAYS; i++) {
    const d = dayKey(i);
    meals[d] = foods.map((f, fi) => ({ ...f, id: `fixm${i}_${fi}`, qty: 1 }));
  }

  const chat = [];
  for (let i = 0; i < CHATS; i++) {
    chat.push({
      role: i % 2 ? "assistant" : "user",
      content: i % 2 ? `Got it. Keep the next session honest — item ${i}.` : `How should I progress lift ${i % names.length}?`,
    });
  }

  const xpLog = {};
  const xpDetail = {};
  for (let i = 0; i < XP_DAYS; i++) {
    const d = dayKey(i);
    const a = 20 + (i % 40);
    xpLog[d] = a;
    xpDetail[d] = [{ m: "Workout complete", a, t: Date.now() - i * 86400000 }];
  }

  return {
    ...base,
    workouts,
    meals,
    chat,
    xpLog: { ...(base.xpLog || {}), ...xpLog },
    xpDetail: { ...(base.xpDetail || {}), ...xpDetail },
    test: true,
    lb: false,
    crew: null,
  };
}
