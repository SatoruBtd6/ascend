import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { readShared } from "./social.js";
export function SharePreset({ s, workout }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [done, setDone] = useState("");
  useEffect(() => { if (open) readShared("lb:").then((r) => setRows(r.filter((x) => x.id !== s.playerId && x.name))); }, [open]);
  const send = async (r) => {
    const exercises = workout.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    try { await window.storage.set(`preset:${uid()}`, JSON.stringify({ to: r.id, toUid: r.uid || null, fromUid: window.ascendUserId || null, from: s.playerId, fromName: s.profile.name, name: workout.title || `${s.profile.name}'s workout`, exercises, t: Date.now() }), true); setDone(r.name); } catch (e) { /* ignore */ }
  };
  if (done) return <span className="body text-xs" style={{ color: C.green }}>Sent to {done}</span>;
  if (!open) return <button aria-label="Send as preset" onClick={() => setOpen(true)} style={{ color: C.cyan }}><Send size={16} /></button>;
  return <div className="flex gap-1 flex-wrap">{rows.length === 0 ? <span className="body text-xs" style={{ color: C.dim }}>No one else on the board</span> : rows.map((r) => <button key={r.id} onClick={() => send(r)} className="ghost px-2 py-1 text-xs">{r.name}</button>)}<button onClick={() => setOpen(false)} className="body text-xs" style={{ color: C.mute }}>×</button></div>;
}
