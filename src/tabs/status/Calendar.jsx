import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dkey, fmtDay, monthLabel, shift, today, weekDays, weekTitle, ymOf } from "../../lib/dates.js";
import { fmtCredit, mealTotals, workoutCredit } from "../../lib/stats.js";
import { targets } from "../../math.js";
import { C } from "../../theme.js";
import { CHIP, ExpandBox, MoreRow, Tap, Title } from "../../ui/primitives.jsx";
import { LogWorkoutSheet } from "./LogWorkoutSheet.jsx";
import { WeightTracker } from "./WeightTracker.jsx";

const HAIR = "1px solid rgba(255,255,255,.08)";
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

const KV = ({ k, v, first }) => (
  <div className="flex justify-between items-center" style={{ padding: "9px 0", borderTop: first ? "none" : HAIR }}>
    <span className="body" style={{ fontSize: 14, color: C.dim }}>{k}</span>
    <span style={{ fontSize: 16, color: C.text }}>{v}</span>
  </div>
);

export function Calendar({ s, setS }) {
  const [sheet, setSheet] = useState(null);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const [view, setView] = useState(() => lsGet("ascend-logview") === "week" ? "week" : "month");
  const [dayMore, setDayMore] = useState(false);
  const [moMore, setMoMore] = useState(false);
  const t = targets(s.profile);
  // Week mode keeps ym on sel's month so "This month" and the card agree.
  const ymv = view === "week" ? ymOf(sel) : ym;

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

  const first = new Date(ymv.y, ymv.m, 1);
  const daysIn = new Date(ymv.y, ymv.m + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => dkey(new Date(ymv.y, ymv.m, i + 1)))];
  const monthDays = cells.filter(Boolean).map((d) => ({ d, ...info(d) }));
  const logged = monthDays.filter((x) => x.meals.length);
  const sum = {
    workouts: fmtCredit(monthDays.reduce((a, x) => a + x.ws.reduce((b, w) => b + workoutCredit(s, w), 0), 0)),
    quests: monthDays.reduce((a, x) => a + x.quests, 0),
    xp: monthDays.reduce((a, x) => a + x.xp, 0),
    volume: monthDays.reduce((a, x) => a + x.volume, 0),
    avgCal: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.cal, 0) / logged.length) : 0,
    avgP: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.p, 0) / logged.length) : 0,
    hits: monthDays.filter((x) => x.hit).length,
  };
  // Month arrows step a month and leave sel alone (existing behavior, future
  // months allowed). Week arrows move sel ±7 so it always sits in the strip;
  // future weeks are allowed too — cells disable and the card shows empty.
  const move = (n) => {
    if (view === "week") { setSel((d) => shift(d, 7 * n)); return; }
    setYm(({ y, m }) => { const x = new Date(y, m + n, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  };
  const setViewMode = (v) => { setView(v); lsSet("ascend-logview", v); setYm(ymOf(sel)); };
  const di = info(sel);
  const td = today();
  const ck = (() => { const ci = s.checkins?.[sel] || {}; const wt = s.weightLog?.[sel]; const steps = s.steps?.[sel]; return [ci.sleep ? `${ci.sleep}h sleep` : null, ci.mood ? `feeling ${ci.mood.toLowerCase()}` : null, steps ? `${steps.toLocaleString()} steps` : null, wt ? `${wt} lb` : null].filter(Boolean); })();
  const xpd = s.xpDetail?.[sel] || [];

  const dayCell = (d, i) => {
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
  };

  return (
    <div className="space-y-4">
      <Title>Log</Title>
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <button aria-label={view === "week" ? "Previous week" : "Previous month"} onClick={() => move(-1)} className="p-1" style={{ color: C.cyan }}><ChevronLeft /></button>
          <span className="font-bold">{view === "week" ? weekTitle(sel) : first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button aria-label={view === "week" ? "Next week" : "Next month"} onClick={() => move(1)} className="p-1" style={{ color: C.cyan }}><ChevronRight /></button>
        </div>
        <div className="flex justify-center mb-2">
          <div className="flex" style={{ background: C.glass, border: `1px solid ${C.glassLine}`, borderRadius: 999, padding: 2 }}>
            {[["month", "Month"], ["week", "Week"]].map(([id, l]) => (
              <Tap key={id} label={`${l} view`} onClick={() => setViewMode(id)}>
                <span className="inline-flex items-center justify-center" style={{ ...CHIP, width: 72, background: view === id ? C.cyan : "transparent", border: "none", color: view === id ? "#0A1630" : C.mute }}>{l}</span>
              </Tap>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: C.mute }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {view === "week" ? weekDays(sel).map(dayCell) : cells.map(dayCell)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 body" style={{ color: C.dim, fontSize: 13 }}>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.blue }} />Workout</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.gold }} />Quests</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.green }} />On target</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.orange }} />Off target</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{sel === td ? "Today" : fmtDay(sel)}</span>
          <span className="text-sm font-bold" style={{ color: di.xp ? C.gold : C.mute }}>{di.xp.toLocaleString()} XP</span>
        </div>
        {di.ws.length > 0 ? di.ws.map((w, i) => (
          <button key={w.id} onClick={() => setSheet(w)} className="w-full text-left" style={{ padding: "12px 0", borderTop: HAIR }}>
            <div className="flex justify-between items-center gap-2">
              <span className="min-w-0 truncate" style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{w.title || "Workout"}{w.run ? ` · ${w.run.miles} mi` : ""}</span>
              <span className="body shrink-0" style={{ fontSize: 14, color: C.cyan }}>Details ›</span>
            </div>
            <div className="body" style={{ fontSize: 14, color: C.dim, marginTop: 1 }}>
              {[`${w.exercises.length} exercise${w.exercises.length === 1 ? "" : "s"}`, w.minutes ? `${w.minutes} min` : null].filter(Boolean).join(" · ")}
            </div>
          </button>
        )) : <div className="body" style={{ fontSize: 14, color: C.mute, padding: "12px 0", borderTop: HAIR }}>No workout this day.</div>}
        <MoreRow label="More" open={dayMore} onToggle={() => setDayMore((v) => !v)} />
        <ExpandBox open={dayMore}>
          <div>
            <KV first k="Quests cleared" v={di.quests} />
            {di.meals.length > 0 && <KV k="Calories" v={`${Math.round(di.tot.cal)} / ${t.cal}`} />}
            {di.meals.length > 0 && <KV k="Protein" v={`${Math.round(di.tot.p)}g`} />}
            {ck.length > 0 && <div className="body" style={{ fontSize: 14, color: C.sub, padding: "9px 0", borderTop: HAIR }}>{ck.join(" · ")}</div>}
            {xpd.length > 0 && (
              <div style={{ borderTop: HAIR, paddingTop: 9, paddingBottom: 4 }}>
                <div className="body" style={{ fontSize: 14, color: C.mute, marginBottom: 4 }}>XP breakdown</div>
                {xpd.map((x, i) => <div key={i} className="flex justify-between body" style={{ fontSize: 14, color: C.dim, padding: "2px 0" }}><span>{x.m}</span><span style={{ color: x.a >= 0 ? C.gold : C.orange }}>{x.a >= 0 ? "+" : ""}{x.a}</span></div>)}
              </div>
            )}
          </div>
        </ExpandBox>
      </div>

      {sheet && <LogWorkoutSheet s={s} setS={setS} w={sheet} onClose={() => setSheet(null)} />}
      <h2 className="text-lg font-bold">{monthLabel(ymv.y, ymv.m)}</h2>
      <div>
        <div className="flex">
          {[["Workouts", sum.workouts, false], ["XP earned", sum.xp.toLocaleString(), true], ["Quests cleared", sum.quests, false]].map(([l, v, gold]) => (
            <div key={l} className="flex-1 min-w-0">
              <div className="font-bold" style={{ fontSize: 20, color: gold ? C.gold : C.text }}>{v}</div>
              <div className="body" style={{ fontSize: 14, color: C.dim }}>{l}</div>
            </div>
          ))}
        </div>
        <MoreRow label="More" open={moMore} onToggle={() => setMoMore((v) => !v)} />
        <ExpandBox open={moMore}>
          <div>
            <KV first k="Volume lifted" v={`${Math.round(sum.volume / 1000)}k lb`} />
            <KV k="Avg calories" v={sum.avgCal || "–"} />
            <KV k="Avg protein" v={sum.avgP ? `${sum.avgP}g` : "–"} />
            <KV k="Days food logged" v={logged.length} />
            <KV k="Days on target" v={sum.hits} />
          </div>
        </ExpandBox>
      </div>
      <WeightTracker s={s} setS={setS} />
    </div>
  );
}
