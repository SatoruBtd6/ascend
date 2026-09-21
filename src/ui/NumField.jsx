import { useState, useEffect, useRef, useCallback } from "react";
import { parseNumInput } from "../math.js";
export const NUM_DEBOUNCE_MS = 180;
export function NumField({ value, onCommit, inputMode = "decimal", className, style, ...rest }) {
  const shown = value === "" || value == null ? "" : String(value);
  const [text, setText] = useState(shown);
  const focused = useRef(false);
  const tRef = useRef(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(() => {
    if (focused.current) return;
    setText(shown);
  }, [shown]);
  const commit = useCallback((raw) => {
    const s = raw == null ? textRef.current : raw;
    commitRef.current(parseNumInput(s));
  }, []);
  useEffect(() => {
    const onHide = () => { if (focused.current) commit(); };
    const onVis = () => { if (document.visibilityState === "hidden") onHide(); };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [commit]);
  const schedule = (s) => {
    setText(s);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => commit(s), NUM_DEBOUNCE_MS);
  };
  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode}
      className={className}
      style={style}
      value={text}
      onChange={(e) => schedule(e.target.value)}
      onFocus={(e) => { focused.current = true; rest.onFocus?.(e); }}
      onBlur={(e) => {
        focused.current = false;
        if (tRef.current) clearTimeout(tRef.current);
        commit();
        rest.onBlur?.(e);
      }}
    />
  );
}
