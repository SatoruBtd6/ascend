import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { targets } from "../../math.js";
import { GOALS } from "../../data/foods.js";
import { FUEL_XP } from "../../data/quests.js";
import { mealTotals } from "../../lib/stats.js";
import { today, shift, fmtDay, uid } from "../../lib/dates.js";
import { Title, Empty, Bar } from "../../ui/primitives.jsx";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { NumField } from "../../ui/NumField.jsx";
import { DiagProbe } from "../../ui/DiagProbe.jsx";
import { AddFood } from "./AddFood.jsx";
import { FuelCoach } from "./FuelCoach.jsx";
import { DayTemplates } from "./DayTemplates.jsx";
import { NutritionReport } from "./NutritionReport.jsx";
import { HydrationBar } from "./HydrationBar.jsx";
export function Fuel({ s, setS, gainXp }) {
  D.noteRender("Fuel");
  useEffect(() => {
    if (!D.on()) return;
    const n = D.nextSeq();
    D.push({ k: "mount", kind: "Fuel", n });
    return () => D.push({ k: "unmount", kind: "Fuel", n });
  }, []);
  const [d, setD] = useState(today());
  const p = s.profile;
  const meals = s.meals[d] || [];
  const [adding, setAdding] = useState(false);
  const t = targets(p);
  const tot = mealTotals(meals);
  const isToday = d === today();
  const addMeal = (food) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: [...(x.meals[d] || []), { ...food, id: uid(), qty: 1 }] } }));
  const pct = Math.min(100, (tot.cal / t.cal) * 100);
  if (adding) return <AddFood s={s} setS={setS} dayLabel={isToday ? "today" : fmtDay(d)} onClose={() => setAdding(false)} onAdd={(f) => { addMeal(f); setAdding(false); window.scrollTo?.(0, 0); }} />;

  return (
    <div className="space-y-4">
      <Title right={<SaveMark />}>Fuel</Title>

      <div className="panel p-2 flex items-center justify-between">
        <button aria-label="Previous day" onClick={() => setD(shift(d, -1))} className="p-2" style={{ color: C.cyan }}><ChevronLeft /></button>
        <button onClick={() => setD(today())} className="font-semibold">{isToday ? "Today" : fmtDay(d)}</button>
        <button aria-label="Next day" disabled={isToday} onClick={() => setD(shift(d, 1))} className="p-2" style={{ color: isToday ? C.mute : C.cyan }}><ChevronRight /></button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {GOALS.map((g) => (
          <button key={g.id} onClick={() => setS((x) => ({ ...x, profile: { ...x.profile, goal: g.id } }))} className="px-4 py-2 text-sm font-semibold whitespace-nowrap" style={{ borderRadius: 4, background: p.goal === g.id ? C.blue : C.soft, color: p.goal === g.id ? "#fff" : C.text, boxShadow: p.goal === g.id ? "0 0 14px rgba(47,140,255,.55)" : "none", border: `1px solid ${C.border}` }}>{g.label}</button>
        ))}
      </div>

      <div className="panel p-5 flex items-center gap-4">
        {isToday && <HydrationBar s={s} setS={setS} gainXp={gainXp} d={d} />}
        <svg width="104" height="104" viewBox="0 0 110 110" className="shrink-0">
          <circle cx="55" cy="55" r="46" fill="none" stroke={C.track} strokeWidth="10" />
          <circle cx="55" cy="55" r="46" fill="none" stroke={tot.cal > t.cal + 150 ? C.orange : C.cyan} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 289} 289`} transform="rotate(-90 55 55)" style={{ filter: "drop-shadow(0 0 6px rgba(124,211,255,.8))" }} />
          <text x="55" y="54" textAnchor="middle" fill={C.text} fontSize="22" fontWeight="700">{Math.round(tot.cal)}</text>
          <text x="55" y="72" textAnchor="middle" fill={C.dim} fontSize="11">of {t.cal}</text>
        </svg>
        <div className="flex-1 space-y-2 body text-sm">
          {[["Protein", tot.p, t.protein, C.cyan], ["Carbs", tot.c, t.carbs, C.green], ["Fat", tot.f, t.fat, C.orange]].map(([n, v, tg, c]) => (
            <div key={n}>
              <div className="flex justify-between"><span>{n}</span><span style={{ color: C.dim }}>{Math.round(v)} / {tg}g</span></div>
              <div className="mt-1"><Bar pct={(v / tg) * 100} color={c} /></div>
            </div>
          ))}
        </div>
      </div>
      {isToday && <FuelCoach s={s} setS={setS} t={t} tot={tot} onAdd={addMeal} />}
      {isToday && (() => {
        const calHit = meals.length > 0 && Math.abs(tot.cal - t.cal) <= t.cal * 0.1;
        const pHit = tot.p >= t.protein;
        const claimed = s.fuelClaimed?.[d];
        const ready = calHit && pHit && !claimed;
        return (
          <div className="panel p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">Daily fuel goal</span>
              <span className="text-sm font-bold" style={{ color: C.gold }}>+{FUEL_XP} XP</span>
            </div>
            <div className="body text-sm mt-2 space-y-1">
              <div className="flex items-center gap-2" style={{ color: calHit ? C.green : C.dim }}><Check size={15} style={{ opacity: calHit ? 1 : 0.3 }} />Calories within 10% of {t.cal} ({Math.round(tot.cal)} now)</div>
              <div className="flex items-center gap-2" style={{ color: pHit ? C.green : C.dim }}><Check size={15} style={{ opacity: pHit ? 1 : 0.3 }} />Protein at least {t.protein}g ({Math.round(tot.p)}g now)</div>
            </div>
            {claimed ? <div className="text-sm font-semibold mt-3" style={{ color: C.green }}>Claimed for today</div> :
              <button disabled={!ready} onClick={() => { setS((x) => ({ ...x, fuelClaimed: { ...(x.fuelClaimed || {}), [d]: true } })); gainXp(FUEL_XP, "Fuel goal hit", `fuel_${d}`); }} className="w-full mt-3 py-2 font-bold" style={{ borderRadius: 4, background: ready ? C.gold : C.soft, color: ready ? "#0A1630" : C.mute, border: `1px solid ${C.border}` }}>Claim</button>}
          </div>
        );
      })()}
      <div className="body text-xs" style={{ color: C.mute }}>Maintenance is about {t.tdee} cal/day from your body stats. Every day's food saves automatically, and you can look back with the arrows or the Log tab.</div>

      <NutritionReport s={s} />
      <DayTemplates s={s} setS={setS} d={d} meals={meals} />

      <div className="flex justify-between items-center pt-1">
        <h2 className="text-lg font-bold">{isToday ? "Today's food" : "Food logged"}</h2>
        <button onClick={() => setAdding(true)} className="btn px-3 py-2 text-sm flex items-center gap-1"><Plus size={16} />Add food</button>
      </div>
      {meals.length === 0 && <Empty>Nothing logged {isToday ? "today" : "this day"}. Add food from the list, or type any meal and get an estimate.</Empty>}
      {meals.map((m) => (
        <div key={m.id} className="panel p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{m.meal ? "🥤 " : ""}{m.name}</div>
            <div className="body text-xs" style={{ color: C.dim }}>{Math.round(m.cal * (+m.qty || 0))} cal · P {Math.round(m.p * (+m.qty || 0))} · C {Math.round(m.c * (+m.qty || 0))} · F {Math.round(m.f * (+m.qty || 0))}</div>
            {m.meal && m.ingredients?.length > 0 && <details className="body text-xs mt-1" style={{ color: C.mute }}><summary style={{ cursor: "pointer" }}>{m.ingredients.length} ingredients</summary>{m.ingredients.map((it, i) => <div key={i} className="pl-2">{it.qty !== 1 ? `${it.qty}× ` : ""}{it.name} · {Math.round(it.cal * it.qty)} cal</div>)}</details>}
          </div>
          <NumField inputMode="decimal" aria-label="Servings" data-diag="fuel-servings" className="inp text-center" style={{ width: 58 }} value={m.qty}
            onCommit={(v) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].map((y) => y.id === m.id ? { ...y, qty: v } : y) } }))} {...D.fuelBind("fuel-qty")} />
          {D.on() && <DiagProbe kind="fuel-qty" id={String(m.id || "").length} />}
          <button aria-label="Remove food" onClick={() => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].filter((y) => y.id !== m.id) } }))} style={{ color: C.mute }}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}
