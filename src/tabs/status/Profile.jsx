import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DEFAULT } from "../../appStay.js";
import { ACTIVITY } from "../../data/foods.js";
import * as D from "../../diag.js";
import { ask } from "../../lib/ask.js";
import { today } from "../../lib/dates.js";
import { applyBodyType, bodySex } from "../../math.js";
import { C } from "../../theme.js";
import { NumField } from "../../ui/NumField.jsx";
import { rankSnapshot } from "../train/helpers.js";
export function Profile({ s, setS, allowWipe }) {
  const [open, setOpen] = useState(false);
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex justify-between items-center font-semibold">
        Body stats <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<NumField inputMode="decimal" className="inp mt-1" value={p.weight} onCommit={(v) => { if (v === "") return; set("weight", v); if (v > 50) setS((x) => ({ ...x, weightLog: { ...(x.weightLog || {}), [today()]: v } })); }} /></label>
          <label>Height (in)<NumField inputMode="decimal" className="inp mt-1" value={p.height} onCommit={(v) => { if (v === "") return; set("height", v); }} /></label>
          <label>Age<NumField inputMode="numeric" className="inp mt-1" value={p.age} onCommit={(v) => { if (v === "") return; set("age", v); }} /></label>
          <label>Body type<select className="inp mt-1" value={bodySex(p)} onChange={(e) => {
            const v = e.target.value === "f" ? "f" : "m";
            if (v === bodySex(p)) return;
            e.target.value = bodySex(p);
            ask("This changes rank targets and calorie math. Achievements, XP, titles, and cosmetics stay. Rank letters may go up or down.", () => {
              setS((x) => { const n = applyBodyType(x, v); return { ...n, rankSnap: rankSnapshot(n) }; });
            }, "Switch");
          }}><option value="m">Male</option><option value="f">Female</option></select></label>
          <label className="col-span-2">Activity<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <button className="col-span-2 mt-1 text-xs underline" style={{ color: C.red }} onClick={() => ask("Reset all progress? This can't be undone.", () => { allowWipe?.(); D.withSource("reset", () => setS((p) => ({ ...DEFAULT, playerId: p.playerId, settings: p.settings, test: !!p.test }))); }, "Reset")}>Reset all progress</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Train ---------- */


// Full page (not a popup) so it scrolls normally on phones

/* ---------- Quests ---------- */
