import { today } from "../../lib/dates.js";
import { STEP_GOAL_XP } from "../train/xpConstants.js";

// Step-goal XP award — the single place this is granted. Lives in a plain .js
// module so tests can exercise it; Dashboard calls it from an effect so it
// fires whether the steps section is open, closed, or toggled.
export function awardStepGoal(s, setS, gainXp) {
  const d = today();
  const goal = s.settings?.stepGoal || 10000;
  if ((s.steps?.[d] || 0) < goal || s.stepXp?.[d]) return false;
  setS((p) => ({ ...p, stepXp: { ...(p.stepXp || {}), [d]: true } }));
  gainXp(STEP_GOAL_XP, "Step goal", `steps_${d}`);
  return true;
}
