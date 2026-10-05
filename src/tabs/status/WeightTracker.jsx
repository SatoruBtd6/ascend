import { useState } from "react";
import { today } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { ExpandBox, MoreRow } from "../../ui/primitives.jsx";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { WeightChart, weightTrend } from "../profile/Avatar.jsx";

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export function WeightTracker({ s, setS }) {
  const [wIn, setWIn] = useState("");
  const [chartOpen, setChartOpen] = useState(() => lsGet("ascend-logchart") === "1");
  const [shareOpen, setShareOpen] = useState(false);
  const shared = !!s.profile.shareWeight;
  const tr = weightTrend(s.weightLog);
  const logWeight = () => {
    const w = +wIn; if (!w || w < 50 || w > 700) return;
    setS((p) => ({ ...p, profile: { ...p.profile, weight: w }, weightLog: { ...(p.weightLog || {}), [today()]: w } }));
    setWIn("");
  };
  const diffColor = !tr.diff ? C.dim : (s.profile.goal === "cut" ? tr.diff < 0 : tr.diff > 0) ? C.green : C.orange;
  return (
    <>
      <h2 className="text-lg font-bold flex items-center gap-2">Weight<SaveMark /></h2>
      <div>
        <div className="flex gap-2 items-center">
          <input type="text" inputMode="decimal" className="inp" aria-label="Today's weight" placeholder="Today's weight" value={wIn}
            style={{ height: 40, fontSize: 16 }}
            onChange={(e) => setWIn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && logWeight()}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 350)} />
          <button onClick={logWeight} disabled={!+wIn} className="btn px-4 text-sm whitespace-nowrap" style={{ height: 40, ...( !+wIn ? { opacity: 0.5 } : null) }}>Log</button>
        </div>
        <div className="body flex justify-between mt-1" style={{ fontSize: 14, color: C.dim }}>
          <span>{s.profile.weight} lb · {tr.n} entries</span>
          {tr.diff != null && tr.n >= 2 && <span style={{ color: diffColor }}>{tr.diff > 0 ? "+" : ""}{tr.diff} lb since {new Date(tr.first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
        </div>
        <MoreRow label="Chart" open={chartOpen} onToggle={() => { setChartOpen((v) => { lsSet("ascend-logchart", v ? "0" : "1"); return !v; }); }} />
        <ExpandBox open={chartOpen}>
          <div className="pb-2"><WeightChart log={s.weightLog} target={s.profile.goal} footer={false} /></div>
        </ExpandBox>
        <MoreRow label="Sharing" right={shared ? "Shared" : "Private"} open={shareOpen} onToggle={() => setShareOpen((v) => !v)} />
        <ExpandBox open={shareOpen}>
          <button type="button" role="switch" aria-checked={shared} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, shareWeight: !shared } }))} className="w-full flex items-center gap-3 text-left pb-2">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">Share my progress</span>
              <span className="block body text-xs" style={{ color: C.dim }}>{shared ? "Your weight trend shows on your profile." : "Private. Only you can see this."}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 relative" style={{ width: 42, height: 24, borderRadius: 999, background: shared ? C.green : C.track, border: `1px solid ${shared ? C.green : C.glassLine}`, transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 2, left: shared ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)", transition: "left .2s" }} />
            </span>
          </button>
        </ExpandBox>
      </div>
    </>
  );
}

/* ---------- Leaderboard ---------- */
