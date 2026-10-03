import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { readShared } from "./social.js";
export function SharePreset({ s, workout, menuItem = false }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [done, setDone] = useState("");
  useEffect(() => { if (open) readShared("lb:").then((r) => setRows(r.filter((x) => x.id !== s.playerId && x.name))); }, [open]);
  const send = async (r) => {
    const exercises = workout.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    try { await window.storage.set(`preset:${uid()}`, JSON.stringify({ to: r.id, toUid: r.uid || null, fromUid: window.ascendUserId || null, from: s.playerId, fromName: s.profile.name, name: workout.title || `${s.profile.name}'s workout`, exercises, t: Date.now() }), true); setDone(r.name); } catch (e) { /* ignore */ }
  };
  if (done) return menuItem
    ? <div className="w-full text-left px-5 text-sm" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: C.green }}>Sent to {done}</div>
    : <span className="body text-xs" style={{ color: C.green }}>Sent to {done}</span>;
  if (menuItem) {
    const itemCls = "w-full text-left px-5 text-sm flex items-center gap-2";
    const itemSt = { minHeight: 40, paddingTop: 14, paddingBottom: 14 };
    if (!open) return <button role="menuitem" aria-label="Send as preset" onClick={() => setOpen(true)} className={itemCls} style={itemSt}><Send size={16} />Send</button>;
    return <>{rows.length === 0 ? <div className="px-5 text-sm" style={{ ...itemSt, color: C.dim }}>No one else on the board</div> : rows.map((r) => <button role="menuitem" key={r.id} onClick={() => send(r)} className={itemCls} style={itemSt}>{r.name}</button>)}</>;
  }
  if (!open) return <button aria-label="Send as preset" onClick={() => setOpen(true)} style={{ color: C.cyan }}><Send size={16} /></button>;
  return <div className="flex gap-1 flex-wrap">{rows.length === 0 ? <span className="body text-xs" style={{ color: C.dim }}>No one else on the board</span> : rows.map((r) => <button key={r.id} onClick={() => send(r)} className="ghost px-2 py-1 text-xs">{r.name}</button>)}<button onClick={() => setOpen(false)} className="body text-xs" style={{ color: C.mute }}>×</button></div>;
}
