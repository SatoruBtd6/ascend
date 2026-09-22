import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { C } from "../../theme.js";
import { exKey } from "../../math.js";
import { GROUPS } from "../../data/ranks.js";
import { allExercises } from "../../lib/exercises.js";
import { ask } from "../../lib/ask.js";
import { Empty } from "../../ui/primitives.jsx";
import { publishShared, slug } from "./social.js";
import { ExResultList } from "./ExResultList.jsx";
export function ExercisePicker({ s, setS, onPick, onBack }) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [group, setGroup] = useState("All");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);

  const catalog = useMemo(() => allExercises(s).map((e) => ({ e, n: e.name.toLowerCase() })), [s.custom, s.community, s.workouts]);
  const needle = deferredQ.trim().toLowerCase();
  const needleKey = exKey(q.trim());
  const list = useMemo(() => catalog.filter(({ e, n }) =>
    (group === "All" || (group === "Custom" ? e.custom : group === "Community" ? e.community : e.group === group)) && (!needle || n.includes(needle) || (needleKey && exKey(e.name).includes(needleKey)))).map((x) => x.e), [catalog, group, needle, needleKey]);
  const exact = !!needle && catalog.some(({ e, n }) => n === needle || (needleKey && exKey(e.name) === needleKey));
  const onDeleteCustom = useCallback((name) => ask(`Delete custom exercise "${name}"? Past workouts keep it.`, () => setS((p) => ({ ...p, custom: p.custom.filter((c) => c.name !== name) })), "Delete"), [setS]);

  const estimate = async () => {
    setLoading(true); setErr(""); setDraft(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          messages: [{ role: "user", content: `A gym app needs details for this exercise: "${q.trim()}".
Respond ONLY with JSON, no markdown:
{"name": clean title-case exercise name,
 "group": one of "Chest","Back","Legs","Shoulders","Arms","Core","Cardio",
 "type": "weighted" (tracked as lb x reps), "bodyweight" (tracked as reps), or "timed" (tracked in minutes, e.g. cardio, holds, sports),
 "perHand": true if people normally count the weight per hand (dumbbells, kettlebells, single-arm cables), false for barbells, machines, two-handed cables, and plate-loaded stacks,
 "factor": for weighted only, how an elite lifter's one-rep max on this exercise compares to their bench press max, using the weight as it is entered (per hand if perHand is true). Examples: bench press = 1.0, squat = 1.25, deadlift = 1.45, overhead press = 0.63, barbell curl = 0.45, dumbbell curl per hand = 0.2, lateral raise per hand = 0.1, reverse fly machine = 0.5, rear delt dumbbell fly per hand = 0.09, machine crunch = 1.3, leg press = 2.4, chest press machine = 1.1. Machines with light-feeling stacks should get higher factors. Use 0 if not weighted,
 "xp": XP value. For weighted/bodyweight: XP per set from 5 (small isolation) to 20 (heavy full-body compound). For timed: XP per minute from 3 (easy) to 10 (very intense),
 "why": one short sentence explaining the XP value}` }],
        }),
      });
      const data = await res.json();
      const text = data.content.map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
      const r = JSON.parse(text);
      const type = ["weighted", "bodyweight", "timed"].includes(r.type) ? r.type : "weighted";
      setDraft({
        name: String(r.name || q).slice(0, 40), group: GROUPS.includes(r.group) ? r.group : "Core", type,
        factor: type === "weighted" ? Math.min(3, Math.max(0.1, +r.factor || 0.5)) : undefined, reps: type === "bodyweight" ? 1 : undefined, perHand: type === "weighted" && !!r.perHand,
        xp: Math.round(Math.min(type === "timed" ? 10 : 20, Math.max(type === "timed" ? 2 : 4, +r.xp || 8))),
        why: r.why || "", custom: true,
      });
    } catch (e) {
      setErr("Couldn't estimate that one. Try a clearer name, like \"cable lateral raise\".");
    }
    setLoading(false);
  };

  const saveDraft = () => {
    const wanted = draft.name.trim();
    const hit = allExercises(s).find((e) => exKey(e.name) === exKey(wanted));
    if (hit) {
      setErr(`That's the same as "${hit.name}". Added that instead of a duplicate.`);
      onPick(hit.name);
      return;
    }
    const name = wanted;
    const ex = { ...draft, name };
    delete ex.why;
    setS((p) => ({ ...p, custom: [...(p.custom || []), ex] }));
    publishShared(`ex:${slug(name)}`, { ...ex, custom: false, by: s.profile.name || "a player", t: Date.now() });
    onPick(name);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back to workout" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Add exercise</h1>
      </div>

      <input autoFocus className="inp" placeholder="Search, or type any exercise" value={q} onChange={(e) => { setQ(e.target.value); setDraft(null); setErr(""); }} />

      {q.trim().length > 2 && !exact && !draft && (
        <button onClick={estimate} disabled={loading} className="w-full p-3 flex items-center gap-2 font-semibold text-left" style={{ background: C.accentBg, color: C.cyan, border: `1px solid ${C.blue}`, borderRadius: 4 }}>
          {loading ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Sparkles size={18} className="shrink-0" />}
          {loading ? "Rating this exercise…" : `Create "${q.trim()}" and estimate its XP`}
        </button>
      )}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}

      {draft && (
        <div className="panel p-4 space-y-3" style={{ borderColor: C.cyan }}>
          <input className="inp font-bold" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Exercise name" />
          <div className="grid grid-cols-2 gap-2 body text-sm">
            <label>Muscle group<select className="inp mt-1" value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label>Tracked as<select className="inp mt-1" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, factor: e.target.value === "weighted" ? draft.factor || 0.5 : undefined })}>
              <option value="weighted">Weight × reps</option><option value="bodyweight">Reps</option><option value="timed">Minutes</option></select></label>
          </div>
          {draft.type === "weighted" && (
            <div className="grid grid-cols-2 gap-2">
              {[[false, "Total weight (bar / machine)"], [true, "Per hand (dumbbells)"]].map(([v, l]) => (
                <button key={String(v)} onClick={() => setDraft({ ...draft, perHand: v, factor: draft.perHand === v ? draft.factor : (v ? draft.factor / 2 : draft.factor * 2) })} className="py-2 text-xs font-semibold" style={{ borderRadius: 4, background: !!draft.perHand === v ? C.blue : C.soft, color: !!draft.perHand === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>
              ))}
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="body text-sm" style={{ color: C.dim }}>Worth</span>
            <span className="text-xl font-bold" style={{ color: C.gold }}>{draft.xp} XP per {draft.type === "timed" ? "minute" : "set"}</span>
          </div>
          {draft.why && <div className="body text-xs" style={{ color: C.dim }}>{draft.why}</div>}
          <button onClick={saveDraft} disabled={!draft.name.trim()} className="btn w-full py-3">Save and add to workout</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {["All", ...GROUPS, "Custom", "Community"].map((g) => (
          <button key={g} onClick={() => setGroup(g)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 4, background: group === g ? C.blue : C.soft, color: group === g ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{g}</button>
        ))}
      </div>

      {list.length === 0 && <Empty>{group === "Custom" && !q ? "No custom exercises yet. Type any exercise above to create one." : group === "Community" && !q ? "Nothing shared yet. Custom exercises anyone creates show up here for everyone." : "No match. Tap create above to add it as a custom exercise."}</Empty>}
      {list.length > 0 && (
        <ExResultList items={list} onPick={onPick} onDeleteCustom={onDeleteCustom} />
      )}
    </div>
  );
}
