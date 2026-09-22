import { Minus, Plus } from "lucide-react";
import { C } from "../../theme.js";
export function IntervalStepper({ label, value, set, step, min, max, fmt, disabled }) {
  return (
    <div className="panel p-3">
      <div className="body text-xs" style={{ color: C.dim }}>{label}</div>
      <div className="flex items-center justify-between mt-1">
        <button aria-label={`Less ${label}`} disabled={disabled} onClick={() => set(Math.max(min, value - step))} className="ghost w-9 h-9 flex items-center justify-center"><Minus size={16} /></button>
        <span className="text-xl font-bold tabular-nums">{fmt(value)}</span>
        <button aria-label={`More ${label}`} disabled={disabled} onClick={() => set(Math.min(max, value + step))} className="ghost w-9 h-9 flex items-center justify-center"><Plus size={16} /></button>
      </div>
    </div>
  );
}
