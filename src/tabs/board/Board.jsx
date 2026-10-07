import { useEffect, useState } from "react";
import { Check, ChevronDown, Crown, Info, MoreHorizontal, RefreshCw } from "lucide-react";
import { GROUP_WEIGHT, RANKS } from "../../data/ranks.js";
import { ask } from "../../lib/ask.js";
import { monthKey, weekStart } from "../../lib/dates.js";
import { rankFromScore } from "../../lib/stats.js";
import { boardWindow, cardNeedsXpUpdate, overlayOwnBoardRow } from "../../math.js";
import { C } from "../../theme.js";
import { AnchoredMenu } from "../../ui/AnchoredMenu.jsx";
import { Empty, ExpandBox, MoreRow, Tap, Title } from "../../ui/primitives.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { PROFILE_BGS, lookStyle } from "../profile/lookConsts.js";
import { profileCard } from "../profile/profileCard.js";
import { backfillSeptemberBadges, settleMonth } from "../profile/season.js";
import { liveBoard } from "../train/social.js";
import { isMutualNemesis } from "./duels.js";
import { Feed } from "./Feed.jsx";
import { Crew } from "./Gym.jsx";
import { PrizeBanner, applyReigning, settleSeason } from "./season.jsx";
// Consume-once: set when a Feed row opens a profile, so back lands on Feed at
// the same scroll. Ordinary tab switches still land on the Board sub-tab.
let feedReturnY = null;
// Disclosure's delayed unmount: hidden content stays through the 250ms
// collapse, then unmounts (frees aura canvases on collapsed board rows).
function useDelayedUnmount(open) {
  const [mounted, setMounted] = useState(!!open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);
  return mounted;
}
export function Board({ s, setS, openProfile, gainXp }) {
  // feedBack is read (not consumed) in the initializers — StrictMode double-
  // invokes them in dev — and cleared in a mount effect, so a profile opened
  // from a Feed row returns to Feed at the saved scroll, and any other entry
  // starts on Board.
  const [feedBack] = useState(() => feedReturnY);
  const [view, setView] = useState(() => (feedReturnY != null ? "feed" : "board"));
  useEffect(() => { feedReturnY = null; }, []);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("month");
  const [muscle, setMuscle] = useState("Chest");
  const [err, setErr] = useState("");
  const [menu, setMenu] = useState(null);       // "⋯" menu anchor
  const [sortMenu, setSortMenu] = useState(null); // metric selector anchor
  const [info, setInfo] = useState(null);       // metric info popover anchor
  const [all, setAll] = useState(false);        // Show all rows
  const restMounted = useDelayedUnmount(all);

  const load = async () => {
    setLoading(true); setErr("");
    if (!window.storage?.list) {
      setErr("The leaderboard needs a connection. Check your signal and tap refresh.");
      setLoading(false); return;
    }
    const readCard = async (k) => {
      try { const r = await window.storage.get(k, true, { fresh: true }); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; }
    };
    let keys = null;
    for (let attempt = 0; attempt < 2 && keys === null; attempt++) {
      try { const res = await window.storage.list("lb:", true); keys = res?.keys || []; }
      catch (e) { if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); }
    }
    if (keys === null) {
      const mine = s.lb ? await readCard(`lb:${s.playerId}`) : null;
      setRows(liveBoard(mine ? [mine] : [], { ghosts: !!s.test }));
      setErr("Couldn't reach the shared leaderboard. Check your connection and tap refresh in a moment.");
    } else {
      const cards = (await Promise.all(keys.map(readCard))).filter(Boolean);
      // The month settle (primary), the retired season settle (still mints
      // earned quarterly badges during overlap), and the reigning badge all
      // run on the ghost-free list: ghost cards are tester-only and must
      // never affect standings.
      settleSeason(s, setS, liveBoard(cards)).catch(() => {});
      settleMonth(s, setS, liveBoard(cards)).catch(() => {});
      backfillSeptemberBadges(s, setS).catch(() => {});
      applyReigning(s, setS, liveBoard(cards));
      setRows(liveBoard(cards, { ghosts: !!s.test }));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (view !== "board" && view !== "crew") return;
    const tick = () => { if (document.visibilityState === "visible") load(); };
    const iv = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", tick); };
  }, [view]);

  const leave = async () => {
    setS((p) => ({ ...p, lb: false }));
    try { await window.storage.delete(`lb:${s.playerId}`, true); } catch (e) { /* not listed */ }
    setRows((r) => r.filter((x) => x.key !== `lb:${s.playerId}`));
  };
  const confirmLeave = () => ask("Leave the board? You'll drop off the leaderboard, the monthly race and duels. Your history stays on your device, and you can rejoin any time.", leave, "Leave");

  const liveMine = profileCard(s);
  const displayRows = overlayOwnBoardRow(rows, liveMine, s.playerId, { lb: s.lb, test: s.test });
  const ws = weekStart();
  const mk = monthKey();
  const SORTS = {
    month: ["Month", "XP", (r) => (r.month?.key === mk ? r.month.xp : 0)],
    points: ["Points", "pts", (r) => r.points || 0], xp: ["XP", "XP", (r) => r.xp || 0],
    streak: ["Streak", "days", (r) => r.streak || 0], week: ["Week", "workouts", (r) => (r.weekOf === ws ? r.week : 0), (r) => (Math.round(((r.weekOf === ws ? r.week : 0) || 0) * 10) / 10).toFixed(1)],
    muscle: ["Muscles", "", (r) => r.groups?.[muscle] || 0, (r) => { const sc = r.groups?.[muscle] || 0; return sc ? rankFromScore(sc).label : "–"; }],
  };
  const [, unit, val, fmt] = SORTS[sort];
  const show = (r) => (fmt ? fmt(r) : val(r).toLocaleString());
  const sorted = [...displayRows].sort((a, b) => val(b) - val(a));
  const top = sorted.slice(0, 3);
  const isMe = (r) => r.key === `lb:${s.playerId}`;
  // a published look is authoritative — award auras (ascended/descended) are
  // permanent stamps, never filtered here by board standing (phase 7o Part A)
  const lookOf = (r) => ({ ...(r.look || {}) });
  const { shown, hidden, pinned } = boardWindow(sorted, isMe);
  const closePopovers = () => { setMenu(null); setSortMenu(null); setInfo(null); };

  const podiumOrder = [top[1], top[0], top[2]];
  const PLACES = [
    { place: 2, h: 92, color: "#C9D6EA", glow: "rgba(201,214,234,.45)" },
    { place: 1, h: 128, color: C.gold, glow: "rgba(255,212,71,.6)" },
    { place: 3, h: 70, color: C.orange, glow: "rgba(255,147,64,.5)" },
  ];

  // Rows 4 and down: two compact lines. Aura-styled backgrounds (lookStyle)
  // stay carded exactly as before; plain rows drop the card for hairlines.
  const rowOf = (r, place, sep) => {
    const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
    const bg = lookStyle(r.look, 0.6);
    return (
      <button key={r.key} type="button" onClick={() => openProfile(r.key.slice(3))} className={`${bg ? "panel p-3" : ""} w-full flex items-center gap-3 text-left`}
        style={bg ? { margin: "6px 0", ...(bg || {}), ...(isMe(r) ? { boxShadow: "0 0 20px rgba(124,211,255,.3)" } : {}) }
          : { padding: "12px 2px", ...(sep ? { borderTop: `1px solid ${C.border}` } : null), ...(isMe(r) ? { border: `1px solid ${C.cyan}66`, borderRadius: 8, padding: "12px 8px", boxShadow: "0 0 20px rgba(124,211,255,.3)" } : {}) }}>
        <span className="w-6 shrink-0 text-center font-extrabold" style={{ fontSize: 16, color: C.dim }}>{place}</span>
        <Avatar src={r.avatar} name={r.name} size={44} ring={rank.color} look={lookOf(r)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold truncate min-w-0" style={{ fontSize: 17 }}><FancyName name={r.name} look={r.look} style={{ color: r.look?.bg && r.look.bg !== "none" ? "#fff" : C.text }} /></span>
            {isMe(r) && <span className="body shrink-0" style={{ fontSize: 12, color: C.cyan }}>you</span>}
            {r.ghost && <span className="shrink-0 font-bold uppercase" style={{ fontSize: 12, color: C.mute }}>ghost</span>}
            {isMutualNemesis(s, r) && <span className="shrink-0" title="Your Nemesis">😈</span>}
            {Object.values(r.badges || {}).some((b) => b.place === 1) && <span className="shrink-0" title="Board champion">🏆</span>}
            {r.title && <span className="shrink-0 font-bold tracking-wider uppercase truncate" style={{ fontSize: 12, color: r.look?.accent || C.cyan }}>{r.title}</span>}
          </div>
          <div className="body" style={{ fontSize: 14, color: C.dim }}><span className="ranklabel">{r.rank}{r.div ? ` ${r.div}` : ""}</span> · Level {r.lvl} · {r.streak} day streak</div>
        </div>
        <div className="shrink-0 text-right">
          <div><span className="font-bold glowtext" style={{ fontSize: 17 }}>{show(r)}</span>{unit ? <span className="body" style={{ fontSize: 13, color: C.mute }}> {unit}</span> : null}</div>
          {cardNeedsXpUpdate(r) ? <div className="body" style={{ fontSize: 12, color: C.mute }}>not updated yet</div> : null}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Title right={
        <span className="flex items-center" style={{ margin: "-5px -8px -5px 0" }}>
          <button aria-label="Refresh" onClick={load} className="inline-flex items-center justify-center" style={{ minWidth: 44, height: 44, color: C.cyan }}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
          {view === "board" && s.lb && (
            <button aria-label="Board options" aria-haspopup="menu" aria-expanded={!!menu} onClick={(e) => { e.stopPropagation(); setSortMenu(null); setInfo(null); setMenu(menu ? null : e.currentTarget); }} className="inline-flex items-center justify-center" style={{ minWidth: 44, height: 44, color: C.mute }}><MoreHorizontal size={20} /></button>
          )}
        </span>
      }>Leaderboard</Title>
      {menu && (
        <AnchoredMenu anchor={menu} onClose={() => setMenu(null)} minWidth={220}>
          <div className="px-4 py-3 body text-sm" style={{ color: C.mute }}>{s.test ? "Ghost mode: only testers can see you · no boss HP or standings" : `On the board as ${s.profile.name}`}</div>
          <button role="menuitem" className="w-full text-left px-5 text-sm font-semibold" style={{ minHeight: 44, paddingTop: 12, paddingBottom: 12, color: C.red, borderTop: `1px solid ${C.glassLine}` }} onClick={() => { setMenu(null); confirmLeave(); }}>Leave the board</button>
        </AnchoredMenu>
      )}

      <div className="flex gap-2">
        {[["board", "Board"], ["feed", "Feed"], ["crew", "Crew"]].map(([id, l]) => (
          <button key={id} onClick={() => { closePopovers(); setView(id); }} className="flex-1" style={{ height: 44, padding: "4px 0" }}>
            <span className="flex items-center justify-center font-bold" style={{ height: 36, fontSize: 15, borderRadius: 4, background: view === id ? C.blue : C.soft, color: view === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</span>
          </button>
        ))}
      </div>
      {view === "feed" && <Feed s={s} setS={setS} openProfile={(id) => { feedReturnY = document.getElementById("ascend-scroll")?.scrollTop ?? 0; openProfile(id); }} rows={rows} restoreScroll={feedBack} />}
      {view === "crew" && <Crew s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />}
      {view === "board" && !s.lb ? (
        <div className="panel p-4 space-y-3">
          <div className="font-bold">Join the leaderboard</div>
          <div className="body text-sm" style={{ color: C.dim }}>{s.test ? "Ghost mode is on. Joining writes a card only tester accounts can see — you won't raise boss HP, monthly standings, or duel matching." : "Everyone using this app will see your profile: name, photo, level, points, rank, streak, achievements, lifetime stats, top lifts, and weight trend. Your food log and individual workouts stay private."}</div>
          {!s.profile.name && <input className="inp" placeholder="Your name" onBlur={(e) => setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } }))} />}
          <button onClick={() => setS((p) => ({ ...p, lb: true }))} disabled={!s.profile.name} className="btn w-full py-3" style={!s.profile.name ? { opacity: 0.5 } : null}>Join as {s.profile.name || "…"}</button>
        </div>
      ) : null}

      {view === "board" && <>
      <div className="flex items-center gap-1">
        <button onClick={(e) => { setInfo(null); setMenu(null); setSortMenu(sortMenu ? null : e.currentTarget); }} aria-haspopup="menu" aria-expanded={!!sortMenu} aria-label="Board metric" className="flex-1 min-w-0 flex items-center gap-2 text-left font-bold" style={{ minHeight: 44, fontSize: 17, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "0 12px" }}>
          <span className="truncate">{SORTS[sort][0]}</span>
          <ChevronDown size={16} className="shrink-0" style={{ color: C.mute }} />
        </button>
        <Tap label={`About the ${SORTS[sort][0]} board`} menu tight onClick={(e) => { setSortMenu(null); setMenu(null); setInfo(info ? null : e.currentTarget); }}><Info size={16} style={{ color: C.mute }} /></Tap>
      </div>
      {sortMenu && (
        <AnchoredMenu anchor={sortMenu} onClose={() => setSortMenu(null)} minWidth={200}>
          {Object.entries(SORTS).map(([id, [l]]) => (
            <button key={id} role="menuitem" className="w-full text-left px-5 text-sm flex items-center gap-2" style={{ minHeight: 44, paddingTop: 12, paddingBottom: 12, color: C.text }} onClick={() => { setSort(id); setSortMenu(null); }}>
              <Check size={16} className="shrink-0" style={{ color: C.cyan, opacity: sort === id ? 1 : 0 }} />{l}
            </button>
          ))}
        </AnchoredMenu>
      )}
      {info && (
        <AnchoredMenu anchor={info} onClose={() => setInfo(null)} minWidth={240}>
          <div className="px-4 py-3 body text-xs space-y-2" style={{ color: C.mute }}>
            {sort === "points" && <div>Board score is the points you have right now. Workouts, lift ranks, quests, fuel, steps, challenges, streak, and sleep/mood check-ins all add. Aura Spin auras multiply that. Each spin spends points and drops your place.</div>}
            {sort === "muscle" && <div>Ranked by each player's best lift in {muscle}. Numbers hide, ranks show.</div>}
            <div>Tap anyone to see their profile, achievements, and leave a high-five or comment.</div>
          </div>
        </AnchoredMenu>
      )}
      {sort === "muscle" && (
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(GROUP_WEIGHT).map((gk) => (
            <button key={gk} onClick={() => setMuscle(gk)} style={{ height: 44, padding: "6px 0" }}>
              <span className="flex items-center justify-center font-bold" style={{ height: 32, borderRadius: 999, fontSize: 13, background: muscle === gk ? C.cyan : C.soft, color: muscle === gk ? "#001018" : C.text, border: `1px solid ${C.border}` }}>{gk}</span>
            </button>
          ))}
        </div>
      )}
      {sort === "month" && <PrizeBanner />}

      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
      {!loading && !err && sorted.length === 0 && <Empty>No one's on the board yet. Join and send your cousins the link.</Empty>}

      {top.length > 0 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-4">
          {podiumOrder.map((r, i) => {
            const P = PLACES[i];
            if (!r) return <div key={i} />;
            const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
            return (
              <button key={r.key} onClick={() => openProfile(r.key.slice(3))} className="flex flex-col items-center">
                {P.place === 1 && <Crown size={26} style={{ color: C.gold, filter: "drop-shadow(0 0 8px rgba(255,212,71,.8))" }} className="mb-1" />}
                {/* Podium #1 showcase (phase 7p): a Descended worn here gets a
                    117px aura canvas — over the painter's 110px small gate, so
                    the full sequence runs — mounted at clock0=6 and delayed
                    ~11s so the prize banner's surge finishes first. Only #1:
                    Descended is kept forever, so multiple holders will share a
                    podium in later months, and uncapped they would bust the
                    frame budget. #2/#3 stay at the frozen rest pose. */}
                <Avatar src={r.avatar} name={r.name} size={P.place === 1 ? 48 : 38} ring={rank.color} look={lookOf(r)}
                  {...(P.place === 1 && lookOf(r).aura === "descended" ? { auraSize: 78, auraClock0: 6, auraDelay: 11000 } : {})} />
                <div className="font-bold text-sm mt-2 text-center w-full truncate"><FancyName name={r.name} look={r.look} style={{ color: isMe(r) ? C.cyan : C.text }} />{r.ghost && <span className="ml-1 text-xs font-bold uppercase" style={{ color: C.mute }}>ghost</span>}</div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase truncate w-full text-center" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="text-xs body mb-2" style={{ color: C.dim }}>{show(r)}{unit ? ` ${unit}` : ""}{cardNeedsXpUpdate(r) ? <div style={{ fontSize: 12, color: C.mute }}>not updated yet</div> : null}</div>
                <div className="w-full flex items-start justify-center pt-2" style={{ height: P.h, borderRadius: "4px 4px 0 0", background: PROFILE_BGS.find((b) => b.id === r.look?.bg)?.css ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.6)), ${PROFILE_BGS.find((b) => b.id === r.look?.bg).css}` : `linear-gradient(180deg, ${P.glow}, ${C.bg})`, backgroundSize: "cover", border: `1px solid ${r.look?.accent || P.color}`, borderBottom: "none", boxShadow: `0 0 20px ${P.glow}` }}>
                  <span className="text-3xl font-extrabold" style={{ color: P.color, textShadow: `0 0 12px ${P.glow}` }}>{P.place}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div>
        {shown.map((r, i) => rowOf(r, i + 4, i > 0))}
        {pinned && !all && rowOf(pinned, sorted.indexOf(pinned) + 1, true)}
        {hidden.length > 0 && (
          <>
            <MoreRow label={all ? "Show fewer" : `Show all ${sorted.length}`} open={all} onToggle={() => { closePopovers(); setAll(!all); }} />
            <ExpandBox open={all}>
              {restMounted ? hidden.map((r, i) => rowOf(r, i + 11, true)) : null}
            </ExpandBox>
          </>
        )}
      </div>
      </>}
    </div>
  );
}

/* ---------- Ranks guide ---------- */
