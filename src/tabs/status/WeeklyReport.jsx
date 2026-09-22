import { useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { GROUP_WEIGHT } from "../../data/ranks.js";
import { C } from "../../theme.js";
import { stalledLifts } from "../train/helpers.js";
export function WeeklyReport({ s }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(s.rankHist || {}).sort();
  if (keys.length < 2) return null;
  const cur = s.rankHist[keys[keys.length - 1]], prev = s.rankHist[keys[keys.length - 2]];
  const ups = [], downs = [];
  Object.entries(cur.lifts || {}).forEach(([n, sc]) => { const p = prev.lifts?.[n]; if (p === undefined) return; if (sc - p >= 0.34) ups.push(n); else if (p - sc >= 0.34) downs.push(n); });
  const dOverall = (cur.overall || 0) - (prev.overall || 0);
  const xpGain = (cur.xp || 0) - (prev.xp || 0);
  const focus = downs[0] || stalledLifts(s)[0]?.name || Object.entries(GROUP_WEIGHT).sort((a, b) => ((cur.groups?.[a[0]] || 0) - (cur.groups?.[b[0]] || 0)))[0][0];
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} style={{ color: C.cyan }} />Weekly rank report</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
          <div>Overall score {dOverall >= 0 ? "+" : ""}{dOverall.toFixed(2)} · {xpGain.toLocaleString()} XP earned</div>
          <div style={{ color: C.green }}>Moved up: {ups.length ? ups.join(", ") : "nothing yet"}</div>
          <div style={{ color: C.orange }}>Slipping: {downs.length ? downs.join(", ") : "nothing"}</div>
          <div style={{ color: C.cyan }}>Focus next week: {focus}</div>
        </div>
      )}
    </div>
  );
}


/* ---------- Generic line chart + exercise page ---------- */

/* ---------- Today dashboard + check-in ---------- */
