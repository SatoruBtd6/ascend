import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { readShared } from "./social.js";
export function SharedPresets({ s, setS }) {
  const [items, setItems] = useState([]);
  useEffect(() => { readShared("preset:").then((r) => setItems(r.filter((x) => x.to === s.playerId))); }, []);
  if (!items.length) return null;
  const save = async (it) => { setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== it.name), { id: uid(), name: it.name, exercises: it.exercises }] })); try { await window.storage.delete(it.key, true); } catch (e) { /* ignore */ } setItems((x) => x.filter((y) => y.key !== it.key)); };
  return (
    <div className="space-y-1">
      <div className="body text-xs font-bold" style={{ color: C.cyan }}>Shared with you</div>
      {items.map((it) => <div key={it.key} className="ghost flex items-center"><div className="flex-1 p-2 min-w-0"><div className="font-semibold text-sm">{it.name} <span className="body text-xs font-normal" style={{ color: C.dim }}>from {it.fromName}</span></div><div className="body text-xs truncate" style={{ color: C.dim }}>{it.exercises.map((e) => `${e.name} ×${e.sets}`).join(" · ")}</div></div><button onClick={() => save(it)} className="btn px-3 py-1.5 text-xs mr-2">Save</button></div>)}
    </div>
  );
}

/* ---------- Sterling weekly plan ---------- */
