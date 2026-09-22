import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Layers, Loader2 } from "lucide-react";
import { fmtDay, monthKey } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { Empty } from "../../ui/primitives.jsx";
import { seasonKey, seasonStart, seasonXp } from "../profile/season.js";
import { XpSync } from "../../lib/xpSync.js";
export const CARD_GAP_MS = 15 * 60000;
export const isCardFlip = (x) => /^deck_/.test(x.event_id || "") || /^Card deck( ·| cleared)/.test(x.source || "");
export function groupCardSessions(list) {
  const asc = [...list].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const out = [];
  let cur = null;
  asc.forEach((x) => {
    if (!isCardFlip(x)) { out.push(x); return; }
    const t = Date.parse(x.at);
    if (cur && t - cur.last <= CARD_GAP_MS) { cur.amount += x.amount; cur.last = t; cur.cards += 1; cur.day = x.day; }
    else { cur = { session: true, event_id: `sess_${x.event_id}`, first: t, last: t, amount: x.amount, cards: 1, day: x.day }; out.push(cur); }
  });
  out.forEach((x) => { if (x.session) { x.at = new Date(x.last).toISOString(); x.mins = Math.round((x.last - x.first) / 60000); x.live = Date.now() - x.last < CARD_GAP_MS; } });
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
export const fmtMins = (m) => (m < 1 ? "under 1 min" : m < 60 ? `${m} min${m === 1 ? "" : "s"}` : `${Math.floor(m / 60)} h ${m % 60} min`);

export function XpLedger({ s, onBack, drawer = false }) {
  const [rows, setRows] = useState(null); // server rows, or null while loading / unavailable
  const [src, setSrc] = useState("loading");
  const [more, setMore] = useState(false);
  const [sum, setSum] = useState(null);
  const [pending, setPending] = useState(() => XpSync.pending());
  const sk = seasonKey(), seasonFrom = seasonStart(sk), monthFrom = `${monthKey()}-01`;
  const sumRange = (from) => Object.entries(s.xpLog || {}).filter(([d]) => d >= from).reduce((a, [, v]) => a + v, 0);
  const totals = { all: s.xp || 0, season: seasonXp(s, sk), month: sumRange(monthFrom) };
  const local = useMemo(() => Object.entries(s.xpDetail || {}).flatMap(([d, list]) => (list || []).map((x, i) => ({ event_id: `${d}_${i}`, amount: x.a, source: x.m, day: d, at: new Date(x.t || `${d}T12:00`).toISOString() }))).sort((a, b) => (a.at < b.at ? 1 : -1)), [s.xpDetail]);
  const load = async (offset = 0) => {
    await XpSync.flush();
    setPending(XpSync.pending());
    const page = await XpSync.page(offset, 60).catch(() => null);
    if (!page) { setSrc("local"); setRows(null); return; }
    setSrc("server"); setMore(page.length === 60);
    setRows((r) => (offset ? [...(r || []), ...page] : page));
    if (!offset) XpSync.summary(seasonFrom, monthFrom).then(setSum).catch(() => {});
  };
  useEffect(() => { load(0); const on = () => setPending(XpSync.pending()); window.addEventListener("ascend-xp-sync", on); return () => window.removeEventListener("ascend-xp-sync", on); }, []);
  const list = useMemo(() => groupCardSessions(src === "server" ? rows || [] : local), [src, rows, local]);
  const groups = [];
  list.forEach((x) => { const g = groups[groups.length - 1]; if (g && g.day === x.day) g.items.push(x); else groups.push({ day: x.day, items: [x] }); });
  const matches = sum && +sum.total === totals.all && +sum.season === totals.season && +sum.month === totals.month;
  const rc = s.xpRecount;
  const fmtT = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <div className="space-y-4">
      {!drawer && <div className="flex items-center gap-2"><button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button><h1 className="text-2xl font-bold glowtext">XP history</h1></div>}
      <div className="panel p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["All time", totals.all], ["This season", totals.season], ["This month", totals.month]].map(([l, v]) => <div key={l}><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold tabular-nums glowtext">{v.toLocaleString()}</div></div>)}
        </div>
        <div className="body text-xs flex items-center gap-1.5" style={{ color: pending ? C.orange : matches ? C.green : C.dim }}>
          {pending ? <><Loader2 size={12} className="animate-spin" />{pending} {pending === 1 ? "entry" : "entries"} waiting to sync</> : matches ? <><Check size={13} />Every point is logged, and the server totals match these numbers.</> : src === "server" ? "Checking totals…" : src === "local" ? "Showing what's saved on this phone. The full log loads when you're online." : "Loading…"}
        </div>
      </div>
      {rc && (
        <div className="panel p-3 body text-xs space-y-0.5" style={{ color: C.dim }}>
          <div className="text-sm font-semibold" style={{ color: C.text }}>Recounted {new Date(rc.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {rc.before.toLocaleString()} → {rc.after.toLocaleString()} XP</div>
          <div>PR bonuses now count once per exercise per workout.{rc.floor ? ` Level kept with a +${rc.floor.toLocaleString()} XP floor.` : ""}{rc.gravemaw ? ` Includes −${rc.gravemaw} XP from the Gravemaw crew-boss exploit.` : ""}</div>
        </div>
      )}
      {src !== "loading" && list.length === 0 && <Empty>No XP yet. Every point you earn shows up here with where it came from.</Empty>}
      {groups.map((g) => (
        <div key={g.day} className="panel overflow-hidden">
          <div className="flex justify-between items-center px-3 py-2" style={{ background: C.soft, borderBottom: `1px solid ${C.glassLine}` }}>
            <span className="font-semibold text-sm">{fmtDay(g.day)}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: C.gold }}>{(s.xpLog?.[g.day] || 0) >= 0 ? "+" : ""}{(s.xpLog?.[g.day] || 0).toLocaleString()}</span>
          </div>
          {g.items.map((x, i) => (
            <div key={x.event_id} className="flex items-center gap-3 px-3 py-2" style={i ? { borderTop: `1px solid ${C.glassLine}` } : null}>
              {x.session ? (
                <div className="flex-1 min-w-0">
                  <div className="body text-sm truncate flex items-center gap-1.5" style={{ color: C.text }}><Layers size={13} style={{ color: C.cyan }} />Card session{x.live && <span className="text-xs font-bold px-1.5" style={{ borderRadius: 999, color: C.green, border: `1px solid ${C.green}66` }}>live</span>}</div>
                  <div className="body text-xs" style={{ color: C.mute }}>{x.cards > 1 ? `${fmtT(new Date(x.first).toISOString())} – ${fmtT(x.at)}` : fmtT(x.at)} · {fmtMins(x.mins)} · {x.cards} card{x.cards === 1 ? "" : "s"}</div>
                </div>
              ) : (
                <div className="flex-1 min-w-0"><div className="body text-sm truncate" style={{ color: C.text }}>{x.source === "Card deck" ? "Card session" : x.source}</div><div className="body text-xs" style={{ color: C.mute }}>{fmtT(x.at)}</div></div>
              )}
              <div className="font-bold tabular-nums text-sm" style={{ color: x.amount >= 0 ? C.gold : C.orange }}>{x.amount >= 0 ? "+" : "−"}{Math.abs(x.amount).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ))}
      {src === "server" && more && <button onClick={() => load((rows || []).length)} className="ghost w-full py-3 text-sm font-bold">Load older</button>}
    </div>
  );
}

/* ---------- Community meals ---------- */
// One-tap publish/unpublish for a meal: goes to the Community meals list (copyable) and the Board feed.

/* ---------- Log tab: workout detail ---------- */
