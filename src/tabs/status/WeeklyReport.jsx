import { useState } from "react";
import { GROUP_WEIGHT } from "../../data/ranks.js";
import { C } from "../../theme.js";
import { Disclosure } from "../../ui/primitives.jsx";
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
    <Disclosure title="Weekly rank report" right={`${dOverall >= 0 ? "+" : ""}${dOverall.toFixed(2)}`} open={open} onToggle={() => setOpen((v) => !v)}>
      <div className="px-1 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
        <div>Overall score {dOverall >= 0 ? "+" : ""}{dOverall.toFixed(2)} · {xpGain.toLocaleString()} XP earned</div>
        <div style={{ color: C.green }}>Moved up: {ups.length ? ups.join(", ") : "nothing yet"}</div>
        <div style={{ color: C.orange }}>Slipping: {downs.length ? downs.join(", ") : "nothing"}</div>
        <div style={{ color: C.cyan }}>Focus next week: {focus}</div>
      </div>
    </Disclosure>
  );
}


/* ---------- Generic line chart + exercise page ---------- */
