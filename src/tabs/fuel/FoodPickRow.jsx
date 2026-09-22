import { Trash2 } from "lucide-react";
import { C } from "../../theme.js";
export function FoodPickRow({ f, onAdd, onDelete }) {
  return (
    <div className="ghost flex items-center">
      <button onClick={() => onAdd(f)} className="flex-1 text-left p-3 min-w-0">
        <div className="font-semibold">{f.meal ? "🥤 " : ""}{f.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{f.cal} cal · P {f.p} · C {f.c} · F {f.f}{f.meal ? ` · meal · ${(f.ingredients || []).length} ingredients` : ""}{f.approx ? " · approx." : ""}{f.community && f.by ? ` · by ${f.by}` : ""}</div>
      </button>
      {onDelete && <button aria-label={`Remove ${f.name} from saved`} onClick={onDelete} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>}
    </div>
  );
}
