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
  const lifts = (catalog || []).filter((e) => e.type === "weighted");
  const machine = lifts.find((e) => /machine|cable/i.test(e.name)) || { name: "Chest Press Machine", type: "weighted" };
  const bar = lifts.find((e) => e.name === "Bench Press") || lifts.find((e) => !/machine|cable/i.test(e.name)) || { name: "Bench Press", type: "weighted" };
  const extra = lifts.filter((e) => e.name !== machine.name && e.name !== bar.name).slice(0, Math.max(0, LIFTS - 2));
  const names = [machine, bar, ...extra];
  const gyms = [{ id: "g1", name: "East" }, { id: "g2", name: "West" }];
  const workouts = [];
  for (let i = 0; i < WORKOUTS; i++) {
    const date = dayKey(i % 400);
    const gym = i % 2 ? "g2" : "g1";
    const exercises = names.map((ex, ei) => ({
      name: ex.name,
      sets: Array.from({ length: SETS }, (_, si) => ({
        w: String(95 + ei * 20 + (i % 15) + si * 5),
        r: String(6 + (si % 4)),
        done: true,
      })),
    }));
    const volume = exercises.reduce((a, ex) => a + ex.sets.reduce((b, st) => b + (+st.w || 0) * (+st.r || 0), 0), 0);
    const setXp = 40 + (i % 30);
    const prBonus = 80;
    workouts.push({
      id: `fixw${i}`,
      date,
      title: ["Push", "Pull", "Legs", "Upper"][i % 4],
      preset: "",
      gym,
      exercises,
      volume,
      xp: setXp + prBonus,
      prBonus,
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
    gyms,
    currentGym: "g1",
    meals,
    chat,
    xpLog: { ...(base.xpLog || {}), ...xpLog },
    xpDetail: { ...(base.xpDetail || {}), ...xpDetail },
    test: true,
    lb: false,
    crew: null,
  };
}
