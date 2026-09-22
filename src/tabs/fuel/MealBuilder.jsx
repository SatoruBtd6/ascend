import { useState } from "react";
import { ChevronLeft, Loader2, Sparkles, X } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { publishShared, slug } from "../train/social.js";
import { NumField } from "../../ui/NumField.jsx";
export function MealBuilder({ s, setS, pool, onDone, onBack }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const matches = q.trim().length > 1 ? pool.filter((f) => !f.meal && f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const tot = items.reduce((a, it) => {
    const q = +it.qty || 0;
    return { cal: a.cal + it.cal * q, p: a.p + it.p * q, c: a.c + it.c * q, f: a.f + it.f * q };
  }, { cal: 0, p: 0, c: 0, f: 0 });
  const add = (f, qty = 1) => { setItems((x) => [...x, { name: f.name, cal: +f.cal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0, qty }]); setQ(""); };
  const build = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 700, messages: [{ role: "user", content: `Turn this description into a recipe with per-ingredient nutrition: "${desc}". Use typical US portions and standard nutrition values. Respond ONLY with JSON, no markdown: {"name": short meal name, "ingredients": [{"name": "ingredient with portion, e.g. Whey protein (1 scoop)", "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat}]}` }] }),
      });
      const data = await res.json();
      const text = (data.content || []).map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
      const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      if (!name.trim() && r.name) setName(String(r.name).slice(0, 50));
      (r.ingredients || []).forEach((it) => add(it, 1));
      setDesc("");
    } catch (e) { setErr("Couldn't build that. Try listing the ingredients, like \"2 scoops whey, banana, cup of milk, tbsp peanut butter\"."); }
    setBusy(false);
  };
  const save = () => {
    const meal = { name: name.trim() || "My meal", meal: true, ingredients: items, cal: Math.round(tot.cal), p: Math.round(tot.p), c: Math.round(tot.c), f: Math.round(tot.f), r: "Meals" };
    setS((x) => ({ ...x, savedFoods: [meal, ...(x.savedFoods || []).filter((y) => y.name !== meal.name)].slice(0, 80) }));
    publishShared(`food:${slug(meal.name)}`, { ...meal, by: s.profile.name || "a player", t: Date.now() });
    onDone(meal);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Create a meal</h1>
      </div>
      <div className="body text-sm" style={{ color: C.dim }}>Build a shake or a full meal once, and it saves with all its ingredients. It's shared with everyone, so your cousins can log it in one tap too.</div>
      <input className="inp font-bold" placeholder="Meal name, e.g. Post-workout shake" value={name} onChange={(e) => setName(e.target.value)} {...D.fuelBind("fuel-meal-name")} data-diag="fuel-meal-name" />

      <div className="panel p-3 space-y-2">
        <div className="font-bold text-sm">Describe it and let AI fill the ingredients</div>
        <div className="flex gap-2">
          <input className="inp" placeholder="e.g. 2 scoops whey, banana, oats, milk" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && desc.trim() && build()} {...D.fuelBind("fuel-desc")} data-diag="fuel-desc" />
          <button onClick={build} disabled={busy || desc.trim().length < 3} className="btn px-3 text-sm flex items-center gap-1">{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}Build</button>
        </div>
        {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      </div>

      <div className="panel p-3 space-y-2">
        <div className="font-bold text-sm">Or add ingredients from the food list</div>
        <input className="inp" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} {...D.fuelBind("fuel-ing")} data-diag="fuel-ing" />
        {matches.map((f) => <button key={f.name} onClick={() => add(f)} className="ghost w-full text-left p-2 text-sm flex justify-between"><span>{f.name}</span><span style={{ color: C.dim }}>{f.cal} cal</span></button>)}
      </div>

      {items.length > 0 && (
        <div className="panel p-3 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0"><div className="truncate font-semibold">{it.name}</div><div className="body text-xs" style={{ color: C.dim }}>{Math.round(it.cal * (+it.qty || 0))} cal · P {Math.round(it.p * (+it.qty || 0))} · C {Math.round(it.c * (+it.qty || 0))} · F {Math.round(it.f * (+it.qty || 0))}</div></div>
              <NumField inputMode="decimal" className="inp text-center" style={{ width: 56 }} value={it.qty} aria-label="Quantity" onCommit={(v) => setItems((x) => x.map((y, j) => j === i ? { ...y, qty: v } : y))} {...D.fuelBind("fuel-ing-qty")} />
              <button aria-label="Remove ingredient" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} style={{ color: C.mute }}><X size={16} /></button>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-2" style={{ borderTop: `1px solid ${C.line}` }}><span>Total</span><span style={{ color: C.gold }}>{Math.round(tot.cal)} cal · P {Math.round(tot.p)} · C {Math.round(tot.c)} · F {Math.round(tot.f)}</span></div>
        </div>
      )}
      <button onClick={save} disabled={!items.length} className="btn w-full py-3" style={!items.length ? { opacity: 0.5 } : null}>Save meal, share it, and log it</button>
    </div>
  );
}

