import { bodySex } from "../math.js";
export const dkey = (dt) => dt.toLocaleDateString("en-CA");
export const today = () => dkey(new Date());
export const shift = (d, n) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return dkey(x); };
export const uid = () => Math.random().toString(36).slice(2, 10);
export const e1rm = (w, r) => (r <= 0 ? 0 : w * (1 + r / 30));
export const fmtDay = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export const sexLabel = (p) => (bodySex(p) === "f" ? "female" : "male");
export const sexLine = (p) => `Body type: ${sexLabel(p)}.`;
export function weekStart() { const x = new Date(); x.setDate(x.getDate() - x.getDay()); return dkey(x); }
export const monthKey = (d = today()) => d.slice(0, 7);
