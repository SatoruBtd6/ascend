import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { fmtDay } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { mealTotals } from "../../lib/stats.js";
import { SB_URL, XpSync } from "../../lib/xpSync.js";
import { creditBreakdown, levelFromXp, round2 } from "../../math.js";
import { C } from "../../theme.js";
import { CreditLedger } from "./CreditLedger.jsx";

// Read-only audit of another account's state blob. Server functions
// kv_audit_roster / kv_audit_state are the gate: both return 'denied' unless
// the caller's auth uid is in the allowlist inside kv_audit_allowed. Without
// them this page exists but yields no data — by design.
const rpc = async (fn, body) => {
  const h = await XpSync.headers();
  if (!h) return { ok: false, reason: "offline" };
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: h, body: JSON.stringify(body || {}) });
  return r.ok ? await r.json() : { ok: false, reason: "error" };
};

export function TesterAudit({ onBack }) {
  const [roster, setRoster] = useState(null); // null = loading, [] = denied/empty
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [st, setSt] = useState(null);
  useEffect(() => {
    rpc("kv_audit_roster").then((j) => {
      if (j?.ok) setRoster(j.accounts || []);
      else setRoster([]);
    }).catch(() => setRoster([]));
  }, []);
  const load = async (uid) => {
    if (!uid) return;
    setPick(uid); setBusy(true); setErr(""); setSt(null);
    try {
      const j = await rpc("kv_audit_state", { p_uid: uid });
      if (!j?.ok) setErr(j?.reason === "denied" ? "This account isn't on the audit allowlist." : j?.reason === "no_state" ? "That account has no saved state." : "Lookup failed — check the connection.");
      else setSt(typeof j.state === "string" ? JSON.parse(j.state) : j.state);
    } catch (e) { setErr("Lookup failed — check the connection."); }
    setBusy(false);
  };
  const xpRows = useMemo(
    () => Object.entries(st?.xpDetail || {}).flatMap(([d, list]) => (list || []).map((x, i) => ({ id: `${d}_${i}`, a: x.a, m: x.m, day: d }))).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 60),
    [st]
  );
  const credits = useMemo(
    () => (st?.workouts || []).map((w) => ({ w, b: creditBreakdown(st, w, findEx) })).filter((x) => x.b.total > 0).slice(0, 20),
    [st]
  );
  const mealDays = useMemo(
    () => Object.entries(st?.meals || {}).filter(([, m]) => (m || []).length).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14),
    [st]
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Audit account</h1>
      </div>
      <div className="panel p-4 space-y-2">
        <div className="body text-xs" style={{ color: C.dim }}>Read-only look at an account's XP log, workout credit and fuel log. Server-side allowlist decides who can use it.</div>
        {roster === null && <div className="body text-xs flex items-center gap-1.5" style={{ color: C.mute }}><Loader2 size={12} className="animate-spin" />Loading accounts…</div>}
        {roster && roster.length === 0 && <div className="body text-xs" style={{ color: C.red }}>No accounts returned — this account isn't on the audit allowlist.</div>}
        {roster && roster.length > 0 && (
          <select className="inp w-full" value={pick} onChange={(e) => load(e.target.value)} disabled={busy} aria-label="Account to audit">
            <option value="">Pick an account…</option>
            {roster.map((a) => (
              <option key={a.uid} value={a.uid}>{a.name || "(unnamed)"}{a.test ? " · test" : ""}{a.has_card ? "" : " · no card"} — {String(a.uid).slice(0, 8)}</option>
            ))}
          </select>
        )}
        {busy && <div className="body text-xs flex items-center gap-1.5" style={{ color: C.mute }}><Loader2 size={12} className="animate-spin" />Loading state…</div>}
        {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      </div>
      {st && (
        <>
          <div className="panel p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">{st.profile?.name || "(no name)"}</div>
              <div className="body text-xs" style={{ color: C.dim }}>playerId {st.playerId || "?"} · Level {levelFromXp(st.xp || 0).lvl} · {(st.xp || 0).toLocaleString()} XP{st.test ? " · test account" : ""}</div>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="px-3 py-2 font-semibold text-sm" style={{ background: C.soft, borderBottom: `1px solid ${C.glassLine}` }}>XP log (local, latest 60)</div>
            {xpRows.length === 0 && <div className="px-3 py-2 body text-xs" style={{ color: C.mute }}>No XP entries in the blob.</div>}
            {xpRows.map((x, i) => (
              <div key={x.id} className="flex items-center gap-3 px-3 py-1.5" style={i ? { borderTop: `1px solid ${C.glassLine}` } : null}>
                <div className="flex-1 min-w-0 body text-sm truncate" style={{ color: C.text }}>{x.m || "XP"} <span style={{ color: C.mute }}>· {fmtDay(x.day)}</span></div>
                <div className="font-bold tabular-nums text-sm" style={{ color: x.a >= 0 ? C.gold : C.orange }}>{x.a >= 0 ? "+" : "−"}{Math.abs(x.a).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="panel overflow-hidden">
            <div className="px-3 py-2 font-semibold text-sm" style={{ background: C.soft, borderBottom: `1px solid ${C.glassLine}` }}>Workout credit (latest 20)</div>
            {credits.length === 0 && <div className="px-3 py-2 body text-xs" style={{ color: C.mute }}>No credited workouts.</div>}
            {credits.map((x, i) => (
              <div key={x.w.id || i} className="flex items-center gap-3 px-3 py-1.5" style={i ? { borderTop: `1px solid ${C.glassLine}` } : null}>
                <div className="flex-1 min-w-0 body text-sm truncate" style={{ color: C.text }}>{x.w.title || (x.w.run ? "Run" : "Workout")} <span style={{ color: C.mute }}>· {fmtDay(x.w.date)}{x.b.capped ? " · capped" : ""}</span></div>
                <div className="font-bold tabular-nums text-sm" style={{ color: C.gold }}>{round2(x.b.total)}</div>
              </div>
            ))}
          </div>

          <div className="panel overflow-hidden">
            <div className="px-3 py-2 font-semibold text-sm" style={{ background: C.soft, borderBottom: `1px solid ${C.glassLine}` }}>Fuel log (latest 14 days)</div>
            {mealDays.length === 0 && <div className="px-3 py-2 body text-xs" style={{ color: C.mute }}>No logged meals.</div>}
            {mealDays.map(([d, m], i) => {
              const t = mealTotals(m);
              return (
                <div key={d} className="flex items-center gap-3 px-3 py-1.5" style={i ? { borderTop: `1px solid ${C.glassLine}` } : null}>
                  <div className="flex-1 min-w-0 body text-sm truncate" style={{ color: C.text }}>{fmtDay(d)} <span style={{ color: C.mute }}>· {m.length} item{m.length === 1 ? "" : "s"}</span></div>
                  <div className="body text-xs tabular-nums" style={{ color: C.dim }}>{Math.round(t.cal)} cal · P {Math.round(t.p)}</div>
                </div>
              );
            })}
          </div>

          <div className="panel p-3 body text-xs" style={{ color: C.mute }}>Full credit ledger for this account:</div>
          <CreditLedger s={st} drawer />
        </>
      )}
    </div>
  );
}
