import React, { useState, useEffect, useRef } from "react";
import { Timer as TimerIcon, X } from "lucide-react";
import { C } from "../../theme.js";
import { Beeper, fmtClock } from "./beeper.js";
export function fireRest(end) {
  try { window.dispatchEvent(new CustomEvent("ascend-rest", { detail: end ? { end } : null })); } catch { /* */ }
}

export const RestDock = React.memo(function RestDock() {
  const [rest, setRest] = useState(null);
  useEffect(() => {
    const on = (e) => setRest(e.detail && e.detail.end ? { end: e.detail.end } : null);
    window.addEventListener("ascend-rest", on);
    return () => window.removeEventListener("ascend-rest", on);
  }, []);
  return (
    <>
      <div aria-hidden="true" style={{ height: 48, pointerEvents: "none" }} />
      {rest && <RestBubble end={rest.end} onDone={() => setRest(null)} onClose={() => setRest(null)} onChangeEnd={(end) => setRest({ end })} />}
    </>
  );
});
/* ---------- Rest timer + plates ---------- */
export function restNotify() {
  try { navigator.vibrate?.([180, 70, 180, 70, 240]); } catch (e) { /* no haptic */ }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Rest over", { body: "Next set. Let's go.", tag: "ascend-rest" });
    }
  } catch (e) { /* blocked */ }
}
export function persistRestEnd(end) { try { localStorage.setItem("ascend-rest-end", String(end || 0)); } catch (e) { /* private */ } }
export function readRestEnd() { try { return +localStorage.getItem("ascend-rest-end") || 0; } catch (e) { return 0; } }
export function RestBubble({ end, onDone, onClose, onChangeEnd }) {
  const [now, setNow] = useState(Date.now());
  const [big, setBig] = useState(false);
  const wakeRef = useRef(null);
  const doneRef = useRef(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => { persistRestEnd(end); }, [end]);
  useEffect(() => {
    (async () => { try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* unsupported */ } })();
    try { if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission(); } catch (e) { /* */ }
    const onVis = async () => { if (document.visibilityState === "visible") { try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* */ } } };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { wakeRef.current?.release(); } catch (e) { /* */ } };
  }, []);
  useEffect(() => {
    if (left === 0 && !doneRef.current) {
      doneRef.current = true;
      Beeper.unlock(); Beeper.work(); restNotify(); onDone();
    }
  }, [left]);
  useEffect(() => { document.title = `⏱ ${fmtClock(left)} rest · Ascend`; }, [left]);
  useEffect(() => () => { document.title = "Ascend"; persistRestEnd(0); }, []);
  const bump = (sec) => onChangeEnd?.(end + sec * 1000);
  const openWatch = () => {
    persistRestEnd(end);
    const w = window.open(`${location.pathname}?watch=rest`, "ascend-rest", "width=360,height=420,noopener");
    if (!w) setBig(true);
  };
  if (big) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6" style={{ background: "#02040B" }}>
        <div className="body text-xs uppercase tracking-widest font-bold" style={{ color: C.mute }}>Rest</div>
        <div className="font-extrabold tabular-nums" style={{ fontSize: "min(28vw, 140px)", lineHeight: 1, color: left <= 5 ? C.orange : C.cyan, textShadow: `0 0 40px ${left <= 5 ? C.orange : C.cyan}` }}>{fmtClock(left)}</div>
        <div className="flex gap-2 w-full max-w-sm">
          <button type="button" onClick={() => bump(30)} className="ghost flex-1 py-3 font-bold">+30s</button>
          <button type="button" onClick={() => { persistRestEnd(0); onClose(); }} className="ghost flex-1 py-3 font-bold" style={{ color: C.orange }}>Skip</button>
        </div>
        <button type="button" onClick={openWatch} className="body text-sm font-bold" style={{ color: C.cyan }}>Open watch window</button>
        <button type="button" onClick={() => setBig(false)} className="body text-xs" style={{ color: C.mute }}>Shrink</button>
      </div>
    );
  }
  return (
    <div className="fixed z-[41] flex items-center gap-0.5 pl-2 pr-0.5 py-0.5 font-bold tabular-nums" style={{ left: 10, bottom: "calc(env(safe-area-inset-bottom) + 62px)", maxWidth: "min(200px, calc(100vw - 92px))", borderRadius: 999, background: C.sheet, color: left <= 5 ? C.orange : C.cyan, border: `1px solid ${left <= 5 ? C.orange : C.cyan}`, boxShadow: `0 0 16px ${C.glow}`, pointerEvents: "none" }}>
      <button type="button" onClick={() => setBig(true)} aria-label="Open rest watch view" className="flex items-center gap-1.5 px-1 py-1" style={{ pointerEvents: "auto", minHeight: 40 }}>
        <TimerIcon size={16} />Rest {fmtClock(left)}
      </button>
      <button type="button" aria-label="Add 30 seconds" onClick={() => bump(30)} className="px-2 py-1 text-xs" style={{ pointerEvents: "auto", minWidth: 40, minHeight: 40 }}>+30</button>
      <button type="button" aria-label="Dismiss rest timer" onClick={onClose} className="px-2 py-1" style={{ pointerEvents: "auto", minWidth: 40, minHeight: 40 }}><X size={14} /></button>
    </div>
  );
}
export function RestWatchPage() {
  const [end, setEnd] = useState(() => readRestEnd());
  const [now, setNow] = useState(Date.now());
  const wakeRef = useRef(null);
  const rang = useRef(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  useEffect(() => {
    (async () => { try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* */ } })();
    try { if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission(); } catch (e) { /* */ }
    const onVis = async () => { if (document.visibilityState === "visible") { try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* */ } } };
    const onStor = (e) => { if (e.key === "ascend-rest-end") setEnd(+e.newValue || 0); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStor);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("storage", onStor); try { wakeRef.current?.release(); } catch (e) { /* */ } };
  }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (left === 0 && end && !rang.current) { rang.current = true; Beeper.unlock(); Beeper.work(); restNotify(); }
    if (left > 0) rang.current = false;
  }, [left, end]);
  useEffect(() => { document.title = left ? `⏱ ${fmtClock(left)} rest` : "Rest over"; }, [left]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: "#02040B", color: C.text }}>
      <div className="body text-xs uppercase tracking-widest font-bold" style={{ color: C.mute }}>{left ? "Rest" : "Go"}</div>
      <div className="font-extrabold tabular-nums" style={{ fontSize: "min(28vw, 140px)", lineHeight: 1, color: !left ? C.green : left <= 5 ? C.orange : C.cyan, textShadow: `0 0 40px ${!left ? C.green : left <= 5 ? C.orange : C.cyan}` }}>{fmtClock(left)}</div>
      <div className="flex gap-2 w-full max-w-sm">
        <button type="button" onClick={() => { const n = (end || Date.now()) + 30000; persistRestEnd(n); setEnd(n); }} className="ghost flex-1 py-3 font-bold">+30s</button>
        <button type="button" onClick={() => window.close()} className="ghost flex-1 py-3 font-bold" style={{ color: C.mute }}>Close</button>
      </div>
      <div className="body text-xs text-center" style={{ color: C.dim }}>Keep this window on your watch or lock screen. The phone stays awake while rest is running.</div>
    </div>
  );
}
