import { useState, useMemo, useDeferredValue, useCallback, useRef } from "react";
import { ChevronLeft, Camera, Loader2, ChefHat, Store, Globe, Sparkles } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { FOODS, RESTAURANT_FOODS, RESTAURANTS } from "../../data/foods.js";
import { Empty } from "../../ui/primitives.jsx";
import { NumField } from "../../ui/NumField.jsx";
import { DiagProbe } from "../../ui/DiagProbe.jsx";
import { publishShared, slug } from "../train/social.js";
import { claudeChat } from "../train/sterling.js";
import { FoodPickRow } from "./FoodPickRow.jsx";
import { FoodResultList, foodNorm, EMPTY_ARR } from "./foodSearch.jsx";
import { PhotoScan } from "./PhotoScan.jsx";
import { MealBuilder } from "./MealBuilder.jsx";
import { PublishMealToggle } from "./PublishMealToggle.jsx";
import { CommunityMeals } from "./CommunityMeals.jsx";
import { shrinkPhoto } from "./shrinkPhoto.js";
import { barcodeLookup } from "./barcodeLookup.js";
export function AddFood({ s, setS, onClose, onAdd, dayLabel }) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [loading, setLoading] = useState(null); // "estimate" | "lookup"
  const [err, setErr] = useState("");
  const [src, setSrc] = useState("All");
  const [found, setFound] = useState(null);
  const [building, setBuilding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const barRef = useRef(null);
  const onBarcode = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setLoading("barcode"); setErr(""); setFound(null);
    try { const small = await shrinkPhoto(f, 480); const food = await barcodeLookup(small); setFound({ ...food, r: "Scanned" }); }
    catch (e2) { setErr(e2.message === "notfound" ? "Barcode read, but that product isn't in the database. Try the AI estimate or a photo of the label." : "Couldn't read the barcode. Fill the frame with it, flat and in focus."); }
    setLoading(null);
  };
  const saved = s.savedFoods || EMPTY_ARR;

  // Recent foods from the log, newest first
  const recent = useMemo(() => {
    const seen = new Set(), out = [];
    Object.keys(s.meals || {}).sort().reverse().forEach((d) => [...(s.meals[d] || [])].reverse().forEach((m) => {
      if (!seen.has(m.name) && out.length < 12) { seen.add(m.name); out.push({ name: m.name, cal: m.cal, p: m.p, c: m.c, f: m.f, r: m.r }); }
    }));
    return out;
  }, [s.meals]);

  const communityFoods = s.community?.foods;
  const community = useMemo(() => (communityFoods || EMPTY_ARR).map((f) => ({ ...f, r: f.r || "Community", community: true })), [communityFoods]);
  const indexed = useMemo(() => {
    const pool = src === "All" ? [...saved, ...community, ...RESTAURANT_FOODS, ...FOODS] : src === "Saved" ? saved : src === "Basics" ? FOODS : src === "Community" ? community : src === "Meals" ? [...saved, ...community].filter((f) => f.meal) : RESTAURANT_FOODS.filter((f) => f.r === src);
    return pool.map((f) => ({ f, n: foodNorm(f.name) }));
  }, [src, saved, community]);
  const needle = foodNorm(deferredQ.trim());
  const list = useMemo(() => (needle ? indexed.filter((x) => x.n.includes(needle)) : indexed).map((x) => x.f), [indexed, needle]);
  const savedNames = useMemo(() => new Set(saved.map((f) => f.name)), [saved]);
  const onRemoveSaved = useCallback((name) => setS((x) => ({ ...x, savedFoods: (x.savedFoods || []).filter((y) => y.name !== name) })), [setS]);

  const callClaude = async (prompt) => {
    const ck = `food:${q.trim().toLowerCase()}`;
    try { const hit = sessionStorage.getItem("ascend-ai:" + ck); if (hit) return JSON.parse(hit); } catch (e) { /* */ }
    const data = await claudeChat({ max_tokens: 280, messages: [{ role: "user", content: prompt }] });
    const texts = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
    const joined = texts.join("\n").replace(/```json|```/g, "");
    const match = joined.match(/\{[\s\S]*\}/g);
    if (!match) throw new Error("no json");
    const parsed = JSON.parse(match[match.length - 1]);
    try { sessionStorage.setItem("ascend-ai:" + ck, JSON.stringify(parsed)); } catch (e) { /* */ }
    return parsed;
  };

  const estimate = async () => {
    setLoading("estimate"); setErr(""); setFound(null);
    try {
      const food = await callClaude(`Estimate nutrition for this food or meal as one serving: "${q}". Use typical US portions if none given. Respond ONLY with JSON, no markdown: {"name": short descriptive name with portion, "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat}`);
      setFound({ name: String(food.name || q).slice(0, 70), cal: Math.round(+food.cal || 0), p: Math.round(+food.p || 0), c: Math.round(+food.c || 0), f: Math.round(+food.f || 0), source: "ai" });
    } catch (e) {
      setErr("Couldn't get an estimate. Try describing it differently, like \"2 slices pepperoni pizza\".");
    }
    setLoading(null);
  };

  const lookup = async () => {
    setLoading("lookup"); setErr(""); setFound(null);
    try {
      const food = await callClaude(`Published-style nutrition for this restaurant menu item: "${q}". User is in Austin, Texas (P. Terry's, Torchy's, Whataburger, Tacodeli, Chuy's, Kerbey Lane, Pluckers, Tumble 22, Taco Cabana are likely). Prefer typical published values for that chain. Respond ONLY with JSON: {"name": "Restaurant item name (portion)", "restaurant": "Restaurant", "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat, "source": "official" or "third-party" or "estimate", "note": "under 12 words"}`);
      setFound({ name: String(food.name || q).slice(0, 70), r: food.restaurant || "", cal: Math.round(+food.cal || 0), p: Math.round(+food.p || 0), c: Math.round(+food.c || 0), f: Math.round(+food.f || 0), source: food.source, note: food.note });
    } catch (e) {
      setErr("Couldn't find that one online. Try adding the restaurant name, like \"Tacodeli Cowboy taco\".");
    }
    setLoading(null);
  };

  const saveAndAdd = (food) => {
    const clean = { name: food.name, r: food.r, cal: food.cal, p: food.p, c: food.c, f: food.f, approx: food.source !== "official" };
    setS((x) => ({ ...x, savedFoods: [clean, ...(x.savedFoods || []).filter((y) => y.name !== clean.name)].slice(0, 60) }));
    publishShared(`food:${slug(clean.name)}`, { ...clean, by: s.profile.name || "a player", t: Date.now() });
    onAdd(clean);
  };

  if (building) return <MealBuilder s={s} setS={setS} pool={[...saved, ...community, ...RESTAURANT_FOODS, ...FOODS]} onBack={() => setBuilding(false)} onDone={(meal) => { setBuilding(false); onAdd(meal); }} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back to Fuel" onClick={onClose} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div>
          <h1 className="text-2xl font-bold glowtext">Add food</h1>
          <div className="body text-xs" style={{ color: C.dim }}>Adding to {dayLabel}</div>
        </div>
      </div>

      <input autoFocus className="inp" placeholder="Search, e.g. P. Terry's double" value={q} onChange={(e) => { setQ(e.target.value); setFound(null); setErr(""); }} {...D.fuelBind("fuel-search")} data-diag="fuel-search" />
      {D.on() && <DiagProbe kind="fuel-search" />}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setScanning(true)} className="btn py-3 text-xs flex items-center justify-center gap-1"><Camera size={16} />Meal photo</button>
        <button onClick={() => barRef.current?.click()} disabled={!!loading} className="ghost py-3 text-xs font-bold flex items-center justify-center gap-1" style={{ color: C.cyan }}>{loading === "barcode" ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}Barcode</button>
        <button onClick={() => setBuilding(true)} className="ghost py-3 text-xs font-bold flex items-center justify-center gap-1" style={{ color: C.cyan }}><ChefHat size={16} />Recipe</button>
      </div>
      <input ref={barRef} type="file" accept="image/*" capture="environment" onChange={onBarcode} style={{ display: "none" }} />
      {loading === "barcode" && <div className="body text-xs" style={{ color: C.dim }}>Reading the barcode and looking up the product…</div>}
      {scanning && <PhotoScan sState={s} onShare onCancel={() => setScanning(false)} onAddAll={(items) => { items.forEach((it) => onAdd({ name: it.name, cal: it.cal, p: it.p, c: it.c, f: it.f })); }} />}
      {q.trim().length > 2 && !found && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={lookup} disabled={!!loading} className="p-3 flex items-center gap-2 font-semibold text-left text-sm" style={{ background: C.accentBg, color: C.cyan, border: `1px solid ${C.blue}`, borderRadius: 4 }}>
            {loading === "lookup" ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Globe size={18} className="shrink-0" />}
            {loading === "lookup" ? "Searching menus…" : "Look up restaurant online"}
          </button>
          <button onClick={estimate} disabled={!!loading} className="ghost p-3 flex items-center gap-2 font-semibold text-left text-sm" style={{ color: C.text }}>
            {loading === "estimate" ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Sparkles size={18} className="shrink-0" />}
            {loading === "estimate" ? "Estimating…" : "Quick AI estimate"}
          </button>
        </div>
      )}
      {loading === "lookup" && <div className="body text-xs" style={{ color: C.dim }}>Checking restaurant nutrition pages. This can take 10–20 seconds.</div>}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}

      {found && (
        <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
          <div className="font-bold">{found.name}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[["cal", "Cal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]].map(([k, l]) => (
              <label key={k} className="body text-xs" style={{ color: C.dim }}>{l}
                <NumField inputMode="decimal" className="inp text-center mt-1 font-bold" value={found[k]} onCommit={(v) => setFound({ ...found, [k]: v })} {...D.fuelBind("fuel-found")} />
              </label>
            ))}
          </div>
          <div className="body text-xs" style={{ color: found.source === "official" || found.r === "Scanned" ? C.green : found.source === "ai" ? C.dim : C.orange }}>
            {found.source === "ai" ? "AI estimate. Fix any number that looks off before adding." : found.source === "official" ? "From the restaurant's published nutrition" : found.source === "third-party" ? "From a third-party nutrition site" : found.r === "Scanned" ? "From the product's barcode listing" : "Estimate, since this restaurant doesn't publish nutrition"}{found.note ? ` · ${found.note}` : ""}
          </div>
          {found.source === "ai" ? (
            <div className="grid grid-cols-2 gap-2"><button onClick={() => saveAndAdd(found)} className="ghost py-3 text-sm font-bold">Add and save</button><button onClick={() => onAdd({ name: found.name, cal: found.cal, p: found.p, c: found.c, f: found.f, approx: true })} className="btn py-3">Add to {dayLabel}</button></div>
          ) : (
            <button onClick={() => saveAndAdd(found)} className="btn w-full py-3">Add and save</button>
          )}
          <PublishMealToggle s={s} food={found} ai={found.source === "ai"} />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["All", "Meals", "Community feed", ...(saved.length ? ["Saved"] : []), "Community", ...RESTAURANTS, "Basics"].map((g) => (
          <button key={g} onClick={() => setSrc(g)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1" style={{ borderRadius: 4, background: src === g ? C.blue : C.soft, color: src === g ? "#fff" : C.text, border: `1px solid ${C.border}` }}>
            {RESTAURANTS.includes(g) && <Store size={13} />}{g}
          </button>
        ))}
      </div>

      {!needle && src === "All" && recent.length > 0 && (
        <>
          <div className="body text-xs font-semibold pt-1" style={{ color: C.dim }}>Recent</div>
          <div className="space-y-2">{recent.map((f) => <FoodPickRow key={`r-${f.name}`} f={f} onAdd={onAdd} />)}</div>
          <div className="body text-xs font-semibold pt-2" style={{ color: C.dim }}>Everything</div>
        </>
      )}

      {src === "Community feed" && <CommunityMeals s={s} setS={setS} onAdd={onAdd} />}
      {src !== "Community feed" && list.length === 0 && <Empty>No match here. Tap "Look up restaurant online" to search the restaurant's nutrition info.</Empty>}
      {src !== "Community feed" && list.length > 0 && (
        <FoodResultList items={list} savedNames={savedNames} onAdd={onAdd} onRemoveSaved={onRemoveSaved} />
      )}
      <div className="body text-xs pt-2" style={{ color: C.mute }}>Built-in restaurant numbers come from published nutrition info as of September 2026. Items marked approx. are less certain, and portions vary by location.</div>
    </div>
  );
}

