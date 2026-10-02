// Cardio machine second metrics + seeded pace ladders.
// pace = <unit> per minute. Seed rungs are population-norm guesses spanning a
// beginner-to-strong range; a user's ladder blends toward their own logged
// paces over their first 5 sessions on that machine (stats.js cardioSteps).
// Adding a machine = one row here; the input label, scoring, and ladder all
// follow automatically. Machines absent from this map stay time-only.
export const CARDIO_METRIC = {
  "Running":        { unit: "mi", label: "Miles",  seed: [0.075, 0.092, 0.108, 0.125, 0.142] }, // 4.5–8.5 mph
  "Walking":        { unit: "mi", label: "Miles",  seed: [0.042, 0.050, 0.058, 0.067, 0.075] }, // 2.5–4.5 mph
  "Incline Walk":   { unit: "mi", label: "Miles",  seed: [0.033, 0.042, 0.050, 0.058, 0.067] }, // 2–4 mph under load
  "Cycling":        { unit: "mi", label: "Miles",  seed: [0.183, 0.233, 0.283, 0.333, 0.400] }, // 11–24 mph
  "Elliptical":     { unit: "mi", label: "Miles",  seed: [0.058, 0.075, 0.092, 0.108, 0.125] }, // machine miles, 3.5–7.5 mph-equiv
  "Stairmaster":    { unit: "fl", label: "Floors", seed: [2, 3, 4, 5.5, 7] },
  "Rowing Machine": { unit: "m",  label: "Meters", seed: [140, 175, 210, 250, 290] },
  "Swimming":       { unit: "m",  label: "Meters", seed: [14, 20, 27, 34, 42] },
  // Jump Rope and Battle Ropes deliberately stay time-only: their per-minute
  // rate is already the group's highest, and a distance field there only
  // invited flat-rate farming.
};
// Workouts finished under the pace model are stamped cv:2. Older rows keep the
// flat miles formula forever — recounts and edits never re-score them.
export const CARDIO_VERSION = 2;
export const cardioMeta = (def) => (def?.type === "timed" && def?.group === "Cardio" ? CARDIO_METRIC[def.name] || null : null);
