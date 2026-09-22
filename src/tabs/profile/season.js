import { today } from "../../lib/dates.js";
export const seasonKey = (d = today()) => `${d.slice(0, 4)}-S${Math.floor((parseInt(d.slice(5, 7), 10) - 1) / 3) + 1}`;
export const seasonStart = (key) => { const [y, q] = key.split("-S"); return `${y}-${String((+q - 1) * 3 + 1).padStart(2, "0")}-01`; };
export const nextSeasonStart = (key) => { const [y, q] = key.split("-S").map(Number); return q === 4 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`; };
export const prevSeasonKey = (key) => { const [y, q] = key.split("-S").map(Number); return q === 1 ? `${y - 1}-S4` : `${y}-S${q - 1}`; };
export const seasonXp = (s, key) => { const a = seasonStart(key), b = nextSeasonStart(key); return Object.entries(s.xpLog || {}).filter(([d]) => d >= a && d < b).reduce((t, [, v]) => t + v, 0); };
