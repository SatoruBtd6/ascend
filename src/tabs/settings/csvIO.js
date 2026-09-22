import { dkey, today, uid } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { computeBests, workoutXp } from "../../lib/stats.js";
import { collectPrHistory } from "../../math.js";
import { recountXp } from "../train/xpRecount.js";
import { XpSync } from "../../lib/xpSync.js";
export function downloadText(name, text) {
  const blob = new Blob([text], { type: "text/csv" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export function exportWorkouts(s) {
  const rows = [["date", "title", "exercise", "set", "weight", "reps", "workout_xp"]];
  s.workouts.forEach((w) => w.exercises.forEach((ex) => ex.sets.forEach((st, i) => rows.push([w.date, w.title || "", ex.name, i + 1, st.w ?? "", st.r ?? "", w.xp ?? ""]))));
  downloadText("ascend-workouts.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}
export function exportFood(s) {
  const rows = [["date", "food", "servings", "calories", "protein", "carbs", "fat"]];
  Object.keys(s.meals || {}).sort().forEach((d) => (s.meals[d] || []).forEach((m) => rows.push([d, m.name, m.qty, Math.round(m.cal * m.qty), Math.round(m.p * m.qty), Math.round(m.c * m.qty), Math.round(m.f * m.qty)])));
  downloadText("ascend-food.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  const src = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); if (row.some((x) => String(x).trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some((x) => String(x).trim())) rows.push(row); }
  return rows;
}
export function parseImportDate(v) {
  const t = String(v || "").trim();
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const y = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${y}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const d = new Date(t);
  return Number.isNaN(+d) ? today() : dkey(d);
}
export function hdrKey(h) { return String(h || "").trim().toLowerCase().replace(/[\s_]+/g, " "); }
export function importWorkoutsFromCsv(s, text) {
  const table = parseCsv(text);
  if (table.length < 2) return { ok: false, err: "That file has no rows." };
  const head = table[0].map(hdrKey);
  const col = (...names) => {
    for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const iDate = col("date", "start time", "start_time", "workout date", "time");
  const iTitle = col("title", "workout name", "workout", "name");
  const iEx = col("exercise", "exercise name", "exercise title", "exercise_title");
  const iW = col("weight", "weight kg", "weight_kg", "kg", "lbs", "lb");
  const iR = col("reps", "rep", "repetitions");
  const iSet = col("set", "set order", "set_index", "set index");
  const iUnit = col("weight unit", "weight_unit", "unit");
  const iType = col("set type", "set_type");
  if (iEx < 0 || iDate < 0) return { ok: false, err: "Need a CSV with date, exercise, weight, and reps (Strong, Hevy, or Ascend export)." };
  const kgish = head.some((h) => h.includes("weight kg") || h === "weight_kg" || h === "kg");
  const sessions = new Map();
  table.slice(1).forEach((row) => {
    const name = String(row[iEx] || "").trim();
    if (!name) return;
    const kind = iType >= 0 ? String(row[iType] || "").toLowerCase() : "";
    if (kind.includes("warmup") || kind === "warmup") return;
    const date = parseImportDate(row[iDate]);
    const title = iTitle >= 0 ? String(row[iTitle] || "").trim() : "";
    const key = `${date}\t${title}`;
    if (!sessions.has(key)) sessions.set(key, { date, title, lifts: new Map() });
    const sess = sessions.get(key);
    if (!sess.lifts.has(name)) sess.lifts.set(name, []);
    let w = iW >= 0 ? parseFloat(String(row[iW] ?? "").replace(",", ".")) : NaN;
    if (!Number.isFinite(w)) w = "";
    const unit = iUnit >= 0 ? String(row[iUnit] || "").toLowerCase() : "";
    if (typeof w === "number" && (kgish || unit.includes("kg"))) w = Math.round(w * 2.20462 * 2) / 2;
    const r = iR >= 0 ? parseFloat(String(row[iR] ?? "").replace(",", ".")) : NaN;
    const drop = kind.includes("drop");
    sess.lifts.get(name).push({ w: w === "" ? "" : String(w), r: Number.isFinite(r) ? String(r) : "", done: true, drop, ord: iSet >= 0 ? +row[iSet] || 0 : sess.lifts.get(name).length });
  });
  const fingerprints = new Set((s.workouts || []).map((w) => `${w.date}|${(w.title || "").toLowerCase()}|${(w.exercises || []).map((e) => e.name).join(",")}`));
  const added = [];
  let skipped = 0;
  let acc = { ...s, workouts: [...(s.workouts || [])] };
  for (const sess of sessions.values()) {
    if (added.length >= 400) break;
    const exercises = [...sess.lifts.entries()].map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => a.ord - b.ord).map(({ w, r, done, drop }) => ({ w, r, done, drop })),
    })).filter((e) => e.sets.some((st) => +st.r > 0 || +st.w > 0));
    if (!exercises.length) continue;
    const fp = `${sess.date}|${sess.title.toLowerCase()}|${exercises.map((e) => e.name).join(",")}`;
    if (fingerprints.has(fp)) { skipped++; continue; }
    fingerprints.add(fp);
    const res = workoutXp(acc, exercises, computeBests(acc), { workout: { gym: null, date: sess.date }, history: collectPrHistory(acc, findEx) });
    const workout = { id: uid(), date: sess.date, title: sess.title, exercises, volume: res.volume, xp: res.xp, lines: res.lines, prBonus: res.prBonus, source: "import" };
    acc = { ...acc, workouts: [...acc.workouts, workout] };
    added.push(workout);
  }
  if (!added.length) return { ok: false, err: skipped ? `Already imported (${skipped} duplicate session${skipped === 1 ? "" : "s"}).` : "No set rows found." };
  const r = recountXp({ ...s, workouts: [...(s.workouts || []), ...added] });
  try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
  return { ok: true, s: r.s, n: added.length, skipped, xp: r.s.xp - (s.xp || 0) };
}

/* ---------- Versus (PvP) ---------- */
