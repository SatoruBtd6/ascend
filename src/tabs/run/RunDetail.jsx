import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { C } from "../../theme.js";
import { fmtDur, fmtPace, runTitle, runBreakdown } from "../../run.js";
import { fmtDay, uid } from "../../lib/dates.js";
import { Sheet } from "../../ui/primitives.jsx";
import { overallInfo } from "../../lib/stats.js";
import { ReceiptButton, buildReceipt } from "../train/receipt.jsx";
import { RouteMap, decodePoly, thinPts, encodePoly } from "./maps.jsx";
export function RunDetail({ s, setS, w, onClose }) {
  const [pts, setPts] = useState(null);
  useEffect(() => { if (!w.run?.hasMap) { setPts([]); return; } window.storage.get(`run:${w.run.id}`, false).then((r) => setPts(decodePoly(r?.value || ""))).catch(() => setPts([])); }, [w.id]);
  const r = w.run;
  const title = runTitle(r);
  const breakdown = r.segments?.length ? runBreakdown(r) : "";
  const saveAsRoute = () => { if (!pts?.length) return; setS((p) => ({ ...p, savedRoutes: [{ id: uid(), name: `${r.miles} mi from ${fmtDay(w.date)}`, miles: r.miles, ascentFt: null, poly: encodePoly(thinPts(pts, 15, 400)), streets: [], t: Date.now() }, ...(p.savedRoutes || [])].slice(0, 30) })); };
  const segs = r.segments || [];
  const segTotal = segs.reduce((a, x) => a + (x.secs || 0), 0) || 1;
  return (
    <Sheet title={`${title} · ${fmtDay(w.date)}`} onClose={onClose}>
      {pts === null ? <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading map…</div> : pts.length > 1 ? <RouteMap lines={[{ pts, color: C.cyan, startDot: true }]} height={220} /> : <div className="body text-sm" style={{ color: C.dim }}>No map for this one.</div>}
      <div className="grid grid-cols-3 gap-2">{[["Distance", `${r.miles} mi`], ["Time", fmtDur(r.secs)], ["Pace", `${fmtPace(r.pace)} /mi`]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
      {breakdown ? <div className="panel p-3 body text-sm font-semibold">{breakdown}</div> : null}
      {segs.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex h-3 overflow-hidden" style={{ borderRadius: 999, background: C.glass, border: `1px solid ${C.glassLine}` }}>
            {segs.map((x, i) => <div key={i} title={`${x.mode === "walk" ? "Walk" : "Run"} ${fmtDur(x.secs)}`} style={{ width: `${Math.max(2, (x.secs / segTotal) * 100)}%`, background: x.mode === "walk" ? C.cyan : C.green }} />)}
          </div>
          <div className="body text-xs flex justify-between" style={{ color: C.dim }}><span>Start</span><span>Finish</span></div>
        </div>
      )}
      {r.splits?.length > 0 && <div className="panel p-3">{r.splits.map((sp, i) => <div key={i} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Mile {i + 1}</span><span className="tabular-nums font-semibold">{fmtDur(sp)}</span></div>)}</div>}
      <div className="grid grid-cols-2 gap-2">
        {pts?.length > 1 && <button onClick={saveAsRoute} className="ghost py-2.5 text-sm font-semibold" style={{ color: C.cyan }}>Save as route</button>}
        <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: title, headline: `${r.miles} miles`, sub: fmtDay(w.date), tierImg: Math.floor(overallInfo(s).score), rows: [["Time", fmtDur(r.secs)], ["Avg pace", `${fmtPace(r.pace)} /mi`], ["Fastest mile", r.splits?.length ? fmtDur(Math.min(...r.splits)) : "–"], ["XP", `+${w.xp || 0}`]] })} />
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>Maps stay private to you. Share cards don't include your route.</div>
    </Sheet>
  );
}
