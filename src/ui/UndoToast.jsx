import { useEffect, useRef } from "react";
import { C } from "../theme.js";

const DEFAULT_MS = 6000;

// Above the rest timer (bottom ~62px, about 56px tall) and the voice button,
// and below the exercise Add set in the open workout. Right inset clears the voice button.
export function UndoToast({ notice, onUndo, onDismiss, ms = DEFAULT_MS }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    if (!notice?.id) return undefined;
    const t = setTimeout(() => dismissRef.current?.(), ms);
    return () => clearTimeout(t);
  }, [notice?.id, ms]);
  if (!notice) return null;
  return (
    <div
      role="status"
      className="fixed z-[45] flex items-center gap-2 pl-3 pr-1"
      style={{
        left: 12,
        right: 80,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 230px)",
        maxWidth: 420,
        minHeight: 48,
        background: C.sheet,
        color: C.text,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
        touchAction: "manipulation",
      }}
    >
      <span className="flex-1 text-sm font-semibold truncate">{notice.label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-bold shrink-0"
        style={{ minWidth: 64, minHeight: 40, padding: "0 12px", color: C.cyan, touchAction: "manipulation" }}
      >
        Undo
      </button>
    </div>
  );
}
