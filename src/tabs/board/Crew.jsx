import { useEffect, useMemo, useState } from "react";
import { ask } from "../../lib/ask.js";
import { today, weekStart } from "../../lib/dates.js";
import { RAID_COUNTDOWN_MS, RAID_NEED, RAID_XP, applyRaidAction, canProposeRaid, crewQuestProgress, presenceActive, prunePresence, raidActive, raidCountdownLeft, raidPhase, tickRaid } from "../../math.js";
import { C } from "../../theme.js";
import { Bar } from "../../ui/primitives.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { profileCard } from "../profile/profileCard.js";
import { CrewBanner } from "../profile/profileWidgets.jsx";
import { casPres, casRaid, ghostBundle, patchGhost, readPres, readRaid } from "../train/raidIO.js";
import { liveBoard } from "../train/social.js";
import { crewCode, loadCrewRoster, readCrew, writeCrewMembership } from "./crewIO.js";
import { fmtAgo, fmtHMS, getGps, locErrorText } from "./gymPresence.js";
export function CrewQuests({ s, setS, rows, crew, code }) {
  const ws = weekStart();
  const myCard = useMemo(() => profileCard(s), [s]);
  // Headcount comes from the crew record as well as the loaded rows: the roster can still be
  // empty on first paint, and a member who hasn't opened the app today has no fresh card yet.
  const cards = useMemo(() => {
    const byId = new Map();
    (crew?.members || []).forEach((id) => id && byId.set(id, { id }));
    (rows || []).forEach((r) => r?.id && byId.set(r.id, r));
    byId.set(s.playerId, myCard);
    return [...byId.values()];
  }, [rows, crew?.members, myCard, s.playerId]);
  const { quests, members, done } = crewQuestProgress(cards, ws, cards.length);
  const reporting = cards.filter((c) => c.wk?.key === ws).length;
  const key = `${code}_${ws}`;
  const earned = !!s.crewBanners?.[key];
  useEffect(() => {
    if (!done || earned || !code) return;
    setS((p) => (p.crewBanners?.[key] ? p : { ...p, crewBanners: { ...(p.crewBanners || {}), [key]: { code, week: ws, t: Date.now() } } }));
  }, [done, earned, key]);
  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">Crew quests · this week</div>
        {(earned || done) && <CrewBanner count={Object.keys(s.crewBanners || {}).length} />}
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Pooled across all {members} member{members === 1 ? "" : "s"}. Clear all three by Saturday night for a crew banner. No effect on the boss.</div>
      {reporting < members && <div className="body text-xs" style={{ color: C.mute }}>{members - reporting} member{members - reporting === 1 ? "" : "s"} haven't opened the new version this week, so their progress still reads zero.</div>}
      {quests.map((q) => (
        <div key={q.id} className="space-y-1">
          <div className="flex justify-between items-baseline gap-3 text-xs body"><span className="min-w-0 truncate" style={{ color: q.done ? C.green : C.sub }}>{q.title}</span><span className="tabular-nums shrink-0 whitespace-nowrap" style={{ color: C.dim }}>{q.value} / {q.target} {q.unit}</span></div>
          <Bar pct={Math.min(1, q.value / Math.max(1, q.target)) * 100} color={q.done ? C.green : C.cyan} />
        </div>
      ))}
    </div>
  );
}
export function raidStatus(id, presence, raid, now) {
  const gym = presenceActive(presence?.[id], now);
  const ready = raidPhase(raid, now) === "lobby" && gym && raid?.ready?.[id] != null && !(raid.left?.[id] != null && +raid.left[id] >= +raid.ready[id]);
  if (ready) return "ready";
  if (gym) return "at-gym";
  return "not-here";
}
export function RaidNight({ s, setS, crew, code, people, presence, raid, setRaid, ghost, gainXp }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const names = Object.fromEntries((people || []).map((p) => [p.id, p.name || "Teammate"]));
  names[s.playerId] = s.profile.name || "You";
  const n = Math.max(people?.length || 0, (crew?.members || []).length, 1);
  const ctx = () => ({ playerId: s.playerId, now: Date.now(), presence, memberCount: n, ghostMode: !!ghost, ghostRaid: raid });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const ph = raidPhase(raid, now);
    if (ph !== "lobby" || !raid?.countdownAt || now < raid.countdownAt + RAID_COUNTDOWN_MS) return;
    (async () => {
      const got = await casRaid(code, "tick", ctx());
      if (got.raid) {
        setRaid(got.raid);
        if (ghost) patchGhost(setS, (g) => ({ ...g, raid: got.raid }));
      }
    })();
  }, [now, raid?.countdownAt, raid?.phase]);
  useEffect(() => {
    if (!raid?.cleared || !s.playerId || !raid.hits?.[s.playerId] || !raid.start) return;
    const eid = `raid_${code}_${raid.start}`;
    if (s.xpDone?.[eid]) return;
    gainXp?.(RAID_XP, "Raid night clear", eid);
  }, [raid?.cleared, raid?.start, code, s.playerId]);
  const act = async (action) => {
    setBusy(true); setErr("");
    const got = await casRaid(code, action, ctx());
    if (got.raid) {
      setRaid(got.raid);
      if (ghost) patchGhost(setS, (g) => ({ ...g, raid: got.raid }));
    }
    if (!got.ok) {
      const why = { "crew-size": `Need ${RAID_NEED} members to raid.`, "not-at-gym": "Check in at the crew gym first.", active: "A raid is already open.", "not-host": "Only the host can cancel.", "no-lobby": "No lobby to join." }[got.reason] || "Couldn't update the raid.";
      setErr(why);
    }
    setBusy(false);
  };
  const live = raidActive(raid, now);
  const lobby = raidPhase(raid, now) === "lobby";
  const cd = lobby ? raidCountdownLeft(raid, now) : null;
  const readyIds = Object.keys(raid?.ready || {}).filter((id) => raidStatus(id, presence, raid, now) === "ready");
  const hostName = names[raid?.by] || "Host";
  const myGym = presenceActive(presence?.[s.playerId], now);
  const myReady = readyIds.includes(s.playerId);
  const canRaid = canProposeRaid(n);
  return (
    <div className="panel p-3 space-y-2" style={{ borderColor: live || (cd != null && cd <= 3) ? C.orange : C.border }}>
      <div className="font-bold text-sm">Raid night</div>
      <div className="body text-xs" style={{ color: C.dim }}>Ready up at the crew gym. After 3 people ready, a 3-2-1 starts the raid. Then you have 3 hours to log a workout there. +{RAID_XP} XP each if {RAID_NEED} of you finish. Boss HP is unchanged.</div>
      {!canRaid && <div className="body text-xs" style={{ color: C.orange }}>Crews need {RAID_NEED} members to raid.</div>}
      {lobby && (
        <div className="space-y-1">
          {(people || []).map((p) => {
            const st = raidStatus(p.id, presence, raid, now);
            const label = st === "ready" ? "ready" : st === "at-gym" ? "at the gym" : "not here";
            const col = st === "ready" ? C.green : st === "at-gym" ? C.cyan : C.mute;
            return (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="truncate font-semibold">{p.name || "Teammate"}{p.id === s.playerId ? " (you)" : ""}{raid?.by === p.id ? " · host" : ""}</span>
                <span style={{ color: col }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
      {lobby && cd != null && (
        <div className="text-center space-y-1">
          <div className="font-extrabold tabular-nums" style={{ fontSize: 42, color: C.orange, lineHeight: 1 }}>{cd || "GO"}</div>
          <div className="body text-xs font-bold" style={{ color: C.sub }}>Starting with {readyIds.map((id) => names[id] || "Teammate").join(", ")}</div>
        </div>
      )}
      {live && (
        <>
          <div className="flex justify-between text-sm font-bold tabular-nums"><span style={{ color: C.orange }}>Live · {fmtHMS(Math.max(0, Math.ceil((raid.end - now) / 1000)))}</span><span>{Object.keys(raid.hits || {}).length}/{RAID_NEED} logged</span></div>
          {Object.values(raid.hits || {}).map((h, i) => <div key={i} className="body text-xs" style={{ color: C.sub }}>{h.name} · {Math.round(h.vol || 0).toLocaleString()} lb</div>)}
          {raid.cleared && <div className="body text-xs font-bold" style={{ color: C.green }}>Raid cleared.</div>}
        </>
      )}
      {raid?.cleared && raid.end > now - 6 * 3600 * 1000 && !live && !lobby && (
        <div className="body text-xs" style={{ color: C.green }}>Last raid cleared · {Object.keys(raid.hits || {}).length} raiders</div>
      )}
      {raid?.cancelled && !live && !lobby && <div className="body text-xs" style={{ color: C.mute }}>Last raid cancelled. Nothing awarded.</div>}
      {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      <div className="flex flex-col gap-1.5">
        {!lobby && !live && canRaid && <button type="button" disabled={busy} onClick={() => act("propose")} className="btn w-full py-2.5 text-sm">Propose raid</button>}
        {lobby && !myReady && <button type="button" disabled={busy || !myGym} onClick={() => act("ready")} className="btn w-full py-2.5 text-sm">{myGym ? "Ready" : "Check in at the gym to ready"}</button>}
        {lobby && myReady && <button type="button" disabled={busy} onClick={() => act("leave")} className="ghost w-full py-2 text-sm font-bold">Leave lobby</button>}
        {lobby && !myReady && raid?.in?.[s.playerId] && <button type="button" disabled={busy} onClick={() => act("leave")} className="ghost w-full py-2 text-sm">Leave lobby</button>}
        {(lobby || (live && !raid.cleared)) && raid?.by === s.playerId && <button type="button" disabled={busy} onClick={() => act("cancel")} className="ghost w-full py-2 text-sm" style={{ color: C.red }}>Cancel raid</button>}
      </div>
      {lobby && <div className="body text-[11px]" style={{ color: C.mute }}>Host: {hostName}. If they leave, someone still in the lobby takes over.</div>}
    </div>
  );
}
export function CrewGymBlock({ s, setS, crew, setCrew, presence, people, ghost }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const owner = crew?.owner === s.playerId;
  const pinGym = async () => {
    setBusy(true); setMsg("");
    try {
      const here = await getGps({ test: !!ghost, gym: ghost ? { lat: 41.8827, lng: -87.6233 } : null });
      const gym = { lat: here.lat, lng: here.lng, t: Date.now() };
      if (ghost) patchGhost(setS, (g) => ({ ...g, gym }));
      else {
        const rec = { ...crew, gym };
        await window.storage.set(`crew:${crew.code}`, JSON.stringify(rec), true);
        setCrew(rec);
      }
      setMsg("Crew gym pinned to where you're standing.");
    } catch (e) { setMsg(locErrorText(e)); }
    setBusy(false);
  };
  const unpinGym = () => ask("Unpin this gym? Check-ins and raid ready-ups stop until you pin a new one.", async () => {
    setBusy(true); setMsg("");
    try {
      if (ghost) patchGhost(setS, (g) => ({ ...g, gym: null, presence: {}, ping: null }));
      else {
        const rec = { ...crew, gym: null };
        await window.storage.set(`crew:${crew.code}`, JSON.stringify(rec), true);
        setCrew(rec);
        if (crew?.code) await casPres(crew.code, (p) => ({ ...p, at: {}, ping: null, onWay: {} }));
      }
      setS((p) => ({ ...p, atGym: null }));
      setMsg("Gym unpinned.");
    } catch (e) { setMsg("Couldn't unpin. Check your connection."); }
    setBusy(false);
  }, "Unpin");
  const at = people.filter((p) => presenceActive(presence?.[p.id], now));
  return (
    <div className="panel p-3 space-y-2">
      <div className="font-bold text-sm">Crew gym</div>
      <div className="body text-xs" style={{ color: C.dim }}>{crew?.gym ? "Pinned. Only the crew creator can move or unpin it. We never save your phone's coordinates — only this gym pin." : "The crew creator pins the gym while standing in it. Raids and check-ins use that pin."}</div>
      {owner && <button type="button" disabled={busy} onClick={pinGym} className="ghost w-full py-2 text-sm font-bold" style={{ color: C.cyan }}>{crew?.gym ? "Move gym to where I am" : "Set gym to where I am"}</button>}
      {owner && crew?.gym && <button type="button" disabled={busy} onClick={unpinGym} className="ghost w-full py-2 text-sm font-bold" style={{ color: C.red }}>Unpin gym</button>}
      {!owner && !crew?.gym && <div className="body text-xs" style={{ color: C.orange }}>Ask the crew creator to pin a gym.</div>}
      {msg && <div className="body text-xs" style={{ color: C.sub }}>{msg}</div>}
      <div className="body text-xs font-bold" style={{ color: C.dim }}>At the gym now</div>
      {at.length === 0 ? <div className="body text-xs" style={{ color: C.mute }}>Nobody's checked in.</div> : at.map((p) => (
        <div key={p.id} className="flex justify-between text-xs"><span className="truncate">{p.name}{p.id === s.playerId ? " (you)" : ""}</span><span style={{ color: C.green }}>{fmtAgo(presence[p.id], now)}</span></div>
      ))}
    </div>
  );
}
export function GhostCrew({ s, setS, gainXp }) {
  const g = ghostBundle(s);
  useEffect(() => { if (!s.ghost?.crew) patchGhost(setS, () => g); }, []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const people = [
    { id: s.playerId, name: s.profile.name || "You" },
    ...Object.values(g.mocks || {}),
  ];
  const presence = prunePresence({ ...(g.presence || {}) }, now);
  const toggleMock = (id) => {
    patchGhost(setS, (prev) => {
      const presenceNext = { ...(prev.presence || {}) };
      if (presenceActive(presenceNext[id], Date.now())) delete presenceNext[id];
      else presenceNext[id] = Date.now();
      let raid = prev.raid;
      const atGym = presenceActive(presenceNext[id], Date.now());
      if (raidPhase(raid, Date.now()) === "lobby") {
        const got = applyRaidAction(raid, atGym ? "ready" : "drop", { playerId: id, now: Date.now(), presence: presenceNext, memberCount: prev.crew.members.length });
        if (got.ok) raid = got.raid;
      }
      return { ...prev, presence: presenceNext, raid };
    });
  };
  return (
    <div className="panel p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Test crew</div>
          <div className="font-bold">{g.crew.name}</div>
        </div>
        <div className="body text-xs text-right" style={{ color: C.orange }}>local only · no board</div>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Ghost mode uses fake teammates and a fake gym on this device. Nothing is written to a real crew or the leaderboard.</div>
      <div className="space-y-1">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate font-semibold">{p.name}{p.id === s.playerId ? " (you)" : ""}</span>
            {p.id !== s.playerId && <button type="button" onClick={() => toggleMock(p.id)} className="ghost px-2 py-1 text-[11px] font-bold" style={{ color: presenceActive(presence[p.id], now) ? C.green : C.cyan }}>{presenceActive(presence[p.id], now) ? "At gym · ready" : "Simulate at gym"}</button>}
          </div>
        ))}
      </div>
      <CrewGymBlock s={s} setS={setS} crew={{ ...g.crew, gym: g.gym }} setCrew={() => {}} presence={presence} people={people} ghost />
      <RaidNight s={s} setS={setS} crew={g.crew} code={g.crew.code} people={people} presence={presence} raid={tickRaid(g.raid, { now, presence })} setRaid={(r) => patchGhost(setS, (prev) => ({ ...prev, raid: r }))} ghost gainXp={gainXp} />
    </div>
  );
}
export function CrewPanel({ s, setS, rows, openProfile, gainXp }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [crew, setCrew] = useState(null);
  const [roster, setRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [raid, setRaid] = useState(null);
  const [pres, setPres] = useState({ at: {} });
  const mine = s.crew;
  const refreshRoster = async () => {
    if (!mine?.code) { setRoster([]); return; }
    try {
      const { rec, rows: people } = await loadCrewRoster(mine.code, s, rows);
      if (rec) setCrew(rec);
      setRoster(people);
    } catch { setRoster([]); }
  };
  useEffect(() => { if (mine?.code) readCrew(mine.code).then(setCrew); }, [mine?.code]);
  useEffect(() => { refreshRoster(); }, [mine?.code, rows]);
  useEffect(() => {
    if (!mine?.code) { setRaid(null); setPres({ at: {} }); return; }
    let stop = false;
    const pull = async () => {
      try {
        const [r, p] = await Promise.all([readRaid(mine.code), readPres(mine.code)]);
        if (stop) return;
        setRaid(r);
        setPres(p || { at: {} });
      } catch { /* */ }
    };
    pull();
    const id = setInterval(pull, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [mine?.code]);
  useEffect(() => {
    if (!raid?.cleared || !mine?.code || !s.playerId || !raid.hits?.[s.playerId]) return;
    const eid = `raid_${mine.code}_${raid.start}`;
    if (s.xpDone?.[eid]) return;
    gainXp?.(RAID_XP, "Raid night clear", eid);
  }, [raid?.cleared, raid?.start, mine?.code, s.playerId]);
  const create = async () => {
    if (!s.lb || !s.profile.name) { setErr("Join the leaderboard first."); return; }
    setBusy(true); setErr("");
    const c = crewCode(), rec = { code: c, name: name.trim().slice(0, 30) || `${s.profile.name}'s crew`, owner: s.playerId, members: [s.playerId], t: Date.now() };
    try { await window.storage.set(`crew:${c}`, JSON.stringify(rec), true); await window.storage.set(`crewmem:${c}:${s.playerId}`, JSON.stringify({ id: s.playerId, name: s.profile.name, since: today(), uid: window.ascendUserId || null }), true); setS((p) => ({ ...p, crew: { code: c, name: rec.name, since: today() } })); setCrew(rec); }
    catch (e) { setErr("Couldn't create the crew. Check your connection."); }
    setBusy(false);
  };
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true); setErr("");
    const rec = await readCrew(c);
    if (!rec) { setErr("No crew with that code."); setBusy(false); return; }
    const members = [...new Set([...(rec.members || []), s.playerId])];
    const next = await writeCrewMembership(c, { ...rec, members }, s, true);
    setS((p) => ({ ...p, crew: { code: c, name: rec.name, since: today() } })); setCrew(next || { ...rec, members }); setCode(""); setBusy(false);
  };
  const leave = () => ask("Leave this crew? You'll go back to the global boss only.", () => {
    setTimeout(() => ask("Are you absolutely sure? You will lose all current boss progress with this crew. This cannot be undone.", async () => {
      await writeCrewMembership(mine.code, crew, s, false);
      setS((p) => ({ ...p, crew: null })); setCrew(null); setRoster([]);
    }, "Leave for good"), 80);
  }, "Continue");
  const memberRows = liveBoard(roster.length ? roster : (crew ? rows.filter((r) => r.id === s.playerId || r.crew?.code === crew.code || (crew.members || []).includes(r.id)) : [])).filter((r) => !(s.test && r.id === s.playerId));
  const headcount = Math.max(memberRows.length, new Set([...(crew?.members || []), s.playerId]).size, 1);
  const presence = prunePresence(pres?.at, Date.now());
  const people = memberRows.map((r) => ({ id: r.id, name: r.name }));
  if (s.test) return <GhostCrew s={s} setS={setS} gainXp={gainXp} />;
  if (mine?.code) {
    return (
      <div className="panel p-4 space-y-2">
        <div className="flex justify-between items-start"><div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Your crew</div><div className="font-bold">{crew?.name || mine.name}</div></div><div className="text-right"><div className="font-mono font-bold" style={{ color: C.cyan }}>{mine.code}</div><div className="body text-xs" style={{ color: C.dim }}>{headcount} member{headcount === 1 ? "" : "s"}</div></div></div>
        <div className="body text-xs" style={{ color: C.dim }}>Share the code so others can join. Your crew boss is sized to your crew.</div>
        <div className="space-y-1.5">
          {memberRows.map((r) => (
            <button key={r.id || r.key} onClick={() => openProfile?.(r.id)} className="w-full flex items-center gap-2 text-left py-1">
              <Avatar src={r.avatar} name={r.name} size={28} look={r.look} />
              <span className="flex-1 min-w-0 truncate font-semibold text-sm"><FancyName name={r.name} look={r.look} /></span>
              {r.id === s.playerId && <span className="body text-xs" style={{ color: C.cyan }}>you</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigator.clipboard?.writeText(mine.code)} className="ghost flex-1 py-2 text-sm font-semibold" style={{ color: C.cyan }}>Copy code</button>
          <button type="button" onClick={leave} className="ghost px-3 py-2 text-sm" style={{ color: C.red }}>Leave</button>
        </div>
        <CrewQuests s={s} setS={setS} rows={memberRows} crew={crew} code={mine.code} />
        <CrewGymBlock s={s} setS={setS} crew={crew} setCrew={setCrew} presence={presence} people={people} />
        <RaidNight s={s} setS={setS} crew={crew} code={mine.code} people={people} presence={presence} raid={raid} setRaid={setRaid} gainXp={gainXp} />
      </div>
    );
  }
  return (
    <div className="panel p-4 space-y-3">
      <div><div className="font-bold">Start or join a crew</div><div className="body text-xs mt-0.5" style={{ color: C.dim }}>Crews get their own boss, sized to how many of you there are. You'll still fight the global boss with everyone.</div></div>
      <div className="flex gap-2"><input className="inp text-sm" placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} /><button onClick={create} disabled={busy} className="btn px-4 text-sm whitespace-nowrap">Create</button></div>
      <div className="flex gap-2"><input className="inp text-sm font-mono" placeholder="Invite code" value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} /><button onClick={join} disabled={busy || code.trim().length < 4} className="ghost px-4 text-sm font-bold" style={{ color: C.cyan }}>Join</button></div>
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
    </div>
  );
}

/* ---------- Animated boss art ---------- */
