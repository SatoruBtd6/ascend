import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dkey, fmtDay, today } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { isWorkout, mealTotals } from "../../lib/stats.js";
import { targets } from "../../math.js";
import { C } from "../../theme.js";
import { Stat, Title } from "../../ui/primitives.jsx";
import { setLabel } from "../train/helpers.js";
import { LogWorkoutSheet } from "./LogWorkoutSheet.jsx";
import { WeightTracker } from "./WeightTracker.jsx";
export function Calendar({ s, setS }) {
  const [sheet, setSheet] = useState(null);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const t = targets(s.profile);

  const info = (d) => {
    const ws = s.workouts.filter((w) => w.date === d);
    const meals = s.meals[d] || [];
    const tot = mealTotals(meals);
    const quests = (s.days?.[d]?.list || []).filter((q) => q.claimed).length;
    return {
      ws, quests, meals, tot, xp: s.xpLog?.[d] || 0,
      volume: ws.reduce((a, w) => a + (w.volume ?? w.exercises.reduce((b, e) => b + e.sets.reduce((c, st) => c + (+st.w || 0) * +st.r, 0), 0)), 0),
      hit: meals.length > 0 && Math.abs(tot.cal - t.cal) <= t.cal * 0.1,
    };
  };

  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => dkey(new Date(ym.y, ym.m, i + 1)))];
  const monthDays = cells.filter(Boolean).map((d) => ({ d, ...info(d) }));
  const logged = monthDays.filter((x) => x.meals.length);
  const sum = {
    workouts: monthDays.reduce((a, x) => a + x.ws.filter(isWorkout).length, 0),
    quests: monthDays.reduce((a, x) => a + x.quests, 0),
    xp: monthDays.reduce((a, x) => a + x.xp, 0),
    volume: monthDays.reduce((a, x) => a + x.volume, 0),
    avgCal: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.cal, 0) / logged.length) : 0,
    avgP: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.p, 0) / logged.length) : 0,
    hits: monthDays.filter((x) => x.hit).length,
  };
  const move = (n) => setYm(({ y, m }) => { const x = new Date(y, m + n, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const di = info(sel);
  const td = today();

  return (
    <div className="space-y-4">
      <Title>Log</Title>
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <button aria-label="Previous month" onClick={() => move(-1)} className="p-1" style={{ color: C.cyan }}><ChevronLeft /></button>
          <span className="font-bold">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button aria-label="Next month" onClick={() => move(1)} className="p-1" style={{ color: C.cyan }}><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: C.mute }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const x = info(d);
            const future = d > td;
            return (
              <button key={d} onClick={() => setSel(d)} disabled={future} className="aspect-square flex flex-col items-center justify-center gap-1"
                style={{ borderRadius: 3, background: sel === d ? "rgba(47,140,255,.28)" : x.ws.length ? "rgba(47,140,255,.1)" : "transparent", border: d === td ? `1px solid ${C.cyan}` : "1px solid transparent", opacity: future ? 0.3 : 1 }}>
                <span className="text-sm font-semibold">{+d.slice(8)}</span>
                <span className="flex gap-0.5 h-1.5">
                  {x.ws.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.blue, boxShadow: `0 0 4px ${C.blue}` }} />}
                  {x.quests > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />}
                  {x.meals.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: x.hit ? C.green : C.orange }} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 body text-xs" style={{ color: C.dim }}>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.blue }} />Workout</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.gold }} />Quests</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.green }} />Calories on target</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.orange }} />Off target</span>
        </div>
      </div>

      <div className="panel p-4">
        <div className="font-bold mb-3">{sel === td ? "Today" : fmtDay(sel)}</div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <Stat label="XP earned" value={di.xp} />
          <Stat label="Quests cleared" value={di.quests} />
          <Stat label="Calories" value={di.meals.length ? `${Math.round(di.tot.cal)} / ${t.cal}` : "–"} />
          <Stat label="Protein" value={di.meals.length ? `${Math.round(di.tot.p)}g` : "–"} />
        </div>
        {(s.xpDetail?.[sel] || []).length > 0 && (
          <div className="mt-3 pt-3 body text-xs space-y-0.5" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="font-bold" style={{ color: C.text }}>XP breakdown</div>
            {s.xpDetail[sel].map((x, i) => <div key={i} className="flex justify-between" style={{ color: C.dim }}><span>{x.m}</span><span style={{ color: x.a >= 0 ? C.gold : C.orange }}>{x.a >= 0 ? "+" : ""}{x.a}</span></div>)}
          </div>
        )}
        {(() => { const ci = s.checkins?.[sel] || {}; const wt = s.weightLog?.[sel]; const steps = s.steps?.[sel]; const parts = [ci.sleep ? `${ci.sleep}h sleep` : null, ci.mood ? `feeling ${ci.mood.toLowerCase()}` : null, steps ? `${steps.toLocaleString()} steps` : null, wt ? `${wt} lb` : null].filter(Boolean);
          return parts.length ? <div className="body text-xs mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, color: C.sub }}>{parts.join(" · ")}</div> : null; })()}
        {di.ws.length > 0 ? di.ws.map((w) => (
          <button key={w.id} onClick={() => setSheet(w)} className="mt-3 body text-sm w-full text-left" style={{ color: C.sub }}>
            <div className="flex justify-between items-center"><span className="font-semibold" style={{ color: C.text }}>{w.title || "Workout"}{w.run ? ` · ${w.run.miles} mi` : ""}</span><span className="body text-xs" style={{ color: C.cyan }}>Details ›</span></div>
            {w.exercises.map((ex) => <div key={ex.name}><span style={{ color: C.cyan }}>{ex.name}</span>: {ex.sets.map((st) => setLabel(findEx(s, ex.name), st)).join(", ")}</div>)}
          </button>
        )) : <div className="mt-3 body text-sm" style={{ color: C.mute }}>No workout this day.</div>}
      </div>

      {sheet && <LogWorkoutSheet s={s} setS={setS} w={sheet} onClose={() => setSheet(null)} />}
      <h2 className="text-lg font-bold">This month</h2>
      <div className="grid grid-cols-2 gap-3 body text-sm">
        <Stat panel label="Workouts" value={sum.workouts} />
        <Stat panel label="Quests cleared" value={sum.quests} />
        <Stat panel label="XP earned" value={sum.xp.toLocaleString()} />
        <Stat panel label="Volume lifted" value={`${Math.round(sum.volume / 1000)}k lb`} />
        <Stat panel label="Avg calories" value={sum.avgCal || "–"} />
        <Stat panel label="Avg protein" value={sum.avgP ? `${sum.avgP}g` : "–"} />
        <Stat panel label="Days food logged" value={logged.length} />
        <Stat panel label="Days on target" value={sum.hits} />
      </div>
      <WeightTracker s={s} setS={setS} />
    </div>
  );
}
