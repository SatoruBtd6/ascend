export const nemesisWins = (s) => Object.values(s.duelResults || {}).filter((x) => x.nem && x.r === "w").length;
