import { useState } from "react";
import { C } from "../../theme.js";
import { Sheet } from "../../ui/primitives.jsx";
export function platesFor(total, bar = 45) {
  let side = (total - bar) / 2;
  if (side < 0) return null;
  const out = [];
  [45, 35, 25, 10, 5, 2.5].forEach((p) => { while (side >= p - 1e-9) { out.push(p); side -= p; } });
  return out;
}
export function PlateSheet({ weight, onClose }) {
  const [w, setW] = useState(weight || 135);
  const [bar, setBar] = useState(45);
  const plates = platesFor(+w || 0, bar);
  return (
    <Sheet title="Plate calculator" onClose={onClose}>
      <div className="flex gap-2 items-center">
        <input type="text" inputMode="decimal" className="inp text-center text-xl font-bold" value={w} onChange={(e) => setW(e.target.value)} aria-label="Total weight" />
        <span className="body text-sm" style={{ color: C.dim }}>lb total</span>
      </div>
      <div className="flex gap-2">{[45, 35, 15].map((b) => <button key={b} onClick={() => setBar(b)} className="flex-1 py-2 text-sm font-semibold" style={{ borderRadius: 4, background: bar === b ? C.blue : C.soft, color: bar === b ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{b} lb bar</button>)}</div>
      {plates === null ? <div className="body text-sm" style={{ color: C.dim }}>Lighter than the bar.</div> : (
        <div className="panel p-3">
          <div className="body text-xs mb-2" style={{ color: C.dim }}>Per side</div>
          <div className="flex items-end gap-1 justify-center" style={{ height: 90 }}>
            {plates.length === 0 && <span className="body text-sm" style={{ color: C.dim }}>Just the bar</span>}
            {plates.map((p, i) => <div key={i} className="flex items-end justify-center font-bold text-xs" style={{ width: p >= 25 ? 22 : 16, height: p >= 45 ? 90 : p >= 35 ? 78 : p >= 25 ? 64 : p >= 10 ? 46 : p >= 5 ? 36 : 28, borderRadius: 4, background: p >= 45 ? "#2F6BFF" : p >= 35 ? "#FFD447" : p >= 25 ? "#3DF08A" : p >= 10 ? "#fff" : p >= 5 ? "#FF2D6F" : "#9AA7BD", color: p >= 10 && p < 25 ? "#000" : "#fff", paddingBottom: 4 }}>{p}</div>)}
          </div>
          <div className="text-center font-bold mt-2">{plates.join(" + ") || "0"} each side{plates.length ? ` · ${(+w - bar) / 2} lb per side` : ""}</div>
        </div>
      )}
    </Sheet>
  );
}
