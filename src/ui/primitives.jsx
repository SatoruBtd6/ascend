import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { C } from "../theme.js";
/* ---------- Shared bits ---------- */
// Apple-style collapsible row: title + count + chevron on the page background.
// Content unmounts ~260ms after close (lets the collapse animate, then frees
// canvases/listeners). keepMounted mounts eagerly — for sections whose row
// count needs the child's async load.
export function Disclosure({ title, right, open, onToggle, keepMounted, children }) {
  const [mounted, setMounted] = useState(!!open || !!keepMounted);
  useEffect(() => {
    if (open || keepMounted) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open, keepMounted]);
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 52 }}>
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 17, color: C.text }}>{title}</span>
        {right != null && right !== "" && <span className="body tabular-nums truncate shrink-0" style={{ fontSize: 15, color: C.mute, maxWidth: "45%" }}>{right}</span>}
        <ChevronRight size={18} className="shrink-0" style={{ color: C.mute, transform: open ? "rotate(90deg)" : "none", transition: "transform .25s ease-out" }} />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
        <div style={{ overflow: "hidden", minHeight: 0, opacity: open ? 1 : 0, transition: "opacity .22s ease-out" }}>
          {mounted ? children : null}
        </div>
      </div>
    </div>
  );
}
export const Bar = ({ pct, color = C.blue, h = 8 }) => {
  const r = h <= 4 ? h / 2 : 2;
  return (
    <div className="overflow-hidden" style={{ height: h, background: C.track, borderRadius: r }}>
      <div className="h-full barfill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color, boxShadow: `0 0 10px ${color}`, transition: "width .5s", borderRadius: r }} />
    </div>
  );
};
// Compact claim action for decluttered rows — same gold treatment as the old
// full-width button, 32px tall, right-aligned on the progress line.
export const ClaimBtn = ({ onClick, children = "Claim" }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.(); }} className="shrink-0 font-bold" style={{ height: 32, padding: "0 16px", borderRadius: 999, background: C.gold, color: "#0A1630", fontSize: 14, boxShadow: "0 0 16px rgba(255,212,71,.5)" }}>{children}</button>
);
// 32px visual pill on a 44px tap target — the Train mid-workout chip shape.
export const CHIP = { height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${C.glassLine}`, background: C.glass, fontSize: 14, fontWeight: 600 };
// Bare icon/label button with a 44px tap target; always stopPropagation so it
// can live inside an expandable row. tight pulls its margins in so the row
// height stays compact.
export const Tap = ({ children, onClick, disabled, label, menu, tight }) => (
  <button type="button" aria-label={label} aria-haspopup={menu ? "menu" : undefined} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick?.(e); }} className="inline-flex items-center justify-center shrink-0" style={{ minWidth: 44, height: 44, padding: 0, margin: tight ? "-11px 0" : 0, background: "none", border: "none", opacity: disabled ? 0.45 : 1 }}>{children}</button>
);
// 44px "More"/"Chart"/"Sharing" expand row: grey 14px label, rotating chevron.
export const MoreRow = ({ label, right, open, onToggle }) => (
  <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 text-left" style={{ height: 44 }}>
    <span className="body" style={{ fontSize: 14, color: C.mute }}>{label}</span>
    {right != null && <span className="body flex-1 min-w-0 truncate text-right" style={{ fontSize: 14, color: C.mute }}>{right}</span>}
    <ChevronRight size={16} className="shrink-0 ml-auto" style={{ color: C.mute, transform: open ? "rotate(90deg)" : "none", transition: "transform .25s ease-out", marginLeft: "auto" }} />
  </button>
);
// Disclosure's expand box without a header — for content revealed by MoreRow.
export const ExpandBox = ({ open, children }) => (
  <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
    <div style={{ overflow: "hidden", minHeight: 0, opacity: open ? 1 : 0, transition: "opacity .22s ease-out" }}>{children}</div>
  </div>
);
export const Title = ({ children, right }) => (
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold tracking-wide glowtext" style={{ color: C.text }}>{children}</h1>{right}
  </div>
);
export const Empty = ({ children }) => <div className="panel p-5 body text-sm" style={{ color: C.dim }}>{children}</div>;

// Sheet portals to the end of #ascend-root: inside #ascend-scroll the sheet
// composites inside the scroll layer, so the nav (a sibling outside it) paints
// over the sheet's lower half on iOS. At root level z-50 beats nav z-40 and the
// backdrop covers the whole viewport — the nav included — while open.
// subtitle/footer are opt-in: subtitle gives a two-line header (20px title
// clamped to 2 lines + grey line beneath), footer pins a bar at the bottom
// with safe-area padding while children scroll above it.
export function Sheet({ title, subtitle, footer, onClose, children }) {
  const head = subtitle ? (
    <div className="flex justify-between items-start gap-2 mb-3">
      <div className="min-w-0">
        <h3 className="font-bold" style={{ fontSize: 20, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</h3>
        <div className="body mt-0.5" style={{ fontSize: 14, color: C.mute }}>{subtitle}</div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="inline-flex items-center justify-center shrink-0" style={{ minWidth: 44, height: 44, margin: "-10px -12px 0 0" }}><X /></button>
    </div>
  ) : <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">{title}</h3><button aria-label="Close" onClick={onClose}><X /></button></div>;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.7)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-auto p-4 max-h-[80vh] overflow-y-auto" style={{ background: C.sheet, borderTop: `1px solid ${C.blue}`, boxShadow: `0 -10px 40px ${C.line}`, ...(footer ? { display: "flex", flexDirection: "column" } : null) }} onClick={(e) => e.stopPropagation()}>
        {head}
        {footer ? (
          <>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0" style={{ margin: "0 -16px", padding: "0 16px" }}>{children}</div>
            <div style={{ paddingTop: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>{footer}</div>
          </>
        ) : <div className="space-y-2">{children}</div>}
      </div>
    </div>,
    document.getElementById("ascend-root") || document.body
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
