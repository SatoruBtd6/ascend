import { useEffect, useState } from "react";
import { Crown, RefreshCw } from "lucide-react";
import { GROUP_WEIGHT, RANKS } from "../../data/ranks.js";
import { monthKey, weekStart } from "../../lib/dates.js";
import { rankFromScore } from "../../lib/stats.js";
import { cardNeedsXpUpdate, overlayOwnBoardRow } from "../../math.js";
import { C } from "../../theme.js";
import { Empty, Title } from "../../ui/primitives.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { PROFILE_BGS, lookStyle } from "../profile/lookConsts.js";
import { profileCard } from "../profile/profileCard.js";
import { seasonKey } from "../profile/season.js";
import { liveBoard } from "../train/social.js";
import { isMutualNemesis } from "./duels.js";
import { Feed } from "./Feed.jsx";
import { Crew } from "./Gym.jsx";
import { SeasonBanner, applyReigning, settleSeason } from "./season.jsx";
export function Board({ s, setS, openProfile, gainXp }) {
  const [view, setView] = useState("board");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("season");
  const [muscle, setMuscle] = useState("Chest");
  const [err, setErr] = useState("");

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
      setRows(liveBoard(mine ? [mine] : []));
      setErr("Couldn't reach the shared leaderboard. Check your connection and tap refresh in a moment.");
    } else {
      const cards = await Promise.all(keys.map(readCard));
      const got = liveBoard(cards.filter(Boolean));
      setRows(got);
      settleSeason(s, setS, got).catch(() => {});
      applyReigning(s, setS, got);
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

  const liveMine = profileCard(s);
  const displayRows = overlayOwnBoardRow(rows, liveMine, s.playerId);
  const ws = weekStart();
  const mk = monthKey();
  const sk = seasonKey();
  const SORTS = {
    season: ["Season", "season XP", (r) => (r.season?.key === sk ? r.season.xp : 0)],
    points: ["Points", "pts", (r) => r.points || 0], xp: ["XP", "XP", (r) => r.xp || 0], month: ["Month", "XP this month", (r) => (r.month?.key === mk ? r.month.xp : 0)],
    streak: ["Streak", "days", (r) => r.streak || 0], week: ["Week", "workouts", (r) => (r.weekOf === ws ? r.week : 0), (r) => (Math.round(((r.weekOf === ws ? r.week : 0) || 0) * 10) / 10).toFixed(1)],
    muscle: ["Muscles", "", (r) => r.groups?.[muscle] || 0, (r) => { const sc = r.groups?.[muscle] || 0; return sc ? rankFromScore(sc).label : "–"; }],
  };
  const [, unit, val, fmt] = SORTS[sort];
  const show = (r) => (fmt ? fmt(r) : val(r).toLocaleString());
  const sorted = [...displayRows].sort((a, b) => val(b) - val(a));
  const top = sorted.slice(0, 3), rest = sorted.slice(3);
  const isMe = (r) => r.key === `lb:${s.playerId}`;
  const seasonRanked = [...displayRows].sort((a, b) => ((b.season?.key === sk ? b.season.xp : 0) || 0) - ((a.season?.key === sk ? a.season.xp : 0) || 0));
  const reigningKey = seasonRanked[0] && ((seasonRanked[0].season?.key === sk ? seasonRanked[0].season.xp : 0) || 0) > 0 ? seasonRanked[0].key : null;
  const lookOf = (r) => {
    const L = { ...(r.look || {}) };
    if (r.key !== reigningKey && L.aura === "ascended") L.aura = L.auraPrev && L.auraPrev !== "ascended" ? L.auraPrev : "none";
    return L;
  };

  const podiumOrder = [top[1], top[0], top[2]];
  const PLACES = [
    { place: 2, h: 92, color: "#C9D6EA", glow: "rgba(201,214,234,.45)" },
    { place: 1, h: 128, color: C.gold, glow: "rgba(255,212,71,.6)" },
    { place: 3, h: 70, color: C.orange, glow: "rgba(255,147,64,.5)" },
  ];

  return (
    <div className="space-y-4">
      <Title right={<button aria-label="Refresh" onClick={load} className="p-2" style={{ color: C.cyan }}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>}>Leaderboard</Title>

      <div className="flex gap-2">
        {[["board", "Board"], ["feed", "Feed"], ["crew", "Crew"]].map(([id, l]) => <button key={id} onClick={() => setView(id)} className="flex-1 py-2 text-sm font-bold" style={{ borderRadius: 4, background: view === id ? C.blue : C.soft, color: view === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>)}
      </div>
      {view === "feed" && <Feed s={s} setS={setS} openProfile={openProfile} rows={rows} />}
      {view === "crew" && <Crew s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />}
      {view === "board" && !s.lb ? (
        <div className="panel p-4 space-y-3">
          <div className="font-bold">Join the leaderboard</div>
          <div className="body text-sm" style={{ color: C.dim }}>{s.test ? "Ghost mode is on. Joining still writes a card, but other players won't see you and you won't raise boss HP, season standings, or duel matching." : "Everyone using this app will see your profile: name, photo, level, points, rank, streak, achievements, lifetime stats, top lifts, and weight trend. Your food log and individual workouts stay private."}</div>
          {!s.profile.name && <input className="inp" placeholder="Your name" onBlur={(e) => setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } }))} />}
          <button onClick={() => setS((p) => ({ ...p, lb: true }))} disabled={!s.profile.name} className="btn w-full py-3" style={!s.profile.name ? { opacity: 0.5 } : null}>Join as {s.profile.name || "…"}</button>
        </div>
      ) : view === "board" ? (
        <div className="body text-sm flex justify-between" style={{ color: C.dim }}>
          <span>{s.test ? "Ghost mode: hidden from the board and boss HP" : `You're on the board as ${s.profile.name}`}</span>
          <button onClick={leave} className="underline" style={{ color: C.red }}>Leave</button>
        </div>
      ) : null}

      {view === "board" && <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(SORTS).map(([id, [l]]) => (
          <button key={id} onClick={() => setSort(id)} className="px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 4, background: sort === id ? C.blue : C.soft, color: sort === id ? "#fff" : C.text, border: `1px solid ${C.border}`, boxShadow: sort === id ? "0 0 14px rgba(47,140,255,.5)" : "none" }}>{l}</button>
        ))}
      </div>
      {sort === "muscle" && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.keys(GROUP_WEIGHT).map((gk) => <button key={gk} onClick={() => setMuscle(gk)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: muscle === gk ? C.cyan : C.soft, color: muscle === gk ? "#001018" : C.text, border: `1px solid ${C.border}` }}>{gk}</button>)}
        </div>
      )}
      {sort === "season" && <SeasonBanner />}
      {sort === "month" && <div className="body text-xs" style={{ color: C.mute }}>XP earned since the 1st. Resets every month, so anyone can take the top spot.</div>}
      {sort === "muscle" && <div className="body text-xs" style={{ color: C.mute }}>Ranked by each player's best lift in {muscle}. Numbers hide, ranks show.</div>}
      {sort === "points" && <div className="body text-xs" style={{ color: C.mute }}>Board score is the points you have right now. Workouts, lift ranks, quests, fuel, steps, challenges, streak, and sleep/mood check-ins all add. Anime Crate auras multiply that. Opening crates spends points and drops your place.</div>}

      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
      {!loading && !err && sorted.length === 0 && <Empty>No one's on the board yet. Join and send your cousins the link.</Empty>}

      {top.length > 0 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-6">
          {podiumOrder.map((r, i) => {
            const P = PLACES[i];
            if (!r) return <div key={i} />;
            const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
            return (
              <button key={r.key} onClick={() => openProfile(r.key.slice(3))} className="flex flex-col items-center">
                {P.place === 1 && <Crown size={26} style={{ color: C.gold, filter: "drop-shadow(0 0 8px rgba(255,212,71,.8))" }} className="mb-1" />}
                <Avatar src={r.avatar} name={r.name} size={P.place === 1 ? 48 : 38} ring={rank.color} look={lookOf(r)} />
                <div className="font-bold text-sm mt-2 text-center w-full truncate"><FancyName name={r.name} look={r.look} style={{ color: isMe(r) ? C.cyan : C.text }} /></div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase truncate w-full text-center" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="text-xs body mb-2" style={{ color: C.dim }}>{show(r)} {unit}{cardNeedsXpUpdate(r) ? <div style={{ color: C.mute }}>not updated yet</div> : null}</div>
                <div className="w-full flex items-start justify-center pt-2" style={{ height: P.h, borderRadius: "4px 4px 0 0", background: PROFILE_BGS.find((b) => b.id === r.look?.bg)?.css ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.6)), ${PROFILE_BGS.find((b) => b.id === r.look?.bg).css}` : `linear-gradient(180deg, ${P.glow}, ${C.bg})`, backgroundSize: "cover", border: `1px solid ${r.look?.accent || P.color}`, borderBottom: "none", boxShadow: `0 0 20px ${P.glow}` }}>
                  <span className="text-3xl font-extrabold" style={{ color: P.color, textShadow: `0 0 12px ${P.glow}` }}>{P.place}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {rest.map((r, i) => {
          const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
          return (
            <button key={r.key} onClick={() => openProfile(r.key.slice(3))} className="panel p-3 flex items-center gap-3 w-full text-left" style={{ ...(lookStyle(r.look, 0.6) || {}), ...(isMe(r) ? { boxShadow: "0 0 20px rgba(124,211,255,.3)" } : {}) }}>
              <span className="w-7 text-center text-lg font-extrabold" style={{ color: C.dim }}>{i + 4}</span>
              <Avatar src={r.avatar} name={r.name} size={32} ring={rank.color} look={lookOf(r)} />
              <div className="flex-1 min-w-0 ml-1">
                <div className="font-bold truncate"><FancyName name={r.name} look={r.look} style={{ color: r.look?.bg && r.look.bg !== "none" ? "#fff" : C.text }} />{isMe(r) && <span className="body text-xs ml-2" style={{ color: C.cyan }}>you</span>}{isMutualNemesis(s, r) && <span className="ml-1" title="Your Nemesis">😈</span>}{Object.values(r.badges || {}).some((b) => b.place === 1) && <span className="ml-1" title="Season champion">🏆</span>}</div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="body text-xs" style={{ color: C.dim }}><span className="ranklabel">{r.rank}{r.div ? ` ${r.div}` : ""}</span> · Level {r.lvl} · {r.streak} day streak</div>
              </div>
              <div className="text-right">
                <div className="font-bold glowtext">{show(r)}</div>
                <div className="body text-xs" style={{ color: C.mute }}>{unit}</div>
                {cardNeedsXpUpdate(r) ? <div className="body text-xs" style={{ color: C.mute }}>not updated yet</div> : null}
              </div>
            </button>
          );
        })}
      </div>
      {sorted.length > 0 && <div className="body text-xs" style={{ color: C.mute }}>Tap anyone to see their profile, achievements, and leave a high-five or comment.</div>}
      </>}
    </div>
  );
}

/* ---------- Ranks guide ---------- */
