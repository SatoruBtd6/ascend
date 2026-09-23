// One weight per day. A replay of the tutorial must not add a second entry for today.
export function logTutorialWeight(weightLog, day, weight) {
  const w = +weight || 170;
  const log = weightLog && typeof weightLog === "object" && !Array.isArray(weightLog) ? weightLog : null;
  if (log && Object.prototype.hasOwnProperty.call(log, day)) {
    if (+log[day] === w) return log;
    return { ...log, [day]: w };
  }
  return { ...(log || {}), [day]: w };
}
