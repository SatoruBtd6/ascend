import { useState } from "react";
import { ChevronDown, Ruler } from "lucide-react";
import { today } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { LineChart } from "../train/LineChart.jsx";
export const MEASURES = [["arms", "Arms"], ["chest", "Chest"], ["waist", "Waist"], ["legs", "Thighs"]];
export function Measurements({ s, setS }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [pick, setPick] = useState("arms");
  const log = s.measure || {};
  const dates = Object.keys(log).sort();
  const last = dates.length ? log[dates[dates.length - 1]] : {};
  const save = () => {
    const entry = {}; MEASURES.forEach(([k]) => { if (+vals[k]) entry[k] = +vals[k]; });
    if (!Object.keys(entry).length) return;
    setS((p) => ({ ...p, measure: { ...(p.measure || {}), [today()]: { ...(p.measure?.[today()] || {}), ...entry } } })); setVals({});
  };
  const pts = dates.filter((d) => log[d][pick]).map((d) => ({ d, v: log[d][pick] }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><Ruler size={16} style={{ color: C.cyan }} />Measurements{dates.length ? ` · ${MEASURES.filter(([k]) => last[k]).map(([k, l]) => `${l} ${last[k]}"`).join(", ")}` : ""}</span><ChevronDown size={16} className="shrink-0" style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">{MEASURES.map(([k, l]) => <label key={k} className="body text-xs text-center" style={{ color: C.dim }}>{l}<input type="text" inputMode="decimal" className="inp text-center mt-0.5" placeholder={last[k] || "in"} value={vals[k] || ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>)}</div>
          <button onClick={save} className="btn w-full py-2 text-sm">Log today</button>
          {dates.length > 0 && (
            <>
              <div className="flex gap-2">{MEASURES.map(([k, l]) => <button key={k} onClick={() => setPick(k)} className="flex-1 py-1.5 text-xs font-semibold" style={{ borderRadius: 999, background: pick === k ? C.blue : C.soft, color: pick === k ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>)}</div>
              <LineChart pts={pts} color={C.cyan} unit="in" fmt={(v) => v.toFixed(1)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Social: feed, crew goal, duels, sharing ---------- */
// Preset that keeps the exact structure: exercise order, set count, and each set's weight and reps
