import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { C } from "../theme.js";
// AnchoredMenu — every .panel is its own stacking context (backdrop-filter),
// so an in-card menu can never beat the next card. Portal to the end of
// #ascend-root (fixed inset-0, so fixed children still track the viewport)
// which keeps the root's font, colour and dys/zesty classes applying inside
// the sheet. Positions off the anchor, flips up when there's no room above
// the nav, clamps 12px inside both side edges. On scroll it follows the
// anchor (stray/async scroll events must not dismiss it); it closes only
// when the anchor leaves the visible band.
export function AnchoredMenu({ anchor, onClose, children, minWidth = 200 }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor?.getBoundingClientRect?.(), m = menuRef.current?.getBoundingClientRect();
      if (!a || !m) return;
      const navTop = document.querySelector("#ascend-root nav")?.getBoundingClientRect().top ?? window.innerHeight;
      if (a.bottom < 8 || a.top > navTop - 8) { onClose(); return; }
      const below = navTop - a.bottom - 8;
      const flip = m.height > below && a.top - 8 > below;
      const top = flip ? Math.max(8, a.top - m.height - 6) : Math.min(a.bottom + 4, Math.max(8, navTop - m.height - 8));
      const left = Math.max(12, Math.min(a.right - m.width, window.innerWidth - m.width - 12));
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    const sc = document.getElementById("ascend-scroll");
    sc?.addEventListener("scroll", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); sc?.removeEventListener("scroll", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,.28)" }} onClick={onClose} />
      <div ref={menuRef} role="menu" data-keep-menu className="panel fixed z-[71] p-1" style={{ top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, minWidth, maxWidth: "calc(100vw - 24px)", background: C.sheet, backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "0 12px 32px rgba(0,0,0,.55)", visibility: pos ? "visible" : "hidden" }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>,
    document.getElementById("ascend-root") || document.body
  );
}
