import { useState } from "react";
import { Trash2 } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { ask } from "../../lib/ask.js";
import { mealTotals } from "../../lib/stats.js";
import { Disclosure } from "../../ui/primitives.jsx";
export function DayTemplates({ s, setS, d, meals }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const tpls = s.dayTemplates || [];
  const save = () => {
    const nm = name.trim() || `Day ${tpls.length + 1}`;
    const items = meals.map(({ id, ...m }) => m);
    setS((p) => ({ ...p, dayTemplates: [...(p.dayTemplates || []).filter((t) => t.name !== nm), { id: uid(), name: nm, items }] }));
    setNaming(false); setName("");
  };
  const load = (t) => setS((p) => ({ ...p, meals: { ...p.meals, [d]: [...(p.meals[d] || []), ...t.items.map((m) => ({ ...m, id: uid() }))] } }));
  return (
    <Disclosure title="Day templates" right={tpls.length ? String(tpls.length) : ""} open={open} onToggle={() => setOpen(!open)}>
      <div className="px-1 pb-4 space-y-2">
        {tpls.map((t) => (
          <div key={t.id} className="ghost flex items-center">
            <button onClick={() => load(t)} className="flex-1 text-left p-2 min-w-0"><div className="font-semibold text-sm">{t.name}</div><div className="body text-xs truncate" style={{ color: C.dim }}>{t.items.length} items · {Math.round(mealTotals(t.items).cal)} cal · P {Math.round(mealTotals(t.items).p)}</div></button>
            <button aria-label={`Delete template ${t.name}`} onClick={() => ask(`Delete template "${t.name}"?`, () => setS((p) => ({ ...p, dayTemplates: p.dayTemplates.filter((x) => x.id !== t.id) })), "Delete")} className="px-3" style={{ color: C.mute }}><Trash2 size={14} /></button>
          </div>
        ))}
        {tpls.length === 0 && <div className="body text-xs" style={{ color: C.dim }}>Save a whole day of eating once, then log it in one tap.</div>}
        {meals.length > 0 && (naming ? (
          <div className="flex gap-2"><input autoFocus className="inp text-sm" placeholder="Template name, e.g. Work day" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} {...D.fuelBind("fuel-tpl")} data-diag="fuel-tpl" /><button onClick={save} className="btn px-3 text-sm">Save</button></div>
        ) : <button onClick={() => setNaming(true)} className="ghost w-full py-2 text-sm font-semibold" style={{ color: C.cyan }}>Save this day as a template</button>)}
      </div>
    </Disclosure>
  );
}
