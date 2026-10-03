import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Check, Info } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { targets } from "../../math.js";
import { GOALS } from "../../data/foods.js";
import { FUEL_XP } from "../../data/quests.js";
import { mealTotals } from "../../lib/stats.js";
import { scrollPageTop } from "../../lib/dom.js";
import { today, shift, fmtDay, uid } from "../../lib/dates.js";
import { Title, Empty, Bar } from "../../ui/primitives.jsx";
import { AnchoredMenu } from "../../ui/AnchoredMenu.jsx";
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
  const [goalMenu, setGoalMenu] = useState(null);
  const [infoMenu, setInfoMenu] = useState(null);
  const t = targets(p);
  const tot = mealTotals(meals);
  const isToday = d === today();
  const addMeal = (food) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: [...(x.meals[d] || []), { ...food, id: uid(), qty: 1 }] } }));
  const pct = Math.min(100, (tot.cal / t.cal) * 100);
  if (adding) return <AddFood s={s} setS={setS} dayLabel={isToday ? "today" : fmtDay(d)} onClose={() => setAdding(false)} onAdd={(f) => { addMeal(f); setAdding(false); scrollPageTop(); }} />;

  return (
    <div className="space-y-4">
      <Title right={<SaveMark />}>Fuel</Title>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button aria-label="Previous day" onClick={() => setD(shift(d, -1))} className="p-1.5" style={{ color: C.cyan }}><ChevronLeft size={20} /></button>
          <button onClick={() => setD(today())} className="font-semibold px-1.5" style={{ fontSize: 17 }}>{isToday ? "Today" : fmtDay(d)}</button>
          <button aria-label="Next day" disabled={isToday} onClick={() => setD(shift(d, 1))} className="p-1.5" style={{ color: isToday ? C.mute : C.cyan }}><ChevronRight size={20} /></button>
        </div>
        <button type="button" data-keep-menu aria-haspopup="menu" aria-expanded={!!goalMenu} onClick={(e) => { e.stopPropagation(); setInfoMenu(null); setGoalMenu(goalMenu ? null : e.currentTarget); }} className="flex items-center gap-1 font-semibold" style={{ height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${C.glassLine}`, background: C.glass, color: C.text, fontSize: 14 }}>
          {GOALS.find((g) => g.id === p.goal)?.label || "Goal"}<ChevronDown size={14} style={{ color: C.mute }} />
        </button>
      </div>
      {goalMenu && (
        <AnchoredMenu anchor={goalMenu} onClose={() => setGoalMenu(null)} minWidth={180}>
          {GOALS.map((g) => (
            <button key={g.id} role="menuitem" className="w-full text-left px-5 text-sm flex items-center gap-2" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: p.goal === g.id ? C.cyan : C.text }} onClick={() => { setS((x) => ({ ...x, profile: { ...x.profile, goal: g.id } })); setGoalMenu(null); }}>
              <Check size={16} style={{ opacity: p.goal === g.id ? 1 : 0 }} />{g.label}
            </button>
          ))}
        </AnchoredMenu>
      )}

      <div className="panel p-4 flex items-center gap-4 relative">
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
        <button aria-label="About your calorie target" aria-haspopup="menu" aria-expanded={!!infoMenu} onClick={(e) => { e.stopPropagation(); setGoalMenu(null); setInfoMenu(infoMenu ? null : e.currentTarget); }} className="absolute top-2 right-2 p-2" style={{ color: C.mute }}><Info size={15} /></button>
      </div>
      {infoMenu && (
        <AnchoredMenu anchor={infoMenu} onClose={() => setInfoMenu(null)} minWidth={240}>
          <div className="px-4 py-3 body text-xs" style={{ color: C.mute }}>Maintenance is about {t.tdee} cal/day from your body stats. Every day's food saves automatically, and you can look back with the arrows or the Log tab.</div>
        </AnchoredMenu>
      )}
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
            {claimed ? <div className="body text-xs mt-3" style={{ color: C.mute }}>Claimed · +{FUEL_XP} XP</div> :
              ready ? <button onClick={() => { setS((x) => ({ ...x, fuelClaimed: { ...(x.fuelClaimed || {}), [d]: true } })); gainXp(FUEL_XP, "Fuel goal hit", `fuel_${d}`); }} className="w-full mt-3 py-2 font-bold" style={{ borderRadius: 4, background: C.gold, color: "#0A1630", border: `1px solid ${C.border}` }}>Claim</button> : null}
          </div>
        );
      })()}

      <NutritionReport s={s} />
      <DayTemplates s={s} setS={setS} d={d} meals={meals} />

      <div className="flex justify-between items-center pt-1">
        <h2 className="text-lg font-bold">{isToday ? "Today's food" : "Food logged"}</h2>
        <button onClick={() => setAdding(true)} className="btn px-3 py-2 text-sm flex items-center gap-1"><Plus size={16} />Add food</button>
      </div>
      {meals.length === 0 && <Empty>{isToday ? "Nothing logged yet." : "Nothing logged this day."}</Empty>}
      {meals.length > 0 && (
        <div>
          {meals.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2" style={{ minHeight: 56, borderTop: i ? "1px solid rgba(255,255,255,.08)" : "none" }}>
              <div className="flex-1 min-w-0 py-1.5">
                <div className="font-semibold truncate" style={{ fontSize: 15 }}>{m.meal ? "🥤 " : ""}{m.name}</div>
                <div className="body text-xs" style={{ color: C.dim }}>{Math.round(m.cal * (+m.qty || 0))} cal · P {Math.round(m.p * (+m.qty || 0))} · C {Math.round(m.c * (+m.qty || 0))} · F {Math.round(m.f * (+m.qty || 0))}</div>
                {m.meal && m.ingredients?.length > 0 && <details className="body text-xs mt-1" style={{ color: C.mute }}><summary style={{ cursor: "pointer" }}>{m.ingredients.length} ingredients</summary>{m.ingredients.map((it, ix) => <div key={ix} className="pl-2">{it.qty !== 1 ? `${it.qty}× ` : ""}{it.name} · {Math.round(it.cal * it.qty)} cal</div>)}</details>}
              </div>
              <NumField inputMode="decimal" aria-label="Servings" data-diag="fuel-servings" className="inp text-center" style={{ width: 58, minHeight: 44 }} value={m.qty}
                onCommit={(v) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].map((y) => y.id === m.id ? { ...y, qty: v } : y) } }))} {...D.fuelBind("fuel-qty")} />
              {D.on() && <DiagProbe kind="fuel-qty" id={String(m.id || "").length} />}
              <button aria-label="Remove food" onClick={() => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].filter((y) => y.id !== m.id) } }))} className="flex items-center justify-center shrink-0" style={{ color: C.mute, minWidth: 44, minHeight: 44 }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
