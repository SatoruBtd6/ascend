import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { uid } from "../../lib/dates.js";
import { tagWorkouts, withSilentRankSnap } from "../../math.js";
import { C } from "../../theme.js";
import { commitGymRetag } from "../train/xpRecount.js";
export function GymsSettings({ s, setS }) {
  const gyms = s.gyms || [];
  const [name, setName] = useState("");
  const [tagDate, setTagDate] = useState("");
  const [tagGym, setTagGym] = useState(s.currentGym || "");
  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = uid();
    const first = gyms.length === 0;
    setS((p) => withSilentRankSnap({ ...p, gyms: [...(p.gyms || []), { id, name: n }], currentGym: p.currentGym || id }));
    setName("");
    setTagGym(id);
    if (first) ask(`Tag all untagged workouts as ${n}? Runs and imports stay untagged.`, () => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: id, untaggedOnly: true }))), "Tag them");
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="body text-xs" style={{ color: C.dim }}>Personal gyms only — not the crew GPS pin. Machine and cable lifts compare within the current gym so a different stack doesn't look like a regression.</div>
      {gyms.map((g) => (
        <div key={g.id} className="flex items-center gap-2">
          <button type="button" onClick={() => setS((p) => withSilentRankSnap({ ...p, currentGym: p.currentGym === g.id ? null : g.id }))} className="px-2 py-1 text-xs font-bold" style={{ borderRadius: 999, background: s.currentGym === g.id ? C.blue : C.soft, color: s.currentGym === g.id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{s.currentGym === g.id ? "Current" : "Use"}</button>
          <input className="inp flex-1 text-sm" value={g.name} aria-label={`Rename ${g.name}`} onChange={(e) => { const v = e.target.value; setS((p) => ({ ...p, gyms: (p.gyms || []).map((x) => x.id === g.id ? { ...x, name: v } : x) })); }} />
          <button aria-label={`Delete ${g.name}`} onClick={() => ask(`Delete gym "${g.name}"? Past workouts keep their tag.`, () => setS((p) => withSilentRankSnap({ ...p, gyms: (p.gyms || []).filter((x) => x.id !== g.id), currentGym: p.currentGym === g.id ? null : p.currentGym })), "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className="inp flex-1 text-sm" placeholder="Gym name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="New gym name" />
        <button type="button" onClick={add} disabled={!name.trim()} className="btn px-3 text-sm">Add</button>
      </div>
      {gyms.length > 0 && (
        <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm">Tag past workouts</div>
          <div className="flex gap-2 flex-wrap items-center">
            <select className="inp text-sm" value={tagGym} onChange={(e) => setTagGym(e.target.value)} aria-label="Tag as gym">
              <option value="">Choose gym</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="date" className="inp text-sm" value={tagDate} onChange={(e) => setTagDate(e.target.value)} aria-label="Tag workouts before this date" />
          </div>
          <button type="button" disabled={!tagGym || !tagDate} onClick={() => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: tagGym, before: tagDate })))} className="ghost w-full py-2 text-sm font-bold">Tag all workouts before that date</button>
          <button type="button" disabled={!tagGym} onClick={() => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: tagGym, untaggedOnly: true })))} className="ghost w-full py-2 text-sm font-bold">Tag all untagged workouts</button>
        </div>
      )}
    </div>
  );
}
