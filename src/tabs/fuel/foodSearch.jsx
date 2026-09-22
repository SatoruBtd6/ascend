import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { C } from "../../theme.js";
import { SEARCH_CAP } from "../train/searchCap.js";
export const EMPTY_ARR = [];
export const foodNorm = (n) => String(n || "").toLowerCase().replace(/[’']/g, "");

export const FoodResultList = React.memo(function FoodResultList({ items, savedNames, onAdd, onRemoveSaved }) {
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); }, [items]);
  const cap = more ? items.length : SEARCH_CAP;
  const shown = items.slice(0, cap);
  return (
    <>
      <div className="space-y-2">
        {shown.map((f) => (
          <div key={`${f.r || "b"}-${f.name}`} className="ghost flex items-center">
            <button onClick={() => onAdd(f)} className="flex-1 text-left p-3 min-w-0">
              <div className="font-semibold">{f.meal ? "🥤 " : ""}{f.name}</div>
              <div className="body text-xs" style={{ color: C.dim }}>{f.cal} cal · P {f.p} · C {f.c} · F {f.f}{f.meal ? ` · meal · ${(f.ingredients || []).length} ingredients` : ""}{f.approx ? " · approx." : ""}{f.community && f.by ? ` · by ${f.by}` : ""}</div>
            </button>
            {savedNames?.has(f.name) && onRemoveSaved && <button aria-label={`Remove ${f.name} from saved`} onClick={() => onRemoveSaved(f.name)} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      {items.length > SEARCH_CAP && !more && (
        <button type="button" className="ghost w-full py-2 text-sm font-bold" onClick={() => setMore(true)}>Show more ({items.length - SEARCH_CAP})</button>
      )}
    </>
  );
});
