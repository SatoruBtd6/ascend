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
// Week strip for the Log calendar: the 7 dkeys of the Sun–Sat week containing d.
export const dayOfWeek = (d) => new Date(d + "T12:00").getDay();
export const weekDays = (d) => Array.from({ length: 7 }, (_, i) => shift(shift(d, -dayOfWeek(d)), i));
// "Oct 4 – 10" within one month, "Sep 28 – Oct 4" across months.
export function weekTitle(d) {
  const days = weekDays(d);
  const a = new Date(days[0] + "T12:00"), b = new Date(days[6] + "T12:00");
  const same = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const fmt = (x, withMonth) => x.toLocaleDateString(undefined, withMonth ? { month: "short", day: "numeric" } : { day: "numeric" });
  return `${fmt(a, true)} – ${fmt(b, !same)}`;
}
export const ymOf = (d) => ({ y: +d.slice(0, 4), m: +d.slice(5, 7) - 1 });
// "This month" for the current month, else "September" / "December 2025".
export function monthLabel(y, m, now = new Date()) {
  if (y === now.getFullYear() && m === now.getMonth()) return "This month";
  const name = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long" });
  return y === now.getFullYear() ? name : `${name} ${y}`;
}
// Feed day headers: local calendar day, not a 24-hour window — a post at
// 11:59pm yesterday is "Yesterday" even when "now" is 12:05am today.
export function dayGroup(t, now = Date.now()) {
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = start(new Date(now)) - start(new Date(t));
  return diff <= 0 ? "Today" : diff <= 86400000 ? "Yesterday" : "Earlier";
}
