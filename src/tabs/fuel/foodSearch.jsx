import React, { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { C } from "../../theme.js";
import { SEARCH_CAP } from "../train/searchCap.js";
export const EMPTY_ARR = [];
export const foodNorm = (n) => String(n || "").toLowerCase().replace(/[’']/g, "");

export const FoodResultList = React.memo(function FoodResultList({ items, savedNames, onAdd, onRemoveSaved, onEditSaved }) {
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); }, [items]);
  const cap = more ? items.length : SEARCH_CAP;
  const shown = items.slice(0, cap);
  return (
    <>
      <div>
        {shown.map((f, i) => (
          <div key={`${f.r || "b"}-${f.name}`} className="flex items-center" style={{ minHeight: 56, borderTop: i ? "1px solid rgba(255,255,255,.08)" : "none" }}>
            <button onClick={() => onAdd(f)} className="flex-1 text-left min-w-0 py-1.5">
              <div className="font-semibold truncate" style={{ fontSize: 15 }}>{f.meal ? "🥤 " : ""}{f.name}</div>
              <div className="body text-xs truncate" style={{ color: C.dim }}>{f.cal} cal · P {f.p} · C {f.c} · F {f.f}{f.meal ? ` · meal · ${(f.ingredients || []).length} ingredients` : ""}{f.approx ? " · approx." : ""}{f.community && f.by ? ` · by ${f.by}` : ""}</div>
            </button>
            {f.meal && savedNames?.has(f.name) && onEditSaved && <button aria-label={`Edit ${f.name}`} onClick={() => onEditSaved(f)} className="flex items-center justify-center shrink-0" style={{ color: C.mute, minWidth: 44, minHeight: 44 }}><Pencil size={15} /></button>}
            {savedNames?.has(f.name) && onRemoveSaved && <button aria-label={`Remove ${f.name} from saved`} onClick={() => onRemoveSaved(f.name)} className="flex items-center justify-center shrink-0" style={{ color: C.mute, minWidth: 44, minHeight: 44 }}><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      {items.length > SEARCH_CAP && !more && (
        <button type="button" className="ghost w-full py-2 text-sm font-bold" onClick={() => setMore(true)}>Show more ({items.length - SEARCH_CAP})</button>
      )}
    </>
  );
});
