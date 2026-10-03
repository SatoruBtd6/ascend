import { Trash2 } from "lucide-react";
import { C } from "../../theme.js";
export function FoodPickRow({ f, onAdd, onDelete, first }) {
  return (
    <div className="flex items-center" style={{ minHeight: 56, borderTop: first ? "none" : "1px solid rgba(255,255,255,.08)" }}>
      <button onClick={() => onAdd(f)} className="flex-1 text-left min-w-0 py-1.5">
        <div className="font-semibold truncate" style={{ fontSize: 15 }}>{f.meal ? "🥤 " : ""}{f.name}</div>
        <div className="body text-xs truncate" style={{ color: C.dim }}>{f.cal} cal · P {f.p} · C {f.c} · F {f.f}{f.meal ? ` · meal · ${(f.ingredients || []).length} ingredients` : ""}{f.approx ? " · approx." : ""}{f.community && f.by ? ` · by ${f.by}` : ""}</div>
      </button>
      {onDelete && <button aria-label={`Remove ${f.name} from saved`} onClick={onDelete} className="flex items-center justify-center shrink-0" style={{ color: C.mute, minWidth: 44, minHeight: 44 }}><Trash2 size={16} /></button>}
    </div>
  );
}
