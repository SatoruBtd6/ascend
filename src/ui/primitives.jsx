import { X } from "lucide-react";
import { C } from "../theme.js";
/* ---------- Shared bits ---------- */
export const Bar = ({ pct, color = C.blue }) => (
  <div className="h-2 overflow-hidden" style={{ background: C.track, borderRadius: 2 }}>
    <div className="h-full barfill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color, boxShadow: `0 0 10px ${color}`, transition: "width .5s", borderRadius: 2 }} />
  </div>
);
export const Title = ({ children, right }) => (
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold tracking-wide glowtext" style={{ color: C.text }}>{children}</h1>{right}
  </div>
);
export const Empty = ({ children }) => <div className="panel p-5 body text-sm" style={{ color: C.dim }}>{children}</div>;

export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.7)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-auto p-4 max-h-[80vh] overflow-y-auto" style={{ background: C.sheet, borderTop: `1px solid ${C.blue}`, boxShadow: `0 -10px 40px ${C.line}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">{title}</h3><button aria-label="Close" onClick={onClose}><X /></button></div>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}
export const Stat = ({ label, value, panel }) => (
  <div className={panel ? "panel p-3" : ""}>
    <div className="text-xs" style={{ color: C.dim }}>{label}</div>
    <div className="text-lg font-bold" style={{ fontFamily: "'Oxanium',sans-serif" }}>{value}</div>
  </div>
);
export function SettingsToggle({ on, onClick, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className="relative shrink-0" style={{ width: 50, height: 28, borderRadius: 999, background: on ? C.cyan : C.track, border: `1px solid ${C.border}`, boxShadow: on ? `0 0 12px ${C.glow}` : "none", transition: "background .2s" }}>
      <span className="absolute top-0.5" style={{ left: on ? 24 : 2, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
    </button>
  );
}
