import { useState } from "react";
import { today } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { WeightChart } from "../profile/Avatar.jsx";
export function WeightTracker({ s, setS }) {
  const [wIn, setWIn] = useState("");
  const shared = !!s.profile.shareWeight;
  const logWeight = () => {
    const w = +wIn; if (!w || w < 50 || w > 700) return;
    setS((p) => ({ ...p, profile: { ...p.profile, weight: w }, weightLog: { ...(p.weightLog || {}), [today()]: w } }));
    setWIn("");
  };
  return (
    <>
      <h2 className="text-lg font-bold flex items-center gap-2">Weight<SaveMark /></h2>
      <div className="panel p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <input type="text" inputMode="decimal" className="inp" aria-label="Today's weight" placeholder={`Today's weight (now ${s.profile.weight} lb)`} value={wIn} onChange={(e) => setWIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} />
          <button onClick={logWeight} disabled={!+wIn} className="btn px-4 py-2 text-sm whitespace-nowrap" style={!+wIn ? { opacity: 0.5 } : null}>Log</button>
        </div>
        <WeightChart log={s.weightLog} target={s.profile.goal} />
        <button type="button" role="switch" aria-checked={shared} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, shareWeight: !shared } }))} className="w-full flex items-center gap-3 text-left pt-1">
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Share my progress</span>
            <span className="block body text-xs" style={{ color: C.dim }}>{shared ? "Your weight trend shows on your profile." : "Private. Only you can see this."}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 relative" style={{ width: 42, height: 24, borderRadius: 999, background: shared ? C.green : C.track, border: `1px solid ${shared ? C.green : C.glassLine}`, transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 2, left: shared ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)", transition: "left .2s" }} />
          </span>
        </button>
      </div>
    </>
  );
}

/* ---------- Leaderboard ---------- */
