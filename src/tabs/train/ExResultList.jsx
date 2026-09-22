import React, { useState, useEffect } from "react";
import { Trash2, Youtube } from "lucide-react";
import { C } from "../../theme.js";
import { SEARCH_CAP } from "./searchCap.js";
import { ytUrl } from "./yt.js";
export const ExResultList = React.memo(function ExResultList({ items, onPick, onDeleteCustom }) {
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); }, [items]);
  const cap = more ? items.length : SEARCH_CAP;
  const shown = items.slice(0, cap);
  return (
    <>
      <div className="space-y-2">
        {shown.map((e) => (
          <div key={e.name} className="ghost flex items-center">
            <button onClick={() => onPick(e.name)} className="flex-1 text-left p-3 flex justify-between items-center gap-2">
              <span className="font-semibold">{e.name}</span>
              <span className="body text-xs whitespace-nowrap" style={{ color: C.mute }}>{e.group}{e.perHand ? " · per hand" : ""}{e.community && e.by ? ` · by ${e.by}` : ""}</span>
            </button>
            <a href={ytUrl(e.name)} target="_blank" rel="noreferrer" aria-label={`How to do ${e.name} on YouTube`} className="px-2" style={{ color: C.mute }}><Youtube size={16} /></a>
            {e.custom && onDeleteCustom && (
              <button aria-label={`Delete ${e.name}`} onClick={() => onDeleteCustom(e.name)} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </div>
      {items.length > SEARCH_CAP && !more && (
        <button type="button" className="ghost w-full py-2 text-sm font-bold" onClick={() => setMore(true)}>Show more ({items.length - SEARCH_CAP})</button>
      )}
    </>
  );
});
