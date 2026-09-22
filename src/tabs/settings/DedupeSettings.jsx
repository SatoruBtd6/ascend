import { useMemo, useState } from "react";
import { EXERCISES } from "../../data/exercises.js";
import { ask } from "../../lib/ask.js";
import { accountExerciseNames, applyExerciseMerge, duplicateExerciseGroups, withSilentRankSnap } from "../../math.js";
import { C } from "../../theme.js";
import { applyPrXpRecount } from "../train/xpRecount.js";
import { XpSync } from "../../lib/xpSync.js";
export function DedupeSettings({ s, setS }) {
  const catalogNames = useMemo(() => EXERCISES.map((e) => e.name), []);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [manA, setManA] = useState("");
  const [manB, setManB] = useState("");
  const names = useMemo(() => [...accountExerciseNames(s)].sort((a, b) => a.localeCompare(b)), [s.workouts, s.custom, s.presets, s.active, s.lastSummary, s.gymSpecific]);
  const load = () => {
    setGroups(duplicateExerciseGroups(s, catalogNames).map((g) => ({ ...g, skip: false })));
    setOpen(true);
  };
  const apply = () => {
    const chosen = groups.filter((g) => !g.skip && g.canonical);
    if (!chosen.length) { setOpen(false); return; }
    ask("Rewrite every stored name in the ticked groups to the canonical name? Custom definitions that get absorbed are removed.", () => {
      setS((p) => {
        const merged = applyExerciseMerge(p, chosen, catalogNames);
        const names = [...new Set(chosen.flatMap((g) => [g.canonical, ...(g.names || [])]).filter(Boolean))];
        const r = applyPrXpRecount(merged, { names, banner: false });
        try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
        return withSilentRankSnap(r.s);
      });
      setOpen(false);
    }, "Apply");
  };
  const addManual = () => {
    if (!manA || !manB || manA === manB) return;
    setGroups((gs) => [...gs, { key: `manual-${manA}-${manB}`, names: [manA, manB], canonical: manB, options: [{ name: manA, sessions: 0 }, { name: manB, sessions: 0 }], skip: false }]);
    setManA(""); setManB("");
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="body text-xs" style={{ color: C.dim }}>Search already hides near-duplicates. This rewrite merges names that already appear in your history, presets, and custom list.</div>
      {!open ? <button type="button" onClick={load} className="ghost w-full py-3 font-bold" style={{ color: C.cyan }}>Clean up duplicate exercises</button> : (
        <>
          {groups.length === 0 && <div className="body text-sm" style={{ color: C.dim }}>No automatic duplicates. You can still merge two names by hand.</div>}
          {groups.map((g, i) => (
            <div key={g.key} className="space-y-1 py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={!g.skip} onChange={() => setGroups((gs) => gs.map((x, j) => j === i ? { ...x, skip: !x.skip } : x))} />
                Merge group
              </label>
              {(g.options || g.names.map((n) => ({ name: n, sessions: 0 }))).map((o) => (
                <label key={o.name} className="flex items-center gap-2 body text-sm pl-1">
                  <input type="radio" name={`canon-${g.key}`} checked={g.canonical === o.name} onChange={() => setGroups((gs) => gs.map((x, j) => j === i ? { ...x, canonical: o.name } : x))} />
                  <span className="flex-1 min-w-0 truncate">{o.name}</span>
                  <span style={{ color: C.mute }}>{o.sessions || 0} sessions{o.catalog ? " · catalog" : ""}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="body text-xs font-bold" style={{ color: C.dim }}>Merge two differently-named exercises</div>
          <div className="grid grid-cols-2 gap-2">
            <select className="inp text-sm" value={manA} onChange={(e) => setManA(e.target.value)} aria-label="Merge from"><option value="">From</option>{names.map((n) => <option key={`a-${n}`} value={n}>{n}</option>)}</select>
            <select className="inp text-sm" value={manB} onChange={(e) => setManB(e.target.value)} aria-label="Merge into"><option value="">Into</option>{names.map((n) => <option key={`b-${n}`} value={n}>{n}</option>)}</select>
          </div>
          <button type="button" disabled={!manA || !manB || manA === manB} onClick={addManual} className="ghost w-full py-2 text-sm font-bold">Add manual pair</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ghost py-2 text-sm font-bold">Cancel</button>
            <button type="button" onClick={apply} className="btn py-2 text-sm">Apply</button>
          </div>
        </>
      )}
    </div>
  );
}
