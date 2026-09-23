import React, { useState, useEffect, useRef, useCallback } from "react";
import { mergeState, persistAck, persistMerge, shouldDeferPersist, shouldWritePending, normalizeState, shouldSkipSave, stateKeysChanged, saveIsUrgent, saveDelayMs, migrateAnimeCrateState, rankUpCeremony, levelFromXp, dryRunPrRecount, LB_XP_VERSION, settingsKey, SETTINGS_KEY_LEGACY, claimUnscopedSettings, mergeScopedSettings, shouldPublishLbCard, tryPublish, readAccountBlob, canPersistAccount, persistWouldWipe, guardedAccountWrite, hydrateWritePlan, looksLikeDefaultBlob, pendingKey, missedRaidClears, RAID_XP } from "./math.js";
import { Shield, Bot, Copy, Dumbbell, Swords, Utensils, User, CalendarDays, Crown } from "lucide-react";
import { BootScreen, OFFLINE_COPY_MSG } from "./Boot.jsx";
import * as D from "./diag.js";
import { newRun } from "./tabs/run/runApi.js";
import { C, RAINBOW, applyTheme } from "./theme.js";
import { RANKS, RANK_INFO } from "./data/ranks.js";
import { EXERCISES } from "./data/exercises.js";
import { TIER_STYLE } from "./data/achievements.js";
import { today, uid, weekStart } from "./lib/dates.js";
import { AskRef } from "./lib/ask.js";
import { findEx } from "./lib/exercises.js";
import { rankedLifts, overallInfo, reconcileAchievements, earnedAchievements } from "./lib/stats.js";
import { SaveCtx } from "./ui/saveCtx.js";
import { Sheet } from "./ui/primitives.jsx";
import { AURAS } from "./auras/catalog.js";
import { CREW_PER_PLAYER, CREW_XP } from "./tabs/train/xpConstants.js";
import { SFX } from "./tabs/train/sfx.js";
import { slug, postFeed, liveBoard } from "./tabs/train/social.js";
import { rankSnapshot } from "./tabs/train/helpers.js";
import { applyPrXpRecount, XP_VERSION } from "./tabs/train/xpRecount.js";
import { XpSync } from "./lib/xpSync.js";
import { loadLive, saveLive } from "./tabs/run/live.js";
import { mergeSteps } from "./tabs/run/mergeSteps.js";
import { readRaidHist } from "./tabs/train/raidIO.js";
import { Train, ExercisePage, MusclePage, RestWatchPage, Fuel, RunTracker, RunHub, Board, ProfilePage, SettingsPage, Assistant, IntervalTimer, CardDeck, Confetti, Onboarding, XpLedger, LazyBoundary, UpdateBanner, prefetchScreens, useSwReady, useBanner } from "./screenLoad.jsx";

















import { DEFAULT, deviceUserId, readPending, writePending, clearPending, readVerifiedCopy, writeVerifiedCopy, WIPE_SAVE_NOTE, URGENT_SAVE, APP_VERSION, stateSizeKb, BACKUP_KEY, runningBundle } from "./appStay.js";
import { Status } from "./tabs/status/Status.jsx";
import { Quests } from "./tabs/status/Quests.jsx";
import { Calendar } from "./tabs/status/Calendar.jsx";
import { Ranks } from "./tabs/status/Ranks.jsx";
import { Ceremony } from "./tabs/status/Ceremony.jsx";
import { JuiceBurst } from "./tabs/status/JuiceBurst.jsx";
import { MuscleFigure } from "./tabs/status/MuscleFigure.jsx";
import { WaterTracker } from "./tabs/status/WaterTracker.jsx";
import { applyReigning } from "./tabs/board/season.jsx";
import { resolveDuels } from "./tabs/board/duels.js";
import { profileCard } from "./tabs/profile/profileCard.js";
import { equippedTitle } from "./tabs/profile/titles.js";
import { AURA_TASKS } from "./tabs/profile/unlock.js";
import { Groove } from "./tabs/profile/music.js";
import { DiscoIcon, DiscoParty } from "./tabs/settings/Disco.jsx";
if (typeof window !== "undefined") window.__ASCEND_VERSION = APP_VERSION;
async function loadCommunity() {
  if (!window.storage?.list) return null;
  const read = async (prefix) => {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }));
    return items.filter((x) => x && x.name);
  };
  return { ex: await read("ex:"), foods: await read("food:") };
}

// XP for one set: effort (how much work relative to your personal S-rank line) × difficulty (which rank the set lands in)



class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null, info: null, open: false, copied: false };
  }
  static getDerivedStateFromError(error) {
    return { err: error, open: false, copied: false };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
    this.setState({ info });
  }
  render() {
    if (!this.state.err) return this.props.children;
    const details = `${this.state.err?.name || "Error"}: ${this.state.err?.message || String(this.state.err)}\n${this.state.info?.componentStack || ""}`;
    return (
      <div className="panel p-4 space-y-3" role="alert">
        <div className="font-bold">Something broke in this tab</div>
        <div className="body text-sm" style={{ color: C.dim }}>The rest of the app still works. Copy the details if you want to report it, or reload.</div>
        <button type="button" className="ghost py-2 px-3 text-sm font-bold w-full" onClick={() => this.setState({ open: !this.state.open })}>Details</button>
        {this.state.open && <pre className="body text-xs overflow-auto p-2" style={{ color: C.sub, maxHeight: 180, whiteSpace: "pre-wrap", background: C.soft, borderRadius: 6, border: `1px solid ${C.line}` }}>{details}</pre>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ghost py-3 font-bold flex items-center justify-center gap-2" onClick={async () => { try { await navigator.clipboard.writeText(details); this.setState({ copied: true }); } catch (e) { /* clipboard blocked */ } }}>
            <Copy size={16} />{this.state.copied ? "Copied" : "Copy details"}
          </button>
          <button type="button" className="btn py-3 font-bold" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}

export default function App() {
  D.noteRender("App");
  const [s, setSRaw] = useState(DEFAULT);
  const setS = useCallback((u) => D.applySetS(setSRaw, u), []);
  const sRef = useRef(s); sRef.current = s;
  useEffect(() => {
    D.boot(s.playerId);
    if (typeof window !== "undefined") window.__ASCEND_VERSION = APP_VERSION;
  }, [s.playerId]);
  useEffect(() => {
    if (!D.on()) return;
    const n = D.nextSeq();
    D.push({ k: "mount", kind: "App", n });
    return () => D.push({ k: "unmount", kind: "App", n });
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [bootTick, setBootTick] = useState(0);
  const [tab, setTab] = useState("status");
  const swReady = useSwReady();
  const timerHeld = useRef(false);
  const cardsHeld = useRef(false);
  if (swReady || tab === "timer") timerHeld.current = true;
  if (swReady || tab === "cards") cardsHeld.current = true;
  const [xpOpen, setXpOpen] = useState(false);
  // New-deploy check: compare the bundle this page runs with the one the server serves now
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    const check = async () => {
      const cur = runningBundle();
      if (!cur) return;
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: "no-store" })).text();
        const m = html.match(/\/assets\/(index-[\w-]+\.js)/);
        if (m && m[1] !== cur) setUpdateReady(true);
      } catch (e) { /* offline */ }
    };
    check();
    const v = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", v);
    const iv = setInterval(check, 5 * 60000);
    return () => { document.removeEventListener("visibilitychange", v); clearInterval(iv); };
  }, []);
  const wakeNextWorker = () => {
    try {
      navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        for (const r of regs || []) {
          try { r.waiting?.postMessage("skipWaiting"); } catch { /* ignore */ }
        }
      }).catch(() => {});
    } catch { /* reload still saves */ }
  };
  const [toast, setToast] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const songPushed = useRef(false);
  const [musclePick, setMusclePick] = useState("Chest");
  const [muscleFrom, setMuscleFrom] = useState("status");
  const openMuscle = (g, from = "status") => { setMusclePick(g); setMuscleFrom(from); setTab("muscle"); window.scrollTo?.(0, 0); };
  const [exercisePick, setExercisePick] = useState(null);
  const [exerciseFrom, setExerciseFrom] = useState("status");
  const openExercise = (name, from = "status") => { setExercisePick(name); setExerciseFrom(from); setTab("exercise"); window.scrollTo?.(0, 0); };
  const [ceremony, setCeremony] = useState(null);
  const [burst, setBurst] = useState(null);
  const xpSeen = useRef(new Set());
  const [confetti, setConfetti] = useState(false);
  const [onboard, setOnboard] = useState(null);
  const [liveRun, setLiveRun] = useState(() => loadLive());
  const liveNow = useRef(liveRun);
  const noteLive = useCallback((r) => { liveNow.current = r; }, []);
  const startRun = (mode, guide) => { const r = newRun(mode, guide); saveLive(r); liveNow.current = r; setLiveRun(r); };
  const pullSteps = async () => {
    try { const r = await window.storage.get("steps-inbox", false); const inbox = r?.value ? JSON.parse(r.value) : null; if (inbox) D.withSource("steps", () => setS((p) => mergeSteps(p, inbox) || p)); } catch (e) { /* none yet */ }
  };
  useEffect(() => { const v = () => { if (document.visibilityState === "visible") pullSteps(); }; document.addEventListener("visibilitychange", v); return () => document.removeEventListener("visibilitychange", v); }, []);
  useEffect(() => {
    const on = (e) => {
      const kind = e.detail; setBurst({ kind, id: Date.now() });
      const root = document.getElementById("ascend-root");
      if (root) { root.classList.remove("shake-pr", "shake-soft"); void root.offsetWidth; root.classList.add(kind === "pr" ? "shake-pr" : "shake-soft"); setTimeout(() => root.classList.remove("shake-pr", "shake-soft"), 700); }
      setTimeout(() => setBurst(null), 1500);
    };
    window.addEventListener("ascend-juice", on);
    return () => window.removeEventListener("ascend-juice", on);
  }, []);
  const [offline, setOffline] = useState(false);
  const [lastSaveAt, setLastSaveAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveNote, setSaveNote] = useState(null);
  const [saveDiag, setSaveDiag] = useState({ kb: 0, ms: null });
  const noPersistRef = useRef(false);
  const accountReadRef = useRef({ kind: null, server: null });
  const allowWipeRef = useRef(false);
  const snapRef = useRef(null);
  const writtenRef = useRef(null);
  const persistLock = useRef(false);
  const persistAgain = useRef(false);
  const persistUrgent = useRef(false);
  const saveNoteTimer = useRef(null);
  const persistRetryTimer = useRef(null);
  const dirtyRef = useRef(false);
  useEffect(() => { songPushed.current = false; }, [s.profile.song, s.lb]);
  const openProfile = (id) => { setProfileId(id || null); setTab("profile"); window.scrollTo?.(0, 0); };
  AskRef.current = (message, onYes, yesLabel = "Confirm") => setDialog({ message, onYes, yesLabel });
  const [party, setPartyState] = useState(false);
  const setParty = (on) => { if (on) Groove.start(); else Groove.stop(); setPartyState(on); };
  useEffect(() => { if (!s.settings?.zesty && party) setParty(false); }, [s.settings?.zesty]);
  useEffect(() => () => Groove.stop(), []);
  // Load fonts with <link> tags too, in case the @import inside the style tag is ignored
  useEffect(() => {
    const fams = ["Oxanium:wght@400;500;600;700;800", "Inter:wght@400;500;600", "Lexend:wght@400;600;800", "Orbitron:wght@700;900", "Bangers", "Cinzel:wght@700;900", "Permanent+Marker", "Press+Start+2P", "Pacifico", "Creepster"];
    fams.forEach((f) => {
      const href = `https://fonts.googleapis.com/css2?family=${f}&display=swap`;
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
    });
  }, []);

  useEffect(() => {
    let stop = false;
    const HYDRATE_MS = 2500;
    const withTimeout = (p) => {
      let t;
      const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(Object.assign(new Error("hydrate-timeout"), { hydrateTimeout: true })), HYDRATE_MS);
      });
      return Promise.race([p, timeout]).finally(() => clearTimeout(t));
    };
    (async () => {
      let st = DEFAULT;
      let crateDirty = false;
      let hadServer = false;
      let offlineBoot = false;
      let raw = null;
      const tryOfflineBoot = () => {
        const uid = deviceUserId();
        const verified = readVerifiedCopy(uid);
        const plan = hydrateWritePlan("error", { verified, userId: uid });
        if (!plan.useLocal) return false;
        raw = verified.state;
        accountReadRef.current = { kind: "error", server: null, offline: true };
        offlineBoot = true;
        hadServer = false;
        setBootError(null);
        setOffline(true);
        return true;
      };
      const failBoot = () => { setBootError(OFFLINE_COPY_MSG); };
      if (!window.storage?.get || !navigator.onLine) {
        if (!tryOfflineBoot()) { failBoot(); return; }
      } else {
        let got;
        try {
          got = await withTimeout(readAccountBlob((key) => window.storage.get(key, false, { fresh: true })));
        } catch {
          got = { kind: "error" };
        }
        if (stop) return;
        if (got.kind === "error") {
          if (!tryOfflineBoot()) { failBoot(); return; }
        } else {
          raw = null;
          if (got.kind === "ok") {
            try { raw = JSON.parse(got.value); }
            catch {
              if (!tryOfflineBoot()) { failBoot(); return; }
            }
          }
          if (!offlineBoot) {
            accountReadRef.current = { kind: got.kind, server: raw };
            setBootError(null);
            hadServer = got.kind === "ok";
            if (hadServer && raw) writeVerifiedCopy(raw);
            if (raw) {
              const v = migrateAnimeCrateState(raw);
              st = { ...DEFAULT, ...v, profile: { ...DEFAULT.profile, ...(v.profile || {}), sex: v.profile?.sex === "f" ? "f" : "m" }, settings: { ...DEFAULT.settings, ...(v.settings || {}) } };
              crateDirty = raw.crateV !== v.crateV || typeof raw.cratePity !== "number";
            }
          }
        }
      }
      if (stop) return;
      if (offlineBoot && raw) {
        const v = migrateAnimeCrateState(raw);
        st = { ...DEFAULT, ...v, profile: { ...DEFAULT.profile, ...(v.profile || {}), sex: v.profile?.sex === "f" ? "f" : "m" }, settings: { ...DEFAULT.settings, ...(v.settings || {}) } };
        crateDirty = false;
      }
      const pending = readPending();
      let recoveredPending = false;
      if (pending?.state && !(import.meta.env.DEV && new URLSearchParams(window.location.search).get("fixture") === "big")) {
        const local = { ...DEFAULT, ...pending.state, profile: { ...DEFAULT.profile, ...(pending.state.profile || {}), sex: pending.state.profile?.sex === "f" ? "f" : "m" }, settings: { ...DEFAULT.settings, ...(pending.state.settings || {}) } };
        const baseKnown = hadServer || offlineBoot;
        if (looksLikeDefaultBlob(local) && !looksLikeDefaultBlob(st)) {
          try { console.warn("[ascend] ignored pending: default-looking"); } catch { /* ignore */ }
        } else if (!baseKnown) {
          st = local;
          recoveredPending = true;
        } else {
          const snap = pending.snap && typeof pending.snap === "object" ? pending.snap : {};
          const merged = mergeState(local, st, snap);
          if (persistWouldWipe(st, merged)) {
            try { console.warn("[ascend] ignored pending: wipe-tripwire"); } catch { /* ignore */ }
          } else {
            st = merged;
            recoveredPending = true;
          }
        }
      }
      try {
        const uid = window.ascendUserId || st.playerId || deviceUserId();
        const serverSettings = st.settings;
        let scoped = null;
        try { scoped = JSON.parse(localStorage.getItem(settingsKey(uid)) || "null"); } catch { scoped = null; }
        st = { ...st, settings: mergeScopedSettings(serverSettings, scoped) };
        const ls = JSON.parse(localStorage.getItem(SETTINGS_KEY_LEGACY) || "null");
        if (ls) {
          if (claimUnscopedSettings(ls, serverSettings) && (ls.savedAt || 0) >= (st.settings?.savedAt || 0)) {
            st = { ...st, settings: { ...st.settings, ...ls } };
          }
          try { localStorage.removeItem(SETTINGS_KEY_LEGACY); } catch (e) { /* ignore */ }
        }
      } catch (e) { /* first run */ }
      if (!st.playerId) st = { ...st, playerId: window.ascendUserId || uid() + uid() };
      if (st.onboarded === false) setOnboard(0);
      else if (!st.onboarded && !st.workouts?.length) setOnboard(st.profile?.name ? 1 : 0);
      if ((st.achV || 1) < 3) st = reconcileAchievements(st, true);
      if (!st.assistV) {
        const bw = Math.max(80, +st.profile?.weight || 170);
        st = { ...st, assistV: 1, workouts: (st.workouts || []).map((w) => ({ ...w, exercises: (w.exercises || []).map((ex) => (/^Assisted (Dip|Pull-up) Machine$/.test(ex.name) ? { ...ex, sets: (ex.sets || []).map((x) => (+x.w >= bw * 0.5 ? { ...x, w: Math.max(0, Math.round(bw - +x.w)) } : x)) } : ex)) })) };
      }
      // Crew boss damage only counts from the day you joined. Existing crews start clean today.
      if (st.crew?.code && !st.crew.since) st = { ...st, crew: { ...st.crew, since: today() } };
      {
        const tid = equippedTitle(st).id;
        if ((st.profile?.title || "none") !== tid) st = { ...st, profile: { ...st.profile, title: tid } };
      }
      let ok = !!window.storage?.set;
      if (offlineBoot) {
        setStorageOk(ok);
        setOffline(true);
      } else {
        if (ok) { try { await window.storage.set("ascend-probe", "1", false); } catch (e) { ok = false; } }
        setStorageOk(ok);
        if (ok) setLastSaveAt(Date.now());
      }
      const beforeNorm = st;
      st = normalizeState(st);
      if (import.meta.env.DEV) {
        try {
          if (new URLSearchParams(window.location.search).get("fixture") === "big") {
            window.__ascendNoPersist = true;
            noPersistRef.current = true;
            const { buildBigFixture } = await import("./devBigFixture.js");
            st = normalizeState(buildBigFixture(st, EXERCISES));
            crateDirty = false;
          }
        } catch (e) { console.warn("[ascend] fixture skipped", e); }
      }
      if (!offlineBoot && !noPersistRef.current && window.storage?.get) {
        try {
          let exists = false;
          try { const b = await window.storage.get(BACKUP_KEY, false); exists = !!b?.value; } catch { exists = false; }
          const skipBackup = hadServer && persistWouldWipe(accountReadRef.current.server, st);
          if (!exists && !skipBackup) await window.storage.set(BACKUP_KEY, JSON.stringify({ at: Date.now(), version: APP_VERSION, state: st }), false);
        } catch (e) { console.warn("[ascend] backup-6z skipped", e); }
      }
      if ((st.xpV || 1) < XP_VERSION) {
        const hasHistory = (st.workouts || []).length || (st.xp || 0) > 0 || Object.keys(st.ach || {}).length;
        if (hasHistory) {
          const r = applyPrXpRecount(st);
          st = r.s;
          XpSync.replace(r.rows);
        } else st = { ...st, xpV: XP_VERSION };
      }
      if ((st.rankSnapV || 0) < 1) st = { ...st, rankSnap: rankSnapshot(st), rankSnapV: 1 };
      if (crateDirty && !offlineBoot && !noPersistRef.current && !recoveredPending) {
        try {
          await guardedAccountWrite({
            set: (k, v) => window.storage.set(k, v, false, { noQueue: true }),
            next: st,
            allowWipe: false,
            readKind: accountReadRef.current.kind,
            server: accountReadRef.current.server,
          });
        } catch (e) { console.warn("[ascend] crate persist skipped", e); }
      }
      if (recoveredPending && !noPersistRef.current) {
        try { snapRef.current = JSON.parse(JSON.stringify(pending.snap && typeof pending.snap === "object" ? pending.snap : (offlineBoot && raw ? raw : {}))); }
        catch (e) { snapRef.current = {}; }
      } else {
        snapRef.current = JSON.parse(JSON.stringify(crateDirty ? st : (st === beforeNorm ? st : beforeNorm)));
      }
      if (!recoveredPending) writtenRef.current = st;
      D.withSource("hydrate", () => { setS(() => st); setLoaded(true); });
      D.boot(st.playerId);
      if (recoveredPending && !noPersistRef.current) dirtyRef.current = true;
      setSaveDiag({ kb: stateSizeKb(st), ms: null });
      loadCommunity().then((c) => { if (c && !noPersistRef.current) D.withSource("community", () => setS((p) => ({ ...p, community: c }))); }).catch(() => { /* offline */ });
      if (!noPersistRef.current) setTimeout(pullSteps, 800);
      if (!noPersistRef.current) setTimeout(() => XpSync.flush(), 1500);
      if (import.meta.env.DEV) {
        window.__prDryRun = () => dryRunPrRecount(sRef.current, findEx);
        window.__phase1Merge = () => { const t0 = performance.now(); mergeState(sRef.current, sRef.current, snapRef.current || sRef.current); return performance.now() - t0; };
        window.__phase1TimePersist = async () => {
          const t0 = performance.now();
          let remote = null;
          try {
            const r = await window.storage.get("ascend-state", false, { fresh: true });
            if (r?.value) remote = normalizeState(migrateAnimeCrateState(JSON.parse(r.value)));
          } catch (e) { /* offline */ }
          const tMerge = performance.now();
          const p = sRef.current;
          const base = snapRef.current || {};
          const remoteRev = +remote?.rev || 0, baseRev = +base.rev || 0;
          const useRemote = remote && remoteRev >= baseRev && JSON.stringify(remote) !== JSON.stringify(base);
          const merged = normalizeState(useRemote ? mergeState(p, remote, base) : p);
          const mergeMs = performance.now() - tMerge;
          JSON.stringify({ ...merged, rev: Math.max(+p.rev || 0, remoteRev, +merged.rev || 0) + 1 });
          return { total: performance.now() - t0, mergeMs, wrote: false };
        };
      }
    })();
    return () => { stop = true; };
  }, [bootTick]);

  // Save state; if it fails (no signal), keep retrying until it lands
  const persistNow = async ({ urgent = false, fromHide = false } = {}) => {
    if (!loaded || !window.storage?.set) return;
    if (noPersistRef.current) return;
    if (!fromHide && shouldDeferPersist(sRef.current, writtenRef.current || snapRef.current)) {
      dirtyRef.current = true;
      return;
    }
    if (persistLock.current) { persistAgain.current = true; if (urgent) persistUrgent.current = true; return; }
    persistLock.current = true;
    setSaveStatus("saving");
    D.life("start");
    const t0 = performance.now();
    let failed = false;
    try {
      let remote = null;
      const got = await readAccountBlob((key) => window.storage.get(key, false, { fresh: true }));
      const readKind = got.kind;
      if (readKind === "ok") {
        try { remote = normalizeState(migrateAnimeCrateState(JSON.parse(got.value))); }
        catch {
          writePending(sRef.current, snapRef.current);
          dirtyRef.current = true;
          throw new Error("no-server-read");
        }
        accountReadRef.current = { kind: "ok", server: remote, offline: false };
      } else if (readKind === "not_found") {
        accountReadRef.current = { kind: "not_found", server: null, offline: false };
      } else {
        writePending(sRef.current, snapRef.current);
        dirtyRef.current = true;
        throw new Error("no-server-read");
      }
      let toWrite = null;
      let mergeMs = 0;
      let nextState = null;
      D.withSource("persist", () => {
        setS((p) => {
          const base = snapRef.current || {};
          const tMerge = performance.now();
          const r = persistMerge(p, remote, base, readKind);
          mergeMs = performance.now() - tMerge;
          toWrite = r.toWrite;
          nextState = r.useRemote ? r.merged : p;
          return nextState;
        });
      });
      await new Promise((r) => setTimeout(r, 0));
      const refuseWipe = () => {
        try { console.warn("[ascend] refused persist: wipe-tripwire"); } catch { /* ignore */ }
        writePending(sRef.current, snapRef.current);
        dirtyRef.current = false;
        allowWipeRef.current = false;
        setSaveStatus("error");
        D.life("fail");
        if (saveNoteTimer.current) clearTimeout(saveNoteTimer.current);
        setSaveNote(WIPE_SAVE_NOTE);
      };
      const gate = canPersistAccount({ readKind, server: remote, next: toWrite || sRef.current, allowWipe: !!allowWipeRef.current });
      if (!gate.ok) {
        if (gate.reason === "wipe-tripwire") refuseWipe();
        else {
          try { console.warn("[ascend] refused persist:", gate.reason); } catch { /* ignore */ }
          writePending(sRef.current, snapRef.current);
          dirtyRef.current = true;
          setSaveStatus("error");
          D.life("fail");
          setSaveNote("Couldn't save. Retrying…");
        }
        return;
      }
      const wr = await guardedAccountWrite({
        set: (k, v) => window.storage.set(k, v, false, { noQueue: true }),
        next: toWrite || sRef.current,
        allowWipe: !!allowWipeRef.current,
        readKind,
        server: remote,
      });
      if (!wr.wrote) {
        if (wr.reason === "wipe-tripwire") refuseWipe();
        else {
          dirtyRef.current = true;
          setSaveStatus("error");
          D.life("fail");
          setSaveNote("Couldn't save. Retrying…");
        }
        return;
      }
      allowWipeRef.current = false;
      const ack = persistAck(toWrite, sRef.current);
      snapRef.current = ack.snap;
      writtenRef.current = ack.written;
      dirtyRef.current = ack.dirty;
      setTimeout(() => writeVerifiedCopy(toWrite || sRef.current), 0);
      clearPending();
      setOffline(false);
      setLastSaveAt(Date.now());
      setSaveStatus("saved");
      D.life("ack");
      const ms = Math.round(performance.now() - t0);
      setSaveDiag({ kb: stateSizeKb(toWrite), ms });
      if (import.meta.env.DEV) window.__phase1LastPersist = { ms, mergeMs };
      if (saveNoteTimer.current) clearTimeout(saveNoteTimer.current);
      if (urgent || persistUrgent.current) {
        setSaveNote("Saved");
        saveNoteTimer.current = setTimeout(() => setSaveNote(null), 1800);
      } else {
        setSaveNote((n) => (n && n.startsWith("Couldn't") ? null : n));
      }
    } catch (e) {
      failed = true;
      dirtyRef.current = true;
      writePending(sRef.current, snapRef.current);
      setOffline(true);
      setSaveStatus("error");
      D.life("fail");
      if (saveNoteTimer.current) clearTimeout(saveNoteTimer.current);
      setSaveNote("Couldn't save. Retrying…");
    } finally {
      persistLock.current = false;
      const again = persistAgain.current || dirtyRef.current;
      const u = persistUrgent.current;
      persistAgain.current = false;
      persistUrgent.current = false;
      if (again) {
        if (failed) {
          if (persistRetryTimer.current) clearTimeout(persistRetryTimer.current);
          persistRetryTimer.current = setTimeout(() => persistNow({ urgent: u || urgent }), 2000);
        } else persistNow({ urgent: u || urgent });
      }
    }
  };
  const persistRef = useRef(() => {});
  persistRef.current = persistNow;
  const prevSave = useRef(s);
  useEffect(() => {
    if (!loaded) return;
    const t0 = performance.now();
    const prev = prevSave.current;
    prevSave.current = s;
    if (shouldSkipSave(s, writtenRef.current)) {
      if (import.meta.env.DEV) window.__phase1LastDetectMs = performance.now() - t0;
      return;
    }
    const dirty = stateKeysChanged(s, prev);
    const detectMs = performance.now() - t0;
    if (import.meta.env.DEV) {
      window.__phase1LastDetectMs = detectMs;
      const samples = window.__phase1DetectSamples || (window.__phase1DetectSamples = []);
      samples.push(detectMs);
      if (samples.length > 40) samples.splice(0, samples.length - 40);
    }
    if (!dirty) return;
    const urgent = saveIsUrgent(prev, s, URGENT_SAVE);
    if (noPersistRef.current) return;
    dirtyRef.current = true;
    if (shouldWritePending(prev, s)) writePending(s, snapRef.current);
    const delay = saveDelayMs(urgent, prev, s);
    const t = setTimeout(() => persistRef.current({ urgent }), delay);
    return () => clearTimeout(t);
  }, [s, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => { if (dirtyRef.current) persistRef.current({ urgent: false }); }, 15000);
    return () => clearInterval(id);
  }, [loaded]);
  useEffect(() => {
    const hide = () => {
      if (noPersistRef.current || !loaded) return;
      writePending(sRef.current, snapRef.current);
      if (dirtyRef.current) persistRef.current({ urgent: true, fromHide: true });
      window.storage?.flush?.();
    };
    const vis = () => { if (document.visibilityState === "hidden") hide(); };
    const onOnline = () => {
      if (!loaded) return;
      if (dirtyRef.current || accountReadRef.current.offline) persistRef.current({ urgent: true });
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", hide);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("online", onOnline);
    };
  }, [loaded]);
  useEffect(() => {
    if (loaded) prefetchScreens();
  }, [loaded]);
  // Settings also live on this device so colors and fonts survive account or connection hiccups
  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(settingsKey(deviceUserId()), JSON.stringify(s.settings)); } catch (e) { /* private mode */ }
    }
  }, [s.settings, loaded]);

  const lbPublishAttempt = useRef(0);
  const lbPublishRetry = useRef(null);
  const publishLbCard = useCallback(async () => {
    const p = sRef.current;
    if (!shouldPublishLbCard({ loaded, lb: p.lb, test: p.test, name: p.profile?.name, noPersist: noPersistRef.current })) return;
    const card = { ...profileCard(p), xpV: p.xpV || LB_XP_VERSION };
    if (p.profile.song?.type === "clip" && !songPushed.current) {
      try { const r = await window.storage.get("ascend-song", false); if (r?.value) { await window.storage.set(`song:${p.playerId}`, r.value, true); songPushed.current = true; } } catch (e) { /* skip */ }
    }
    const write = async (payload) => { await window.storage.set(`lb:${p.playerId}`, JSON.stringify(payload), true); };
    const res = await tryPublish(write, card, {
      attempt: lbPublishAttempt.current,
      schedule: (ms, next) => {
        lbPublishAttempt.current = next;
        if (lbPublishRetry.current) clearTimeout(lbPublishRetry.current);
        lbPublishRetry.current = setTimeout(() => { lbPublishRetry.current = null; publishLbCard(); }, ms);
      },
    });
    if (res.ok) lbPublishAttempt.current = 0;
  }, [loaded]);

  // Push leaderboard card on load (including after a recount) and whenever progress changes
  useEffect(() => {
    if (!shouldPublishLbCard({ loaded, lb: s.lb, test: s.test, name: s.profile.name, noPersist: noPersistRef.current })) return;
    const t = setTimeout(() => publishLbCard(), 400);
    return () => clearTimeout(t);
  }, [loaded, s.lb, s.test, s.profile.name, s.profile.avatar, s.profile.look, s.profile.look?.border, s.profile.title, s.profile.song, s.seasonBadges, s.xp, s.xpV, s.workouts, s.profile.weight, s.profile.sex, s.days, s.custom, s.ach, s.weightLog, s.profile.shareWeight, s.steps, s.xpLog, s.nemesis, s.duelResults, s.crateSpent, s.crateUnlocks, s.checkins, s.lbReigning, s.loot, publishLbCard]);

  useEffect(() => {
    const onOnline = () => publishLbCard();
    const onVis = () => { if (document.visibilityState === "visible") publishLbCard(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
      if (lbPublishRetry.current) clearTimeout(lbPublishRetry.current);
    };
  }, [publishLbCard]);

  useEffect(() => {
    if (!loaded) return;
    const tid = equippedTitle(s).id;
    if ((s.profile.title || "none") === tid) return;
    D.withSource("title", () => setS((p) => {
      const next = equippedTitle(p).id;
      if ((p.profile.title || "none") === next) return p;
      return { ...p, profile: { ...p.profile, title: next } };
    }));
  }, [loaded, s.profile.title, s.ach, s.loot, s.crateUnlocks, s.lbReigning, s.seasonBadges, s.test]);

  useEffect(() => {
    const go = () => XpSync.flush();
    const retrySave = () => persistRef.current({ urgent: true });
    const lost = () => setOffline(true);
    window.addEventListener("online", go);
    window.addEventListener("online", retrySave);
    window.addEventListener("offline", lost);
    const iv = setInterval(go, 60000);
    return () => { window.removeEventListener("online", go); window.removeEventListener("online", retrySave); window.removeEventListener("offline", lost); clearInterval(iv); };
  }, []);

  const gainXp = (amt, msg, once = null) => {
    if (!amt) return;
    // `once` is an event id: the same award can never be counted twice, even if a listener fires twice
    if (once) { if (xpSeen.current.has(once) || (sRef.current.xpDone || {})[once]) return; xpSeen.current.add(once); }
    const before = levelFromXp(sRef.current.xp).lvl, after = levelFromXp(Math.max(0, sRef.current.xp + amt)).lvl;
    const d = today();
    const eid = once || `x_${slug(msg).slice(0, 40)}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    XpSync.add({ e: eid, a: amt, m: msg, d, t: Date.now() });
    D.withSource("xp", () => setS((p) => ({ ...p, xp: Math.max(0, p.xp + amt), xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + amt },
      xpDone: { ...(p.xpDone || {}), [eid]: 1 },
      xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), { m: msg, a: amt, t: Date.now() }].slice(-120) } })));
    if (after > before) SFX.levelUp();
    setToast(after > before ? { big: true, text: `Level up · Level ${after}` } : { text: `${amt >= 0 ? "+" : ""}${amt} XP · ${msg}` });
    setTimeout(() => setToast(null), 2600);
  };

  // Award achievements as soon as they're earned
  useEffect(() => {
    if (!loaded) return;
    const fresh = earnedAchievements(s).filter((a) => !(s.ach || {})[a.id]);
    if (!fresh.length) return;
    const amt = fresh.reduce((a, x) => a + x.xp, 0), d = today();
    if (fresh.every((a) => xpSeen.current.has(`ach_${a.id}`))) return;
    fresh.forEach((a) => xpSeen.current.add(`ach_${a.id}`));
    fresh.filter((a) => !(s.ach || {})[a.id]).forEach((a) => XpSync.add({ e: `ach_${a.id}`, a: a.xp, m: `Achievement: ${a.title}`, d, t: Date.now() }));
    D.withSource("ach", () => setS((p) => {
      const already = Object.keys(p.ach || {});
      const add = fresh.filter((a) => !already.includes(a.id));
      if (!add.length) return p;
      const sum = add.reduce((x, a) => x + a.xp, 0);
      return { ...p, xp: p.xp + sum, ach: { ...(p.ach || {}), ...Object.fromEntries(add.map((a) => [a.id, d])) },
        xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + sum }, xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), ...add.map((a) => ({ m: `Achievement: ${a.title}`, a: a.xp, t: Date.now() }))].slice(-120) } };
    }));
    setToast({ big: true, text: fresh.length === 1 ? `${fresh[0].title} unlocked · +${amt} XP` : `${fresh.length} achievements · +${amt} XP` });
    SFX.achievement();
    if (fresh.length <= 3) fresh.forEach((a) => postFeed(s, "ach", `unlocked ${a.title} (${TIER_STYLE[a.tier].name})`, {}, `ach_${a.id}`));
    setTimeout(() => setToast(null), 3200);
  }, [loaded, s.workouts, s.days, s.xp, s.profile.weight]);

  // Settle finished duels (lifetime record, Nemesis rewards) on open and whenever the app comes back
  useEffect(() => {
    if (!loaded || !s.lb) return;
    const say = (text) => { setToast({ big: true, text }); setTimeout(() => setToast(null), 3600); };
    const go = () => D.withSource("duel", () => resolveDuels(sRef.current, setS, say).catch(() => {}));
    const t = setTimeout(go, 2500);
    const v = () => document.visibilityState === "visible" && go();
    document.addEventListener("visibilitychange", v);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", v); };
  }, [loaded, s.lb]);

  // Reigning season #1: Ascended Ophanim is only equipped while you actually hold the top spot
  useEffect(() => {
    if (!loaded || !s.lb || !window.storage?.list) return;
    let stop = false;
    const go = async () => {
      try {
        const res = await window.storage.list("lb:", true);
        const cards = await Promise.all((res?.keys || []).map(async (k) => {
          try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
        }));
        if (!stop) D.withSource("board", () => applyReigning(sRef.current, setS, liveBoard(cards.filter(Boolean))));
      } catch (e) { /* offline */ }
    };
    const t = setTimeout(go, 1800);
    const iv = setInterval(go, 60000);
    const v = () => document.visibilityState === "visible" && go();
    document.addEventListener("visibilitychange", v);
    return () => { stop = true; clearTimeout(t); clearInterval(iv); document.removeEventListener("visibilitychange", v); };
  }, [loaded, s.lb, s.xp]);

  // Feat auras: the first time a condition is met, save it for good and tell the crew
  useEffect(() => {
    if (!loaded) return;
    const fresh = AURAS.filter((a) => a.task && !s.auraUnlocks?.[a.id] && AURA_TASKS[a.task](s).done);
    if (!fresh.length) return;
    const d = today();
    D.withSource("aura", () => setS((p) => ({ ...p, auraUnlocks: { ...(p.auraUnlocks || {}), ...Object.fromEntries(fresh.map((a) => [a.id, d])) } })));
    setToast({ big: true, text: fresh.length === 1 ? `New aura: ${fresh[0].name}` : `${fresh.length} new auras unlocked` });
    fresh.forEach((a) => postFeed(s, "ach", `unlocked the ${a.name} aura`, {}, `aura_${a.id}`));
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [loaded, s.workouts, s.days, s.steps, s.auraUnlocks, s.xpDone]);

  // Raid clears are archived per crew; reconcile ones this account missed while
  // away so they count toward XP and the Standard-Bearer feat aura.
  useEffect(() => {
    if (!loaded || !s.crew?.code || s.test) return;
    let stop = false;
    const go = async () => {
      try {
        const hist = await readRaidHist(s.crew.code);
        if (stop) return;
        missedRaidClears(sRef.current, s.crew.code, hist).forEach((c) => gainXp(RAID_XP, "Raid night clear", `raid_${s.crew.code}_${c.start}`));
      } catch { /* offline */ }
    };
    const t = setTimeout(go, 2600);
    const v = () => document.visibilityState === "visible" && go();
    document.addEventListener("visibilitychange", v);
    return () => { stop = true; clearTimeout(t); document.removeEventListener("visibilitychange", v); };
  }, [loaded, s.crew?.code]);

  // Rank-up ceremony: compare current tiers to the last snapshot
  useEffect(() => {
    if (!loaded) return;
    const snap = rankSnapshot(s);
    if (!s.rankSnap) { D.withSource("rank", () => setS((p) => ({ ...p, rankSnap: snap }))); return; }
    const prev = s.rankSnap;
    const up = rankUpCeremony(prev, snap);
    let cer = null;
    const oi = overallInfo(s);
    if (up?.kind === "overall") { cer = { kind: "overall", rank: oi.rank, label: `${oi.label} · ${RANK_INFO[oi.rank.id][0]}`, feedLabel: oi.label }; }
    else if (up?.kind === "lift") { const full = rankedLifts(s).find((x) => x.e.name === up.name); const r = RANKS[Math.min(6, up.tier)]; cer = { kind: "lift", name: up.name, rank: r, label: full ? full.label : `${r.id}-Rank`, tier: up.tier }; }
    const changed = snap.overall !== prev.overall || snap.od !== prev.od || JSON.stringify(snap.lifts) !== JSON.stringify(prev.lifts);
    if (changed) D.withSource("rank", () => setS((p) => ({ ...p, rankSnap: snap })));
    if (cer) { setCeremony(cer); postFeed(s, "rank", cer.kind === "overall" ? `ranked up to ${cer.feedLabel} overall` : `${cer.name} hit ${cer.label}`, { tier: cer.kind === "overall" ? Math.floor(snap.overall) : cer.tier }, `rank_${cer.kind === "overall" ? "overall" : slug(cer.name)}_${cer.kind === "overall" ? cer.feedLabel.replace(" ", "") : cer.rank.id}`); }
    if (cer?.kind !== "overall" && prev.od != null && snap.od > prev.od && snap.overall === prev.overall && snap.overall >= 1) { postFeed(s, "rank", `climbed to ${oi.label} overall`, { tier: snap.overall }, `rank_overall_${oi.label.replace(" ", "")}`); }
  }, [loaded, s.workouts, s.profile.weight, s.profile.sex, s.custom]);

  // Weekly snapshot for the rank report
  useEffect(() => {
    if (!loaded) return;
    const ws = weekStart();
    if (s.rankHist?.[ws]) return;
    const o = overallInfo(s); const lifts = {}; rankedLifts(s).forEach((r) => { lifts[r.e.name] = r.score; });
    D.withSource("rank", () => setS((p) => ({ ...p, rankHist: { ...(p.rankHist || {}), [ws]: { overall: o.score, groups: o.groups, lifts, xp: p.xp } } })));
  }, [loaded, s.workouts]);

  const chunkBanner = useBanner();
  const reloadForUpdate = () => {
    D.push({ k: "banner", st: "tap" });
    try {
      if (liveNow.current) saveLive(liveNow.current);
      localStorage.setItem(pendingKey(deviceUserId()), JSON.stringify({ state: sRef.current, snap: snapRef.current, t: Date.now() }));
    } catch (e) {
      setSaveNote("Couldn't save — try again");
      if (saveNoteTimer.current) clearTimeout(saveNoteTimer.current);
      saveNoteTimer.current = setTimeout(() => setSaveNote(null), 2200);
      return;
    }
    persistRef.current({ urgent: true });
    window.location.reload();
  };
  applyTheme(s.settings);
  SFX.enabled = s.settings?.sounds !== false;
  try {
    if (new URLSearchParams(window.location.search).get("watch") === "rest") return (<><UpdateBanner onReload={reloadForUpdate} /><TabErrorBoundary><LazyBoundary><RestWatchPage /></LazyBoundary></TabErrorBoundary></>);
  } catch (e) { /* stay in the app */ }
  if (!loaded) return (
    <BootScreen
      error={bootError}
      onRetry={bootError ? () => { setBootError(null); setBootTick((n) => n + 1); } : undefined}
    />
  );

  const tabs = [["status", User, "Status"], ["train", Dumbbell, "Train"], ["quests", Swords, "Quests"], ["fuel", Utensils, "Fuel"], ["calendar", CalendarDays, "Log"], ["ranks", Shield, "Ranks"], ["board", Crown, "Board"]];

  return (
    <SaveCtx.Provider value={{ status: saveStatus }}>
    <div className={`min-h-screen relative ${s.settings?.zesty ? "zesty" : ""} ${s.settings?.dysFont ? "dys" : ""}`} id="ascend-root" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <UpdateBanner onReload={reloadForUpdate} />
      {updateReady && !chunkBanner && (
        <div role="alert" className="fixed left-0 right-0 z-[60] flex justify-center px-3" style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
          <div className="max-w-md w-full flex items-center gap-3 px-4 py-3" style={{ borderRadius: 14, background: C.sheet, border: `1px solid ${C.cyan}`, boxShadow: `0 8px 30px rgba(0,0,0,.45), 0 0 18px ${C.glow}` }}>
            <span className="flex-1 text-sm font-semibold">A new version of Ascend is ready</span>
            <button onClick={() => { wakeNextWorker(); reloadForUpdate(); }} className="btn px-3 py-1.5 text-sm">Update now</button>
          </div>
        </div>
      )}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Lexend:wght@400;600;800&family=Orbitron:wght@700;900&family=Bangers&family=Cinzel:wght@700;900&family=Permanent+Marker&family=Press+Start+2P&family=Pacifico&family=Creepster&display=swap');
        .body{font-family:'Inter',system-ui,sans-serif;line-height:1.45;letter-spacing:.005em}
        h1,h2{letter-spacing:.01em}
        .dys,.dys *,.dys .body{font-family:'Lexend',system-ui,sans-serif!important;letter-spacing:.03em;word-spacing:.08em}
        .fancyname,.fancyname *,.dys .fancyname,.dys .fancyname *{font-family:var(--nf)!important;letter-spacing:normal}
        .bgfx{position:fixed;inset:0;pointer-events:none;background:
          radial-gradient(70% 38% at 50% -8%, ${C.halo}, transparent 70%),
          radial-gradient(60% 40% at 100% 100%, ${C.halo}, transparent 70%), ${C.bg}}
        .panel{position:relative;background:${C.glass};border:1px solid ${C.glassLine};border-radius:16px;-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);box-shadow:0 8px 30px rgba(0,0,0,.18)}
        .panel::before,.panel::after{content:none}
        .space-y-4>:not([hidden])~:not([hidden]){margin-top:1.15rem}
        h1{font-weight:700;letter-spacing:-.01em} h2{font-weight:650;letter-spacing:-.005em}
        @keyframes auraorbit{from{transform:rotate(var(--a)) translate(var(--r)) rotate(calc(-1 * var(--a)))}to{transform:rotate(calc(var(--a) + 360deg)) translate(var(--r)) rotate(calc(-1 * var(--a) - 360deg))}}
        @keyframes aurabob{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-70%) scale(1.15)}}
        @keyframes musclein{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        @keyframes aurapulse{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes juiceflash{0%{opacity:1}100%{opacity:0}}
        @keyframes juicespark{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(.2);opacity:0}}
        @keyframes cratepulse{0%,100%{box-shadow:0 0 18px rgba(255,212,71,.25)}50%{box-shadow:0 0 34px rgba(255,212,71,.55),0 0 60px rgba(106,0,255,.25)}}
        @keyframes borderpulse{0%,100%{transform:scale(.98);filter:brightness(.8)}50%{transform:scale(1.04);filter:brightness(1.5)}}
        @keyframes borderchase{to{transform:rotate(360deg)}}
        @keyframes borderfracture{0%,100%{transform:scale(1) rotate(0)}45%{transform:scale(1.08) rotate(3deg)}55%{transform:scale(.98) rotate(-2deg)}}
        @keyframes borderorbit{to{transform:rotate(360deg)}}
        .black-sun-pull #ascend-root{filter:grayscale(1) contrast(1.12);transition:filter .12s}
        @media(prefers-reduced-motion:reduce){.anime-border{animation-duration:12s!important}.anime-border-dot{animation-duration:16s!important}}
        @keyframes cratespin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes cratereveal{0%{transform:scale(.4) rotate(-8deg);opacity:0}60%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes gildsweep{0%{transform:translateX(-120%) skewX(-18deg);opacity:0}18%{opacity:.55}50%{opacity:.2}100%{transform:translateX(220%) skewX(-18deg);opacity:0}}
        @keyframes juicetext{0%{transform:translateX(-50%) scale(.4);opacity:0}25%{transform:translateX(-50%) scale(1.25);opacity:1}70%{opacity:1}100%{transform:translateX(-50%) scale(1);opacity:0}}
        @keyframes shake{0%,100%{transform:translate(0,0)}15%{transform:translate(-8px,4px)}30%{transform:translate(7px,-5px)}45%{transform:translate(-6px,-3px)}60%{transform:translate(5px,4px)}75%{transform:translate(-3px,2px)}}
        @keyframes shakesoft{0%,100%{transform:translate(0,0)}30%{transform:translate(-3px,2px)}60%{transform:translate(3px,-2px)}}
        .shake-pr{animation:shake .55s cubic-bezier(.36,.07,.19,.97)} .shake-soft{animation:shakesoft .3s ease-out}
        @keyframes bossidle{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes bosshit{0%{transform:scale(1)}30%{transform:scale(.85) rotate(-6deg);filter:brightness(2)}100%{transform:scale(1)}}
        .inp{background:${C.inpBg};border:1px solid ${C.glassLine};border-radius:10px;padding:8px 10px;color:${C.text};width:100%;min-width:0}
        .inp[type=number]{-moz-appearance:textfield;appearance:textfield}
        .inp[type=number]::-webkit-outer-spin-button,.inp[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .setgrid .inp{padding:8px 4px}
        .inp:focus,button:focus-visible{outline:2px solid ${C.cyan};outline-offset:1px;box-shadow:0 0 12px ${C.glow}}
        .btn{background:linear-gradient(180deg,${C.cyan},${C.blue});box-shadow:0 6px 18px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.3);border-radius:12px;color:#001018;font-weight:800;letter-spacing:.02em}
        .ghost{background:${C.glass};border:1px solid ${C.glassLine};border-radius:12px;color:${C.text}}
        .glowtext{text-shadow:none}
        .ranklabel{font-family:'Inter',system-ui,sans-serif;font-weight:800;letter-spacing:.02em}
        .bs-hover{animation:bsfloat 4.2s ease-in-out infinite}
        .bossfig .bs-breathe{transform-box:fill-box;transform-origin:50% 100%;animation:bsbreathe 3.4s ease-in-out infinite}
        .bossfig .bs-float{animation:bsfloat 4s ease-in-out infinite}
        .bossfig .bs-eye{animation:bseye 2.8s ease-in-out infinite}
        .bossfig .bs-glow{animation:bsglow 2.2s ease-in-out infinite}
        .bossfig .bs-flicker{animation:bsflicker 1.4s ease-in-out infinite}
        .bossfig .bs-jaw{transform-box:fill-box;transform-origin:50% 0;animation:bsjaw 3.4s ease-in-out infinite}
        .bossfig .bs-sway,.bossfig .bs-sway-r{transform-box:fill-box;transform-origin:50% 100%;animation:bssway 5s ease-in-out infinite}
        .bossfig .bs-sway-r{animation-direction:reverse}
        .bossfig .bs-flap-l{transform-box:fill-box;transform-origin:100% 60%;animation:bsflapl 1.8s ease-in-out infinite}
        .bossfig .bs-flap-r{transform-box:fill-box;transform-origin:0% 60%;animation:bsflapr 1.8s ease-in-out infinite}
        .bossfig .bs-spin,.bossfig .bs-spin-r,.bossfig .bs-spin-slow{transform-box:fill-box;transform-origin:center;animation:rkspin 6s linear infinite}
        .bossfig .bs-spin-r{animation-duration:4s;animation-direction:reverse}
        .bossfig .bs-spin-slow{animation-duration:40s}
        .bossfig .bs-drip{animation:bsdrip 2.4s ease-in infinite}
        .bossfig .bs-rise{animation:bsrise 2.6s ease-out infinite}
        .bossfig .bs-bob{animation:bsbob 3s ease-in-out infinite}
        .bossfig .bs-whisk{transform-box:fill-box;transform-origin:50% 50%;animation:bswhisk 1.3s ease-in-out infinite}
        .bossfig.bs-rage{animation:bsshiver .28s linear infinite}
        .bossfig.bs-rage .bs-breathe{animation-duration:1.2s}
        .bossfig.bs-rage .bs-eye,.bossfig.bs-rage .bs-glow{animation-duration:.7s}
        .bossfig.bs-rage .bs-flap-l,.bossfig.bs-rage .bs-flap-r,.bossfig.bs-rage .bs-jaw{animation-duration:.9s}
        .bossfig.bs-rage .bs-spin{animation-duration:2s}
        .bossfig.bs-dead,.bossfig.bs-dead *{animation:none!important}
        .bossfig.bs-dead{filter:grayscale(1) brightness(.7)}
        .bossimg{transform-origin:50% 100%;animation:bsimg 3.4s ease-in-out infinite}
        .bossimg.bs-rage{animation:bsimg 1.2s ease-in-out infinite,bsshiver .28s linear infinite}
        .bossimg.bs-dead{animation:none;filter:grayscale(1) brightness(.7)}
        @keyframes bsbreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.035)}}
        @keyframes bsfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes bseye{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes bsglow{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes bsflicker{0%,100%{opacity:.85;transform:translateY(0)}30%{opacity:1;transform:translateY(-1.5px)}60%{opacity:.7;transform:translateY(.5px)}}
        @keyframes bsjaw{0%,68%,100%{transform:translateY(0)}78%{transform:translateY(3.5px)}88%{transform:translateY(0)}}
        @keyframes bssway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
        @keyframes bsflapl{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
        @keyframes bsflapr{0%,100%{transform:rotate(0)}50%{transform:rotate(-12deg)}}
        @keyframes bsdrip{0%{transform:translateY(-3px);opacity:0}25%{opacity:1}100%{transform:translateY(9px);opacity:0}}
        @keyframes bsrise{0%{transform:translateY(4px);opacity:0}30%{opacity:1}100%{transform:translateY(-12px);opacity:0}}
        @keyframes bsbob{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}
        @keyframes bswhisk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.8)}}
        @keyframes bsshiver{0%,100%{transform:translate(0,0)}25%{transform:translate(-.7px,.4px)}75%{transform:translate(.7px,-.4px)}}
        @keyframes bsimg{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-3px) scale(1.01,1.03)}}
        @media (prefers-reduced-motion: reduce){.bs-hover,.bossfig,.bossfig *,.bossimg{animation:none!important}}
        .feedtap{cursor:pointer;transition:background .15s}
        .feedtap:hover{background:${C.soft}}
        .feedtap:active{background:${C.soft}}
        .feedtap:focus-visible{outline:2px solid ${C.cyan};outline-offset:-2px}
        .neonline{height:1px;background:linear-gradient(90deg,transparent,${C.cyan},transparent);box-shadow:0 0 8px ${C.cyan}}
        @keyframes breathe{0%,100%{filter:drop-shadow(0 0 6px var(--g))}50%{filter:drop-shadow(0 0 20px var(--g))}}
        .breathe{animation:breathe 3.2s ease-in-out infinite}
        @keyframes rainbow{0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        .zesty .bgfx{background:
          radial-gradient(55% 32% at 8% 0%, rgba(255,60,172,.30), transparent 70%),
          radial-gradient(55% 32% at 95% 12%, rgba(60,200,255,.28), transparent 70%),
          radial-gradient(70% 38% at 50% 105%, rgba(155,92,255,.30), transparent 70%),
          radial-gradient(45% 28% at 0% 70%, rgba(60,255,158,.18), transparent 70%),
          linear-gradient(${C.grid} 1px, transparent 1px) 0 0/28px 28px,
          linear-gradient(90deg, ${C.grid} 1px, transparent 1px) 0 0/28px 28px, ${C.bg}}
        .zesty .panel{border:1.5px solid transparent;background:linear-gradient(180deg,${C.panelTop},${C.panelBot} 70%) padding-box, ${RAINBOW} border-box;background-size:100% 100%, 200% 100%;animation:rainbow 6s linear infinite;box-shadow:0 0 18px rgba(255,60,172,.18)}
        .zesty .panel::before{border-color:#ffb43c}.zesty .panel::after{border-color:#3cc8ff}
        .zesty .glowtext{background:${RAINBOW};background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:rainbow 4s linear infinite;text-shadow:none}
        .zesty .btn{background:${RAINBOW};background-size:200% auto;animation:rainbow 3s linear infinite;color:#1a0020;box-shadow:0 0 22px rgba(255,60,172,.45)}
        .zesty .neonline{background:${RAINBOW};box-shadow:0 0 10px rgba(255,60,172,.7)}
        .zesty .barfill{background-image:${RAINBOW}!important;background-size:200% auto!important;animation:rainbow 5s linear infinite;box-shadow:0 0 10px rgba(255,60,172,.6)!important}
        @keyframes rkspin{to{transform:rotate(360deg)}}
        @keyframes ophfloat{0%,100%{transform:translate(-50%,-50%) rotate(-7deg) scale(1)}50%{transform:translate(-50%,-58%) rotate(7deg) scale(1.06)}}
        @keyframes ophspin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes ophspinrev{from{transform:translate(-50%,-50%) rotate(360deg)}to{transform:translate(-50%,-50%) rotate(0)}}
        @keyframes ophpulse{0%,100%{opacity:.35;filter:drop-shadow(0 0 8px rgba(255,212,71,.5))}50%{opacity:.7;filter:drop-shadow(0 0 18px rgba(125,249,255,.9))}}
        @media (prefers-reduced-motion:reduce){.oph-wings,.oph-wheel,.oph-wheel-r{animation:none!important}}
        @keyframes rkbreathe{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.06);opacity:.9}}
        @keyframes rkpulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}
        @keyframes rkorbit{to{transform:rotate(360deg)}}
        @keyframes rktwinkle{0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes rkhalo{0%{transform:scale(.6);opacity:.4}100%{transform:scale(2);opacity:0}}
        @keyframes rkshine{0%,60%{transform:skewX(-20deg) translateX(0)}100%{transform:skewX(-20deg) translateX(190px)}}
        @keyframes nm-pulse{0%,100%{text-shadow:0 0 4px var(--nc)}50%{text-shadow:0 0 12px var(--nc)}}
        .fancyname{background:transparent}
        .fancyname:not(.nm-rainbow),.zesty .fancyname:not(.nm-rainbow){background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;-webkit-text-fill-color:currentColor!important}
        .fancyname.nm-wave,.fancyname.nm-shake{text-shadow:none!important}
        .nm-pulse{animation:nm-pulse 1.6s ease-in-out infinite}
        .nm-rainbow{background:${RAINBOW};background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:rainbow 3s linear infinite;text-shadow:none}
        @keyframes nm-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes nm-shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(1px,-1px) rotate(2deg)}75%{transform:translate(-1px,1px) rotate(-2deg)}}
        @keyframes nm-wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
        .nm-wobble{animation:nm-wobble 1.2s ease-in-out infinite;transform-origin:center}
        @keyframes nm-flicker{0%,19%,21%,23%,54%,56%,100%{opacity:1;text-shadow:0 0 8px var(--nc)}20%,22%,55%{opacity:.35;text-shadow:none}}
        .nm-flicker{animation:nm-flicker 3s linear infinite}
        @keyframes nm-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-5px) rotate(1deg)}}
        .nm-float{animation:nm-float 2.4s ease-in-out infinite}
        @keyframes pop{0%{transform:translate(-50%,-14px) scale(.96);opacity:0}100%{transform:translate(-50%,0) scale(1);opacity:1}}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`}</style>
      <div className="bgfx" />

      <div className="relative max-w-md mx-auto px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 220px)" }}>
        <div className="flex items-center justify-center mb-3" style={{ height: 36 }}><img src="/logo-sm.webp" alt="Ascend" width="38" height="36" style={{ height: 32, width: "auto", opacity: 0.95 }} /></div>
        {onboard !== null && <TabErrorBoundary><LazyBoundary><Onboarding s={s} setS={setS} step={onboard} onNext={() => { if (onboard >= 3) { setOnboard(null); setS((p) => ({ ...p, onboarded: true })); setConfetti(true); setTab("status"); } else setOnboard(onboard + 1); }} /></LazyBoundary></TabErrorBoundary>}
        {onboard !== null ? null : tab === "status" && <TabErrorBoundary><Status s={s} setS={setS} gainXp={gainXp} openAssistant={() => setTab("assistant")} openSettings={() => setTab("settings")} openProfile={(pid) => openProfile(typeof pid === "string" ? pid : null)} openMuscle={openMuscle} openExercise={openExercise} goTrain={() => setTab("train")} goRun={() => setTab("run")} goQuests={() => setTab("quests")} openXp={() => setXpOpen(true)} saveOk={storageOk && !offline} saveAt={lastSaveAt} storageOk={storageOk} allowWipe={() => { allowWipeRef.current = true; }} /></TabErrorBoundary>}
        {onboard === null && tab === "exercise" && <TabErrorBoundary><LazyBoundary><ExercisePage s={s} setS={setS} name={exercisePick} onBack={() => setTab(exerciseFrom)} openMuscle={(g) => openMuscle(g, "exercise")} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "run" && <TabErrorBoundary><LazyBoundary><RunHub s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("train")} startRun={startRun} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "muscle" && <TabErrorBoundary><LazyBoundary><MusclePage s={s} group={musclePick} onBack={() => setTab(muscleFrom)} openExercise={(n) => openExercise(n, "muscle")} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "profile" && <TabErrorBoundary><LazyBoundary><ProfilePage s={s} setS={setS} gainXp={gainXp} targetId={profileId} onBack={() => setTab(profileId ? "board" : "status")} openXp={() => setXpOpen(true)} /></LazyBoundary></TabErrorBoundary>}
        {!storageOk && (
          <div className="panel p-3 mb-4 body text-sm" style={{ borderColor: C.orange, color: C.orange }}>
            Progress can't save right now. Check your connection, or sign out and back in from Settings.
          </div>
        )}
        {xpOpen && <Sheet title="XP history" onClose={() => setXpOpen(false)}><TabErrorBoundary><LazyBoundary><XpLedger s={s} drawer onBack={() => setXpOpen(false)} /></LazyBoundary></TabErrorBoundary></Sheet>}
        {onboard === null && tab === "settings" && <TabErrorBoundary><LazyBoundary><SettingsPage s={s} setS={setS} onBack={() => setTab("status")} party={party} setParty={setParty} openTool={setTab} saveDiag={saveDiag} onReplayTutorial={() => { setS((p) => ({ ...p, onboarded: false })); setOnboard(0); }} /></LazyBoundary></TabErrorBoundary>}
        {(timerHeld.current) && <TabErrorBoundary><LazyBoundary active={tab === "timer"}><IntervalTimer visible={tab === "timer"} onBack={() => setTab("settings")} onOpen={() => setTab("timer")} /></LazyBoundary></TabErrorBoundary>}
        {(cardsHeld.current) && <TabErrorBoundary><LazyBoundary active={tab === "cards"}><CardDeck visible={tab === "cards"} s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("settings")} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "assistant" && <TabErrorBoundary><LazyBoundary><Assistant s={s} setS={setS} onBack={() => setTab("status")} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "train" && <TabErrorBoundary><LazyBoundary><Train s={s} setS={setS} gainXp={gainXp} openRun={() => setTab("run")} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "quests" && <TabErrorBoundary><Quests s={s} setS={setS} gainXp={gainXp} /></TabErrorBoundary>}
        {onboard === null && tab === "fuel" && <TabErrorBoundary><LazyBoundary><Fuel s={s} setS={setS} gainXp={gainXp} /></LazyBoundary></TabErrorBoundary>}
        {onboard === null && tab === "calendar" && <TabErrorBoundary><Calendar s={s} setS={setS} /></TabErrorBoundary>}
        {onboard === null && tab === "ranks" && <TabErrorBoundary><Ranks s={s} openMuscle={(g) => openMuscle(g, "ranks")} /></TabErrorBoundary>}
        {onboard === null && tab === "board" && <TabErrorBoundary><LazyBoundary><Board s={s} setS={setS} openProfile={openProfile} gainXp={gainXp} /></LazyBoundary></TabErrorBoundary>}
      </div>

      {toast && (
        <div className="fixed left-1/2 z-50 px-5 py-2.5 text-sm font-bold" style={{ top: "calc(env(safe-area-inset-top) + 12px)", transform: "translateX(-50%)", animation: "pop .3s ease-out", borderRadius: 999, whiteSpace: "nowrap",
          background: toast.big ? C.gold : C.sheet, color: toast.big ? "#0A1630" : C.cyan, border: `1px solid ${toast.big ? C.gold : C.blue}`,
          boxShadow: toast.big ? "0 0 30px rgba(255,212,71,.6)" : `0 0 22px ${C.glow}` }}>{toast.text}</div>
      )}

      {party && <DiscoParty />}
      {ceremony && <Ceremony c={ceremony} onClose={() => setCeremony(null)} />}
      {burst && <JuiceBurst key={burst.id} kind={burst.kind} />}
      {confetti && <TabErrorBoundary><LazyBoundary active={false}><Confetti onDone={() => setConfetti(false)} /></LazyBoundary></TabErrorBoundary>}
      {liveRun && <TabErrorBoundary><LazyBoundary><RunTracker key={liveRun.id} s={s} setS={setS} gainXp={gainXp} initial={liveRun} onLive={noteLive} onClose={() => { liveNow.current = null; setLiveRun(null); setTab("run"); }} /></LazyBoundary></TabErrorBoundary>}
      {saveNote && (
        <div className="fixed left-1/2 z-50 px-4 py-1.5 text-xs font-bold" style={{ bottom: "calc(env(safe-area-inset-bottom) + 118px)", transform: "translateX(-50%)", borderRadius: 999, whiteSpace: "nowrap", pointerEvents: "none",
          background: C.sheet, color: saveNote.startsWith("Couldn't") ? C.orange : C.green, border: `1px solid ${saveNote.startsWith("Couldn't") ? C.orange : C.green}` }}>{saveNote}</div>
      )}
      {offline && !saveNote && <div className="fixed right-2 z-50" style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}><div className=" px-3 py-1 text-xs font-bold" style={{ borderRadius: 999, background: C.sheet, color: C.orange, border: `1px solid ${C.orange}` }}>Offline · will sync</div></div>}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,.65)" }} onClick={() => setDialog(null)}>
          <div role="dialog" aria-modal="true" className="panel w-full max-w-sm p-5" style={{ background: C.sheet }} onClick={(e) => e.stopPropagation()}>
            <div className="body text-base" style={{ color: C.text }}>{dialog.message}</div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button autoFocus onClick={() => setDialog(null)} className="ghost py-3 font-bold">Cancel</button>
              <button onClick={() => { const fn = dialog.onYes; setDialog(null); fn(); }} className="py-3 font-bold" style={{ borderRadius: 3, background: C.red, color: "#fff", boxShadow: `0 0 16px ${C.red}66` }}>{dialog.yesLabel}</button>
            </div>
          </div>
        </div>
      )}
      {s.settings?.zesty && tab !== "assistant" && (
        <button aria-label={party ? "Stop the disco" : "Start the disco"} onClick={() => setParty(!party)} className="fixed z-40 flex items-center justify-center" style={{ right: 20, bottom: "calc(env(safe-area-inset-bottom) + 148px)", width: 44, height: 44, borderRadius: 999, background: party ? RAINBOW : C.soft, backgroundSize: "200% auto", animation: party ? "rainbow 2s linear infinite" : "none", border: `1px solid ${C.border}`, boxShadow: "0 0 18px rgba(255,60,172,.5)" }}>
          <DiscoIcon size={24} spinning={party} />
        </button>
      )}
      {tab !== "assistant" && (
        <button aria-label="Open voice assistant" onClick={() => setTab("assistant")} className="btn fixed z-40 flex items-center justify-center" style={{ right: 16, bottom: "calc(env(safe-area-inset-bottom) + 86px)", width: 52, height: 52, borderRadius: 999 }}>
          <Bot size={24} />
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40" style={{ background: C.glass, borderTop: `1px solid ${C.glassLine}`, backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-md mx-auto grid grid-cols-7">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className="pt-2.5 pb-3 flex flex-col items-center gap-1 relative" style={{ fontSize: 10, color: tab === id ? C.cyan : C.mute, filter: tab === id ? `drop-shadow(0 0 6px ${C.glow})` : "none" }}>
              {tab === id && <span className="absolute top-0 left-1/4 right-1/4" style={{ height: 2, background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />}
              <Icon size={19} strokeWidth={tab === id ? 2.4 : 1.8} />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
    </SaveCtx.Provider>
  );
}
