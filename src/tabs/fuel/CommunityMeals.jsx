import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { C } from "../../theme.js";
import { ask } from "../../lib/ask.js";
import { Empty } from "../../ui/primitives.jsx";
import { readShared } from "../train/social.js";
export function CommunityMeals({ s, setS, onAdd }) {
  const [items, setItems] = useState(null);
  const [scale, setScale] = useState({});
  useEffect(() => { readShared("cmeal:").then((r) => setItems(r.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 30))); }, []);
  if (items === null) return <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading community meals…</div>;
  if (!items.length) return <Empty>No shared meals yet. After a photo scan or AI estimate, flip "Publish to Community Feed" to put it here.</Empty>;
  return (
    <div className="space-y-2">
      {items.map((m) => {
        const k = scale[m.key] ?? 1;
        const v = (n) => Math.round((n || 0) * k);
        return (
          <div key={m.key} className="panel p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0"><div className="font-semibold truncate">{m.name}</div><div className="body text-xs" style={{ color: C.dim }}>by {m.by}{m.ingredients?.length ? ` · ${m.ingredients.length} ingredients` : ""}</div></div>
              {m.from === s.playerId && <button aria-label="Delete" onClick={() => ask("Remove this from the community feed?", async () => { try { await window.storage.delete(m.key, true); window.storage.delete(`feed:${m.from}_meal_${m.key.slice(6)}`, true).catch(() => {}); setItems((x) => x.filter((y) => y.key !== m.key)); } catch (e) { /* ignore */ } }, "Delete")} style={{ color: C.mute }}><Trash2 size={14} /></button>}
            </div>
            <div className="body text-sm" style={{ color: C.sub }}>{v(m.cal)} cal · P {v(m.p)} · C {v(m.c)} · F {v(m.f)}</div>
            <div className="flex items-center gap-2">
              <input type="range" min="0.25" max="2" step="0.25" value={k} onChange={(e) => setScale({ ...scale, [m.key]: +e.target.value })} className="flex-1" style={{ accentColor: C.cyan }} aria-label="Portion size" />
              <span className="body text-xs tabular-nums w-10 text-right" style={{ color: C.dim }}>{k}×</span>
              <button onClick={() => onAdd({ name: `${m.name}${k !== 1 ? ` (${k}×)` : ""}`, cal: v(m.cal), p: v(m.p), c: v(m.c), f: v(m.f), ingredients: m.ingredients || undefined, meal: !!m.ingredients })} className="btn px-3 py-1.5 text-xs">Copy meal</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
