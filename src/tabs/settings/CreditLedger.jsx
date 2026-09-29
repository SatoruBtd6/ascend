import { useMemo } from "react";
import { ChevronLeft, Footprints, Timer as TimerIcon } from "lucide-react";
import { fmtDay, monthKey, weekStart } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { creditBreakdown, round2 } from "../../math.js";
import { C } from "../../theme.js";
import { Empty } from "../../ui/primitives.jsx";
import { fmtMins } from "./XpLedger.jsx";

// A session's "credit" is what streaks, duels and lifetime workout counts use:
// lifting minutes and cardio minutes each convert through their own curve and
// cap, then the sum is capped again. Card-deck and quest sessions earn none.
export function CreditLedger({ s, onBack, drawer = false }) {
  const rows = useMemo(
    () => (s.workouts || [])
      .map((w) => ({ w, b: creditBreakdown(s, w, findEx) }))
      .filter((x) => !x.b.skipped && x.b.total > 0)
      .sort((a, b) => (a.w.date < b.w.date ? 1 : -1)),
    [s]
  );
  const ws = weekStart(), mk = monthKey();
  const sum = (pred) => round2(rows.filter((x) => pred(x.w)).reduce((a, x) => a + x.b.total, 0));
  const totals = { all: round2(rows.reduce((a, x) => a + x.b.total, 0)), week: sum((w) => w.date >= ws), month: sum((w) => w.date.startsWith(mk)) };
  const groups = [];
  rows.forEach((x) => { const g = groups[groups.length - 1]; if (g && g.day === x.w.date) g.items.push(x); else groups.push({ day: x.w.date, items: [x] }); });
  const label = (w) => (w.title ? w.title : w.run ? "Run" : "Workout");
  const detail = (b) => {
    const parts = [];
    if (b.sets) parts.push(`${b.sets} sets · ${fmtMins(Math.round(b.strengthMin))} lifting → ${round2(b.strength)}`);
    if (b.runMin) parts.push(`${fmtMins(Math.round(b.runMin))} running → ${round2(b.cardio)}`);
    if (b.walkMin) parts.push(`${fmtMins(Math.round(b.walkMin))} walking → ${round2(b.cardio)}`);
    return parts.join("  +  ");
  };
  return (
    <div className="space-y-4">
      {!drawer && <div className="flex items-center gap-2"><button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button><h1 className="text-2xl font-bold glowtext">Workout credit</h1></div>}
      <div className="panel p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["All time", totals.all], ["This week", totals.week], ["This month", totals.month]].map(([l, v]) => <div key={l}><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold tabular-nums glowtext">{v.toLocaleString()}</div></div>)}
        </div>
        <div className="body text-xs" style={{ color: C.dim }}>
          Credit is what counts a workout toward streaks, duels and the board — not sessions. Lifting earns up to 1.25 by minutes, cardio up to 0.75, capped at 1.25 combined. Card-deck and quest sessions earn none. Sessions without a logged duration estimate 3.5 min per set.
        </div>
      </div>
      {rows.length === 0 && <Empty>No credited workouts yet. Finish a workout and it shows up here with the credit it earned.</Empty>}
      {groups.map((g) => (
        <div key={g.day} className="panel overflow-hidden">
          <div className="flex justify-between items-center px-3 py-2" style={{ background: C.soft, borderBottom: `1px solid ${C.glassLine}` }}>
            <span className="font-semibold text-sm">{fmtDay(g.day)}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: C.gold }}>{round2(g.items.reduce((a, x) => a + x.b.total, 0))}</span>
          </div>
          {g.items.map((x, i) => (
            <div key={x.w.id || i} className="flex items-center gap-3 px-3 py-2" style={i ? { borderTop: `1px solid ${C.glassLine}` } : null}>
              <div className="flex-1 min-w-0">
                <div className="body text-sm truncate flex items-center gap-1.5" style={{ color: C.text }}>{x.w.run ? <Footprints size={13} style={{ color: C.cyan }} /> : <TimerIcon size={13} style={{ color: C.cyan }} />}{label(x.w)}{x.w.source === "import" && <span className="body text-xs" style={{ color: C.mute }}>imported</span>}</div>
                <div className="body text-xs" style={{ color: C.mute }}>{detail(x.b)}{x.b.capped ? " · capped" : ""}</div>
              </div>
              <div className="font-bold tabular-nums text-sm" style={{ color: C.gold }}>{round2(x.b.total)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
