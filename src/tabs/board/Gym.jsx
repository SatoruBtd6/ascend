import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { GYM_RADIUS_M, PRESENCE_MS, checkGymPin, pingActive, presenceActive } from "../../math.js";
import { C } from "../../theme.js";
import { casPres, ghostBundle, patchGhost, readPres } from "../train/raidIO.js";
import { BossFight } from "./BossFight.jsx";
import { CrewPanel } from "./Crew.jsx";
import { readCrew } from "./crewIO.js";
import { DuelsPanel } from "./Duels.jsx";
import { fmtAgo, getGps, locErrorText, stampPresence } from "./gymPresence.js";
export function GymCheckBtn({ s, setS }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const now = Date.now();
  const here = presenceActive(s.atGym, now);
  const gym = s.test ? ghostBundle(s).gym : null;
  const [crewGym, setCrewGym] = useState(gym);
  useEffect(() => {
    if (s.test) { setCrewGym(ghostBundle(s).gym || null); return; }
    if (!s.crew?.code) { setCrewGym(null); return; }
    let stop = false;
    readCrew(s.crew.code).then((rec) => { if (!stop) setCrewGym(rec?.gym || null); }).catch(() => {});
    return () => { stop = true; };
  }, [s.test, s.crew?.code, s.ghost?.gym]);
  useEffect(() => {
    if (!here) return;
    const pin = s.test ? ghostBundle(s).gym : crewGym;
    let stop = false;
    const watch = async () => {
      if (stop) return;
      if (!pin) { await stampPresence(s, setS, Date.now(), true); setMsg("Crew gym isn't set yet."); return; }
      try {
        const pos = await getGps({ test: s.test, gym: pin });
        const chk = checkGymPin(pos, pin);
        if (!chk.ok) { await stampPresence(s, setS, Date.now(), true); setMsg(chk.reason === "too-far" ? "You left the gym pin — check-in dropped." : "Crew gym isn't set yet."); }
      } catch (e) {
        if (e?.code === 1) { await stampPresence(s, setS, Date.now(), true); setMsg(locErrorText(e)); }
      }
    };
    watch();
    const id = setInterval(watch, 45000);
    return () => { stop = true; clearInterval(id); };
  }, [here, s.test, s.crew?.code, crewGym?.lat, crewGym?.lng]);
  const tap = async () => {
    setBusy(true); setMsg("");
    const pin = s.test ? ghostBundle(s).gym : crewGym;
    if (!pin) { setMsg(s.test ? "Set a test gym on the crew tab." : "Your crew leader hasn't pinned a gym yet."); setBusy(false); return; }
    try {
      const pos = await getGps({ test: s.test, gym: pin });
      const chk = checkGymPin(pos, pin);
      if (!chk.ok) { setMsg(chk.reason === "too-far" ? `You have to be within ${GYM_RADIUS_M} m of the crew gym.` : "Crew gym isn't set yet."); setBusy(false); return; }
      await stampPresence(s, setS, Date.now(), false);
    } catch (e) { setMsg(locErrorText(e)); }
    setBusy(false);
  };
  const ping = async () => {
    if (!here) return;
    const nowT = Date.now();
    const payload = { by: s.playerId, name: s.profile.name || "You", t: nowT };
    setMsg("");
    if (s.test) {
      patchGhost(setS, (g) => ({ ...g, ping: payload, onWay: {} }));
      setMsg("Pinged · crew sees this on Status for 90 minutes.");
      return;
    }
    if (!s.crew?.code) { setMsg("Join a crew to ping for a spot."); return; }
    const wrote = await casPres(s.crew.code, (rec) => ({ ...rec, ping: payload, onWay: {} }));
    setMsg(wrote ? "Pinged · crew sees this on Status for 90 minutes." : "Couldn't send the ping. Check your connection.");
  };
  return (
    <>
      <button type="button" disabled={busy} onClick={tap} className="ghost py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: here ? C.green : C.cyan, borderColor: here ? C.green : C.border }}><MapPin size={16} />{busy ? "Checking…" : here ? "At the gym ✓" : "At the gym"}</button>
      {here && <button type="button" onClick={ping} className="col-span-2 ghost py-2 text-sm font-bold relative z-50" style={{ color: C.orange, borderColor: C.orange }}>Who wants a spot?</button>}
      {msg && <div className="col-span-2 body text-[11px] leading-snug" style={{ color: C.orange }}>{msg}</div>}
    </>
  );
}
export function GymSpotBanner({ s, setS }) {
  const [remote, setRemote] = useState({ ping: null, onWay: {} });
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (s.test || !s.crew?.code) return;
    let stop = false;
    const pull = async () => {
      const rec = await readPres(s.crew.code);
      if (stop) return;
      setRemote({ ping: rec?.ping || null, onWay: rec?.onWay || {} });
    };
    pull();
    const id = setInterval(pull, 4000);
    return () => { stop = true; clearInterval(id); };
  }, [s.test, s.crew?.code]);
  const ping = s.test ? (s.ghost?.ping || null) : remote.ping;
  const onWay = s.test ? (s.ghost?.onWay || {}) : remote.onWay;
  const now = Date.now();
  if (!pingActive(ping, now)) return null;
  const mine = ping.by === s.playerId;
  const going = onWay?.[s.playerId];
  const sayComing = async () => {
    const t = Date.now();
    if (s.test) { patchGhost(setS, (g) => ({ ...g, onWay: { ...(g.onWay || {}), [s.playerId]: t } })); return; }
    const wrote = await casPres(s.crew.code, (rec) => ({ ...rec, ping: rec.ping || ping, onWay: { ...(rec.onWay || {}), [s.playerId]: t } }));
    if (wrote) setRemote({ ping: wrote.ping || ping, onWay: wrote.onWay || {} });
  };
  const who = Object.entries(onWay || {}).filter(([id, t]) => id !== ping.by && presenceActive(t, now)).map(([id]) => (id === s.playerId ? "you" : "a teammate"));
  const leftM = Math.max(1, Math.ceil((PRESENCE_MS - (now - ping.t)) / 60000));
  return (
    <div className="panel p-3 flex items-center gap-2" style={{ borderColor: `${C.orange}66` }}>
      <MapPin size={16} className="shrink-0" style={{ color: C.orange }} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{mine ? "You asked for a spot" : `${ping.name || "A teammate"} wants a spot`}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{fmtAgo(ping.t, now)} ago · {leftM}m left{who.length ? ` · on the way: ${who.join(", ")}` : mine ? " · waiting on your crew" : ""}</div>
      </div>
      {!mine && <button type="button" disabled={!!going} onClick={sayComing} className="ghost px-3 py-2 text-xs font-bold whitespace-nowrap" style={{ color: going ? C.green : C.cyan }}>{going ? "On my way ✓" : "On my way"}</button>}
    </div>
  );
}
export function Crew({ s, setS, gainXp, rows, openProfile }) {
  return (
    <div className="space-y-3">
      <CrewPanel s={s} setS={setS} rows={rows} openProfile={openProfile} gainXp={gainXp} />
      {s.crew?.code && <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="crew" crewId={s.crew.code} />}
      <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="global" />
      <DuelsPanel s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />
    </div>
  );
}

/* ---------- Export ---------- */
