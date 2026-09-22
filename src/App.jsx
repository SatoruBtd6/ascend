import React, { useState, useEffect, useMemo, useRef, useId, useCallback } from "react";
import { pickNextGoal, usualTrainHour, workSets, resolveWorldFirst, crewQuestProgress, mergeState, persistAck, persistMerge, shouldDeferPersist, shouldWritePending, normalizeState, shouldSkipSave, stateKeysChanged, saveIsUrgent, saveDelayMs, RAID_NEED, RAID_XP, RAID_COUNTDOWN_MS, GYM_RADIUS_M, PRESENCE_MS, applyRaidAction, tickRaid, raidActive, raidPhase, raidCountdownLeft, canProposeRaid, checkGymPin, presenceActive, prunePresence, pingActive, bodySex, thresholds, targets, applyBodyType, ANIME_CRATE_WEIGHTS, ANIME_RARITY_ORDER, ANIME_PITY_AT, rollAnimeRarity, migrateAnimeCrateState, workoutGym, tagWorkouts, duplicateExerciseGroups, applyExerciseMerge, accountExerciseNames, rankUpCeremony, levelFromXp, collectPrHistory, dryRunPrRecount, LB_XP_VERSION, settingsKey, pendingKey, verifiedCopyKey, SETTINGS_KEY_LEGACY, PENDING_KEY_LEGACY, claimUnscopedSettings, mergeScopedSettings, claimUnscopedPending, overlayOwnBoardRow, cardNeedsXpUpdate, shouldPublishLbCard, tryPublish, stripGhostCosmeticsState, readAccountBlob, canPersistAccount, persistWouldWipe, guardedAccountWrite, hydrateWritePlan, looksLikeDefaultBlob, isVerifiedLocalCopy, makeVerifiedCopy } from "./math.js";
import { TrendingUp, MapPin, Droplets, Ruler, Download, Youtube, Music, Image as ImageIcon, Share2, Footprints, Zap, Camera, Hand, MessageCircle, Type, Award, Lock, Sparkle, Bookmark, SkipForward, Timer as TimerIcon, Layers, Play, Pause, RotateCcw, Minus, Shield, Settings as Gear, Bot, Mic, Send, Volume2, VolumeX, Copy, Moon, Sun, Palette, Save, Upload, Dumbbell, Swords, Utensils, User, Plus, X, Check, Flame, Sparkles, Trash2, Loader2, ChevronDown, ChevronLeft, ChevronRight, Trophy, RefreshCw, CalendarDays, Crown } from "lucide-react";
import { BootScreen, OFFLINE_COPY_MSG } from "./Boot.jsx";
import * as D from "./diag.js";
import { newRun } from "./run.js";
import { C, RAINBOW, applyTheme } from "./theme.js";
import { RANKS, RANK_INFO, GROUP_WEIGHT, GROUPS } from "./data/ranks.js";
import { EXERCISES } from "./data/exercises.js";
import { DAILY_REROLLS, QUEST_EX, questStep, FUEL_XP } from "./data/quests.js";
import { ACTIVITY, GOALS } from "./data/foods.js";
import { TIER_STYLE, ACH_ICONS } from "./data/achievements.js";
import { WEEKLY_POOL, MONTHLY_POOL, WEEKLY_REPS, MONTHLY_REPS } from "./data/challenges.js";
import { dkey, today, shift, uid, fmtDay, sexLabel, sexLine, weekStart, monthKey } from "./lib/dates.js";
import { AskRef, ask } from "./lib/ask.js";
import { allExercises, findEx } from "./lib/exercises.js";
import { addDeckSet, rankFromScore, rankFor, movedLb, computeBests, rankedLifts, groupScores, overallInfo, overallRank, isWorkout, activeDays, streakOf, mealTotals, makeQuest, newDay, workoutXp, allAchievements, lifetimeStats, reconcileAchievements, earnedAchievements, rangeStats, pickChallenges } from "./lib/stats.js";
import { SaveCtx } from "./ui/saveCtx.js";
import { SaveMark } from "./ui/SaveMark.jsx";
import { NumField } from "./ui/NumField.jsx";
import { Bar, Title, Empty, Sheet, Stat, SettingsToggle } from "./ui/primitives.jsx";
import { AURAS } from "./auras/catalog.js";
import { AuraCanvas, AuraRing } from "./auras/AuraCanvas.jsx";
import { MOG_XP, DUEL_XP, WATER_XP, CREW_PER_PLAYER, CREW_XP } from "./tabs/train/xpConstants.js";
import { SFX } from "./tabs/train/sfx.js";
import { juice } from "./tabs/train/juice.js";
import { Beeper, fmtClock } from "./tabs/train/beeper.js";
import { slug, postFeed, readShared, liveBoard, workoutPayload } from "./tabs/train/social.js";
import { ytUrl } from "./tabs/train/yt.js";
import { VOICE_STYLES, pickBritishVoice, askJson, STERLING_SYS, sterlingSay } from "./tabs/train/sterling.js";
import { gymLabel, setLabel, stalledLifts, rankSnapshot, withSilentRankSnap, fmtShort } from "./tabs/train/helpers.js";
import { RankBadge } from "./tabs/train/RankBadge.jsx";
import { ReceiptButton, buildReceipt } from "./tabs/train/receipt.jsx";
import { RestWatchPage } from "./tabs/train/rest.jsx";
import { Train } from "./tabs/train/Train.jsx";
import { ExercisePage } from "./tabs/train/ExercisePage.jsx";
import { MusclePage } from "./tabs/train/MusclePage.jsx";
import { TIER_IDS, physiqueSrc, PhysiquePlaceholder } from "./tabs/train/physique.jsx";
import { LineChart } from "./tabs/train/LineChart.jsx";
import { BOSSES, BOSS_XP, crewBossHp, globalBossHp } from "./tabs/train/bosses.js";
import { applyPrXpRecount, commitGymRetag, recountXp, XP_VERSION } from "./tabs/train/xpRecount.js";
import { XpSync } from "./tabs/train/xpSync.js";
import { ghostBundle, patchGhost, readPres, casPres, readRaid, casRaid } from "./tabs/train/raidIO.js";
import { Fuel } from "./tabs/fuel/Fuel.jsx";
import { shrinkPhoto } from "./tabs/fuel/shrinkPhoto.js";
import { loadLive, saveLive } from "./tabs/run/live.js";
import { mergeSteps } from "./tabs/run/mergeSteps.js";
import { RunTracker } from "./tabs/run/RunTracker.jsx";
import { StepsPanel } from "./tabs/run/StepsPanel.jsx";
import { RunHub } from "./tabs/run/RunHub.jsx";
import { STEP_SHORTCUT_URL } from "./tabs/run/stepSync.js";





/* ---------- Helpers ---------- */

// Score from 0 to 6: E is 0–1, D 1–2 ... S 5–6 (S I is 15% past the S line)
// Score 0–7: E 0–1 … S 5–6, and a hidden SS tier 6–7. S I ends 35% past the S line; SS caps at 75% past it.
function crateAuraMult(s) {
  let best = 0;
  (AURAS || []).forEach((a) => { if (a.crate && a.ptsMult && unlocked(a, s)) best = Math.max(best, a.ptsMult); });
  return 1 + best;
}
function crateAuraBest(s) {
  return (AURAS || []).filter((a) => a.crate && a.ptsMult && unlocked(a, s)).sort((a, b) => b.ptsMult - a.ptsMult)[0] || null;
}
function pointsParts(s) {
  const fromWorkouts = (s.workouts || []).reduce((a, w) => a + (w.xp || 0), 0);
  const fromRanks = rankedLifts(s).reduce((a, r) => a + Math.round(r.score * r.score * 30), 0);
  const fromHustle = Math.max(0, Math.round(s.xp || 0) - fromWorkouts);
  const fromStreak = streakOf(s) * 25;
  const fromCheckins = Object.values(s.checkins || {}).filter((c) => c.sleep && c.mood).length * 15;
  const gross = fromWorkouts + fromRanks + fromHustle + fromStreak + fromCheckins;
  const mult = crateAuraMult(s);
  const boosted = Math.round(gross * mult);
  const spent = crateSpentOf(s);
  return { fromWorkouts, fromRanks, fromHustle, fromStreak, fromCheckins, gross, mult, boosted, spent, total: Math.max(0, boosted - spent) };
}
function pointsOf(s) {
  return pointsParts(s).total;
}
const crateSpentOf = (s) => Math.max(0, Math.round(+s.crateSpent || 0));
const crateBank = (s) => pointsOf(s);

/* ---------- XP, achievements, community ---------- */
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



const DEFAULT = {
  profile: { name: "", weight: 170, height: 70, age: 20, sex: "m", activity: 1.55, goal: "lean" },
  xp: 0, xpLog: {}, workouts: [], active: null, days: {}, meals: {}, weekly: {}, monthly: {}, rankSnap: null, rankHist: {}, steps: {}, stepXp: {}, savedRoutes: [], stepToken: null, stepTokenHash: null, loot: {}, seasonBadges: {}, nemesis: null, nemesisSeen: {}, roasts: {}, checkins: {}, atGym: null, water: {}, dayTemplates: [], measure: {}, groupClaimed: {}, duelClaimed: {}, lastSummary: null, playerId: null, lb: false, test: false, ghost: null, bossRecaps: {}, streakNagDay: null, worldFirsts: {}, wfClaim: {}, crewBanners: {}, custom: [], fuelClaimed: {}, chat: [], ach: {}, achV: 3, mogClaimed: {}, xpDetail: {}, xpDone: {}, presets: [], weightLog: {}, community: { ex: [], foods: [] }, savedFoods: [], gyms: [], currentGym: null, gymSpecific: {}, testCrate: { pity: 0, log: [] },
  settings: { theme: "dark", zesty: false, voice: true, voiceStyle: "goblin", sounds: true, rest: 90, dysFont: false, custom: { on: false, cyan: "#00D9FF", blue: "#0A84FF", bg: "#000000" } },
};

let pendingWarned = false;
function deviceUserId() {
  return (typeof window !== "undefined" && (window.ascendUserId || window.__ascendStorageUser)) || "me";
}
function readPending() {
  try {
    const uid = deviceUserId();
    const scopedRaw = localStorage.getItem(pendingKey(uid));
    if (scopedRaw) return JSON.parse(scopedRaw);
    const raw = localStorage.getItem(PENDING_KEY_LEGACY);
    if (!raw) return null;
    let pending = null;
    try { pending = JSON.parse(raw); } catch { pending = null; }
    try { localStorage.removeItem(PENDING_KEY_LEGACY); } catch (e) { /* ignore */ }
    return claimUnscopedPending(pending, uid) ? pending : null;
  } catch (e) { return null; }
}
function writePending(state, snap) {
  if (typeof window !== "undefined" && window.__ascendNoPersist) return;
  try { localStorage.setItem(pendingKey(deviceUserId()), JSON.stringify({ state, snap, t: Date.now() })); }
  catch (e) { if (!pendingWarned) { pendingWarned = true; console.warn("[ascend] pending copy failed", e); } }
}
function clearPending() {
  try { localStorage.removeItem(pendingKey(deviceUserId())); } catch (e) { /* private mode */ }
}
function readVerifiedCopy(userId = deviceUserId()) {
  try {
    const raw = localStorage.getItem(verifiedCopyKey(userId));
    if (!raw) return null;
    const copy = JSON.parse(raw);
    return isVerifiedLocalCopy(copy, userId) ? copy : null;
  } catch { return null; }
}
function writeVerifiedCopy(state) {
  if (typeof window !== "undefined" && window.__ascendNoPersist) return;
  const uid = deviceUserId();
  const copy = makeVerifiedCopy(uid, state);
  if (!isVerifiedLocalCopy(copy, uid)) return;
  try { localStorage.setItem(verifiedCopyKey(uid), JSON.stringify(copy)); }
  catch (e) { /* private mode */ }
}
const WIPE_SAVE_NOTE = "Couldn't save: this would wipe your progress. Local copy kept.";
const URGENT_SAVE = ["meals", "workouts", "weightLog", "presets", "savedFoods", "dayTemplates", "fuelClaimed", "water", "measure"];

/* ---------- App ---------- */
// Bump with every update so it's easy to confirm which version is live (Settings shows it)
const APP_VERSION = "7c";
if (typeof window !== "undefined") window.__ASCEND_VERSION = APP_VERSION;
function stateSizeKb(obj) {
  try {
    const n = JSON.stringify(obj || {}).length;
    return Math.round(n / 1024);
  } catch { return 0; }
}




function RankGuideRow({ e, p, bests }) {
  const steps = thresholds(e, p);
  const cur = bests[e.name] ? rankFor(e, bests[e.name], p) : null;
  return (
    <div className="grid items-center gap-1 py-2 text-sm" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", borderTop: `1px solid rgba(0,217,255,.10)` }}>
      <div className="min-w-0">
        <div className="font-semibold truncate">{e.name}{e.perHand ? <span className="body text-xs font-normal" style={{ color: C.mute }}> /hand</span> : null}</div>
        <div className="body text-xs" style={{ color: cur ? cur.rank.color : C.mute }}>{cur ? `You: ${cur.label}` : "Not logged"}</div>
      </div>
      {steps.map((v, i) => {
        const reached = cur && cur.score >= i + 1;
        return <div key={i} className="text-center font-semibold tabular-nums" style={{ color: reached ? RANKS[i + 1].color : C.sub, textShadow: reached ? `0 0 8px ${RANKS[i + 1].glow}` : "none" }}>{v}</div>;
      })}
    </div>
  );
}


function IntervalStepper({ label, value, set, step, min, max, fmt, disabled }) {
  return (
    <div className="panel p-3">
      <div className="body text-xs" style={{ color: C.dim }}>{label}</div>
      <div className="flex items-center justify-between mt-1">
        <button aria-label={`Less ${label}`} disabled={disabled} onClick={() => set(Math.max(min, value - step))} className="ghost w-9 h-9 flex items-center justify-center"><Minus size={16} /></button>
        <span className="text-xl font-bold tabular-nums">{fmt(value)}</span>
        <button aria-label={`More ${label}`} disabled={disabled} onClick={() => set(Math.min(max, value + step))} className="ghost w-9 h-9 flex items-center justify-center"><Plus size={16} /></button>
      </div>
    </div>
  );
}

function MogFace({ e, label, win }) {
  return (
    <div className="flex-1 text-center">
      <img src={e.img} alt={`${label}'s mog`} style={{ width: "100%", maxWidth: 140, aspectRatio: "1", objectFit: "cover", borderRadius: 8, margin: "0 auto", border: `2px solid ${win ? C.gold : C.border}`, boxShadow: win ? `0 0 16px ${C.gold}` : "none" }} />
      <div className="font-bold text-sm mt-1 truncate">{label}</div>
      <div className="text-2xl font-extrabold glowtext" style={{ color: win ? C.gold : C.text }}>{e.total}</div>
      <div className="body text-xs" style={{ color: C.dim }}>lips {e.pucker} · brows {e.brows} · stare {e.stare} · jaw {e.jaw} · commit {e.commitment}</div>
      <div className="body text-xs italic mt-1" style={{ color: C.sub }}>"{e.quip}"</div>
    </div>
  );
}

function VersusSide({ c, r }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      <Avatar src={c.avatar} name={c.name} size={64} ring={c.look?.accent || r.color} look={c.look} />
      <div className="font-bold mt-2 truncate w-full"><FancyName name={c.name} look={c.look} /></div>
      {c.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: c.look?.accent || C.cyan }}>{c.title}</div>}
      <div className="mt-1"><RankBadge rank={r} size={34} /></div>
      <div className="ranklabel text-sm font-bold" style={{ color: r.color }}>{c.rank}{c.div ? ` ${c.div}` : ""}</div>
    </div>
  );
}

const BACKUP_KEY = "ascend-state-backup-6z";
// Pre-built iPhone Shortcut URL only. Ingest rules live in api/steps.js. Replace PUT_HASH_HERE with the iCloud share hash.
// Which built bundle this page is running, e.g. "index-Ab12Cd.js"
const runningBundle = () => { try { return [...document.querySelectorAll('script[src*="/assets/"]')].map((x) => x.getAttribute("src").split("/assets/").pop()).find((n) => /^index-/.test(n)) || null; } catch (e) { return null; } };

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
  const applyUpdate = async () => {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
      await Promise.all(regs.map(async (r) => {
        try { await r.update(); } catch { /* ignore */ }
        try { r.waiting?.postMessage("skipWaiting"); } catch { /* ignore */ }
      }));
      const keys = (await window.caches?.keys?.()) || [];
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch (e) { /* reload anyway */ }
    window.location.reload();
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
  const startRun = (mode, guide) => { const r = newRun(mode, guide); saveLive(r); setLiveRun(r); };
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
      if (!st.onboarded && !st.workouts?.length) setOnboard(st.profile?.name ? 1 : 0);
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
  }, [loaded, s.workouts, s.steps]);

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

  applyTheme(s.settings);
  SFX.enabled = s.settings?.sounds !== false;
  try {
    if (new URLSearchParams(window.location.search).get("watch") === "rest") return <RestWatchPage />;
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
      {updateReady && (
        <div role="alert" className="fixed left-0 right-0 z-[60] flex justify-center px-3" style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}>
          <div className="max-w-md w-full flex items-center gap-3 px-4 py-3" style={{ borderRadius: 14, background: C.sheet, border: `1px solid ${C.cyan}`, boxShadow: `0 8px 30px rgba(0,0,0,.45), 0 0 18px ${C.glow}` }}>
            <span className="flex-1 text-sm font-semibold">A new version of Ascend is ready</span>
            <button onClick={applyUpdate} className="btn px-3 py-1.5 text-sm">Update now</button>
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
        {onboard !== null && <TabErrorBoundary><Onboarding s={s} setS={setS} step={onboard} onNext={() => { if (onboard >= 3) { setOnboard(null); setS((p) => ({ ...p, onboarded: true })); setConfetti(true); setTab("status"); } else setOnboard(onboard + 1); }} /></TabErrorBoundary>}
        {onboard !== null ? null : tab === "status" && <TabErrorBoundary><Status s={s} setS={setS} gainXp={gainXp} openAssistant={() => setTab("assistant")} openSettings={() => setTab("settings")} openProfile={(pid) => openProfile(typeof pid === "string" ? pid : null)} openMuscle={openMuscle} openExercise={openExercise} goTrain={() => setTab("train")} goRun={() => setTab("run")} goQuests={() => setTab("quests")} openXp={() => setXpOpen(true)} saveOk={storageOk && !offline} saveAt={lastSaveAt} storageOk={storageOk} allowWipe={() => { allowWipeRef.current = true; }} /></TabErrorBoundary>}
        {onboard === null && tab === "exercise" && <TabErrorBoundary><ExercisePage s={s} setS={setS} name={exercisePick} onBack={() => setTab(exerciseFrom)} openMuscle={(g) => openMuscle(g, "exercise")} /></TabErrorBoundary>}
        {onboard === null && tab === "run" && <TabErrorBoundary><RunHub s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("train")} startRun={startRun} /></TabErrorBoundary>}
        {onboard === null && tab === "muscle" && <TabErrorBoundary><MusclePage s={s} group={musclePick} onBack={() => setTab(muscleFrom)} openExercise={(n) => openExercise(n, "muscle")} /></TabErrorBoundary>}
        {onboard === null && tab === "profile" && <TabErrorBoundary><ProfilePage s={s} setS={setS} gainXp={gainXp} targetId={profileId} onBack={() => setTab(profileId ? "board" : "status")} openXp={() => setXpOpen(true)} /></TabErrorBoundary>}
        {!storageOk && (
          <div className="panel p-3 mb-4 body text-sm" style={{ borderColor: C.orange, color: C.orange }}>
            Progress can't save right now. Check your connection, or sign out and back in from Settings.
          </div>
        )}
        {xpOpen && <Sheet title="XP history" onClose={() => setXpOpen(false)}><TabErrorBoundary><XpLedger s={s} drawer onBack={() => setXpOpen(false)} /></TabErrorBoundary></Sheet>}
        {onboard === null && tab === "settings" && <TabErrorBoundary><SettingsPage s={s} setS={setS} onBack={() => setTab("status")} party={party} setParty={setParty} openTool={setTab} saveDiag={saveDiag} /></TabErrorBoundary>}
        <TabErrorBoundary><IntervalTimer visible={tab === "timer"} onBack={() => setTab("settings")} onOpen={() => setTab("timer")} /></TabErrorBoundary>
        <TabErrorBoundary><CardDeck visible={tab === "cards"} s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("settings")} /></TabErrorBoundary>
        {onboard === null && tab === "assistant" && <TabErrorBoundary><Assistant s={s} setS={setS} onBack={() => setTab("status")} /></TabErrorBoundary>}
        {onboard === null && tab === "train" && <TabErrorBoundary><Train s={s} setS={setS} gainXp={gainXp} openRun={() => setTab("run")} /></TabErrorBoundary>}
        {onboard === null && tab === "quests" && <TabErrorBoundary><Quests s={s} setS={setS} gainXp={gainXp} /></TabErrorBoundary>}
        {onboard === null && tab === "fuel" && <TabErrorBoundary><Fuel s={s} setS={setS} gainXp={gainXp} /></TabErrorBoundary>}
        {onboard === null && tab === "calendar" && <TabErrorBoundary><Calendar s={s} setS={setS} /></TabErrorBoundary>}
        {onboard === null && tab === "ranks" && <TabErrorBoundary><Ranks s={s} openMuscle={(g) => openMuscle(g, "ranks")} /></TabErrorBoundary>}
        {onboard === null && tab === "board" && <TabErrorBoundary><Board s={s} setS={setS} openProfile={openProfile} gainXp={gainXp} /></TabErrorBoundary>}
      </div>

      {toast && (
        <div className="fixed left-1/2 z-50 px-5 py-2.5 text-sm font-bold" style={{ top: "calc(env(safe-area-inset-top) + 12px)", transform: "translateX(-50%)", animation: "pop .3s ease-out", borderRadius: 999, whiteSpace: "nowrap",
          background: toast.big ? C.gold : C.sheet, color: toast.big ? "#0A1630" : C.cyan, border: `1px solid ${toast.big ? C.gold : C.blue}`,
          boxShadow: toast.big ? "0 0 30px rgba(255,212,71,.6)" : `0 0 22px ${C.glow}` }}>{toast.text}</div>
      )}

      {party && <DiscoParty />}
      {ceremony && <Ceremony c={ceremony} onClose={() => setCeremony(null)} />}
      {burst && <JuiceBurst key={burst.id} kind={burst.kind} />}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
      {liveRun && <RunTracker key={liveRun.id} s={s} setS={setS} gainXp={gainXp} initial={liveRun} onClose={() => { setLiveRun(null); setTab("run"); }} />}
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


/* ---------- Status ---------- */
// One line on Status: the single goal you're closest to finishing, across quests, challenges, and lift ranks
const goalLeft = (n, unit) => {
  const v = unit === "mi" ? Math.round(n * 10) / 10 : Math.ceil(n);
  return `${v.toLocaleString()} ${unit}`;
};
function nextGoalFor(s) {
  const out = [];
  (s.days?.[today()]?.list || []).forEach((q) => {
    if (q.claimed || !(q.target > 0)) return;
    const v = Math.min(+q.progress || 0, q.target);
    out.push({ kind: "quest", tie: 0, value: v, goal: q.target, label: `${goalLeft(q.target - v, q.unit)} from today's ${q.title}` });
  });
  const ws = weekStart(), mk = monthKey();
  const wc = s.weekly?.[ws], wClaimed = wc === true ? { "w-train4": true } : (wc || {});
  const mClaimed = s.monthly?.[mk] || {};
  const add = (list, stats, claimed, word) => list.forEach((c) => {
    if (claimed[c.id]) return;
    const v = Math.min(c.get(stats), c.target);
    out.push({ kind: "challenge", tie: 1, value: v, goal: c.target, label: `${goalLeft(c.target - v, c.unit)} from the ${word}` });
  });
  add([...pickChallenges(WEEKLY_POOL, ws, 3), WEEKLY_REPS], rangeStats(s, ws, shift(ws, 6)), wClaimed, "weekly");
  add([...pickChallenges(MONTHLY_POOL, mk, 3), MONTHLY_REPS], rangeStats(s, `${mk}-01`, `${mk}-31`), mClaimed, "monthly");
  rankedLifts(s).forEach((r) => {
    if (!r.next) return;
    out.push({ kind: "lift", tie: 2, name: r.e.name, value: r.best, goal: r.next, label: `${goalLeft(r.next - r.best, r.e.type === "bodyweight" ? "reps" : "lb")} from ${r.nextLabel} ${r.e.name}` });
  });
  return pickNextGoal(out);
}
// Streak about to break: past your usual training hour with nothing logged today
function StreakRisk({ s, setS, goTrain }) {
  const d = today();
  const streak = streakOf(s);
  if (!streak || activeDays(s).has(d) || s.streakNagDay === d) return null;
  const hour = usualTrainHour((s.workouts || []).filter((w) => w.startedAt && isWorkout(w)).map((w) => new Date(w.startedAt).getHours()));
  if (new Date().getHours() < hour) return null;
  const when = new Date(new Date().setHours(hour, 0, 0, 0)).toLocaleTimeString([], { hour: "numeric" });
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,147,64,.55)" }}>
      <Flame size={22} className="shrink-0" style={{ color: C.orange }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: C.orange }}>{streak} day streak on the line</div>
        <div className="body text-sm" style={{ color: C.sub }}>You usually train by {when} and today is still empty. A workout or a cleared quest keeps it alive.</div>
        <div className="flex gap-3 mt-2">
          <button onClick={goTrain} className="body text-sm font-semibold" style={{ color: C.cyan }}>Train now</button>
          <button onClick={() => setS((p) => ({ ...p, streakNagDay: d }))} className="body text-sm" style={{ color: C.dim }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
function NextGoal({ s, openExercise, goQuests }) {
  const goal = useMemo(() => nextGoalFor(s), [s]);
  if (!goal) return null;
  return (
    <button onClick={() => (goal.kind === "lift" ? openExercise(goal.name) : goQuests())} className="panel p-3 w-full text-left flex items-center gap-3">
      <TrendingUp size={18} className="shrink-0" style={{ color: C.cyan }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{goal.label}</div>
        <div className="mt-1.5"><Bar pct={(goal.value / goal.goal) * 100} color={C.cyan} /></div>
      </div>
      <ChevronRight size={18} className="shrink-0" style={{ color: C.mute }} />
    </button>
  );
}

function Status({ s, setS, gainXp, openAssistant, openSettings, openProfile, openMuscle, openExercise, goTrain, goRun, goQuests, openXp, openRival, saveOk, saveAt, storageOk, allowWipe }) {
  const { lvl, into, need } = levelFromXp(s.xp);
  const ranked = rankedLifts(s);
  const points = pointsOf(s);
  const overall = overallInfo(s);
  const streak = streakOf(s);
  const g = overall.groups;
  const stat = (...ks) => Math.min(100, Math.round((ks.reduce((a, k) => a + (g[k] || 0), 0) / ks.length) * (100 / 6)));
  const [editName, setEditName] = useState(!s.profile.name);
  const oc = overall.rank;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {editName ? (
          <input autoFocus className="inp text-lg font-bold" style={{ maxWidth: 220 }} placeholder="Your name" defaultValue={s.profile.name}
            onBlur={(e) => { setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } })); setEditName(false); }} />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <button aria-label="Open your profile" onClick={openProfile}><Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={oc.color} look={s.profile.look} /></button>
            <button onClick={() => setEditName(true)} className="text-2xl font-bold tracking-wide truncate">{s.profile.name ? <FancyName name={s.profile.name} look={s.profile.look} className="glowtext" /> : "Set your name"}</button>
          </div>
        )}
        <div className="flex items-center gap-1 font-semibold" style={{ color: C.orange, textShadow: "0 0 10px rgba(255,147,64,.6)" }}><Flame size={20} />{streak}
          <button aria-label="XP history" onClick={() => openXp?.()} className="ml-3 p-1.5 ghost" style={{ color: C.gold, textShadow: "none" }}><Zap size={18} /></button>
          <button aria-label="Settings" onClick={openSettings} className="ml-1.5 p-1.5 ghost" style={{ color: C.cyan }}><Gear size={18} /></button></div>
      </div>

      {s.xpRecount && !s.xpRecount.seen && (
        <div className="panel p-4 space-y-2" style={{ borderColor: `${C.gold}66` }}>
          <div className="font-bold flex items-center gap-2"><Zap size={16} style={{ color: C.gold }} />Your XP was recounted</div>
          <div className="body text-sm" style={{ color: C.sub }}>{s.xpRecount.before.toLocaleString()} → <b style={{ color: C.text }}>{s.xpRecount.after.toLocaleString()} XP</b>. PR bonuses now count once per exercise per workout.{s.xpRecount.floor ? ` Your level was kept (+${s.xpRecount.floor.toLocaleString()} XP).` : ""}{s.xpRecount.gravemaw ? ` The Gravemaw crew-boss exploit was also undone (−${s.xpRecount.gravemaw} XP and its loot).` : ""}</div>
          <div className="flex gap-2">
            <button onClick={() => { setS((p) => ({ ...p, xpRecount: { ...p.xpRecount, seen: true } })); openXp?.(); }} className="btn px-4 py-2 text-sm">See XP history</button>
            <button onClick={() => setS((p) => ({ ...p, xpRecount: { ...p.xpRecount, seen: true } }))} className="ghost px-4 py-2 text-sm font-bold">Got it</button>
          </div>
        </div>
      )}
      <div className="panel p-5 overflow-hidden">
        <div className="absolute -right-4 -top-10 font-extrabold select-none" style={{ fontSize: 170, color: oc.color, opacity: 0.07, lineHeight: 1 }}>{oc.id}</div>
        <div className="flex items-center gap-4 relative">
          <div className="flex-1 min-w-0">
            <div className="breathe inline-block" style={{ "--g": oc.glow }}><RankBadge rank={oc} size={60} /></div>
            <div className="text-sm body mt-2" style={{ color: C.dim }}>Overall rank · {RANK_INFO[oc.id][0]}</div>
            <div className="ranklabel text-4xl" style={{ color: oc.color }}>{overall.label}</div>
          </div>
          <Physique tier={overall.score} height={150} aura={s.profile.look?.aura} sex={s.profile.sex} />
        </div>
        <div className="mt-3 relative"><Bar pct={overall.divPct} color={oc.color} /></div>
        <button onClick={openProfile} className="btn mt-4 w-full py-2.5 text-sm flex items-center justify-center gap-2 relative"><User size={16} />Profile · achievements · weight chart</button>
        <div className="body text-xs mt-1 relative" style={{ color: C.mute }}>Overall counts every muscle group. Groups you haven't trained count as zero.</div>

        <div className="neonline my-4" />
        <div className="flex justify-between items-baseline relative">
          <span className="text-xl font-bold">Level {lvl}</span>
          <span className="text-sm body" style={{ color: C.dim }}>{into} / {need} XP</span>
        </div>
        <div className="mt-2"><Bar pct={(into / need) * 100} color={C.cyan} /></div>
        <div className="mt-4 flex justify-between items-baseline relative">
          <button onClick={() => openXp()} className="body text-sm underline" style={{ color: C.cyan }}>XP history</button>
          <span className="body text-sm" style={{ color: C.dim }}>Leaderboard points</span>
          <span className="text-xl font-bold" style={{ color: C.gold, textShadow: "0 0 12px rgba(255,212,71,.5)" }}>{points.toLocaleString()}</span>
        </div>
        {(() => {
          const pp = pointsParts(s);
          const aura = crateAuraBest(s);
          const bits = [];
          if (pp.fromHustle) bits.push("quests & daily XP count");
          if (pp.fromStreak) bits.push(`streak +${pp.fromStreak.toLocaleString()}`);
          if (pp.fromCheckins) bits.push(`check-ins +${pp.fromCheckins.toLocaleString()}`);
          if (aura) bits.push(`${aura.name} +${Math.round(aura.ptsMult * 100)}%`);
          if (pp.spent) bits.push(`${pp.spent.toLocaleString()} spent on crates`);
          return bits.length ? <div className="body text-xs mt-1 text-right" style={{ color: C.mute }}>{bits.join(" · ")}</div> : null;
        })()}
        <CrateTeaser s={s} onOpen={openProfile} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["STR", stat("Legs", "Back")], ["PWR", stat("Chest", "Shoulders")], ["ARM", stat("Arms")], ["CORE", stat("Core")]].map(([k, v]) => (
          <div key={k} className="panel py-3 text-center">
            <div className="text-xs" style={{ color: C.dim }}>{k}</div>
            <div className="text-2xl font-bold glowtext">{v}</div>
          </div>
        ))}
      </div>

      <BossRecapBanner s={s} setS={setS} />
      <StreakRisk s={s} setS={setS} goTrain={goTrain} />
      <NextGoal s={s} openExercise={openExercise} goQuests={goQuests} />
      <GymSpotBanner s={s} setS={setS} />
      <Dashboard s={s} setS={setS} goTrain={goTrain} goRun={goRun} saveOk={saveOk} saveAt={saveAt} storageOk={storageOk} />
      <StepsPanel s={s} setS={setS} gainXp={gainXp} openRun={goRun} openAssistant={openAssistant} />
      <RoastCard s={s} setS={setS} />
      <NemesisAlert s={s} setS={setS} openProfile={openProfile} />
      <Nudges s={s} openExercise={openExercise} goTrain={goTrain} />
      <WeeklyReport s={s} />
      <MogInbox s={s} openProfile={openProfile} />

      <h2 className="text-lg font-bold glowtext">Muscle groups <span className="body text-sm font-normal" style={{ color: C.dim }}>tap one</span></h2>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(GROUP_WEIGHT).map((gk) => { const sc = g[gk] || 0; const rr = rankFromScore(sc); return (
          <button key={gk} onClick={() => openMuscle(gk)} className="panel p-2 flex flex-col items-center gap-1">
            <RankBadge rank={sc ? rr.rank : RANKS[0]} size={40} still={!sc} />
            <div className="text-xs font-bold">{gk}</div>
            <div className="ranklabel text-xs" style={{ color: sc ? rr.rank.color : C.mute }}>{sc ? rr.label : "–"}</div>
          </button>
        ); })}
      </div>

      <h2 className="text-lg font-bold glowtext">Lift ranks</h2>
      {ranked.length === 0 ? (
        <Empty>Log a workout in Train to get ranked on each lift. Check the Ranks tab to see what every rank takes for your height and weight.</Empty>
      ) : (
        <div className="space-y-2">
          {ranked.sort((a, b) => b.score - a.score).map(({ e, best, rank, label, pct, next, nextLabel }) => {
            const unit = e.type === "bodyweight" ? " reps" : " lb";
            return (
              <button key={e.name} onClick={() => openExercise(e.name)} className="panel p-3 flex items-center gap-4 w-full text-left">
                <RankBadge rank={rank} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold truncate">{e.name}</span>
                    <span className="ranklabel font-bold whitespace-nowrap" style={{ color: rank.color }}>{label}</span>
                  </div>
                  <div className="mt-1.5"><Bar pct={pct} color={rank.color} /></div>
                  <div className="text-xs body mt-1 flex justify-between gap-2" style={{ color: C.mute }}>
                    <span>Best {Math.round(best)}{e.type === "bodyweight" ? " reps" : " lb est. max"}</span>
                    <span>{next ? `${nextLabel} at ${next}${unit}` : "Maxed out"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Profile s={s} setS={setS} allowWipe={allowWipe} />
    </div>
  );
}

function Profile({ s, setS, allowWipe }) {
  const [open, setOpen] = useState(false);
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex justify-between items-center font-semibold">
        Body stats <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<NumField inputMode="decimal" className="inp mt-1" value={p.weight} onCommit={(v) => { if (v === "") return; set("weight", v); if (v > 50) setS((x) => ({ ...x, weightLog: { ...(x.weightLog || {}), [today()]: v } })); }} /></label>
          <label>Height (in)<NumField inputMode="decimal" className="inp mt-1" value={p.height} onCommit={(v) => { if (v === "") return; set("height", v); }} /></label>
          <label>Age<NumField inputMode="numeric" className="inp mt-1" value={p.age} onCommit={(v) => { if (v === "") return; set("age", v); }} /></label>
          <label>Body type<select className="inp mt-1" value={bodySex(p)} onChange={(e) => {
            const v = e.target.value === "f" ? "f" : "m";
            if (v === bodySex(p)) return;
            e.target.value = bodySex(p);
            ask("This changes rank targets and calorie math. Achievements, XP, titles, and cosmetics stay. Rank letters may go up or down.", () => {
              setS((x) => { const n = applyBodyType(x, v); return { ...n, rankSnap: rankSnapshot(n) }; });
            }, "Switch");
          }}><option value="m">Male</option><option value="f">Female</option></select></label>
          <label className="col-span-2">Activity<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <button className="col-span-2 mt-1 text-xs underline" style={{ color: C.red }} onClick={() => ask("Reset all progress? This can't be undone.", () => { allowWipe?.(); D.withSource("reset", () => setS((p) => ({ ...DEFAULT, playerId: p.playerId, settings: p.settings, test: !!p.test }))); }, "Reset")}>Reset all progress</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Train ---------- */


// Full page (not a popup) so it scrolls normally on phones

/* ---------- Quests ---------- */
function Quests({ s, setS, gainXp }) {
  const d = today();
  const day = s.days?.[d];
  useEffect(() => { if (!day) setS((p) => ({ ...p, days: { ...p.days, [d]: newDay() } })); }, [day, d]);
  if (!day) return null;

  const updDay = (fn) => setS((p) => ({ ...p, days: { ...p.days, [d]: fn(p.days[d]) } }));
  const setProg = (id, v) => updDay((x) => ({ ...x, list: x.list.map((q) => q.id === id ? { ...q, progress: Math.max(0, v) } : q) }));
  const reroll = (id) => updDay((x) => {
    const old = x.list.find((q) => q.id === id);
    const fresh = makeQuest(x.list.map((q) => q.qid), old.tier);
    return { ...x, rerolls: x.rerolls + 1, list: x.list.map((q) => q.id === id ? fresh : q) };
  });
  const claim = (q) => {
    const exName = QUEST_EX[q.qid];
    const extra = Math.max(0, q.progress - (q.fromWorkout || 0));
    let logged = null;
    if (exName && extra > 0) {
      const def = findEx(s, exName);
      const sets = [];
      if (def.type === "timed") sets.push({ w: "", r: extra, done: true });
      else { const size = questStep(q); let left = extra; while (left > 0) { sets.push({ w: "", r: Math.min(size, left), done: true }); left -= size; } }
      logged = { id: uid(), date: d, source: "quest", xp: 0, volume: 0, exercises: [{ name: exName, sets }] };
    }
    setS((p) => ({
      ...p,
      workouts: logged ? [...p.workouts, logged] : p.workouts,
      days: { ...p.days, [d]: { ...p.days[d], list: p.days[d].list.map((y) => y.id === q.id ? { ...y, claimed: true } : y) } },
    }));
    gainXp(q.xp, `Quest: ${q.title}`, `quest_${d}_${q.id}`);
  };

  const tiers = [...new Set(day.list.map((q) => q.tier))];
  const topTier = Math.max(...tiers);
  const tierDone = (t) => day.list.filter((q) => q.tier === t).every((q) => q.claimed);
  const canBonus = tierDone(topTier) && day.bonuses < topTier;
  const canMore = tierDone(topTier) && day.bonuses >= topTier;
  const rerollsLeft = DAILY_REROLLS - day.rerolls;


  return (
    <div className="space-y-4">
      <Title right={<span className="text-sm body flex items-center gap-1" style={{ color: C.dim }}><RefreshCw size={14} />{rerollsLeft} left</span>}>Daily quests</Title>
      <div className="body text-sm" style={{ color: C.dim }}>Don't like a quest? Reroll it (3 per day). Clear a full set to unlock a harder one. Exercise quests link to your workouts both ways.</div>

      {tiers.map((t) => (
        <div key={t} className="space-y-3">
          {t > 1 && <h2 className="text-lg font-bold pt-2" style={{ color: t >= 3 ? C.gold : C.cyan }}>Bonus set {t - 1} · {1 + 0.5 * (t - 1)}× difficulty</h2>}
          {day.list.filter((q) => q.tier === t).map((q) => {
            const done = q.progress >= q.target;
            const step = questStep(q);
            const quick = q.unit === "mi" ? [0.5, 1, 2] : q.unit === "min" ? [1, 5, 10] : q.unit === "cups" ? [1, 2] : q.unit === "steps" ? [500, 1000, 2500] : [5, 10, 25];
            const exName = QUEST_EX[q.qid];
            const label = /^[a-z]/.test(q.title) ? `${q.target.toLocaleString()} ${q.title}` : `${q.title} ${q.target.toLocaleString()} ${q.unit}`;
            return (
              <div key={q.id} className="panel p-4" style={q.claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold">{label}</div>
                    <div className="body text-sm" style={{ color: C.dim }}>{q.progress.toLocaleString()} / {q.target.toLocaleString()} {q.unit}</div>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{q.xp} XP</span>
                </div>
                <div className="my-3"><Bar pct={(q.progress / q.target) * 100} color={q.claimed ? C.green : C.blue} /></div>
                {exName && !q.claimed && <div className="body text-xs -mt-1 mb-3" style={{ color: C.mute }}>Linked to {exName}: logging it in Train fills this quest, and claiming logs these {q.unit === "min" ? "minutes" : `reps in sets of ${step}`} to your history.{q.fromWorkout ? ` ${q.fromWorkout} already came from workouts.` : ""}</div>}
                {q.claimed ? (
                  <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <button aria-label="Reroll quest" disabled={rerollsLeft <= 0 || q.progress > 0} onClick={() => reroll(q.id)} className="ghost px-2.5 py-1.5" style={{ color: rerollsLeft > 0 && q.progress === 0 ? C.cyan : C.mute }}><RefreshCw size={14} /></button>
                      {quick.map((n) => <button key={n} onClick={() => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} className="ghost px-2.5 py-1.5 text-sm font-bold">+{n.toLocaleString()}</button>)}
                      <QuestAdd unit={q.unit} onAdd={(n) => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} />
                      {q.progress > 0 && <button aria-label="Undo" onClick={() => setProg(q.id, Math.max(0, Math.round((q.progress - quick[0]) * 100) / 100))} className="ghost px-2.5 py-1.5 text-sm" style={{ color: C.mute }}>−{quick[0]}</button>}
                    </div>
                    <button disabled={!done} onClick={() => claim(q)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>{done ? "Claim" : `${Math.round((q.target - q.progress) * 100) / 100} ${q.unit} to go`}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {canBonus && (
        <button onClick={() => { updDay((x) => ({ ...x, bonuses: x.bonuses + 1 })); gainXp(100 * topTier, "Set cleared", `bonus_${d}_${day.bonuses}`); }} className="w-full py-3 font-bold flex items-center justify-center gap-2" style={{ background: C.gold, color: "#0A1630", borderRadius: 4, boxShadow: "0 0 22px rgba(255,212,71,.55)" }}>
          <Sparkles size={18} />Claim set bonus +{100 * topTier} XP
        </button>
      )}
      {canMore && (
        <button onClick={() => updDay((x) => { const add = []; while (add.length < 3) add.push(makeQuest([...x.list.filter((q) => q.tier === topTier).map((q) => q.qid), ...add.map((q) => q.qid)], topTier + 1)); return { ...x, list: [...x.list, ...add] }; })} className="btn w-full py-3 flex items-center justify-center gap-2">
          <Swords size={18} />Take on 3 harder quests
        </button>
      )}

      <Challenges s={s} setS={setS} gainXp={gainXp} />
    </div>
  );
}

/* ---------- Fuel ---------- */



/* ---------- Calendar ---------- */
function Calendar({ s, setS }) {
  const [sheet, setSheet] = useState(null);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const t = targets(s.profile);

  const info = (d) => {
    const ws = s.workouts.filter((w) => w.date === d);
    const meals = s.meals[d] || [];
    const tot = mealTotals(meals);
    const quests = (s.days?.[d]?.list || []).filter((q) => q.claimed).length;
    return {
      ws, quests, meals, tot, xp: s.xpLog?.[d] || 0,
      volume: ws.reduce((a, w) => a + (w.volume ?? w.exercises.reduce((b, e) => b + e.sets.reduce((c, st) => c + (+st.w || 0) * +st.r, 0), 0)), 0),
      hit: meals.length > 0 && Math.abs(tot.cal - t.cal) <= t.cal * 0.1,
    };
  };

  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => dkey(new Date(ym.y, ym.m, i + 1)))];
  const monthDays = cells.filter(Boolean).map((d) => ({ d, ...info(d) }));
  const logged = monthDays.filter((x) => x.meals.length);
  const sum = {
    workouts: monthDays.reduce((a, x) => a + x.ws.filter(isWorkout).length, 0),
    quests: monthDays.reduce((a, x) => a + x.quests, 0),
    xp: monthDays.reduce((a, x) => a + x.xp, 0),
    volume: monthDays.reduce((a, x) => a + x.volume, 0),
    avgCal: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.cal, 0) / logged.length) : 0,
    avgP: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.p, 0) / logged.length) : 0,
    hits: monthDays.filter((x) => x.hit).length,
  };
  const move = (n) => setYm(({ y, m }) => { const x = new Date(y, m + n, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const di = info(sel);
  const td = today();

  return (
    <div className="space-y-4">
      <Title>Log</Title>
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <button aria-label="Previous month" onClick={() => move(-1)} className="p-1" style={{ color: C.cyan }}><ChevronLeft /></button>
          <span className="font-bold">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button aria-label="Next month" onClick={() => move(1)} className="p-1" style={{ color: C.cyan }}><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: C.mute }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const x = info(d);
            const future = d > td;
            return (
              <button key={d} onClick={() => setSel(d)} disabled={future} className="aspect-square flex flex-col items-center justify-center gap-1"
                style={{ borderRadius: 3, background: sel === d ? "rgba(47,140,255,.28)" : x.ws.length ? "rgba(47,140,255,.1)" : "transparent", border: d === td ? `1px solid ${C.cyan}` : "1px solid transparent", opacity: future ? 0.3 : 1 }}>
                <span className="text-sm font-semibold">{+d.slice(8)}</span>
                <span className="flex gap-0.5 h-1.5">
                  {x.ws.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.blue, boxShadow: `0 0 4px ${C.blue}` }} />}
                  {x.quests > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />}
                  {x.meals.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: x.hit ? C.green : C.orange }} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 body text-xs" style={{ color: C.dim }}>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.blue }} />Workout</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.gold }} />Quests</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.green }} />Calories on target</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.orange }} />Off target</span>
        </div>
      </div>

      <div className="panel p-4">
        <div className="font-bold mb-3">{sel === td ? "Today" : fmtDay(sel)}</div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <Stat label="XP earned" value={di.xp} />
          <Stat label="Quests cleared" value={di.quests} />
          <Stat label="Calories" value={di.meals.length ? `${Math.round(di.tot.cal)} / ${t.cal}` : "–"} />
          <Stat label="Protein" value={di.meals.length ? `${Math.round(di.tot.p)}g` : "–"} />
        </div>
        {(s.xpDetail?.[sel] || []).length > 0 && (
          <div className="mt-3 pt-3 body text-xs space-y-0.5" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="font-bold" style={{ color: C.text }}>XP breakdown</div>
            {s.xpDetail[sel].map((x, i) => <div key={i} className="flex justify-between" style={{ color: C.dim }}><span>{x.m}</span><span style={{ color: x.a >= 0 ? C.gold : C.orange }}>{x.a >= 0 ? "+" : ""}{x.a}</span></div>)}
          </div>
        )}
        {(() => { const ci = s.checkins?.[sel] || {}; const wt = s.weightLog?.[sel]; const steps = s.steps?.[sel]; const parts = [ci.sleep ? `${ci.sleep}h sleep` : null, ci.mood ? `feeling ${ci.mood.toLowerCase()}` : null, steps ? `${steps.toLocaleString()} steps` : null, wt ? `${wt} lb` : null].filter(Boolean);
          return parts.length ? <div className="body text-xs mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, color: C.sub }}>{parts.join(" · ")}</div> : null; })()}
        {di.ws.length > 0 ? di.ws.map((w) => (
          <button key={w.id} onClick={() => setSheet(w)} className="mt-3 body text-sm w-full text-left" style={{ color: C.sub }}>
            <div className="flex justify-between items-center"><span className="font-semibold" style={{ color: C.text }}>{w.title || "Workout"}{w.run ? ` · ${w.run.miles} mi` : ""}</span><span className="body text-xs" style={{ color: C.cyan }}>Details ›</span></div>
            {w.exercises.map((ex) => <div key={ex.name}><span style={{ color: C.cyan }}>{ex.name}</span>: {ex.sets.map((st) => setLabel(findEx(s, ex.name), st)).join(", ")}</div>)}
          </button>
        )) : <div className="mt-3 body text-sm" style={{ color: C.mute }}>No workout this day.</div>}
      </div>

      {sheet && <LogWorkoutSheet s={s} setS={setS} w={sheet} onClose={() => setSheet(null)} />}
      <h2 className="text-lg font-bold">This month</h2>
      <div className="grid grid-cols-2 gap-3 body text-sm">
        <Stat panel label="Workouts" value={sum.workouts} />
        <Stat panel label="Quests cleared" value={sum.quests} />
        <Stat panel label="XP earned" value={sum.xp.toLocaleString()} />
        <Stat panel label="Volume lifted" value={`${Math.round(sum.volume / 1000)}k lb`} />
        <Stat panel label="Avg calories" value={sum.avgCal || "–"} />
        <Stat panel label="Avg protein" value={sum.avgP ? `${sum.avgP}g` : "–"} />
        <Stat panel label="Days food logged" value={logged.length} />
        <Stat panel label="Days on target" value={sum.hits} />
      </div>
      <WeightTracker s={s} setS={setS} />
    </div>
  );
}
function WeightTracker({ s, setS }) {
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
function Board({ s, setS, openProfile, gainXp }) {
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
    streak: ["Streak", "days", (r) => r.streak || 0], week: ["Week", "workouts", (r) => (r.weekOf === ws ? r.week : 0)],
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
function Ranks({ s, openMuscle }) {
  const p = s.profile;
  const [pick, setPick] = useState("Bench Press");
  const overall = overallInfo(s);
  const key = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"];
  const all = allExercises(s).filter((e) => e.type !== "timed" && e.type !== "assisted");
  const bests = computeBests(s);
  const ft = Math.floor(p.height / 12), inch = Math.round(p.height % 12);
  const totalW = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-wide glowtext">Ranks</h1>
      <div className="body text-sm" style={{ color: C.dim }}>
        Targets are built for you: {p.weight} lb, {ft}'{inch}", {sexLabel(p)}. Heavier lifters need to lift more, and taller frames need more too, because a strong physique at that height means carrying more muscle. Update your body stats on the Status tab whenever they change.
      </div>

      <div className="space-y-2">
        {[...RANKS].reverse().filter((r) => r.id !== "SS" || overall.score >= 6).map((r) => {
          const mine = overall.rank.id === r.id;
          return (
            <div key={r.id} className="panel p-3 flex items-center gap-4" style={mine ? { borderColor: r.color, boxShadow: `0 0 22px ${r.glow}` } : null}>
              <RankBadge rank={r} size={36} />
              <div className="flex-1 ml-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold" style={{ color: r.color }}>{r.id}-Rank · {RANK_INFO[r.id][0]}</span>
                  {mine && <span className="text-xs font-bold" style={{ color: r.color }}>You · {overall.label}</span>}
                </div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{RANK_INFO[r.id][1]}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>Each rank has three divisions: III, II, then I. S I sits 35% past the S line. Rumour has it there's something above S.</div>

      <h2 className="text-lg font-bold glowtext pt-2">What each rank takes</h2>
      <div className="panel p-3">
        <div className="grid gap-1 pb-1 text-xs font-bold" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)" }}>
          <span style={{ color: C.dim }}>Lift</span>
          {RANKS.slice(1, 6).map((r) => <span key={r.id} className="text-center" style={{ color: r.color, textShadow: `0 0 8px ${r.glow}` }}>{r.id}</span>)}
        </div>
        {key.map((n) => { const e = all.find((x) => x.name === n); return e ? <RankGuideRow key={n} e={e} p={p} bests={bests} /> : null; })}
        <div className="body text-xs pt-2" style={{ color: C.mute }}>Weighted lifts show estimated one-rep max in lb, so 225 × 5 counts as about a 263 lb max. Lifts marked /hand use the weight in one hand. Pull-ups show strict reps in one set, and added weight counts extra. Shoulders and arms are held to a stricter standard.</div>
      </div>

      <div className="panel p-3 space-y-2">
        <label className="body text-sm block" style={{ color: C.dim }}>Look up any exercise
          <select className="inp mt-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            {GROUPS.filter((g) => g !== "Cardio").map((g) => (
              <optgroup key={g} label={g}>{all.filter((e) => e.group === g).map((e) => <option key={e.name}>{e.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        {all.find((e) => e.name === pick) && <RankGuideRow e={all.find((e) => e.name === pick)} p={p} bests={bests} />}
      </div>

      <h2 className="text-lg font-bold glowtext pt-2">How overall rank works</h2>
      <div className="panel p-4 space-y-3">
        <div className="body text-sm" style={{ color: C.dim }}>Your best lift in each muscle group counts, weighted like this. To be overall S, you need to be elite across your whole body, not on one machine.</div>
        {Object.entries(GROUP_WEIGHT).map(([k, w]) => {
          const sc = overall.groups[k] || 0;
          const r = rankFromScore(sc);
          return (
            <button key={k} onClick={() => openMuscle?.(k)} className="w-full text-left">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{k} <span className="body text-xs" style={{ color: C.mute }}>counts {Math.round((w / totalW) * 100)}% · tap</span></span>
                <span className="font-bold" style={{ color: sc ? r.rank.color : C.mute }}>{sc ? r.label : "Untrained"}</span>
              </div>
              <div className="mt-1"><Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} /></div>
            </button>
          );
        })}
        <div className="body text-xs" style={{ color: C.mute }}>Cardio and timed exercises earn XP but don't affect rank.</div>
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
async function encodeSave(s) {
  const data = { ...s, active: null, community: undefined, chat: undefined };
  const raw = new TextEncoder().encode(JSON.stringify({ app: "ascend", v: 2, saved: Date.now(), data }));
  if (typeof CompressionStream !== "undefined") {
    try {
      const gz = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
      return "ASC2-" + b64url(gz);
    } catch (e) { /* fall back to plain */ }
  }
  return "ASC1-" + b64url(raw);
}
async function decodeSave(code) {
  const t = code.trim().replace(/\s+/g, "");
  let bytes;
  if (t.startsWith("ASC2-")) bytes = new Uint8Array(await new Response(new Blob([fromB64url(t.slice(5))]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  else if (t.startsWith("ASC1-")) bytes = fromB64url(t.slice(5));
  else bytes = Uint8Array.from(atob(t.replace(/^ASCEND-/, "")), (c) => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (parsed.app !== "ascend" || !parsed.data?.profile || !Array.isArray(parsed.data.workouts)) throw new Error("bad save");
  return parsed;
}

function GymsSettings({ s, setS }) {
  const gyms = s.gyms || [];
  const [name, setName] = useState("");
  const [tagDate, setTagDate] = useState("");
  const [tagGym, setTagGym] = useState(s.currentGym || "");
  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = uid();
    const first = gyms.length === 0;
    setS((p) => withSilentRankSnap({ ...p, gyms: [...(p.gyms || []), { id, name: n }], currentGym: p.currentGym || id }));
    setName("");
    setTagGym(id);
    if (first) ask(`Tag all untagged workouts as ${n}? Runs and imports stay untagged.`, () => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: id, untaggedOnly: true }))), "Tag them");
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="body text-xs" style={{ color: C.dim }}>Personal gyms only — not the crew GPS pin. Machine and cable lifts compare within the current gym so a different stack doesn't look like a regression.</div>
      {gyms.map((g) => (
        <div key={g.id} className="flex items-center gap-2">
          <button type="button" onClick={() => setS((p) => withSilentRankSnap({ ...p, currentGym: p.currentGym === g.id ? null : g.id }))} className="px-2 py-1 text-xs font-bold" style={{ borderRadius: 999, background: s.currentGym === g.id ? C.blue : C.soft, color: s.currentGym === g.id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{s.currentGym === g.id ? "Current" : "Use"}</button>
          <input className="inp flex-1 text-sm" value={g.name} aria-label={`Rename ${g.name}`} onChange={(e) => { const v = e.target.value; setS((p) => ({ ...p, gyms: (p.gyms || []).map((x) => x.id === g.id ? { ...x, name: v } : x) })); }} />
          <button aria-label={`Delete ${g.name}`} onClick={() => ask(`Delete gym "${g.name}"? Past workouts keep their tag.`, () => setS((p) => withSilentRankSnap({ ...p, gyms: (p.gyms || []).filter((x) => x.id !== g.id), currentGym: p.currentGym === g.id ? null : p.currentGym })), "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className="inp flex-1 text-sm" placeholder="Gym name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="New gym name" />
        <button type="button" onClick={add} disabled={!name.trim()} className="btn px-3 text-sm">Add</button>
      </div>
      {gyms.length > 0 && (
        <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm">Tag past workouts</div>
          <div className="flex gap-2 flex-wrap items-center">
            <select className="inp text-sm" value={tagGym} onChange={(e) => setTagGym(e.target.value)} aria-label="Tag as gym">
              <option value="">Choose gym</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="date" className="inp text-sm" value={tagDate} onChange={(e) => setTagDate(e.target.value)} aria-label="Tag workouts before this date" />
          </div>
          <button type="button" disabled={!tagGym || !tagDate} onClick={() => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: tagGym, before: tagDate })))} className="ghost w-full py-2 text-sm font-bold">Tag all workouts before that date</button>
          <button type="button" disabled={!tagGym} onClick={() => setS((p) => commitGymRetag(p, tagWorkouts(p, { gymId: tagGym, untaggedOnly: true })))} className="ghost w-full py-2 text-sm font-bold">Tag all untagged workouts</button>
        </div>
      )}
    </div>
  );
}

function DedupeSettings({ s, setS }) {
  const catalogNames = useMemo(() => EXERCISES.map((e) => e.name), []);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [manA, setManA] = useState("");
  const [manB, setManB] = useState("");
  const names = useMemo(() => [...accountExerciseNames(s)].sort((a, b) => a.localeCompare(b)), [s.workouts, s.custom, s.presets, s.active, s.lastSummary, s.gymSpecific]);
  const load = () => {
    setGroups(duplicateExerciseGroups(s, catalogNames).map((g) => ({ ...g, skip: false })));
    setOpen(true);
  };
  const apply = () => {
    const chosen = groups.filter((g) => !g.skip && g.canonical);
    if (!chosen.length) { setOpen(false); return; }
    ask("Rewrite every stored name in the ticked groups to the canonical name? Custom definitions that get absorbed are removed.", () => {
      setS((p) => {
        const merged = applyExerciseMerge(p, chosen, catalogNames);
        const names = [...new Set(chosen.flatMap((g) => [g.canonical, ...(g.names || [])]).filter(Boolean))];
        const r = applyPrXpRecount(merged, { names, banner: false });
        try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
        return withSilentRankSnap(r.s);
      });
      setOpen(false);
    }, "Apply");
  };
  const addManual = () => {
    if (!manA || !manB || manA === manB) return;
    setGroups((gs) => [...gs, { key: `manual-${manA}-${manB}`, names: [manA, manB], canonical: manB, options: [{ name: manA, sessions: 0 }, { name: manB, sessions: 0 }], skip: false }]);
    setManA(""); setManB("");
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="body text-xs" style={{ color: C.dim }}>Search already hides near-duplicates. This rewrite merges names that already appear in your history, presets, and custom list.</div>
      {!open ? <button type="button" onClick={load} className="ghost w-full py-3 font-bold" style={{ color: C.cyan }}>Clean up duplicate exercises</button> : (
        <>
          {groups.length === 0 && <div className="body text-sm" style={{ color: C.dim }}>No automatic duplicates. You can still merge two names by hand.</div>}
          {groups.map((g, i) => (
            <div key={g.key} className="space-y-1 py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={!g.skip} onChange={() => setGroups((gs) => gs.map((x, j) => j === i ? { ...x, skip: !x.skip } : x))} />
                Merge group
              </label>
              {(g.options || g.names.map((n) => ({ name: n, sessions: 0 }))).map((o) => (
                <label key={o.name} className="flex items-center gap-2 body text-sm pl-1">
                  <input type="radio" name={`canon-${g.key}`} checked={g.canonical === o.name} onChange={() => setGroups((gs) => gs.map((x, j) => j === i ? { ...x, canonical: o.name } : x))} />
                  <span className="flex-1 min-w-0 truncate">{o.name}</span>
                  <span style={{ color: C.mute }}>{o.sessions || 0} sessions{o.catalog ? " · catalog" : ""}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="body text-xs font-bold" style={{ color: C.dim }}>Merge two differently-named exercises</div>
          <div className="grid grid-cols-2 gap-2">
            <select className="inp text-sm" value={manA} onChange={(e) => setManA(e.target.value)} aria-label="Merge from"><option value="">From</option>{names.map((n) => <option key={`a-${n}`} value={n}>{n}</option>)}</select>
            <select className="inp text-sm" value={manB} onChange={(e) => setManB(e.target.value)} aria-label="Merge into"><option value="">Into</option>{names.map((n) => <option key={`b-${n}`} value={n}>{n}</option>)}</select>
          </div>
          <button type="button" disabled={!manA || !manB || manA === manB} onClick={addManual} className="ghost w-full py-2 text-sm font-bold">Add manual pair</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ghost py-2 text-sm font-bold">Cancel</button>
            <button type="button" onClick={apply} className="btn py-2 text-sm">Apply</button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsPage({ s, setS, onBack, party, setParty, openTool, saveDiag }) {
  const st = s.settings || {};
  const setSet = (k, v) => setS((p) => ({ ...p, settings: { ...p.settings, [k]: v, savedAt: Date.now() } }));
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const [testerKey, setTesterKey] = useState("");
  const [testerOk, setTesterOk] = useState(false);
  const [testerErr, setTesterErr] = useState(false);
  const [impMsg, setImpMsg] = useState(null);
  const impRef = useRef(null);
  const [diagOn, setDiagOn] = useState(() => D.on());
  const [diagCopied, setDiagCopied] = useState(false);
  const verTaps = useRef([]);

  const makeSave = async () => {
    const c = await encodeSave(s);
    setCode(c); setCopied(false);
    try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e) { /* user can copy manually */ }
  };
  const shareSave = async () => {
    const c = code || await encodeSave(s);
    setCode(c);
    try { await navigator.share({ title: "Ascend save code", text: c }); } catch (e) { try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e2) { /* manual copy */ } }
  };
  const load = async () => {
    try {
      const { data, saved } = await decodeSave(paste);
      const when = new Date(saved).toLocaleString();
      ask(`Load save from ${when}? This replaces everything currently in the app.`, () => {
        D.withSource("restore", () => setS((p) => normalizeState({ ...DEFAULT, ...data, active: null, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, playerId: data.playerId || p.playerId })));
        setPaste(""); setMsg({ ok: true, text: `Save loaded: level ${levelFromXp(data.xp || 0).lvl}, ${data.workouts.length} workouts.` });
      }, "Load");
    } catch (e) {
      setMsg({ ok: false, text: "That code didn't work. Make sure you copied the whole thing, starting with ASC2-, ASC1-, or ASCEND-." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Settings</h1>
      </div>

      <h2 className="text-lg font-bold">Appearance</h2>
      <div className="panel p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[["dark", Moon, "Dark"], ["light", Sun, "Light"]].map(([id, Icon, l]) => (
            <button key={id} onClick={() => setSet("theme", id)} className="py-3 flex items-center justify-center gap-2 font-bold" style={{ borderRadius: 4, background: (st.theme || "dark") === id ? C.blue : C.soft, color: (st.theme || "dark") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>
              <Icon size={18} />{l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Zesty mode</div>
            <div className="body text-xs" style={{ color: C.dim }}>Rainbow everything, plus disco music and a disco ball. Tap the disco ball button to start or stop the party.</div>
          </div>
          <SettingsToggle label="Zesty mode" on={!!st.zesty} onClick={() => { const on = !st.zesty; setSet("zesty", on); setParty(on); }} />
        </div>
        <div className="flex items-center gap-3">
          <Type size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Easy-read font</div>
            <div className="body text-xs" style={{ color: C.dim }}>Switches everything to Lexend, a rounder font with wider spacing that's easier to read for dyslexia.</div>
          </div>
          <SettingsToggle label="Easy-read font" on={!!st.dysFont} onClick={() => setSet("dysFont", !st.dysFont)} />
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Custom colors</div>
            <div className="body text-xs" style={{ color: C.dim }}>Pick your own accent, secondary, and background. Zesty mode overrides this while it's on.</div>
          </div>
          <SettingsToggle label="Custom colors" on={!!st.custom?.on} onClick={() => setSet("custom", { ...(st.custom || DEFAULT.settings.custom), on: !st.custom?.on })} />
        </div>
        {st.custom?.on && (
          <div className="grid grid-cols-3 gap-2 body text-sm">
            {[["cyan", "Accent"], ["blue", "Secondary"], ["bg", "Background"]].map(([k, l]) => (
              <label key={k} className="flex flex-col items-center gap-1">
                <input type="color" value={st.custom[k] || DEFAULT.settings.custom[k]} onChange={(e) => setSet("custom", { ...st.custom, [k]: e.target.value })} aria-label={`${l} color`} style={{ width: "100%", height: 44, border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent" }} />
                <span style={{ color: C.dim }}>{l}</span>
              </label>
            ))}
            <button onClick={() => setSet("custom", { ...DEFAULT.settings.custom, on: true })} className="col-span-3 ghost py-2 text-sm">Reset colors</button>
            <div className="col-span-3 body text-xs flex items-center gap-1" style={{ color: C.green }}><Check size={14} />Saved to your account and this device{st.savedAt ? ` · ${new Date(st.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</div>
          </div>
        )}
        <div className="flex items-center gap-3">
          {st.voice ? <Volume2 size={22} style={{ color: C.cyan }} /> : <VolumeX size={22} style={{ color: C.mute }} />}
          <div className="flex-1">
            <div className="font-bold">Assistant voice</div>
            <div className="body text-xs" style={{ color: C.dim }}>Sterling reads replies out loud.</div>
          </div>
          <SettingsToggle label="Assistant voice" on={!!st.voice} onClick={() => setSet("voice", !st.voice)} />
        </div>
        <div className="flex items-center gap-3">
          <Volume2 size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Sound effects</div><div className="body text-xs" style={{ color: C.dim }}>Set clicks, PR chime, level-up and rank-up fanfares.</div></div>
          <SettingsToggle label="Sound effects" on={st.sounds !== false} onClick={() => setSet("sounds", st.sounds === false)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimerIcon size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Rest timer</div><div className="body text-xs" style={{ color: C.dim }}>Starts when you check off a set. Tap the pill for a watch-size view.</div></div>
          <div className="flex gap-1">{[0, 60, 90, 120, 180].map((v) => <button key={v} onClick={() => setSet("rest", v)} className="px-2 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: (st.rest ?? 90) === v ? C.blue : C.soft, color: (st.rest ?? 90) === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v ? `${v}s` : "Off"}</button>)}</div>
        </div>
        {st.voice && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(VOICE_STYLES).map(([id, v]) => (
              <button key={id} onClick={() => setSet("voiceStyle", id)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: (st.voiceStyle || "goblin") === id ? C.blue : C.soft, color: (st.voiceStyle || "goblin") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v.name}</button>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold">Workout tools</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openTool("timer")} className="panel p-4 text-left">
          <TimerIcon size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Interval timer</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Beeps for work and rest</div>
        </button>
        <button onClick={() => openTool("cards")} className="panel p-4 text-left">
          <Layers size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Deck of cards</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Draw a card, do the reps</div>
        </button>
      </div>

      <h2 className="text-lg font-bold">Gyms</h2>
      <GymsSettings s={s} setS={setS} />

      <h2 className="text-lg font-bold">Exercises</h2>
      <DedupeSettings s={s} setS={setS} />

      {window.ascendAuth && (
        <div className="panel p-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="font-bold">Account</div><div className="body text-xs truncate" style={{ color: C.dim }}>{window.ascendAuth.email}</div></div>
          <button onClick={() => ask("Sign out on this device? Your progress stays saved in your account.", () => window.ascendAuth.signOut(), "Sign out")} className="ghost px-4 py-2 text-sm font-bold" style={{ color: C.red }}>Sign out</button>
        </div>
      )}

      <div className="panel p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Shield size={22} style={{ color: C.cyan }} />
          <div className="flex-1 min-w-0">
            <div className="font-bold">Tester tools</div>
            <div className="body text-xs" style={{ color: C.dim }}>Password required. Ghost mode hides this profile from other players and unlocks every aura, title, and border for preview. Turning it off puts real unlocks back.</div>
          </div>
        </div>
        {!testerOk ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (testerKey === "Tester") { setTesterOk(true); setTesterErr(false); setTesterKey(""); } else setTesterErr(true); }}>
            <input type="password" className="inp flex-1" placeholder="Tester password" value={testerKey} onChange={(e) => { setTesterKey(e.target.value); setTesterErr(false); }} autoComplete="off" aria-label="Tester password" />
            <button type="submit" className="btn px-4 py-2 text-sm">Unlock</button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold">Ghost / test account</div>
              <div className="body text-xs" style={{ color: C.dim }}>{s.test ? "Hidden from boards, bosses, seasons, and duels. All cosmetics are unlocked." : "Off. Your real unlocks apply."}</div>
            </div>
            <SettingsToggle label="Ghost / test account" on={!!s.test} onClick={() => setS((p) => (p.test ? stripGhostCosmetics(p) : { ...p, test: true }))} />
          </div>
        )}
        {testerErr && <div className="body text-xs" style={{ color: C.red }}>Wrong password.</div>}
      </div>

      <button type="button" onClick={() => {
        const t = Date.now();
        verTaps.current = verTaps.current.filter((x) => t - x < 2500);
        verTaps.current.push(t);
        if (verTaps.current.length >= 5) {
          verTaps.current = [];
          setDiagOn(D.toggle(s.playerId));
          setDiagCopied(false);
        }
      }} className="body text-xs text-center w-full" style={{ color: C.mute, background: "transparent", border: "none", padding: 0 }}>Ascend version {APP_VERSION}{runningBundle() ? ` · build ${runningBundle().replace(/^index-|\.js$/g, "")}` : ""}</button>
      <div className="body text-xs text-center" style={{ color: C.mute }}>State {saveDiag?.kb ?? 0} KB{saveDiag?.ms != null ? ` · last save ${saveDiag.ms} ms` : ""}</div>
      {diagOn && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(D.formatDump({ version: APP_VERSION, sw: "ascend-v7c" })); setDiagCopied(true); } catch (e) { /* clipboard blocked */ } }} className="ghost py-3 text-sm font-bold">{diagCopied ? "Copied" : "Copy diagnostic log"}</button>
          <button type="button" onClick={() => { D.clear(); setDiagCopied(false); }} className="ghost py-3 text-sm font-bold">Clear</button>
        </div>
      )}

      <h2 className="text-lg font-bold">Contact support</h2>
      <SupportForm s={s} />

      <h2 className="text-lg font-bold">Achievements</h2>
      <div className="panel p-4 space-y-2">
        <div className="body text-sm" style={{ color: C.dim }}>Achievements from the old, easier rank scale were already removed. If anything else looks wrong, recheck: any badge you no longer qualify for is removed and its XP taken back.</div>
        <button onClick={() => ask("Recheck all achievements against your current data?", () => { const before = Object.keys(s.ach || {}).length; const next = reconcileAchievements(s); D.withSource("achievements", () => setS(() => next)); setMsg({ ok: true, text: `Rechecked. ${before - Object.keys(next.ach).length} removed.` }); }, "Recheck")} className="ghost w-full py-3 font-bold" style={{ color: C.cyan }}>Recheck achievements</button>
      </div>

      <h2 className="text-lg font-bold">Export / import</h2>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => exportWorkouts(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Workouts CSV</button>
        <button type="button" onClick={() => exportFood(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Food log CSV</button>
      </div>
      <div className="panel p-4 space-y-2">
        <div className="font-bold">Import Strong / Hevy / Ascend</div>
        <div className="body text-xs" style={{ color: C.dim }}>Web apps can't write to Apple Health. Export a CSV from Strong or Hevy (or Ascend's own export) and load it here. Apple Health XML isn't set-level, so it won't import.</div>
        <input ref={impRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          setImpMsg(null);
          try {
            const text = await f.text();
            if (/^\s*</.test(text) || /\.xml$/i.test(f.name)) { setImpMsg({ ok: false, text: "That's an XML export. Use Strong or Hevy CSV instead." }); return; }
            const res = importWorkoutsFromCsv(s, text);
            if (!res.ok) { setImpMsg({ ok: false, text: res.err }); return; }
            D.withSource("import", () => setS(() => res.s));
            setImpMsg({ ok: true, text: `Imported ${res.n} session${res.n === 1 ? "" : "s"}${res.skipped ? ` · skipped ${res.skipped} duplicate${res.skipped === 1 ? "" : "s"}` : ""}${res.xp ? ` · ${res.xp > 0 ? "+" : ""}${Math.round(res.xp)} XP` : ""}.` });
          } catch (err) { setImpMsg({ ok: false, text: "Couldn't read that file." }); }
        }} />
        <button type="button" onClick={() => impRef.current?.click()} className="ghost w-full py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.green }}><Upload size={16} />Import workouts CSV</button>
        {impMsg && <div className="body text-sm" style={{ color: impMsg.ok ? C.green : C.red }}>{impMsg.text}</div>}
      </div>

      <h2 className="text-lg font-bold">Save files</h2>
      <div className="panel p-4 space-y-3">
        <div className="body text-sm" style={{ color: C.dim }}>Before switching to a new version of the app, make a save code and keep it somewhere like your Notes app. Then paste it into the new version to get all your progress back. Only load your own save, since it includes your leaderboard identity.</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={makeSave} className="btn py-3 flex items-center justify-center gap-2"><Save size={18} />Copy save code</button>
          <button onClick={shareSave} className="ghost py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Share2 size={18} />Share…</button>
        </div>
        <div className="body text-xs" style={{ color: C.mute }}>Codes are compressed now, so they're a fraction of the old length. "Share…" opens your phone's share sheet so you can drop it straight into Notes or a text to yourself. Old ASCEND- codes still load.</div>
        {code && (
          <>
            <textarea readOnly value={code} onFocus={(e) => e.target.select()} className="inp body text-xs" rows={3} aria-label="Save code" style={{ wordBreak: "break-all" }} />
            <div className="body text-xs" style={{ color: C.dim }}>{code.length.toLocaleString()} characters</div>
            <div className="body text-xs flex items-center gap-2" style={{ color: copied ? C.green : C.dim }}>
              {copied ? <><Check size={14} />Copied. Paste it somewhere safe.</> : <><Copy size={14} />Tap the box, select all, and copy it.</>}
            </div>
          </>
        )}
        <div className="neonline" />
        <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setMsg(null); }} className="inp body text-xs" rows={3} placeholder="Paste a save code here" aria-label="Paste save code" />
        <button onClick={load} disabled={!paste.trim()} className="ghost w-full py-3 font-bold flex items-center justify-center gap-2" style={{ color: paste.trim() ? C.cyan : C.mute }}><Upload size={18} />Load save</button>
        {msg && <div className="body text-sm" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
        <button type="button" onClick={() => ask("Restore the pre-update backup? This replaces everything currently in the app with the snapshot saved before this update.", async () => {
          try {
            const b = await window.storage.get(BACKUP_KEY, false);
            if (!b?.value) { setMsg({ ok: false, text: "No backup found on this account." }); return; }
            const blob = typeof b.value === "string" ? JSON.parse(b.value) : b.value;
            const data = blob.state && typeof blob.state === "object" ? blob.state : blob;
            D.withSource("restore", () => setS((p) => normalizeState({ ...DEFAULT, ...data, active: null, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, playerId: data.playerId || p.playerId })));
            setMsg({ ok: true, text: "Pre-update backup restored." });
          } catch (e) { setMsg({ ok: false, text: "Couldn't restore that backup." }); }
        }, "Restore")} className="ghost w-full py-3 font-bold" style={{ color: C.orange }}>Restore pre-update backup</button>
      </div>
    </div>
  );
}

/* ---------- Voice assistant ---------- */
function buildContext(s) {
  const p = s.profile, d = today(), t = targets(p);
  const o = overallInfo(s);
  const lifts = rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 12)
    .map((r) => `${r.e.name}: ${r.label} (best ${Math.round(r.best)}${r.e.type === "bodyweight" ? " reps" : " lb est. 1RM"}${r.next ? `, next ${r.nextLabel} at ${r.next}` : ""})`).join("; ");
  const quests = (s.days?.[d]?.list || []).map((q) => `${q.title} ${q.progress}/${q.target} ${q.unit}${q.claimed ? " (cleared)" : ""}`).join("; ");
  const tot = mealTotals(s.meals[d]);
  const recent = s.workouts.filter(isWorkout).slice(-5).map((w) => `${w.date}${w.title ? ` (${w.title})` : ""}: ${w.exercises.map((e) => `${e.name} ${e.sets.map((x) => (x.w ? `${x.w}x${x.r}` : x.r)).join(",")}`).join(" | ")}`).join("\n");
  return `Name: ${p.name || "unknown"}. Bodyweight ${p.weight} lb, height ${p.height} in, age ${p.age}. ${sexLine(p)} Goal: ${GOALS.find((g) => g.id === p.goal)?.label}.
Level ${levelFromXp(s.xp).lvl} (${s.xp} XP), overall rank ${o.label}, streak ${streakOf(s)} days, leaderboard points ${pointsOf(s)}.
Lift ranks: ${lifts || "none logged yet"}.
Today (${d}) quests: ${quests || "none yet"}.
Today's food: ${Math.round(tot.cal)}/${t.cal} cal, protein ${Math.round(tot.p)}/${t.protein}g, carbs ${Math.round(tot.c)}/${t.carbs}g, fat ${Math.round(tot.f)}/${t.fat}g.
Recent workouts:\n${recent || "none yet"}
Today's check-in: ${s.checkins?.[d]?.sleep ? `${s.checkins[d].sleep}h sleep` : "sleep not logged"}, mood ${s.checkins?.[d]?.mood || "not logged"}.`;
}

const YT_RE = /\[\[yt:([^\]]+)\]\]/g;
const stripYt = (t) => t.replace(YT_RE, "").replace(/\s{2,}/g, " ").trim();

const STEP_COACH = `The user just asked for help setting up automatic step syncing. Walk them through it like a friendly personal trainer, not tech support: warm, encouraging, plain language, one step at a time, and ask them to say "next" when each step is done. Do not teach them how to build Shortcut actions by hand. The Shortcut is already built. Important background: iPhones lock Health data while the phone is locked, so a nightly timed automation usually sends nothing. That's why the trigger is "when an app is opened", which only runs while the phone is unlocked. The setup: 1) In Ascend, open the Steps card, tap "Sync steps automatically", then "Create my sync code" and copy the code. 2) Tap the iCloud Shortcut link on that same card (${STEP_SHORTCUT_URL}) to install the pre-configured Ascend Steps Shortcut automatically. 3) When the Shortcut asks, paste the sync code. 4) In the Shortcuts app, Automation tab, tap +, choose App, pick 2 or 3 apps they open every day including one right before bed (Messages, Instagram, TikTok or Snapchat), keep "Is Opened" checked, Run Immediately, turn off Notify When Run, then have that automation run the Ascend Steps Shortcut they just installed. 5) Open one of those apps, then come back to Ascend: the Steps card shows "Last sync". If it shows an error, the message says exactly what to fix. Running it many times a day is fine; Ascend keeps the highest count for each day. Troubleshoot patiently, and mention they can always type steps in by hand.`;
function Assistant({ s, setS, onBack }) {
  const chat = s.chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [note, setNote] = useState("");
  const recRef = useRef(null);
  const endRef = useRef(null);
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const voiceOn = s.settings?.voice !== false;

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  useEffect(() => {
    window.speechSynthesis?.getVoices?.();
    return () => { try { window.speechSynthesis?.cancel(); recRef.current?.abort?.(); } catch (e) { /* ignore */ } };
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const style = VOICE_STYLES[s.settings?.voiceStyle] || VOICE_STYLES.goblin;
      const v = pickBritishVoice();
      const parts = stripYt(text).split(/(?<=[.!?])\s+/).filter(Boolean);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        if (v) u.voice = v;
        const [pitch, rate] = style.seq[i % style.seq.length];
        u.lang = "en-GB"; u.pitch = pitch; u.rate = rate;
        if (i === 0) u.onstart = () => setSpeaking(true);
        if (i === parts.length - 1) u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      });
    } catch (e) { setSpeaking(false); }
  };

  const send = async (textArg, coachMode = false) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    // Unlock speech on iPhone while we still have the tap
    if (voiceOn && window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
    const next = [...chat, { role: "user", content: text }].slice(-8);
    setS((p) => ({ ...p, chat: next }));
    setInput(""); setBusy(true); setNote("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          system: [
            { type: "text", text: `${coachMode ? `${STEP_COACH}\n\n` : ""}You are Sterling, the built-in AI coach inside Ascend, a leveling-style gym tracking app. You are a deeply unhinged British butler: posh vocabulary, wildly over-the-top hype, dramatic exclamations like "GOOD HEAVENS" and "by the barbell", occasional absurd similes, and you treat every set like a matter of national importance. Be funny, but the training and nutrition advice underneath must stay accurate and practical. Your replies are read aloud in a silly voice, so keep them to 1 to 3 short sentences unless asked for detail, and never use markdown, bullet points, or emojis. Whenever the user asks how to do an exercise, its form, or technique, give one or two key cues and then add a tag at the very end in exactly this format: [[yt:Exercise Name]] (the app turns it into a YouTube how-to button, so never mention the tag or the word YouTube yourself). Give practical, accurate training and nutrition guidance using the user's real data below. If they mention pain, injury, or a medical issue, advise seeing a qualified professional. App facts: ranks go E, D, C, B, A, S with divisions III, II, I; lift ranks use estimated one-rep max scaled to bodyweight and height; overall rank weights legs, back and chest most; daily quests link to logged exercises; hitting calories within 10% plus the protein target earns ${FUEL_XP} XP.`, cache_control: { type: "ephemeral" } },
            { type: "text", text: `User data:\n${buildContext(s)}` },
          ],
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).map((i) => i.text || "").join("").trim() || "Terribly sorry, I seem to have lost my train of thought. Do ask again.";
      setS((p) => ({ ...p, chat: [...(p.chat || []), { role: "assistant", content: reply }].slice(-8) }));
      if (voiceOn) speak(reply);
    } catch (e) {
      setNote("Sterling couldn't connect. Check your connection and try again.");
    }
    setBusy(false);
  };

  const toggleMic = () => {
    if (listening) { try { recRef.current?.stop(); } catch (e) { /* ignore */ } return; }
    if (!SR) { setNote("Voice input isn't supported here, so type your question instead."); return; }
    try {
      window.speechSynthesis?.cancel();
      const rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
      let finalText = "";
      rec.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) finalText = txt; }
        setInput(txt);
      };
      rec.onerror = (e) => { setListening(false); setNote(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The mic is blocked in this app, so type your question instead." : "Didn't catch that. Try again or type it."); };
      rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
      recRef.current = rec;
      rec.start(); setListening(true); setNote("");
    } catch (e) {
      setListening(false); setNote("Voice input isn't available here, so type your question instead.");
    }
  };

  const suggestions = ["What should I train today?", "How close am I to my next rank?", "What should I eat to hit my protein?"];
  // Opened from the Steps card: Sterling starts the setup himself
  useEffect(() => {
    const on = () => { if (!busy) send("Walk me through setting up automatic step tracking on my iPhone, one step at a time.", true); };
    window.addEventListener("ascend-sterling-steps", on);
    return () => window.removeEventListener("ascend-sterling-steps", on);
  }, [busy, chat.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={() => { window.speechSynthesis?.cancel(); onBack(); }} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold glowtext">Sterling</h1>
          <div className="body text-xs" style={{ color: C.dim }}>Your AI coach</div>
        </div>
        {speaking && (
          <button aria-label="Stop speaking" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} className="flex items-end gap-0.5 h-6 px-2">
            {[0, 1, 2, 3].map((i) => <span key={i} className="w-1 h-full barfill" style={{ background: C.cyan, borderRadius: 2, transformOrigin: "bottom", animation: `eq .8s ${i * 0.12}s ease-in-out infinite` }} />)}
          </button>
        )}
        <button aria-label={voiceOn ? "Mute voice" : "Unmute voice"} onClick={() => { if (voiceOn) window.speechSynthesis?.cancel(); setS((p) => ({ ...p, settings: { ...p.settings, voice: !voiceOn } })); }} className="ghost p-2" style={{ color: voiceOn ? C.cyan : C.mute }}>
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {chat.length === 0 && (
        <div className="panel p-4 space-y-3">
          <div className="body text-sm" style={{ color: C.sub }}>Good day. I can see your ranks, quests, workouts and today's food, so ask me anything about your training.</div>
          <div className="flex flex-col gap-2">
            {suggestions.map((q) => <button key={q} onClick={() => send(q)} className="ghost text-left p-3 body text-sm" style={{ color: C.cyan }}>{q}</button>)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[80%] px-3 py-2 body text-sm" style={{ background: C.blue, color: "#fff", borderRadius: "10px 10px 2px 10px" }}>{m.content}</div>
            ) : (
              <div className="panel max-w-[85%] px-3 py-2">
                <div className="body text-sm" style={{ color: C.text }}>{stripYt(m.content)}</div>
                {[...m.content.matchAll(YT_RE)].map((mm, k) => <a key={k} href={ytUrl(mm[1].trim())} target="_blank" rel="noreferrer" className="btn mt-2 px-3 py-1.5 text-xs inline-flex items-center gap-1 mr-2"><Youtube size={14} />How to: {mm[1].trim()}</a>)}
                <button aria-label="Play reply" onClick={() => speak(m.content)} className="mt-1 flex items-center gap-1 text-xs" style={{ color: C.dim }}><Volume2 size={13} />Play</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Sterling is thinking…</div>}
        <div ref={endRef} />
      </div>

      {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}

      <div className="panel p-2 flex items-center gap-2">
        <button aria-label={listening ? "Stop listening" : "Speak your question"} onClick={toggleMic} className="shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 999, background: listening ? C.red : C.soft, color: listening ? "#fff" : C.cyan, border: `1px solid ${C.border}`, boxShadow: listening ? "0 0 18px rgba(255,77,109,.6)" : "none" }}>
          <Mic size={20} />
        </button>
        <input className="inp" placeholder={listening ? "Listening…" : "Ask Sterling"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button aria-label="Send" onClick={() => send()} disabled={!input.trim() || busy} className="btn shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, opacity: !input.trim() || busy ? 0.5 : 1 }}><Send size={18} /></button>
      </div>
      {chat.length > 0 && <button onClick={() => { window.speechSynthesis?.cancel(); setS((p) => ({ ...p, chat: [] })); }} className="body text-xs underline" style={{ color: C.mute }}>Clear conversation</button>}
    </div>
  );
}

/* ---------- Zesty disco: original synthesized funk loop ---------- */
const Groove = {
  ctx: null, master: null, timer: null, step: 0, nextTime: 0, noise: null,
  bpm: 114,
  start() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
        this.master.connect(comp); comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume();
      if (this.timer) return;
      this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 25);
    } catch (e) { /* audio not available */ }
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try { this.ctx?.suspend(); } catch (e) { /* ignore */ }
  },
  schedule() {
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      // light swing on the off 16ths
      const t = this.nextTime + (this.step % 2 ? sixteenth * 0.12 : 0);
      this.playStep(this.step, t, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  },
  playStep(st, t, s16) {
    const b = st % 16, bar = Math.floor(st / 16);
    if (b % 4 === 0) this.kick(t);
    if (b === 4 || b === 12) this.clap(t);
    if (b % 4 === 2) this.hat(t, 0.16, 0.09);
    else if (b % 2 === 1) this.hat(t, 0.05, 0.03);
    // bass: syncopated octave line over Em7 / Am7 / Em7 / B7
    const roots = [28, 33, 28, 35]; // E1, A1, E1, B1
    const pat = { 0: 0, 3: 12, 6: 0, 7: 10, 10: 12, 11: 7, 14: 10 };
    if (pat[b] !== undefined) this.bass(t, roots[bar] + 12 + pat[b], s16 * (b === 0 ? 2.5 : 1.4));
    // chord stabs on the offbeats
    const chords = [[52, 55, 59, 62, 66], [57, 60, 64, 67, 71], [52, 55, 59, 62, 66], [59, 63, 66, 69]];
    if (b === 2 || b === 7 || b === 10) this.stab(t, chords[bar], s16 * 1.2);
    // shimmer arpeggio every other bar
    if (bar % 2 === 1 && b % 2 === 0) this.bell(t, chords[bar][(b / 2) % chords[bar].length] + 12);
  },
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  env(g, t, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); },
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.32); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
  },
  noiseHit(t, type, freq, peak, dec) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); this.env(g, t, peak, dec);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t, Math.random() * 0.5); n.stop(t + dec + 0.02);
  },
  clap(t) { [0, 0.012, 0.024].forEach((d, i) => this.noiseHit(t + d, "bandpass", 1400, i === 2 ? 0.5 : 0.25, i === 2 ? 0.16 : 0.03)); },
  hat(t, peak, dec) { this.noiseHit(t, "highpass", 7500, peak, dec); },
  bass(t, midi, dur) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = this.hz(midi);
    f.type = "lowpass"; f.Q.value = 9; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  stab(t, notes, dur) {
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = "lowpass"; f.Q.value = 6; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + dur);
    this.env(g, t, 0.07, dur); f.connect(g); g.connect(this.master);
    notes.forEach((m, i) => {
      const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = this.hz(m); o.detune.value = i % 2 ? 6 : -6;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    });
  },
  bell(t, midi) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "triangle"; o.frequency.value = this.hz(midi);
    this.env(g, t, 0.05, 0.25); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.28);
  },
};

function DiscoIcon({ size = 24, spinning }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ animation: spinning ? "discospin 2s linear infinite" : "none" }}>
      <defs><radialGradient id="dball" cx="35%" cy="30%"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#b9c6d6" /><stop offset="1" stopColor="#5d6b7d" /></radialGradient></defs>
      <circle cx="12" cy="12" r="10" fill="url(#dball)" stroke="#fff" strokeWidth=".6" />
      {[-6, -2, 2, 6].map((y) => <line key={y} x1="2.5" x2="21.5" y1={12 + y} y2={12 + y} stroke="#3a4656" strokeWidth=".5" />)}
      {[-6, -2, 2, 6].map((x) => <ellipse key={x} cx="12" cy="12" rx={Math.abs(x) + 0.01} ry="10" fill="none" stroke="#3a4656" strokeWidth=".5" />)}
    </svg>
  );
}

function DiscoParty() {
  const spots = ["#ff3cac", "#3cc8ff", "#f7ff3c", "#3cff9e", "#9b5cff", "#ffb43c", "#ff3cac", "#3cc8ff"];
  const tiles = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = 6 + c * 12, y = 6 + r * 12;
    if ((x - 54) ** 2 + (y - 54) ** 2 < 50 * 50) tiles.push([x, y, (r * 7 + c * 3) % 5]);
  }
  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes discodrop{0%{transform:translate(-50%,-260px)}70%{transform:translate(-50%,12px)}100%{transform:translate(-50%,0)}}
        @keyframes discospin{to{transform:rotate(360deg)}}
        @keyframes sparkle{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes sweep{0%{transform:translate(-10vw,10vh) scale(1)}25%{transform:translate(70vw,40vh) scale(1.4)}50%{transform:translate(30vw,85vh) scale(.9)}75%{transform:translate(85vw,15vh) scale(1.2)}100%{transform:translate(-10vw,10vh) scale(1)}}
        @keyframes beams{to{transform:translateX(-50%) rotate(360deg)}}
        .dspot{position:absolute;top:0;left:0;width:120px;height:120px;border-radius:999px;mix-blend-mode:screen;filter:blur(18px);opacity:.55}
      `}</style>
      <div className="absolute left-1/2 top-0" style={{ width: 600, height: 600, marginTop: -180, transform: "translateX(-50%)", animation: "beams 9s linear infinite",
        background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 4deg, transparent 4deg 22deg)", maskImage: "radial-gradient(circle, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, black 20%, transparent 70%)" }} />
      {spots.map((c, i) => (
        <div key={i} className="dspot" style={{ background: c, animation: `sweep ${7 + i * 1.3}s ${-i * 1.7}s ease-in-out infinite` }} />
      ))}
      <div className="absolute left-1/2 top-0 flex flex-col items-center" style={{ animation: "discodrop .9s cubic-bezier(.2,.8,.3,1.2) both" }}>
        <div style={{ width: 2, height: 46, background: "linear-gradient(#999,#ddd)" }} />
        <svg width="108" height="108" viewBox="0 0 108 108" style={{ animation: "discospin 6s linear infinite", filter: "drop-shadow(0 0 22px rgba(255,255,255,.7)) drop-shadow(0 0 40px rgba(255,60,172,.5))" }}>
          <defs>
            <radialGradient id="ballbase" cx="38%" cy="32%"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#aab6c5" /><stop offset="1" stopColor="#3b4655" /></radialGradient>
            <clipPath id="ballclip"><circle cx="54" cy="54" r="50" /></clipPath>
          </defs>
          <circle cx="54" cy="54" r="50" fill="url(#ballbase)" />
          <g clipPath="url(#ballclip)">
            {tiles.map(([x, y, k], i) => (
              <rect key={i} x={x - 5.5} y={y - 5.5} width="11" height="11" rx="1" fill={spots[k]} opacity=".35" style={{ animation: `sparkle ${0.6 + k * 0.25}s ${i * 0.05}s ease-in-out infinite`, mixBlendMode: "screen" }} />
            ))}
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" x2="108" y1={i * 12} y2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
            {[...Array(9)].map((_, i) => <line key={`v${i}`} y1="0" y2="108" x1={i * 12} x2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
          </g>
          <circle cx="38" cy="34" r="9" fill="#fff" opacity=".8" style={{ animation: "sparkle 1.1s ease-in-out infinite" }} />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Beeps ---------- */

/* ---------- Interval timer ---------- */
function IntervalTimer({ visible, onBack, onOpen }) {
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [run, setRun] = useState(null); // { phase, left, round, paused }
  const runRef = useRef(null); runRef.current = run;
  const cfgRef = useRef({}); cfgRef.current = { work, rest, rounds };
  const wakeRef = useRef(null);

  useEffect(() => {
    if (!run || run.paused || run.phase === "done") return;
    const id = setInterval(() => {
      const r = runRef.current, cfg = cfgRef.current;
      if (!r || r.paused) return;
      let { phase, left, round } = r;
      left -= 1;
      if (left > 0) {
        if (left <= 3) Beeper.tick();
        setRun({ ...r, left });
        return;
      }
      if (phase === "ready" || (phase === "rest")) {
        if (phase === "rest") round += 1;
        Beeper.work(); setRun({ phase: "work", left: cfg.work, round, paused: false });
      } else if (phase === "work") {
        if (cfg.rounds > 0 && round >= cfg.rounds) { Beeper.done(); setRun({ phase: "done", left: 0, round, paused: false }); releaseWake(); }
        else if (cfg.rest > 0) { Beeper.rest(); setRun({ phase: "rest", left: cfg.rest, round, paused: false }); }
        else { Beeper.work(); setRun({ phase: "work", left: cfg.work, round: round + 1, paused: false }); }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [run?.paused, run?.phase, !!run]);

  const releaseWake = () => { try { wakeRef.current?.release(); } catch (e) { /* ignore */ } wakeRef.current = null; };
  useEffect(() => { if (run && run.phase !== "done") document.title = `${run.paused ? "❚❚" : "⏱"} ${run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} ${fmtClock(run.left)} · Ascend`; else document.title = "Ascend"; }, [run?.left, run?.phase, run?.paused]);
  useEffect(() => () => releaseWake(), []);

  const start = async () => {
    Beeper.unlock(); Beeper.tick();
    setRun({ phase: "ready", left: 3, round: 1, paused: false });
    try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* not supported */ }
  };
  const stop = () => { setRun(null); releaseWake(); };

  const phaseColor = !run ? C.cyan : run.phase === "work" ? C.green : run.phase === "rest" ? C.orange : run.phase === "done" ? C.gold : C.cyan;
  const phaseTotal = !run ? work : run.phase === "work" ? work : run.phase === "rest" ? rest : 3;
  const pct = run && run.phase !== "done" ? run.left / phaseTotal : 1;
  const R = 110, CIRC = 2 * Math.PI * R;
  const totalTime = rounds > 0 ? rounds * work + (rounds - 1) * rest : null;

  // Floating mini timer on other pages while it's running
  if (!visible) {
    if (!run || run.phase === "done") return null;
    return (
      <button onClick={onOpen} aria-label="Open interval timer" className="fixed z-40 flex items-center gap-2 px-3 py-2 font-bold tabular-nums" style={{ left: 16, bottom: "calc(env(safe-area-inset-bottom) + 90px)", borderRadius: 999, background: C.sheet, color: phaseColor, border: `1px solid ${phaseColor}`, boxShadow: `0 0 16px ${phaseColor}66` }}>
        <TimerIcon size={16} />{run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} {fmtClock(run.left)}{run.paused ? " ❚❚" : ""}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Interval timer</h1>
      </div>

      <div className="panel p-5 flex flex-col items-center">
        <svg width="250" height="250" viewBox="0 0 250 250" role="img" aria-label={run ? `${run.phase} ${run.left} seconds` : "Timer ready"}>
          <circle cx="125" cy="125" r={R} fill="none" stroke={C.track} strokeWidth="14" />
          <circle cx="125" cy="125" r={R} fill="none" stroke={phaseColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${CIRC * pct} ${CIRC}`} transform="rotate(-90 125 125)" style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 8px ${phaseColor})` }} />
          <text x="125" y="108" textAnchor="middle" fill={phaseColor} fontSize="20" fontWeight="700" style={{ letterSpacing: 3 }}>{!run ? "READY" : run.phase === "done" ? "DONE" : run.phase.toUpperCase()}</text>
          <text x="125" y="160" textAnchor="middle" fill={C.text} fontSize="58" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{run ? (run.phase === "done" ? "✓" : fmtClock(run.left)) : fmtClock(work)}</text>
          <text x="125" y="190" textAnchor="middle" fill={C.dim} fontSize="14">{run ? `Round ${run.round}${rounds > 0 ? ` of ${rounds}` : ""}` : rounds > 0 ? `${rounds} rounds · ${fmtClock(totalTime)} total` : "Endless rounds"}</text>
        </svg>

        <div className="flex gap-3 mt-3 w-full">
          {!run || run.phase === "done" ? (
            <button onClick={start} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2"><Play size={20} />Start</button>
          ) : (
            <>
              <button onClick={() => { Beeper.unlock(); setRun({ ...run, paused: !run.paused }); }} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2">{run.paused ? <><Play size={20} />Resume</> : <><Pause size={20} />Pause</>}</button>
              <button onClick={stop} aria-label="Reset timer" className="ghost px-5 flex items-center justify-center"><RotateCcw size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div className="body text-xs" style={{ color: C.dim }}>Quick picks</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["Tabata", 20, 10, 8], ["30 / 15", 30, 15, 10], ["40 / 20", 40, 20, 8], ["Every 10s", 10, 0, 0], ["EMOM", 60, 0, 10]].map(([n, w, r, rd]) => (
          <button key={n} disabled={!!run} onClick={() => { setWork(w); setRest(r); setRounds(rd); }} className="ghost px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0" style={{ color: work === w && rest === r && rounds === rd ? C.cyan : C.text, borderColor: work === w && rest === r && rounds === rd ? C.cyan : C.border }}>{n}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <IntervalStepper label="Work" value={work} set={setWork} step={5} min={5} max={600} fmt={fmtClock} disabled={!!run} />
        <IntervalStepper label="Rest" value={rest} set={setRest} step={5} min={0} max={300} fmt={(v) => (v ? fmtClock(v) : "None")} disabled={!!run} />
        <IntervalStepper label="Rounds" value={rounds} set={setRounds} step={1} min={0} max={99} fmt={(v) => (v ? v : "∞")} disabled={!!run} />
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>It beeps when each work or rest period starts, with a countdown tick for the last 3 seconds. Set rest to None to beep every interval nonstop. The timer keeps running if you switch tabs. Turn off silent mode to hear the beeps.</div>
    </div>
  );
}

/* ---------- Deck of cards ---------- */
const SUITS = [
  { id: "S", sym: "♠", name: "Spades", red: false },
  { id: "H", sym: "♥", name: "Hearts", red: true },
  { id: "D", sym: "♦", name: "Diamonds", red: true },
  { id: "C", sym: "♣", name: "Clubs", red: false },
];
const FACES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function freshDeck(jokers) {
  const d = [];
  SUITS.forEach((su) => FACES.forEach((f, i) => d.push({ suit: su.id, face: f, rank: i + 1 })));
  if (jokers) { d.push({ suit: "J", face: "JOKER", rank: 0 }); d.push({ suit: "J", face: "JOKER", rank: 0 }); }
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function CardDeck({ visible, s, setS, gainXp, onBack }) {
  const [cfg, setCfg] = useState({ S: "Burpee", H: "Push-up", D: "Air Squat", C: "Sit-up", faces: "ten", aces: 11, jokers: false, jokerReps: 20, jokerEx: "Burpee" });
  const [deck, setDeck] = useState(() => freshDeck(false));
  const [current, setCurrent] = useState(null); // { card, status: "open" }
  const [log, setLog] = useState([]); // completed or skipped cards
  const [flip, setFlip] = useState(0);
  const [sessionId, setSessionId] = useState(uid);
  const all = allExercises(s).filter((e) => e.type !== "timed");

  const repsFor = (card) => {
    if (card.suit === "J") return cfg.jokerReps;
    if (card.rank === 1) return cfg.aces;
    if (card.rank > 10) return cfg.faces === "ten" ? 10 : card.rank;
    return card.rank;
  };
  const exFor = (card) => (card.suit === "J" ? cfg.jokerEx : cfg[card.suit]);
  const xpFor = (card) => workoutXp(s, [{ name: exFor(card), sets: [{ w: "", r: repsFor(card) }] }], null).xp;

  const draw = () => {
    if (!deck.length || current) return;
    const [card, ...rest] = deck;
    setDeck(rest); setCurrent(card); setFlip((f) => f + 1);
  };

  const complete = () => {
    if (!current) return;
    const name = exFor(current), reps = repsFor(current);
    const { xp } = workoutXp(s, [{ name, sets: [{ w: "", r: reps }] }], computeBests(s), { skipPr: true });
    const lastCard = deck.length === 0;
    const bonus = lastCard ? 150 : 0;
    setS((p) => addDeckSet(p, sessionId, name, reps, xp + bonus));
    gainXp(xp + bonus, lastCard ? "Card deck cleared" : `Card deck · ${reps} ${name}`, `deck_${sessionId}_${log.length}`);
    setLog((l) => [...l, { card: current, name, reps, xp: xp + bonus, done: true }]);
    setCurrent(null);
  };

  const skip = () => {
    if (!current) return;
    setLog((l) => [...l, { card: current, name: exFor(current), reps: repsFor(current), xp: 0, done: false }]);
    setCurrent(null);
  };

  const reshuffle = () => { setDeck(freshDeck(cfg.jokers)); setCurrent(null); setLog([]); setSessionId(uid()); };

  if (!visible) return null;

  const doneCards = log.filter((x) => x.done);
  const totals = {};
  doneCards.forEach((x) => { totals[x.name] = (totals[x.name] || 0) + x.reps; });
  const sessionXp = doneCards.reduce((a, x) => a + x.xp, 0);
  const card = current || (log.length ? log[log.length - 1].card : null);
  const suit = card && SUITS.find((x) => x.id === card.suit);
  const cardColor = card ? (card.suit === "J" ? "#9b5cff" : suit.red ? "#E0284A" : "#0B1220") : C.text;
  const finished = !deck.length && !current;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">Deck of cards</h1>
        <span className="body text-sm" style={{ color: C.dim }}>{deck.length + (current ? 1 : 0)} left</span>
      </div>

      <style>{`@keyframes cardin{0%{transform:translateY(-30px) rotateY(90deg) scale(.9);opacity:0}100%{transform:none;opacity:1}}`}</style>
      <div className="flex justify-center" style={{ perspective: 800 }}>
        {current ? (
          <div key={flip} className="relative flex flex-col justify-between p-3" style={{ width: 210, height: 294, borderRadius: 14, background: "#FDFDFB", color: cardColor, boxShadow: `0 0 28px ${C.glow}, 0 10px 30px rgba(0,0,0,.4)`, animation: "cardin .35s ease-out", fontFamily: "Georgia, serif" }}>
            <div className="text-left leading-none"><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
            <div className="absolute inset-0 flex items-center justify-center"><div style={{ fontSize: card.suit === "J" ? 64 : 88, lineHeight: 1 }}>{card.suit === "J" ? "🃏" : suit.sym}</div></div>
            <div className="text-right leading-none" style={{ transform: "rotate(180deg)" }}><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
          </div>
        ) : (
          <button onClick={finished ? reshuffle : draw} aria-label={finished ? "Start a new deck" : "Draw a card"} className="relative flex items-center justify-center" style={{ width: 210, height: 294, borderRadius: 14, background: `repeating-linear-gradient(45deg, ${C.blue} 0 10px, ${C.accentBg} 10px 20px)`, border: `4px solid ${C.soft}`, boxShadow: `0 0 28px ${C.glow}` }}>
            <span className="px-4 py-2 font-extrabold text-lg" style={{ background: C.sheet, color: C.cyan, borderRadius: 4 }}>{finished ? "New deck" : "Tap to draw"}</span>
          </button>
        )}
      </div>

      {current && (
        <div className="panel p-4 text-center">
          <div className="text-4xl font-extrabold glowtext">{repsFor(current)} reps</div>
          <div className="text-xl font-bold mt-1" style={{ color: C.cyan }}>{exFor(current)}</div>
          <div className="body text-sm mt-1 font-bold" style={{ color: C.gold }}>Worth +{xpFor(current)} XP{deck.length === 0 ? " · +150 for the last card" : ""}</div>
        </div>
      )}

      {current ? (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={complete} className="btn col-span-2 py-4 text-lg flex items-center justify-center gap-2"><Check size={20} />Done</button>
          <button onClick={skip} className="ghost py-4 font-bold flex items-center justify-center gap-1"><SkipForward size={18} />Skip</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={finished ? reshuffle : draw} className="btn py-4 text-lg">{finished ? "New deck" : log.length ? "Next card" : "Draw card"}</button>
          <button onClick={() => (log.length ? ask("Start a fresh deck? Reps you already finished stay saved.", reshuffle, "Reshuffle") : reshuffle())} className="ghost py-4 font-bold flex items-center justify-center gap-2"><RotateCcw size={18} />Reshuffle</button>
        </div>
      )}
      <div className="body text-xs" style={{ color: C.mute }}>Tap Done after each card. Every finished card saves right away, earns XP, counts toward that exercise's rank, and fills matching daily quests. Skipped cards earn nothing.</div>

      {log.length > 0 && (
        <div className="panel p-4 space-y-2">
          <div className="flex justify-between font-bold"><span>This deck</span><span style={{ color: C.gold }}>+{sessionXp} XP</span></div>
          <div className="body text-xs" style={{ color: C.dim }}>{doneCards.length} done{log.length - doneCards.length ? ` · ${log.length - doneCards.length} skipped` : ""}</div>
          {Object.entries(totals).map(([n, r]) => (
            <div key={n} className="flex justify-between body text-sm" style={{ color: C.sub }}><span>{n}</span><span>{r} reps</span></div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold pt-2">Your deck</h2>
      <div className="panel p-4 space-y-3">
        {SUITS.map((su) => (
          <label key={su.id} className="flex items-center gap-3 body text-sm">
            <span className="w-8 text-2xl text-center" style={{ color: su.red ? C.red : C.text }}>{su.sym}</span>
            <select className="inp" value={cfg[su.id]} onChange={(e) => setCfg({ ...cfg, [su.id]: e.target.value })} aria-label={`${su.name} exercise`}>
              {all.map((e) => <option key={e.name}>{e.name}</option>)}
            </select>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2 body text-sm">
          <label>J, Q, K count as<select className="inp mt-1" value={cfg.faces} onChange={(e) => setCfg({ ...cfg, faces: e.target.value })}><option value="ten">10 reps</option><option value="rank">11, 12, 13</option></select></label>
          <label>Aces count as<select className="inp mt-1" value={cfg.aces} onChange={(e) => setCfg({ ...cfg, aces: +e.target.value })}><option value={1}>1 rep</option><option value={11}>11 reps</option><option value={15}>15 reps</option></select></label>
        </div>
        <label className="flex items-center gap-3 body text-sm">
          <input type="checkbox" checked={cfg.jokers} onChange={(e) => setCfg({ ...cfg, jokers: e.target.checked })} style={{ width: 20, height: 20, accentColor: C.cyan }} />
          <span className="flex-1">Add 2 jokers (applies on next reshuffle)</span>
        </label>
        {cfg.jokers && (
          <div className="grid grid-cols-2 gap-2 body text-sm">
            <label>Joker exercise<select className="inp mt-1" value={cfg.jokerEx} onChange={(e) => setCfg({ ...cfg, jokerEx: e.target.value })}>{all.map((e) => <option key={e.name}>{e.name}</option>)}</select></label>
            <label>Joker reps<NumField inputMode="numeric" className="inp mt-1" value={cfg.jokerReps} onCommit={(v) => { if (v === "") return; setCfg({ ...cfg, jokerReps: Math.max(1, v) }); }} /></label>
          </div>
        )}
        <div className="body text-xs" style={{ color: C.mute }}>A full deck with these settings is about {(() => { let t = 0; FACES.forEach((f, i) => { const r = i + 1; t += 4 * (r === 1 ? cfg.aces : r > 10 ? (cfg.faces === "ten" ? 10 : r) : r); }); return t + (cfg.jokers ? 2 * cfg.jokerReps : 0); })()} total reps.</div>
      </div>
    </div>
  );
}

/* ---------- Profile looks, theme songs, comment photos ---------- */
const PROFILE_BGS = [
  { id: "none", name: "Default", css: null },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg,#ff6a3d 0%,#ff3c8e 50%,#7b2ff7 100%)" },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#00c6ff,#0072ff 60%,#001a4d)" },
  { id: "ember", name: "Ember", css: "radial-gradient(circle at 30% 20%,#ffb347,#ff2a2a 45%,#2a0000)" },
  { id: "aurora", name: "Aurora", css: "linear-gradient(135deg,#00ffa3,#00c2ff 45%,#6a00ff)" },
  { id: "galaxy", name: "Galaxy", css: "radial-gradient(circle at 70% 30%,#8a2be2,#1a0533 50%,#000)" },
  { id: "gold", name: "Gold", css: "linear-gradient(135deg,#f9d976,#c79a1a 50%,#5a3a00)" },
  { id: "carbon", name: "Carbon", css: "repeating-linear-gradient(45deg,#151515 0 6px,#2a2a2a 6px 12px)" },
  { id: "toxic", name: "Toxic", css: "linear-gradient(135deg,#a8ff78,#39ff14 50%,#004d00)" },
  { id: "rainbow", name: "Rainbow", css: "linear-gradient(90deg,#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff)" },
];
function lookStyle(look, strength = 0.55) {
  const bg = PROFILE_BGS.find((b) => b.id === look?.bg);
  const st = {};
  if (bg?.css) { st.background = `linear-gradient(rgba(0,0,0,${strength}),rgba(0,0,0,${strength + 0.15})), ${bg.css}`; st.backgroundSize = "cover"; }
  if (look?.accent) st.borderColor = look.accent;
  return Object.keys(st).length ? st : null;
}
// Keeps a photo's shape but limits its size, for comment pictures
// Turns an uploaded song into a small 20-second mono WAV clip that plays on every phone
async function makeClip(file, seconds = 20, rate = 11025) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("no audio");
  const ctx = new AC();
  const buf = await file.arrayBuffer();
  const decoded = await new Promise((res, rej) => { try { const r = ctx.decodeAudioData(buf, res, rej); if (r?.then) r.then(res, rej); } catch (e) { rej(e); } });
  const n = Math.min(decoded.length, Math.floor(seconds * decoded.sampleRate));
  const chans = decoded.numberOfChannels, data = Array.from({ length: chans }, (_, c) => decoded.getChannelData(c));
  const step = decoded.sampleRate / rate, outLen = Math.floor(n / step);
  const tmp = new Float32Array(outLen);
  let peak = 0;
  for (let i = 0; i < outLen; i++) {
    const a = Math.floor(i * step), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * step)));
    let sum = 0, cnt = 0;
    for (let j = a; j < b; j++) for (let c = 0; c < chans; c++) { sum += data[c][j]; cnt++; }
    tmp[i] = cnt ? sum / cnt : 0; peak = Math.max(peak, Math.abs(tmp[i]));
  }
  const g = peak > 0 ? 0.95 / peak : 1;
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) { let v = tmp[i] * g; const rem = outLen - i; if (rem < rate) v *= rem / rate; if (i < rate / 4) v *= i / (rate / 4); pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767))); }
  const bytes = new Uint8Array(44 + outLen * 2), dv = new DataView(bytes.buffer);
  const wstr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  wstr(0, "RIFF"); dv.setUint32(4, 36 + outLen * 2, true); wstr(8, "WAVE"); wstr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); wstr(36, "data"); dv.setUint32(40, outLen * 2, true);
  bytes.set(new Uint8Array(pcm.buffer), 44);
  try { ctx.close?.(); } catch (e) { /* ignore */ }
  return "data:audio/wav;base64," + b64(bytes);
}
const b64 = (bytes) => { let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(bin); };
const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (t) => { const s = t.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
const songLinkLabel = (url) => (/youtu\.?be/i.test(url) ? "YouTube" : /spotify/i.test(url) ? "Spotify" : /apple/i.test(url) ? "Apple Music" : /soundcloud/i.test(url) ? "SoundCloud" : "Link");

/* ---------- Profiles ---------- */
function Avatar({ src, name, size = 48, ring, look }) {
  const color = ring || C.cyan;
  const border = BORDERS.find((b) => b.id === look?.border && (b.css || b.img));
  const inner = src ? (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: border ? "none" : `2px solid ${color}`, flexShrink: 0, display: "block" }} />
  ) : (
    <div className="flex items-center justify-center font-bold shrink-0" style={{ width: size, height: size, borderRadius: 999, background: C.accentBg, color, border: border ? "none" : `2px solid ${color}`, fontSize: size * 0.42 }}>{((name || "?").trim()[0] || "?").toUpperCase()}</div>
  );
  if (!border && (!look?.aura || look.aura === "none")) return inner;
  const pad = border ? Math.max(3, Math.round(size / (border.img ? 10 : 22))) : 0;
  const ringScale = look?.aura === "ascended" ? 1.34 : 1.45;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      {border?.img && <img src={border.img} alt="" aria-hidden="true" style={{ position: "absolute", inset: -Math.round(size * 0.08), width: size + pad * 2 + Math.round(size * 0.16), height: size + pad * 2 + Math.round(size * 0.16), objectFit: "contain", pointerEvents: "none", animation: "rkspin 14s linear infinite", filter: "drop-shadow(0 0 8px rgba(255,212,71,.8))" }} />}
      {border?.css && <AnimatedBorder border={border} color={look?.accent || color} />}
      {look?.aura && look.aura !== "none" && <AuraRing aura={look.aura} size={(size + pad * 2) * ringScale} style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />}
      <div className="relative" style={{ borderRadius: 999, overflow: "hidden" }}>{inner}</div>
    </div>
  );
}

function AnimatedBorder({ border, color }) {
  const base = { position: "absolute", inset: 0, borderRadius: 999, background: border.effect === "fracture" ? "transparent" : border.effect === "tide" ? `conic-gradient(${color},#a855f7,${color})` : border.css, pointerEvents: "none" };
  const animation = border.effect === "pulse" ? "borderpulse 2s ease-in-out infinite" : border.effect === "fracture" ? "borderfracture 4s ease-in-out infinite" : border.effect ? "borderchase 3s linear infinite" : border.spin ? "rkspin 4s linear infinite" : "none";
  return (
    <div aria-hidden="true" className="anime-border" style={{ ...base, animation }}>
      {border.effect === "orbit" && [0, 1, 2].map((i) => <span key={i} className="anime-border-dot" style={{ position: "absolute", inset: -2 - i * 2, borderRadius: 999, animation: `borderorbit ${2.4 + i * 0.8}s linear ${i % 2 ? "reverse" : "normal"} infinite` }}><span style={{ position: "absolute", left: "50%", top: -2, width: 4 + i, height: 4 + i, borderRadius: 999, background: i === 1 ? "#FFD447" : color, boxShadow: `0 0 7px ${color}` }} /></span>)}
      {border.effect === "fracture" && Array.from({ length: 8 }, (_, i) => <span key={i} style={{ position: "absolute", inset: i % 2 ? -2 : 0, borderRadius: 999, border: "2px solid transparent", borderTopColor: i % 2 ? "#ec4899" : "#fff", transform: `rotate(${i * 45}deg) translateY(${i % 2 ? -1 : 1}px)` }} />)}
    </div>
  );
}

// Shrinks an uploaded photo to a small square JPEG so it fits in storage and loads fast on the board
function shrinkImage(file, size = 112) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function AchBadge({ a, earned, size = 60, onClick }) {
  const t = TIER_STYLE[a.tier];
  const Icon = ACH_ICONS[a.series.icon] || Award;
  const mythic = a.tier === 5;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" style={{ width: size + 16 }} aria-label={`${a.title}: ${a.desc}${earned ? ", earned" : ", locked"}`}>
      <div className="flex items-center justify-center relative" style={{ width: size, height: size, borderRadius: a.tier >= 4 ? 12 : 999, transform: a.tier >= 4 ? "rotate(45deg)" : "none",
        background: earned ? (mythic ? RAINBOW : `radial-gradient(circle at 35% 30%, ${t.color}, ${C.bg} 85%)`) : C.soft, backgroundSize: mythic ? "300% auto" : undefined,
        border: `2px solid ${earned ? t.color : C.border}`, boxShadow: earned ? `0 0 ${8 + a.tier * 5}px ${t.glow}` : "none", opacity: earned ? 1 : 0.45, animation: earned && mythic ? "rainbow 3s linear infinite" : "none" }}>
        <div style={{ transform: a.tier >= 4 ? "rotate(-45deg)" : "none", color: earned ? (a.tier === 2 ? "#0B1220" : mythic ? "#fff" : "#0B1220") : C.mute }}>
          {earned ? <Icon size={size * 0.45} strokeWidth={2.2} /> : <Lock size={size * 0.38} />}
        </div>
        {earned && a.tier >= 3 && !mythic && <span className="absolute" style={{ top: -4, right: -4, transform: a.tier >= 4 ? "rotate(-45deg)" : "none" }}><Sparkle size={14} style={{ color: t.color, filter: `drop-shadow(0 0 4px ${t.color})` }} /></span>}
      </div>
      <div className="text-xs font-bold text-center leading-tight" style={{ color: earned ? t.color : C.mute }}>{a.title}</div>
    </button>
  );
}

function WeightChart({ log, target }) {
  const pts = Object.entries(log || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-60).map(([d, w]) => ({ d, w: +w })).filter((p) => p.w > 0);
  if (pts.length < 2) return <div className="body text-sm" style={{ color: C.dim }}>Log your weight on at least two days to see a trend line.</div>;
  const W = 320, H = 130, padL = 34, padR = 10, padT = 12, padB = 22;
  const ws = pts.map((p) => p.w), lo = Math.floor(Math.min(...ws) - 2), hi = Math.ceil(Math.max(...ws) + 2);
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (w) => padT + (1 - (w - lo) / (hi - lo)) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const diff = Math.round((last.w - first.w) * 10) / 10;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Weight from ${first.w} to ${last.w} lb`}>
        {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{Math.round(v)}</text></g>)}
        <path d={`${path} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={C.cyan} opacity=".12" />
        <path d={path} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${C.glow})` }} />
        {pts.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.w)} r="3" fill={C.bg} stroke={C.cyan} strokeWidth="2" />)}
        <text x={padL} y={H - 6} fontSize="10" fill={C.dim}>{new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
        <text x={W - padR} y={H - 6} fontSize="10" fill={C.dim} textAnchor="end">{new Date(last.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
      </svg>
      <div className="body text-xs flex justify-between" style={{ color: C.dim }}>
        <span>{pts.length} entries</span>
        <span style={{ color: diff === 0 ? C.dim : (target === "cut" ? diff < 0 : diff > 0) ? C.green : C.orange }}>{diff > 0 ? "+" : ""}{diff} lb since {new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

function profileCard(s) {
  const ws = weekStart();
  const st = lifetimeStats(s);
  const wl = Object.entries(s.weightLog || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-40);
  return {
    id: s.playerId, name: s.profile.name, avatar: s.profile.avatar || null, goal: s.profile.goal, look: s.profile.look || null, song: s.profile.song || null,
    sex: bodySex(s.profile),
    title: equippedTitle(s).name,
    weekXp: Object.entries(s.xpLog || {}).filter(([d]) => d >= ws).reduce((a, [, v]) => a + v, 0),
    prevWeek: (() => { const pw = shift(ws, -7); return { key: pw, xp: Object.entries(s.xpLog || {}).filter(([d]) => d >= pw && d < ws).reduce((a, [, v]) => a + v, 0) }; })(),
    xp: s.xp, points: pointsOf(s), lvl: levelFromXp(s.xp).lvl, rank: overallRank(s).id, div: overallInfo(s).div,
    xpV: s.xpV || LB_XP_VERSION,
    streak: streakOf(s), week: s.workouts.filter((w) => w.date >= ws && isWorkout(w)).length, weekOf: ws, updated: Date.now(),
    ach: Object.keys(s.ach || {}), stats: st, weightLog: s.profile.shareWeight ? Object.fromEntries(wl) : null,
    month: (() => { const mk = monthKey(); let volume = 0, reps = 0, miles = 0; s.workouts.filter((w) => w.date.startsWith(mk)).forEach((w) => w.exercises.forEach((ex) => { const d = findEx(s, ex.name); workSets(ex.sets).forEach((st) => { if (d.type === "timed") { if (d.group === "Cardio") miles += +st.w || 0; } else { reps += +st.r || 0; volume += (+st.w || 0) * (+st.r || 0); } }); })); return { key: mk, dd: dayDamageMap(s, mk), xp: Object.entries(s.xpLog || {}).filter(([d]) => d.startsWith(mk)).reduce((a, [, v]) => a + v, 0), workouts: s.workouts.filter((w) => w.date.startsWith(mk) && isWorkout(w)).length, volume: Math.round(volume), reps, miles: Math.round(miles * 10) / 10 }; })(),
    uid: window.ascendUserId || null, tier: bestTier(s), crew: s.crew?.code ? { code: s.crew.code, since: s.crew.since || today() } : null, daily: dailyStats(s), rivalWith: s.nemesis?.id || null, nemWins: nemesisWins(s),
    season: { key: seasonKey(), xp: seasonXp(s, seasonKey()) }, prevSeason: { key: prevSeasonKey(seasonKey()), xp: seasonXp(s, prevSeasonKey(seasonKey())) },
    badges: s.seasonBadges || {},
    reigning: !!s.lbReigning,
    ghost: !!s.test,
    // Crew weekly quest pool + how many crew banners this player has earned
    wk: (() => { const st = rangeStats(s, ws, shift(ws, 6)); return { key: ws, workouts: st.workouts, miles: Math.round(st.miles * 10) / 10, fuel: st.fuel }; })(),
    cb: Object.keys(s.crewBanners || {}).length,
    groups: groupScores(s),
    lifts: rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 6).map((r) => ({ name: r.e.name, label: r.label, rank: r.rank.id, best: Math.round(r.best), bw: r.e.type === "bodyweight" })),
  };
}

function ProfilePage({ s, setS, targetId, onBack, gainXp, openXp }) {
  const me = !targetId || targetId === s.playerId;
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(!me);
  const [social, setSocial] = useState({ fives: [], comments: [] });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState(null);
  const fileRef = useRef(null);
  const id = me ? s.playerId : targetId;
  const data = me ? profileCard(s) : card;

  const loadSocial = async () => {
    if (!window.storage?.list) return;
    const read = async (prefix) => {
      try {
        const res = await window.storage.list(prefix, true);
        const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
        return items.filter(Boolean);
      } catch { return []; }
    };
    const [fives, comments] = await Promise.all([read(`hf:${id}:`), read(`cm:${id}:`)]);
    setSocial({ fives, comments: comments.sort((a, b) => (b.t || 0) - (a.t || 0)) });
  };
  useEffect(() => {
    (async () => {
      if (!me) {
        try { const r = await window.storage.get(`lb:${targetId}`, true); setCard(r?.value ? JSON.parse(r.value) : null); } catch { setCard(null); }
        setLoading(false);
      }
      loadSocial();
    })();
  }, [targetId]);

  const highFive = async () => {
    if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so people know who the high-five is from."); return; }
    setBusy(true);
    const key = `hf:${id}:${s.playerId}`;
    const mine = social.fives.find((f) => f.key === key);
    const rec = { n: (mine?.n || 0) + 1, name: s.profile.name, from: s.playerId, t: Date.now() };
    try { await window.storage.set(key, JSON.stringify(rec), true); setSocial((x) => ({ ...x, fives: [...x.fives.filter((f) => f.key !== key), { key, ...rec }] })); }
    catch { setNote("Couldn't send that. Check your connection."); }
    setBusy(false);
  };
  const postComment = async () => {
    const text = comment.trim().slice(0, 140);
    if (!text && !cImg) return;
    if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so your name shows on comments."); return; }
    setBusy(true); setNote("");
    const t = Date.now(), key = `cm:${id}:${t}_${s.playerId}`;
    const imgKey = cImg ? `cmi:${id}:${t}_${s.playerId}` : null;
    const rec = { text, img: cImg || null, imgKey, name: s.profile.name, from: s.playerId, fromUid: window.ascendUserId || null, to: id, toUid: data?.uid || (me ? window.ascendUserId : null), t };
    try {
      if (imgKey) await window.storage.set(imgKey, cImg, true);
      await window.storage.set(key, JSON.stringify(rec), true);
      setSocial((x) => ({ ...x, comments: [{ key, ...rec }, ...x.comments] })); setComment(""); setCImg(null);
    } catch { setNote("Couldn't post that. Check your connection."); }
    setBusy(false);
  };
  const deleteComment = async (c) => {
    setNote("");
    try {
      if (c.imgKey) { try { await window.storage.delete(c.imgKey, true); } catch (e) { /* try the comment row anyway */ } }
      else if (c.img) { try { await window.storage.purgeValue?.(c.img); } catch (e) { /* inline jpeg */ } }
      await window.storage.delete(c.key, true);
      setSocial((x) => ({ ...x, comments: x.comments.filter((y) => y.key !== c.key) }));
    } catch { setNote("Couldn't delete that. Check your connection, or try again from the account that posted it."); }
  };
  const removeAvatar = async () => {
    const prev = s.profile.avatar;
    setS((p) => ({ ...p, profile: { ...p.profile, avatar: null } }));
    try { await window.storage.purgeValue?.(prev); } catch (e) { /* data url or already gone */ }
    try {
      if (s.lb) {
        const card = profileCard({ ...s, profile: { ...s.profile, avatar: null } });
        await window.storage.set(`lb:${s.playerId}`, JSON.stringify(card), true);
      }
    } catch { setNote("Photo cleared here, but the board copy may take a moment to catch up."); }
  };
  const [songBusy, setSongBusy] = useState(false);
  const [songLink, setSongLink] = useState("");
  const songRef = useRef(null);
  const onSong = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSongBusy(true); setNote("");
    try {
      const clip = await makeClip(f);
      await window.storage.set("ascend-song", clip, false);
      if (s.lb) await window.storage.set(`song:${s.playerId}`, clip, true);
      setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "clip", name: f.name.replace(/\.[^.]+$/, "").slice(0, 40) } } }));
    } catch (err) { setNote("Couldn't make a clip from that file. Try an mp3 or m4a."); }
    setSongBusy(false); e.target.value = "";
  };
  const saveLink = () => {
    const url = songLink.trim(); if (!/^https?:\/\//i.test(url)) return;
    setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "link", url, name: songLinkLabel(url) } } })); setSongLink("");
  };
  const removeSong = async () => {
    setS((p) => ({ ...p, profile: { ...p.profile, song: null } }));
    try { await window.storage.delete("ascend-song", false); } catch (e) { /* none */ }
    try { await window.storage.delete(`song:${s.playerId}`, true); } catch (e) { /* none */ }
  };
  const [cImg, setCImg] = useState(null);
  const cImgRef = useRef(null);
  const onCommentPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setCImg(await shrinkPhoto(f)); } catch (err) { setNote("Couldn't read that photo."); }
    e.target.value = "";
  };
  const [bigImg, setBigImg] = useState(null);
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const src = await shrinkImage(f); setS((p) => ({ ...p, profile: { ...p.profile, avatar: src } })); }
    catch { setNote("Couldn't read that photo. Try a different one."); }
    e.target.value = "";
  };

  const fives = social.fives.reduce((a, f) => a + (f.n || 0), 0);
  const all = allAchievements();
  const earnedIds = new Set(data?.ach || []);
  const earned = all.filter((a) => earnedIds.has(a.id)), locked = all.filter((a) => !earnedIds.has(a.id));
  const rank = data ? RANKS.find((r) => r.id === data.rank) || RANKS[0] : RANKS[0];
  const st = data?.stats;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">{me ? "Your profile" : "Profile"}</h1>
      </div>

      {loading && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Loading profile…</div>}
      {!loading && !data && <Empty>This player isn't on the leaderboard anymore.</Empty>}

      {data && (
        <>
          <div className="panel p-5" style={lookStyle(data.look)}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar src={data.avatar} name={data.name} size={76} ring={data.look?.accent || rank.color} look={(!data.reigning && !(me && (s.lbReigning || s.test)) && data.look?.aura === "ascended") ? { ...(data.look || {}), aura: (data.look?.auraPrev && data.look.auraPrev !== "ascended") ? data.look.auraPrev : "none" } : data.look} />
                {me && (
                  <>
                    <button aria-label="Change profile photo" onClick={() => fileRef.current?.click()} className="absolute flex items-center justify-center" style={{ right: -4, bottom: -4, width: 28, height: 28, borderRadius: 999, background: C.cyan, color: "#001018" }}><Camera size={15} /></button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold truncate"><FancyName name={data.name} look={data.look} className="glowtext" /></div>
                {data.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: data.look?.accent || C.cyan }}>{data.title}</div>}
                {(me ? nemesisWins(s) : data.nemWins) > 0 && <div className="mt-1"><RivalBadge wins={me ? nemesisWins(s) : data.nemWins} /></div>}
                {Object.keys(data.badges || {}).length > 0 && <div className="mt-1"><SeasonBadges badges={data.badges} /></div>}
                {(data.cb || 0) > 0 && <div className="mt-1"><CrewBanner count={data.cb} /></div>}
                <div className="body text-sm" style={{ color: rank.color }}>{data.rank}{data.div ? ` ${data.div}` : ""} · Level {data.lvl}</div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{(data.points || 0).toLocaleString()} pts · {data.streak} day streak{st?.since ? ` · since ${new Date(st.since + "T12:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}</div>
              </div>
            </div>
            {me && data.avatar && <button onClick={() => ask("Remove your profile photo? This deletes it from your profile and the board.", removeAvatar, "Remove")} className="body text-xs underline mt-3" style={{ color: C.mute }}>Remove photo</button>}
            <div className="flex items-center gap-3 flex-wrap mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-1 font-bold" style={{ color: C.gold }}><Hand size={18} />{fives} high-five{fives === 1 ? "" : "s"}</div>
              {!me && <button onClick={highFive} disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-1"><Hand size={16} />High five</button>}
              {me && openXp && <button onClick={openXp} className="ghost px-3 py-1.5 text-sm font-bold flex items-center gap-1.5" style={{ color: C.gold }}><Zap size={15} />XP history</button>}
              <SongPlayer playerId={id} meta={data.song} me={me} />
            </div>
          </div>

          {me && <CrateVault s={s} setS={setS} />}
          {me && <LookStudio s={s} setS={setS} />}
          {me && (
            <div className="panel p-4 space-y-3">
              <div className="font-bold flex items-center gap-2"><Music size={16} />Theme song</div>
              {s.profile.song && <div className="body text-sm" style={{ color: C.sub }}>Current: {s.profile.song.type === "link" ? `${songLinkLabel(s.profile.song.url)} link` : s.profile.song.type === "theme" ? `${s.profile.song.name} (built-in)` : `${s.profile.song.name || "clip"} (20 sec clip)`} <button onClick={removeSong} className="underline ml-2" style={{ color: C.red }}>Remove</button></div>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => songRef.current?.click()} disabled={songBusy} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}>{songBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{songBusy ? "Making clip…" : "Upload mp3"}</button>
                <input ref={songRef} type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.flac,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/*" onChange={onSong} style={{ display: "none" }} />
                <div className="flex gap-1">
                  <input className="inp text-sm" placeholder="YouTube / Spotify / Apple Music link" value={songLink} onChange={(e) => setSongLink(e.target.value)} />
                  <button onClick={saveLink} disabled={!/^https?:\/\//i.test(songLink.trim())} className="btn px-3 text-sm">Set</button>
                </div>
              </div>
              <div className="body text-xs" style={{ color: C.dim }}>Or pick a built-in theme (tap to preview, tap again to stop):</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Object.entries(THEMES_MUSIC).map(([id, t]) => { const sel = s.profile.song?.type === "theme" && s.profile.song.id === id; return (
                  <button key={id} onClick={() => { if (Jingle.id === id) { Jingle.stop(); } else { Jingle.start(id); } setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "theme", id, name: t.name } } })); }} className="px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1" style={{ borderRadius: 999, background: sel ? C.blue : C.soft, color: sel ? "#fff" : C.text, border: `1px solid ${C.border}` }}><Music size={12} />{t.name}</button>
                ); })}
              </div>
              <div className="body text-xs" style={{ color: C.mute }}>Uploads keep the first 20 seconds as a small clip. YouTube, Spotify, and Apple Music links play right inside your profile.</div>
            </div>
          )}

          {st && (
            <div className="grid grid-cols-3 gap-2">
              {[["Workouts", st.workouts], ["Lifted", `${st.volume >= 1000000 ? `${(st.volume / 1000000).toFixed(1)}M` : `${Math.round(st.volume / 1000)}k`} lb`], ["Reps", st.reps.toLocaleString()], ["Miles", st.miles], ["Longest streak", `${st.longestStreak}d`], ["Quests", st.quests], ["Bench", st.bench ? `${st.bench} lb` : "–"], ["Squat", st.squat ? `${st.squat} lb` : "–"], ["Deadlift", st.deadlift ? `${st.deadlift} lb` : "–"]].map(([l, v]) => (
                <div key={l} className="panel py-3 px-2 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold glowtext">{v}</div></div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-bold">Achievements <span className="body text-sm font-normal" style={{ color: C.dim }}>{earned.length} / {all.length}</span></h2>
          {pick && (
            <div className="panel p-3 body text-sm" style={{ borderColor: TIER_STYLE[pick.tier].color }}>
              <div className="font-bold" style={{ color: TIER_STYLE[pick.tier].color }}>{pick.title} · {TIER_STYLE[pick.tier].name}</div>
              <div>{pick.desc}</div>
              <div className="text-xs mt-1" style={{ color: C.gold }}>+{pick.xp} XP{earnedIds.has(pick.id) ? " · earned" : ""}</div>
              {!earnedIds.has(pick.id) && st && typeof pick.series.get(st) === "number" && (
                <div className="mt-2"><Bar pct={(pick.series.get(st) / pick.value) * 100} color={TIER_STYLE[pick.tier].color} /><div className="text-xs mt-1" style={{ color: C.dim }}>{Math.floor(pick.series.get(st)).toLocaleString()} / {pick.value.toLocaleString()} {pick.series.unit}</div></div>
              )}
            </div>
          )}
          <div className="panel p-3">
            {earned.length === 0 && <div className="body text-sm mb-2" style={{ color: C.dim }}>Nothing earned yet. Tap a locked badge to see what it takes.</div>}
            <div className="flex flex-wrap gap-1 justify-center">
              {[...earned.sort((a, b) => b.tier - a.tier), ...locked].map((a) => <AchBadge key={a.id} a={a} earned={earnedIds.has(a.id)} onClick={() => setPick(a)} />)}
            </div>
          </div>

          {me && (
            <>
              <h2 className="text-lg font-bold">Body</h2>
              <ProgressPhotos s={s} />
              <Measurements s={s} setS={setS} />
            </>
          )}
          {me && <StepsPanel s={s} setS={setS} gainXp={gainXp} />}
          {!me && data.weightLog && Object.keys(data.weightLog).length > 1 && (
            <>
              <h2 className="text-lg font-bold">Weight over time</h2>
              <div className="panel p-4"><WeightChart log={data.weightLog} target={data.goal} /></div>
            </>
          )}

          {data.lifts?.length > 0 && (
            <>
              <h2 className="text-lg font-bold">Top lifts</h2>
              <div className="space-y-2">
                {data.lifts.map((l) => { const r = RANKS.find((x) => x.id === l.rank) || RANKS[0]; return (
                  <div key={l.name} className="panel p-3 flex items-center gap-3"><RankBadge rank={r} size={30} /><span className="flex-1 font-semibold ml-1">{l.name}</span><span className="font-bold" style={{ color: r.color }}>{l.label}</span><span className="body text-xs" style={{ color: C.dim }}>{l.best}{l.bw ? " reps" : " lb"}</span></div>
                ); })}
              </div>
            </>
          )}

          {!me && <div className="flex justify-center"><Physique tier={data.tier ?? (RANKS.findIndex((r) => r.id === data.rank) || 0)} height={220} aura={data.look?.aura} sex={data.sex} caption={`${data.name}'s physique`} /></div>}
          {!me ? <VersusPanel s={s} data={data} me={me} id={id} setS={setS} gainXp={gainXp} /> : <MogSection s={s} setS={setS} gainXp={gainXp} me={me} targetId={id} targetName={data.name} />}

          <h2 className="text-lg font-bold flex items-center gap-2"><MessageCircle size={18} />Comments</h2>
          {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}
          {!me && (
            <div className="panel p-2 space-y-2">
              {cImg && <div className="flex items-center gap-2"><img src={cImg} alt="" style={{ height: 64, borderRadius: 6 }} /><button onClick={() => setCImg(null)} aria-label="Remove photo" className="ghost p-1"><X size={14} /></button></div>}
              <div className="flex gap-2">
                <button aria-label="Add a photo" onClick={() => cImgRef.current?.click()} className="ghost px-3 flex items-center" style={{ color: cImg ? C.green : C.cyan }}><ImageIcon size={18} /></button>
                <input ref={cImgRef} type="file" accept="image/*" onChange={onCommentPhoto} style={{ display: "none" }} />
                <input className="inp" placeholder="Say something (140 max)" maxLength={140} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postComment()} />
                <button onClick={postComment} disabled={busy || (!comment.trim() && !cImg)} className="btn px-4 py-2 text-sm">Post</button>
              </div>
            </div>
          )}
          {social.comments.length === 0 && <Empty>{me ? "No comments yet. When your cousins visit your profile from the Board tab, they can leave one." : "Be the first to leave a comment."}</Empty>}
          <div className="space-y-2">
            {social.comments.map((c) => (
              <div key={c.key} className="panel p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm">{c.name}<span className="body text-xs font-normal ml-2" style={{ color: C.mute }}>{new Date(c.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                  {(me || c.from === s.playerId) && <button aria-label="Delete comment" onClick={() => ask(c.img ? "Delete this comment and its photo? They're removed from the board for everyone." : "Delete this comment?", () => deleteComment(c), "Delete")} style={{ color: C.mute }}><Trash2 size={14} /></button>}
                </div>
                {c.text && <div className="body text-sm mt-1" style={{ color: C.sub }}>{c.text}</div>}
                {c.img && <button onClick={() => setBigImg(bigImg === c.key ? null : c.key)} className="mt-2 block"><img src={c.img} alt="Photo in comment" style={{ maxHeight: bigImg === c.key ? 400 : 120, maxWidth: "100%", borderRadius: 6, border: `1px solid ${C.border}` }} /></button>}
              </div>
            ))}
          </div>
          {social.fives.length > 0 && <div className="body text-xs" style={{ color: C.mute }}>High-fives from {social.fives.map((f) => `${f.name} (${f.n})`).join(", ")}</div>}
        </>
      )}
    </div>
  );
}

/* ---------- Name fonts + animations ---------- */
const NAME_FONTS = [
  { id: "default", name: "Ascend", family: "'Oxanium', sans-serif" },
  { id: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif" },
  { id: "bangers", name: "Comic", family: "'Bangers', cursive" },
  { id: "cinzel", name: "Royal", family: "'Cinzel', serif" },
  { id: "marker", name: "Marker", family: "'Permanent Marker', cursive" },
  { id: "pixel", name: "Pixel", family: "'Press Start 2P', monospace" },
  { id: "pacifico", name: "Script", family: "'Pacifico', cursive" },
  { id: "creepster", name: "Creepy", family: "'Creepster', cursive" },
];
const NAME_ANIMS = [
  { id: "none", name: "None" }, { id: "pulse", name: "Pulse" }, { id: "rainbow", name: "Rainbow" }, { id: "wave", name: "Wave" },
  { id: "wobble", name: "Wobble" }, { id: "flicker", name: "Flicker" }, { id: "float", name: "Float" }, { id: "shake", name: "Shake" },
];
function FancyName({ name, look, className = "", style = {}, size }) {
  const font = NAME_FONTS.find((f) => f.id === look?.font) || NAME_FONTS[0];
  const anim = look?.anim && look.anim !== "none" ? look.anim : null;
  const color = look?.accent || style.color;
  const base = { ...style, fontFamily: font.family, "--nf": font.family, color, fontSize: size, display: "inline-block", maxWidth: "100%" };
  className = `fancyname ${className}`;
  if (anim) className = className.replace("glowtext", "").trim();
  if (look?.font === "pixel") base.fontSize = size ? size * 0.7 : "0.8em";
  const text = name || "Unnamed";
  if (anim === "wave" || anim === "shake") {
    return (
      <span className={className} style={base} aria-label={text}>
        {[...text].map((ch, i) => <span key={i} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "pre", animation: `nm-${anim} ${anim === "wave" ? 1.6 : 0.5}s ${i * (anim === "wave" ? 0.08 : 0.03)}s ease-in-out infinite` }}>{ch}</span>)}
      </span>
    );
  }
  const cls = anim ? `nm-${anim}` : "";
  if (anim === "rainbow") return <span className={`${className} ${cls}`} style={{ ...base, color: undefined }}>{text}</span>;
  return <span className={`${className} ${cls}`} style={{ ...base, "--nc": color || C.cyan }}>{text}</span>;
}

/* ---------- Look studio: tabbed profile customization ---------- */
const NAME_COLORS = ["#00D9FF", "#3DF08A", "#FFD447", "#FF9340", "#FF2D6F", "#B14BFF", "#F4FBFF", "#E8C872"];
const AURA_GROUPS = [["crate", "Anime Crate", "Opened from the Anime Crate. Owned crate auras multiply your board points — best one counts, even if another aura is equipped."], ["rank", "Rank auras", "Unlock by ranking up any lift."], ["feat", "Feats", "Earned by doing something specific, once."], ["boss", "Boss loot", "Drop from bosses you help defeat."], ["special", "Special", "Limited and exclusive."], ["soon", "Coming soon", "More exclusive auras on the way."]];
const titleGroup = (t) => (t.soon ? "soon" : t.crate ? "crate" : t.id.startsWith("boss_") ? "boss" : t.id === "champion" || t.id === "contender" || t.id === "reigning" ? "season" : t.id === "nemesis_slayer" ? "rivalry" : "progress");
function StudioTabs({ tab, setTab, tabs }) {
  const i = Math.max(0, tabs.findIndex((t) => t[0] === tab));
  return (
    <div role="tablist" aria-label="Customize" className="relative grid p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, borderRadius: 14, background: C.soft, border: `1px solid ${C.glassLine}` }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 4, bottom: 4, left: `calc(${(i / tabs.length) * 100}% + 4px)`, width: `calc(${100 / tabs.length}% - 8px)`, borderRadius: 10, background: `linear-gradient(180deg, ${C.cyan}, ${C.blue})`, boxShadow: `0 4px 14px ${C.glow}`, transition: "left .28s cubic-bezier(.2,.8,.2,1)" }} />
      {tabs.map(([id, label, count]) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="relative py-2 text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: tab === id ? "#001018" : C.text, transition: "color .2s" }}>
          {label}{count && <span className="body text-xs font-semibold tabular-nums" style={{ opacity: 0.7 }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}
function StudioHead({ children, note }) {
  return <div className="flex items-baseline justify-between gap-2 pt-1"><div className="text-sm font-bold">{children}</div>{note && <div className="body text-xs text-right" style={{ color: C.mute }}>{note}</div>}</div>;
}
function AuraTile({ a, s, sel, onPick }) {
  const ok = unlocked(a, s);
  const prog = a.task ? AURA_TASKS[a.task](s) : null;
  const gilded = !!a.gilded;
  return (
    <button onClick={() => ok && onPick(a.id)} aria-pressed={sel} aria-disabled={!ok} aria-label={`${a.name}${ok ? "" : `, locked: ${a.how}`}`} className="relative flex flex-col items-center text-center px-1.5 pt-2 pb-2 overflow-visible" style={{ borderRadius: 14, background: sel ? `${C.cyan}14` : gilded ? "linear-gradient(180deg, rgba(255,212,71,.16), rgba(201,150,46,.06))" : C.glass, border: `1px solid ${sel ? C.cyan : gilded ? "rgba(255,212,71,.55)" : C.glassLine}`, boxShadow: sel ? `0 0 0 1px ${C.cyan}, 0 6px 20px ${C.glow}` : gilded ? "0 0 18px rgba(255,212,71,.22)" : "none", cursor: ok ? "pointer" : "default", transition: "border-color .2s, box-shadow .2s" }}>
      {gilded && <span aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 14, pointerEvents: "none" }}><span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "38%", background: "linear-gradient(90deg, transparent, rgba(255,246,201,.28), transparent)", animation: "gildsweep 4.8s ease-in-out infinite" }} /></span>}
      <span className="relative flex items-center justify-center overflow-visible" style={{ width: 88, height: 88 }}>
        {a.id !== "none" && <span style={{ position: "absolute", inset: 0, opacity: ok ? 1 : 0.5, filter: ok ? "none" : "saturate(.6)", overflow: "visible" }}><AuraCanvas aura={a.id} w={88} h={88} ringR={28} style={{ left: 0, top: 0 }} /></span>}
        <span className="relative flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 999, background: C.sheet, border: `1px solid ${gilded ? "rgba(255,212,71,.45)" : C.glassLine}` }}>
          {!ok ? <Lock size={14} style={{ color: C.mute }} /> : a.id === "none" ? <X size={14} style={{ color: C.mute }} /> : sel ? <Check size={16} style={{ color: C.cyan }} /> : null}
        </span>
      </span>
      {gilded && <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xs font-extrabold tracking-widest uppercase" style={{ color: "#E8C56A", fontSize: 9, letterSpacing: ".14em", zIndex: 1 }}>Gilded</span>}
      <span className="text-xs font-bold leading-tight mt-0.5" style={{ color: ok ? C.text : C.dim }}>{a.name}</span>
      {ok && a.ptsMult ? <span className="body leading-tight" style={{ fontSize: 10.5, color: C.gold }}>+{Math.round(a.ptsMult * 100)}% pts</span> : null}
      {!ok && !prog && <span className="body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{a.how}</span>}
      {!ok && prog && (
        <span className="w-full mt-1 px-1">
          <span className="block body leading-tight" style={{ fontSize: 10.5, color: C.mute }}>{a.how}</span>
          {prog.goal > 1 && <span className="block mt-1 h-1 overflow-hidden" style={{ borderRadius: 999, background: C.track }}><span className="block h-full" style={{ width: `${(prog.v / prog.goal) * 100}%`, borderRadius: 999, background: a.colors[0] }} /></span>}
          <span className="block body leading-tight mt-0.5 tabular-nums" style={{ fontSize: 10, color: C.dim }}>{prog.label}</span>
        </span>
      )}
    </button>
  );
}
function LookStudio({ s, setS }) {
  const [tab, setTab] = useState("auras");
  const look = s.profile.look || {};
  const setLook = (patch) => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), ...patch } } }));
  const oi = overallInfo(s);
  const curTitle = equippedTitle(s);
  const titleName = curTitle?.name || null;
  const aurasOk = AURAS.filter((a) => a.id !== "none" && unlocked(a, s)).length;
  const titlesOk = TITLES.filter((t) => titleEarned(t, s)).length;
  const selAura = look.aura || "none";
  const auraName = AURAS.find((a) => a.id === selAura)?.name;
  return (
    <div className="panel overflow-hidden">
      <div className="relative px-4 pt-4 pb-3 flex items-center gap-3" style={{ backgroundImage: lookStyle(look, 0.5)?.background || `radial-gradient(120% 90% at 20% 30%, ${oi.rank.glow}, transparent 60%)`, backgroundSize: "cover", borderBottom: `1px solid ${C.glassLine}` }}>
        <div className="shrink-0" style={{ width: 104 }}><Physique tier={oi.score} height={150} aura={look.aura} sex={s.profile.sex} /></div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={look.accent || oi.rank.color} look={{ ...look, aura: "none" }} />
            <div className="min-w-0">
              <div className="text-lg font-bold truncate leading-tight"><FancyName name={s.profile.name} look={look} className="glowtext" /></div>
              {titleName && <div className="text-xs font-bold tracking-wider uppercase truncate" style={{ color: look.accent || C.cyan }}>{titleName}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap"><RankChip rank={oi.rank.id} div={oi.div} /><span className="body text-xs" style={{ color: C.dim }}>{selAura === "none" ? "No aura" : `${auraName} aura`}</span></div>
          <div className="body text-xs" style={{ color: C.mute }}>This is how you show up on the board and in the feed.</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <StudioTabs tab={tab} setTab={setTab} tabs={[["auras", "Auras", `${aurasOk}/${AURAS.length - 1}`], ["titles", "Titles", `${titlesOk}/${TITLES.length}`], ["themes", "Themes", null]]} />

        {tab === "auras" && AURA_GROUPS.map(([g, label, note]) => {
          const list = AURAS.filter((a) => (a.group === g || (g === "rank" && a.id === "none")) && (a.id !== "blacksun" || unlocked(a, s)));
          const have = list.filter((a) => a.id !== "none" && unlocked(a, s)).length;
          return (
            <div key={g} className="space-y-2">
              <StudioHead note={`${have} of ${list.filter((a) => a.id !== "none").length}`}>{label}</StudioHead>
              {note && <div className="body text-xs -mt-1.5" style={{ color: C.dim }}>{note}</div>}
              <div className="grid grid-cols-3 gap-2">{list.map((a) => <AuraTile key={a.id} a={a} s={s} sel={selAura === a.id} onPick={(id) => setLook({ aura: id, ...(id !== (look.aura || "none") && look.aura && look.aura !== "none" && look.aura !== "ascended" ? { auraPrev: look.aura } : {}) })} />)}</div>
            </div>
          );
        })}

        {tab === "titles" && [["progress", "Milestones"], ["crate", "Anime Crate"], ["boss", "Boss slayer"], ["rivalry", "Rivalry"], ["season", "Seasons"], ["soon", "Coming soon"]].map(([g, label]) => {
          const list = TITLES.filter((t) => titleGroup(t) === g);
          return (
            <div key={g} className="space-y-2">
              <StudioHead note={`${list.filter((t) => titleEarned(t, s)).length} of ${list.length}`}>{label}</StudioHead>
              <div className="grid grid-cols-2 gap-2">
                {list.map((t) => {
                  const ok = titleEarned(t, s), sel = curTitle.id === t.id;
                  return (
                    <button key={t.id} onClick={() => ok && setS((p) => ({ ...p, profile: { ...p.profile, title: t.id } }))} aria-pressed={sel} aria-disabled={!ok} className="text-left px-3 py-2.5 flex items-start gap-2" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}`, boxShadow: sel ? `0 0 0 1px ${C.cyan}` : "none", cursor: ok ? "pointer" : "default" }}>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold tracking-wider uppercase truncate" style={{ color: ok ? (sel ? look.accent || C.cyan : C.text) : C.mute }}>{t.name}</span>
                        <span className="block body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{t.how}</span>
                      </span>
                      {sel ? <Check size={14} className="shrink-0 mt-0.5" style={{ color: C.cyan }} /> : !ok ? <Lock size={12} className="shrink-0 mt-0.5" style={{ color: C.mute }} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {tab === "titles" && (
          <div className="space-y-2">
            <StudioHead>Exclusive achievements</StudioHead>
            <div className="body text-xs -mt-1.5" style={{ color: C.dim }}>Not earnable yet. They're here so the grind has a ceiling to chase.</div>
            <div className="grid grid-cols-2 gap-2">
              {[["Perfect Season", "Hit every daily quest for a full season"], ["First Blood", "Land the first hit on a new global boss"], ["Untouchable", "Hold #1 for 30 days straight"]].map(([name, how]) => (
                <div key={name} className="text-left px-3 py-2.5 flex items-start gap-2" style={{ borderRadius: 12, background: C.glass, border: `1px solid ${C.glassLine}` }}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold tracking-wider uppercase truncate" style={{ color: C.mute }}>{name}</span>
                    <span className="block body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{how}</span>
                  </span>
                  <Lock size={12} className="shrink-0 mt-0.5" style={{ color: C.mute }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "themes" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <StudioHead>Card background</StudioHead>
              <div className="grid grid-cols-5 gap-2">
                {PROFILE_BGS.map((b) => { const sel = (look.bg || "none") === b.id; return (
                  <button key={b.id} onClick={() => setLook({ bg: b.id })} aria-pressed={sel} aria-label={`${b.name} background`} className="flex flex-col items-center gap-1">
                    <span className="w-full flex items-center justify-center" style={{ aspectRatio: "4 / 3", borderRadius: 10, background: b.css || C.soft, border: `2px solid ${sel ? C.cyan : C.glassLine}`, boxShadow: sel ? `0 0 12px ${C.glow}` : "none" }}>{sel && <Check size={14} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }} />}</span>
                    <span className="body truncate w-full text-center" style={{ fontSize: 10.5, color: sel ? C.text : C.dim }}>{b.name}</span>
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead note={`${BORDERS.filter((b) => unlocked(b, s)).length} of ${BORDERS.length}`}>Photo border</StudioHead>
              <div className="grid grid-cols-4 gap-2">
                {BORDERS.map((b) => { const ok = unlocked(b, s), sel = (look.border || "none") === b.id; return (
                  <button key={b.id} onClick={() => ok && setLook({ border: b.id })} aria-pressed={sel} aria-disabled={!ok} className="flex flex-col items-center gap-1 py-2 px-1" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : "transparent", border: `1px solid ${sel ? C.cyan : "transparent"}`, cursor: ok ? "pointer" : "default" }}>
                    <span className="relative flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 999, background: b.img || b.effect ? "transparent" : (b.css || C.cyan), opacity: ok ? 1 : 0.35, animation: (b.spin || b.img) && !b.effect && ok ? "rkspin 8s linear infinite" : "none" }}>
                      {b.effect && <AnimatedBorder border={b} color={look.accent || C.cyan} />}
                      {b.img && <img src={b.img} alt="" style={{ position: "absolute", inset: -2, width: 44, height: 44, objectFit: "contain" }} />}
                      <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: C.sheet }}>{!ok && <Lock size={12} style={{ color: C.mute }} />}</span>
                    </span>
                    <span className="text-xs font-semibold leading-tight text-center" style={{ color: ok ? C.text : C.mute }}>{b.name}</span>
                    {!ok && <span className="body leading-tight text-center" style={{ fontSize: 10, color: C.mute }}>{b.how}</span>}
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name font</StudioHead>
              <div className="grid grid-cols-2 gap-2">
                {NAME_FONTS.map((f) => { const sel = (look.font || "default") === f.id; return (
                  <button key={f.id} onClick={() => setLook({ font: f.id })} aria-pressed={sel} className="px-3 py-2.5 text-left min-w-0" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}` }}>
                    <span className="block truncate" style={{ fontSize: 17 }}><FancyName name={s.profile.name || "Your name"} look={{ font: f.id, accent: look.accent }} /></span>
                    <span className="block body text-xs mt-0.5" style={{ color: C.mute }}>{f.name}</span>
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name effect</StudioHead>
              <div className="grid grid-cols-4 gap-2">
                {NAME_ANIMS.map((a) => { const sel = (look.anim || "none") === a.id; return (
                  <button key={a.id} onClick={() => setLook({ anim: a.id })} aria-pressed={sel} className="py-2.5 px-1 text-sm font-bold overflow-hidden" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}` }}>
                    <FancyName name={a.name} look={{ anim: a.id, accent: look.accent || C.cyan }} />
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name color</StudioHead>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setLook({ accent: null })} aria-pressed={!look.accent} aria-label="Default color" className="flex items-center justify-center text-xs font-bold" style={{ width: 34, height: 34, borderRadius: 999, background: C.soft, border: `2px solid ${!look.accent ? C.cyan : C.glassLine}`, color: C.dim }}>Auto</button>
                {NAME_COLORS.map((c) => { const sel = (look.accent || "").toLowerCase() === c.toLowerCase(); return <button key={c} onClick={() => setLook({ accent: c })} aria-pressed={sel} aria-label={`Name color ${c}`} style={{ width: 34, height: 34, borderRadius: 999, background: c, border: `2px solid ${sel ? C.text : "transparent"}`, boxShadow: sel ? `0 0 0 2px ${C.sheet} inset, 0 0 12px ${c}` : "none" }} />; })}
                <label className="relative flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: "conic-gradient(#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)", border: `2px solid ${look.accent && !NAME_COLORS.some((c) => c.toLowerCase() === look.accent.toLowerCase()) ? C.text : "transparent"}`, cursor: "pointer" }}>
                  <Plus size={14} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }} />
                  <input type="color" value={look.accent || "#00D9FF"} onChange={(e) => setLook({ accent: e.target.value })} aria-label="Custom name color" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Rank emblems ---------- */
/* ---------- Meal builder ---------- */
/* ---------- Mog-off ---------- */
async function rateMog(dataUrl) {
  const b64data = dataUrl.split(",")[1];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5", max_tokens: 220,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64data } },
        { type: "text", text: `This is a silly game between friends called a mog-off. Judge ONLY the facial expression performance, never the person's looks. The goal is the classic fashion-model "Blue Steel" face: dead-serious stare, puffed fishy pouty lips, intense eyebrows, chin up, zero smile. Score each 0-20 as integers: pucker (fishy lips), brows (intensity), stare (seriousness of the eyes), jaw (chin/jaw drama), commitment (how fully they sold it, laughing or smiling loses points). Respond ONLY with JSON: {"pucker": n, "brows": n, "stare": n, "jaw": n, "commitment": n, "quip": "one short playful judge comment, under 12 words"}` },
      ] }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const clamp = (v) => Math.max(0, Math.min(20, Math.round(+v || 0)));
  const parts = { pucker: clamp(r.pucker), brows: clamp(r.brows), stare: clamp(r.stare), jaw: clamp(r.jaw), commitment: clamp(r.commitment) };
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), quip: String(r.quip || "The judges have spoken.").slice(0, 80) };
}
function MogSection({ s, setS, gainXp, me, targetId, targetName, targetUid, embedded }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(null);
  const camRef = useRef(null);
  const pendingRef = useRef(null); // challenge being accepted, or null for a new challenge
  const load = async () => {
    if (!window.storage?.list) return;
    try {
      const res = await window.storage.list("mog:", true);
      const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
      setList(items.filter((m) => m && (m.from === s.playerId || m.to === s.playerId)).sort((a, b) => (b.t || 0) - (a.t || 0)));
    } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [targetId]);

  const snap = (pending) => { if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so the challenge has your name on it."); return; } pendingRef.current = pending; camRef.current?.click(); };
  const onShot = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); setNote("");
    try {
      const img = await shrinkPhoto(f, 260);
      let score;
      try { score = await rateMog(img); } catch { const seed = img.length % 37; score = { pucker: 8 + seed % 9, brows: 6 + seed % 11, stare: 7 + seed % 10, jaw: 5 + seed % 12, commitment: 9 + seed % 8, quip: "The judge blinked, so this one's on vibes.", total: 0 }; score.total = score.pucker + score.brows + score.stare + score.jaw + score.commitment; }
      const entry = { ...score, img, name: s.profile.name, t: Date.now() };
      const pending = pendingRef.current;
      if (pending) {
        const winner = entry.total > pending.a.total ? s.playerId : entry.total < pending.a.total ? pending.from : "tie";
        const rec = { ...pending, b: entry, status: "done", winner };
        delete rec.key;
        await window.storage.set(pending.key, JSON.stringify(rec), true);
      } else {
        const id = uid();
        const rec = { id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, t: Date.now(), a: entry, b: null, status: "pending" };
        await window.storage.set(`mog:${id}`, JSON.stringify(rec), true);
      }
      await load();
    } catch (err) { setNote("Couldn't process that photo. Try again in better light."); }
    setBusy(false);
  };
  const claim = (m) => {
    setS((p) => ({ ...p, mogClaimed: { ...(p.mogClaimed || {}), [m.id]: true } }));
    gainXp(MOG_XP, "Mog-off win", `mog_${m.id}`);
  };
  const remove = async (m) => { try { await window.storage.delete(m.key, true); setList((l) => l.filter((x) => x.key !== m.key)); } catch { /* ignore */ } };
  const rows = me ? list : list.filter((m) => (m.from === targetId || m.to === targetId));
  return (
    <div className="space-y-2">
      {!embedded && <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18} style={{ color: "#FF2D6F" }} />PvP · mog-offs</h2>}
      <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onShot} style={{ display: "none" }} />
      {!me && (
        <button onClick={() => snap(null)} disabled={busy} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}{busy ? "Judging your mog…" : `🐟 Mog-off ${targetName || "them"} (+${MOG_XP} XP)`}</button>
      )}
      {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}
      {me && rows.length === 0 && <Empty>No mog-offs yet. Open a cousin's profile from the Board tab and challenge them. When someone challenges you, it shows here and on your Status tab.</Empty>}
      {!s.lb && me && <div className="body text-xs" style={{ color: C.orange }}>Join the leaderboard (Board tab) to send and receive mog-offs.</div>}
      {rows.map((m) => {
        const iAmTarget = m.to === s.playerId, iAmFrom = m.from === s.playerId;
        const isOpen = open === m.key;
        return (
          <div key={m.key} className="panel p-3 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <div className="font-bold text-sm truncate">{m.fromName} vs {m.toName}</div>
              <div className="body text-xs" style={{ color: C.dim }}>{new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            </div>
            {m.status === "pending" && iAmTarget && (
              <button onClick={() => snap(m)} disabled={busy} className="btn w-full py-3 flex items-center justify-center gap-2">{busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}{busy ? "Judging…" : `Accept: mog back at ${m.fromName}`}</button>
            )}
            {m.status === "pending" && !iAmTarget && <div className="body text-sm" style={{ color: C.dim }}>Waiting for {m.toName} to accept. Your score: {m.a.total}.</div>}
            {m.status === "pending" && iAmTarget && <div className="body text-xs" style={{ color: C.dim }}>{m.fromName} scored {m.a.total}. Beat it to win {MOG_XP} XP.</div>}
            {m.status === "done" && (
              <>
                <div className="flex justify-end"><ReceiptButton label="Share result" make={() => buildReceipt({ s, kind: "Mog-off", headline: m.winner === "tie" ? "Dead heat" : `${m.winner === m.from ? m.fromName : m.toName} mogged`, sub: `${m.fromName} ${m.a.total} vs ${m.toName} ${m.b?.total ?? "–"}`, rows: [["Lips", `${m.a.pucker} vs ${m.b?.pucker ?? "–"}`], ["Brows", `${m.a.brows} vs ${m.b?.brows ?? "–"}`], ["Stare", `${m.a.stare} vs ${m.b?.stare ?? "–"}`], ["Commitment", `${m.a.commitment} vs ${m.b?.commitment ?? "–"}`]] })} /></div>
                <div className="text-center font-extrabold" style={{ color: C.gold }}>{m.winner === "tie" ? "It's a tie. Both mogged equally hard." : `${m.winner === m.from ? m.fromName : m.toName} wins the mog-off`}</div>
                <button onClick={() => setOpen(isOpen ? null : m.key)} className="body text-xs underline w-full" style={{ color: C.cyan }}>{isOpen ? "Hide faces" : "Show the faces and scores"}</button>
                {isOpen && <div className="flex gap-3"><MogFace e={m.a} label={m.fromName} win={m.winner === m.from} /><MogFace e={m.b} label={m.toName} win={m.winner === m.to} /></div>}
                {m.winner === s.playerId && !(s.mogClaimed || {})[m.id] && <button onClick={() => claim(m)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: C.gold, color: "#0A1630" }}>Claim +{MOG_XP} XP</button>}
              </>
            )}
            {(iAmFrom || iAmTarget) && me && <button onClick={() => ask("Delete this mog-off?", () => remove(m), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Sterling coaching cards ---------- */

// Pops up on the Fuel tab once most of the day's calories are in, with foods that finish the macros
// Shows during a workout with what to do next and a form-check video when it matters

// Pending mog-off challenges, shown on the Status tab so nobody misses one
function MogInbox({ s, openProfile }) {
  const [pending, setPending] = useState([]);
  useEffect(() => {
    (async () => {
      if (!window.storage?.list || !s.lb) return;
      try {
        const res = await window.storage.list("mog:", true);
        const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }));
        setPending(items.filter((m) => m && m.status === "pending" && m.to === s.playerId));
      } catch { /* offline */ }
    })();
  }, [s.lb, s.playerId]);
  if (!pending.length) return null;
  return (
    <button onClick={() => openProfile()} className="panel p-3 w-full text-left flex items-center gap-3" style={{ borderColor: C.gold }}>
      <span className="text-2xl">🐟</span>
      <div className="flex-1">
        <div className="font-bold" style={{ color: C.gold }}>{pending.length === 1 ? `${pending[0].fromName} challenged you to a mog-off` : `${pending.length} mog-off challenges waiting`}</div>
        <div className="body text-xs" style={{ color: C.dim }}>Tap to open your profile and mog back.</div>
      </div>
      <ChevronRight size={18} style={{ color: C.gold }} />
    </button>
  );
}

/* ---------- Rank emblems v3 ---------- */
/* ---------- Muscle pages ---------- */
function MuscleFigure({ group, score, color }) {
  const k = 1 + Math.min(6, score) * 0.11; // muscles grow with rank
  const def = 0.15 + Math.min(6, score) * 0.12; // definition lines get sharper
  const on = (g) => g === group;
  const base = C.mute, skin = "#1a2436";
  const M = (g, el) => <g style={{ transformOrigin: "100px 130px", transform: on(g) ? `scale(${k})` : "none", transition: "transform .6s" }} opacity={on(g) ? 1 : 0.35}>{el}</g>;
  const fill = (g) => (on(g) ? color : base);
  const lat = on("Back") ? 12 * (k - 1) + 4 : 0;
  return (
    <svg viewBox="0 0 200 300" width="100%" style={{ maxHeight: 340 }} role="img" aria-label={`${group} muscle model`}>
      <defs>
        <radialGradient id="mgl" cx="50%" cy="45%" r="50%"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
        <linearGradient id="msk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3852" /><stop offset="1" stopColor={skin} /></linearGradient>
      </defs>
      <circle cx="100" cy="130" r="120" fill="url(#mgl)" />
      {/* body silhouette */}
      <circle cx="100" cy="36" r="17" fill="url(#msk)" />
      <rect x="93" y="50" width="14" height="14" fill="url(#msk)" />
      <path d={`M${60 - lat},70 Q100,58 ${140 + lat},70 L${132 + lat * 0.4},150 Q100,165 ${68 - lat * 0.4},150 Z`} fill="url(#msk)" stroke={on("Back") ? color : "none"} strokeWidth="2" />
      <path d="M72,152 Q100,160 128,152 L124,215 L106,215 L100,190 L94,215 L76,215 Z" fill="url(#msk)" />
      <path d="M78,216 L94,216 L92,290 L76,290 Z M106,216 L122,216 L124,290 L108,290 Z" fill="url(#msk)" />
      <path d={`M${58 - lat},72 Q42,80 38,120 L32,165 L46,168 L54,120 Q56,95 ${68 - lat},88 Z`} fill="url(#msk)" />
      <path d={`M${142 + lat},72 Q158,80 162,120 L168,165 L154,168 L146,120 Q144,95 ${132 + lat},88 Z`} fill="url(#msk)" />
      {/* muscle overlays */}
      {M("Shoulders", <><ellipse cx="62" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /><ellipse cx="138" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /></>)}
      {M("Chest", <><path d="M70,84 Q98,80 99,105 Q90,118 72,110 Z" fill={fill("Chest")} /><path d="M130,84 Q102,80 101,105 Q110,118 128,110 Z" fill={fill("Chest")} /><line x1="100" y1="84" x2="100" y2="112" stroke="#000" strokeOpacity={def} strokeWidth="1.5" /></>)}
      {M("Arms", <><ellipse cx="50" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(8 50 112)" /><ellipse cx="150" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(-8 150 112)" /><ellipse cx="42" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /><ellipse cx="158" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /></>)}
      {M("Core", <>{[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={90 + c * 11} y={118 + r * 13} width="9" height="11" rx="2" fill={fill("Core")} opacity={0.9 - r * 0.15} />))}<line x1="100" y1="116" x2="100" y2="156" stroke="#000" strokeOpacity={def} /></>)}
      {M("Legs", <><path d="M78,160 Q92,158 98,170 L96,212 L80,212 Z" fill={fill("Legs")} /><path d="M122,160 Q108,158 102,170 L104,212 L120,212 Z" fill={fill("Legs")} /><path d="M80,222 L92,222 L90,270 L80,270 Z" fill={fill("Legs")} opacity=".8" /><path d="M108,222 L120,222 L120,270 L110,270 Z" fill={fill("Legs")} opacity=".8" /></>)}
      {on("Back") && <>
        <path d={`M${64 - lat},72 L${76 - lat * 0.3},140 L100,150 L${124 + lat * 0.3},140 L${136 + lat},72 Q100,66 ${64 - lat},72 Z`} fill={color} opacity=".85" />
        <line x1="100" y1="70" x2="100" y2="150" stroke="#000" strokeOpacity={def + 0.2} strokeWidth="2" />
        {[0, 1, 2].map((i) => <line key={i} x1={78 - lat * 0.2} y1={88 + i * 18} x2={122 + lat * 0.2} y2={88 + i * 18} stroke="#000" strokeOpacity={def} />)}
      </>}
      {score > 0 && <g opacity={def}>{[74, 84, 94, 106, 116, 126].map((x) => <line key={x} x1={x} y1="160" x2={x} y2="164" stroke={color} strokeWidth="1" />)}</g>}
    </svg>
  );
}
/* ---------- Weekly + monthly challenges ---------- */
function ChallengeCard({ c, value, claimed, onClaim, color }) {
  const done = value >= c.target;
  const fmt = (v) => (c.unit === "lb" ? Math.round(v).toLocaleString() : c.unit === "mi" ? Math.round(v * 10) / 10 : Math.round(v));
  return (
    <div className="panel p-4" style={claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-3 items-center"><Trophy style={{ color }} /><div><div className="font-bold">{c.title}</div><div className="body text-sm" style={{ color: C.dim }}>{fmt(Math.min(value, c.target))} / {fmt(c.target)} {c.unit}</div></div></div>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{c.xp.toLocaleString()} XP</span>
      </div>
      <div className="my-3"><Bar pct={(value / c.target) * 100} color={claimed ? C.green : color} /></div>
      {claimed ? <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div> :
        <button disabled={!done} onClick={onClaim} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>Claim</button>}
    </div>
  );
}
function Challenges({ s, setS, gainXp }) {
  const ws = weekStart(), we = shift(ws, 6), mk = monthKey(), mStart = `${mk}-01`, mEnd = `${mk}-31`;
  const wst = rangeStats(s, ws, we), mst = rangeStats(s, mStart, mEnd);
  const weekly = [...pickChallenges(WEEKLY_POOL, ws, 3), WEEKLY_REPS], monthly = [...pickChallenges(MONTHLY_POOL, mk, 3), MONTHLY_REPS];
  const wc = s.weekly?.[ws]; const wClaimed = wc === true ? { "w-train4": true } : (wc || {});
  const mClaimed = s.monthly?.[mk] || {};
  const claimW = (c) => { setS((p) => { const cur = p.weekly?.[ws]; const obj = cur === true ? { "w-train4": true } : (cur || {}); return { ...p, weekly: { ...(p.weekly || {}), [ws]: { ...obj, [c.id]: true } } }; }); gainXp(c.xp, `Weekly: ${c.title}`, `wk_${ws}_${c.id}`); };
  const claimM = (c) => { setS((p) => ({ ...p, monthly: { ...(p.monthly || {}), [mk]: { ...(p.monthly?.[mk] || {}), [c.id]: true } } })); gainXp(c.xp, `Monthly: ${c.title}`, `mo_${mk}_${c.id}`); };
  const monthName = new Date(mStart + "T12:00").toLocaleDateString(undefined, { month: "long" });
  return (
    <>
      <h2 className="text-lg font-bold pt-2">Weekly challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>resets Sunday</span></h2>
      {weekly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(wst)} claimed={!!wClaimed[c.id]} onClaim={() => claimW(c)} color={C.orange} />)}
      <h2 className="text-lg font-bold pt-2">{monthName} challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>big XP</span></h2>
      {monthly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(mst)} claimed={!!mClaimed[c.id]} onClaim={() => claimM(c)} color="#B14BFF" />)}
      <div className="body text-xs" style={{ color: C.mute }}>Weekly and monthly progress is tracked automatically from your workouts, quests, fuel goals, and weigh-ins. New ones roll in every week and month.</div>
    </>
  );
}

/* ---------- Photo meal scanner ---------- */
/* ---------- Built-in synth themes (original, no licensing) ---------- */
const THEMES_MUSIC = {
  epic: { name: "Epic entrance", bpm: 92, wave: "sawtooth", bass: [36, 36, 43, 43, 41, 41, 39, 39], lead: [60, 63, 67, 72, 70, 67, 63, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "kick" },
  hype: { name: "Hype trap", bpm: 140, wave: "square", bass: [33, 33, 33, 33, 31, 31, 36, 36], lead: [57, 60, 64, 60, 57, 60, 64, 67, 55, 59, 62, 59, 55, 59, 62, 66], drums: "trap" },
  bit: { name: "8-bit boss", bpm: 150, wave: "square", bass: [40, 40, 47, 47, 45, 45, 43, 43], lead: [64, 67, 71, 76, 74, 71, 67, 64, 66, 69, 73, 78, 76, 73, 69, 66], drums: "kick" },
  disco: { name: "Disco strut", bpm: 118, wave: "triangle", bass: [28, 40, 28, 40, 33, 45, 33, 45], lead: [64, 67, 71, 74, 69, 72, 76, 79, 64, 67, 71, 74, 71, 74, 78, 81], drums: "disco" },
  dark: { name: "Dark arrival", bpm: 80, wave: "sawtooth", bass: [29, 29, 29, 29, 32, 32, 27, 27], lead: [53, 56, 60, 56, 53, 51, 48, 51, 53, 56, 60, 63, 60, 56, 53, 51], drums: "kick" },
  lofi: { name: "Chill lo-fi", bpm: 84, wave: "triangle", bass: [38, 38, 41, 41, 43, 43, 36, 36], lead: [62, 65, 69, 72, 69, 65, 62, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "soft" },
};
const Jingle = {
  ctx: null, timer: null, master: null, id: null,
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  start(id, onEnd) {
    this.stop();
    const T = THEMES_MUSIC[id]; if (!T) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      this.ctx.resume();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      this.id = id;
      const step = 60 / T.bpm / 2, t0 = this.ctx.currentTime + 0.05, total = 32;
      for (let i = 0; i < total; i++) {
        const t = t0 + i * step;
        this.note(T.wave, T.lead[i % T.lead.length], t, step * 0.9, 0.16);
        if (i % 2 === 0) this.note("sawtooth", T.bass[(i / 2) % T.bass.length], t, step * 1.6, 0.22, 500);
        if (i % 4 === 0) this.kick(t);
        if (T.drums === "trap" && i % 2 === 1) this.hat(t, 0.05);
        if (T.drums === "disco" && i % 2 === 1) this.hat(t, 0.08);
        if ((T.drums === "kick" || T.drums === "disco") && i % 8 === 4) this.snare(t);
        if (T.drums === "soft" && i % 8 === 4) this.hat(t, 0.06);
      }
      if (id === "epic") { for (let i = 0; i < 4; i++) this.note("sawtooth", 48 + [0, 3, 7, 12][i], t0 + total * step - 1.2, 1.6, 0.14, 1400); }
      this.timer = setTimeout(() => { this.stop(); onEnd?.(); }, (total * step + 1.8) * 1000);
    } catch (e) { onEnd?.(); }
  },
  stop() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } try { this.master?.disconnect(); } catch (e) { /* ignore */ } this.master = null; this.id = null; },
  note(wave, midi, t, dur, vol, cutoff = 2600) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = wave; o.frequency.value = this.hz(midi); f.type = "lowpass"; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  kick(t) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.32); },
  noise(t, dur, vol, type, freq) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = this.ctx.createBufferSource(); n.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); },
  hat(t, vol) { this.noise(t, 0.05, vol, "highpass", 7000); },
  snare(t) { this.noise(t, 0.16, 0.35, "bandpass", 1800); },
};
const embedFor = (url) => {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "YouTube", src: `https://www.youtube.com/embed/${yt[1]}?rel=0`, h: 200 };
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (sp) return { kind: "Spotify", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?theme=0`, h: sp[1] === "track" || sp[1] === "episode" ? 152 : 352 };
  const am = url.match(/music\.apple\.com\/(.+)/);
  if (am) return { kind: "Apple Music", src: `https://embed.music.apple.com/${am[1]}`, h: 175 };
  return null;
};
function SongPlayer({ playerId, meta, me }) {
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [open, setOpen] = useState(false);
  const audioRef = useRef(null);
  useEffect(() => () => { try { audioRef.current?.pause(); } catch (e) { /* ignore */ } if (Jingle.id) Jingle.stop(); }, []);
  if (!meta) return null;
  if (meta.type === "link") {
    const emb = embedFor(meta.url);
    if (!emb) return <a href={meta.url} target="_blank" rel="noreferrer" className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Open theme link</a>;
    return (
      <div className="w-full">
        {!open ? <button onClick={() => setOpen(true)} className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Play theme on {emb.kind}</button> : (
          <div className="space-y-1">
            <iframe title={`${emb.kind} theme song`} src={emb.src} width="100%" height={emb.h} style={{ border: 0, borderRadius: 8 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            <button onClick={() => setOpen(false)} className="body text-xs underline" style={{ color: C.mute }}>Hide player</button>
          </div>
        )}
      </div>
    );
  }
  const play = async () => {
    if (state === "playing") { audioRef.current?.pause(); Jingle.stop(); setState("idle"); return; }
    if (meta.type === "theme") { setState("playing"); Jingle.start(meta.id, () => setState("idle")); return; }
    setState("loading");
    try {
      let src = null;
      if (me) { try { const r = await window.storage.get("ascend-song", false); src = r?.value; } catch (e) { /* fall through */ } }
      if (!src) { const r = await window.storage.get(`song:${playerId}`, true); src = r?.value; }
      if (!src) throw new Error("missing");
      const a = new Audio(src); audioRef.current = a;
      a.onended = () => setState("idle"); a.onerror = () => setState("idle");
      await a.play(); setState("playing");
    } catch (e) { setState("idle"); }
  };
  const label = meta.type === "theme" ? THEMES_MUSIC[meta.id]?.name || "theme" : meta.name;
  return (
    <button onClick={play} className="btn px-4 py-2 text-sm inline-flex items-center gap-2">
      {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : state === "playing" ? <Pause size={16} /> : <Music size={16} />}
      {state === "playing" ? "Stop" : state === "loading" ? "Loading…" : `Play theme${label ? `: ${label}` : ""}`}
    </button>
  );
}

/* ---------- Sound effects ---------- */

/* ---------- Rank-up ceremony ---------- */
function Ceremony({ c, onClose }) {
  const rank = c.rank;
  useEffect(() => { SFX.rankUp(); const t = setTimeout(onClose, 9000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(0,0,0,.6), rgba(0,0,0,.95))", backdropFilter: "blur(6px)" }} onClick={onClose} role="dialog" aria-label="Rank up">
      <style>{`@keyframes cerein{0%{transform:scale(.3) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}
        @keyframes ceretext{0%{transform:translateY(20px);opacity:0}100%{transform:none;opacity:1}}
        @keyframes cerespark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}`}</style>
      {Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2, d = 120 + (i % 5) * 40; return <span key={i} className="absolute rounded-full" style={{ left: "50%", top: "45%", width: i % 3 ? 6 : 10, height: i % 3 ? 6 : 10, background: i % 2 ? "#fff" : rank.color, boxShadow: `0 0 10px ${rank.color}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px`, animation: `cerespark ${1.2 + (i % 4) * 0.3}s ${(i % 6) * 0.08}s ease-out forwards` }} />; })}
      <div style={{ animation: "cerein .9s cubic-bezier(.2,.9,.3,1.3) both" }}><RankBadge rank={rank} size={170} /></div>
      <div className="text-4xl font-extrabold tracking-widest mt-6" style={{ color: rank.color, textShadow: `0 0 24px ${rank.glow}`, animation: "ceretext .6s .5s ease-out both", fontFamily: "'Oxanium', sans-serif" }}>RANK UP</div>
      <div className="text-xl font-bold mt-2 text-center" style={{ color: "#fff", animation: "ceretext .6s .7s ease-out both" }}>{c.kind === "overall" ? "Overall rank" : c.name}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: rank.color, animation: "ceretext .6s .85s ease-out both" }}>{c.label}</div>
      <div className="body text-sm mt-8" style={{ color: "#9DB2CC", animation: "ceretext .6s 1.2s ease-out both" }}>Tap anywhere to continue</div>
    </div>
  );
}

/* ---------- Titles ---------- */
const TITLE_NONE = { id: "none", name: "" };
const TITLES = [
  { id: "showup", name: "Regular", req: (s) => !!s.ach?.["workouts-0"], how: "Show Up I" },
  { id: "roadrunner", name: "Road Runner", req: (s) => !!s.ach?.["miles-1"], how: "Road Runner II" },
  { id: "cardio", name: "Cardio Menace", req: (s) => !!s.ach?.["miles-2"], how: "Road Runner III" },
  { id: "iron", name: "Iron Mover", req: (s) => !!s.ach?.["volume-1"], how: "Iron Mover II" },
  { id: "rep", name: "Rep Machine", req: (s) => !!s.ach?.["reps-1"], how: "Rep Machine II" },
  { id: "unbroken", name: "Unbroken", req: (s) => !!s.ach?.["streak-1"], how: "Unbroken II (30-day streak)" },
  { id: "barhanger", name: "Bar Hanger", req: (s) => !!s.ach?.["pullups-1"], how: "Bar Hanger II" },
  { id: "plates", name: "Two Plates", req: (s) => !!s.ach?.["bench-1"], how: "Bench Club II (225)" },
  { id: "squatlord", name: "Squat Lord", req: (s) => !!s.ach?.["squat-2"], how: "Squat Club III (405)" },
  { id: "deadking", name: "Deadlift King", req: (s) => !!s.ach?.["deadlift-2"], how: "Deadlift Club III (405)" },
  { id: "quester", name: "Quest Hunter", req: (s) => !!s.ach?.["quests-1"], how: "Quest Hunter II" },
  { id: "ascended", name: "Ascended", req: (s) => !!s.ach?.["rank-2"], how: "First A-rank lift" },
  { id: "mythic", name: "Mythic", req: (s) => Object.keys(s.ach || {}).some((id) => allAchievements().find((a) => a.id === id)?.tier === 5), how: "Any Mythic achievement" },
  { id: "elite", name: "Elite", req: (s) => overallInfo(s).score >= 5, how: "Reach S overall" },
  { id: "gymgod", name: "Gym God", req: (s) => overallInfo(s).score >= 6, how: "????" },
  { id: "boss_wyrm", name: "Wyrmslayer", req: (s) => (s.loot?.bosses || []).includes("wyrm"), how: "Defeat The Iron Wyrm" },
  { id: "boss_colossus", name: "Icebreaker", req: (s) => (s.loot?.bosses || []).includes("colossus"), how: "Defeat Frost Colossus" },
  { id: "boss_gravemaw", name: "Gravebane", req: (s) => (s.loot?.bosses || []).includes("gravemaw"), how: "Defeat Gravemaw" },
  { id: "boss_chud", name: "Chud King", req: (s) => (s.loot?.bosses || []).includes("chud"), how: "Defeat The Chud King" },
  { id: "boss_rust", name: "Titanbreaker", req: (s) => (s.loot?.bosses || []).includes("rust"), how: "Defeat The Rust Titan" },
  { id: "boss_harpy", name: "Stormbound", req: (s) => (s.loot?.bosses || []).includes("harpy"), how: "Defeat Stormcaller Harpy" },
  { id: "boss_warden", name: "Wardenbane", req: (s) => (s.loot?.bosses || []).includes("warden"), how: "Defeat The Hollow Warden" },
  { id: "boss_leviathan", name: "Tidebreaker", req: (s) => (s.loot?.bosses || []).includes("leviathan"), how: "Defeat Leviathan of the Deep" },
  { id: "boss_behemoth", name: "Magmaforged", req: (s) => (s.loot?.bosses || []).includes("behemoth"), how: "Defeat Molten Behemoth" },
  { id: "boss_ratlord", name: "Ratcatcher", req: (s) => (s.loot?.bosses || []).includes("ratlord"), how: "Defeat The Plague Rat Lord" },
  { id: "boss_pharaoh", name: "Sunbreaker", req: (s) => (s.loot?.bosses || []).includes("pharaoh"), how: "Defeat Sandstorm Pharaoh" },
  { id: "boss_void", name: "Voidwalker", req: (s) => (s.loot?.bosses || []).includes("void"), how: "Defeat The Void Sovereign" },
  { id: "yogurtmale", name: "Yogurt Male", req: (s) => !!s.ach?.["yogurt-0"], how: "Log 100 yogurts" },
  { id: "chud", name: "OG", req: (s) => !!s.crateUnlocks?.chud, how: "Anime Crate · common", crate: true },
  { id: "crate_rookie", name: "Rookie", req: (s) => !!s.crateUnlocks?.crate_rookie, how: "Anime Crate · common", crate: true },
  { id: "crate_grinder", name: "Grinder", req: (s) => !!s.crateUnlocks?.crate_grinder, how: "Anime Crate · common", crate: true },
  { id: "crate_no_days_off", name: "No Days Off", req: (s) => !!s.crateUnlocks?.crate_no_days_off, how: "Anime Crate · common", crate: true },
  { id: "crate_certified", name: "Certified", req: (s) => !!s.crateUnlocks?.crate_certified, how: "Anime Crate · common", crate: true },
  { id: "crate_ascended", name: "Ascended", req: (s) => !!s.crateUnlocks?.crate_ascended, how: "Anime Crate · uncommon", crate: true },
  { id: "crate_built_different", name: "Built Different", req: (s) => !!s.crateUnlocks?.crate_built_different, how: "Anime Crate · uncommon", crate: true },
  { id: "champion", name: "Season Champion", req: (s) => Object.values(s.seasonBadges || {}).some((b) => b.place === 1), how: "Finish a season in 1st" },
  { id: "contender", name: "Contender", req: (s) => Object.keys(s.seasonBadges || {}).length > 0, how: "Finish a season in the top 3" },
  { id: "reigning", name: "Reigning", req: (s) => !!s.lbReigning, how: "Hold #1 on the season board" },
  { id: "nemesis_slayer", name: "Nemesis Slayer", req: (s) => nemesisWins(s) >= 3, how: "Beat your Nemesis in 3 duels" },
  { id: "world_first", name: "World First", req: (s) => Object.keys(s.worldFirsts || {}).length > 0, how: "Land the killing blow on a global boss" },
  { id: "seraph_title", name: "Seraph", req: (s) => backToBackSeasonFirsts(s), how: "Finish #1 two seasons in a row" },
];
// Two seasons back to back at the top of the board
function backToBackSeasonFirsts(s) {
  const b = s.seasonBadges || {};
  return Object.entries(b).some(([k, v]) => v?.place === 1 && b[prevSeasonKey(k)]?.place === 1);
}
const TITLE_LEGACY = { wyrmslayer: "boss_wyrm", icebreaker: "boss_colossus", gravebane: "boss_gravemaw", rookie: "none" };
function titleIdOf(s) {
  return TITLE_LEGACY[s.profile?.title] || s.profile?.title || "none";
}
function equippedTitle(s) {
  const want = TITLES.find((t) => t.id === titleIdOf(s));
  if (want && !want.soon && titleEarned(want, s)) return want;
  return TITLE_NONE;
}
function titleEarned(t, s) {
  return !!t && (s.test || t.req(s));
}

/* ---------- Progression + coaching helpers ---------- */
function daysSinceTraining(s) {
  const last = [...s.workouts].reverse().find(isWorkout);
  if (!last) return null;
  return Math.round((new Date(today() + "T12:00") - new Date(last.date + "T12:00")) / 86400000);
}
function Nudges({ s, openExercise, goTrain }) {
  const stalled = stalledLifts(s).slice(0, 2);
  const gap = daysSinceTraining(s);
  const lines = [];
  if (gap !== null && gap >= 3) lines.push({ text: `Right then. ${gap} days without training. The iron has feelings too.`, action: "Train now", onClick: goTrain });
  stalled.forEach((x) => lines.push({ text: `${x.name} has been stuck around ${x.best} for 3 sessions. Drop 10%, do 5 sets of 5, rebuild.`, action: "See lift", onClick: () => openExercise(x.name) }));
  if (!lines.length) return null;
  return (
    <div className="panel p-3 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="font-bold text-sm flex items-center gap-2"><Bot size={16} style={{ color: C.cyan }} />Sterling</div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2"><div className="body text-sm flex-1" style={{ color: C.sub }}>{l.text}</div><button onClick={l.onClick} className="ghost px-3 py-1.5 text-xs font-bold whitespace-nowrap" style={{ color: C.cyan }}>{l.action}</button></div>
      ))}
    </div>
  );
}
function WeeklyReport({ s }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(s.rankHist || {}).sort();
  if (keys.length < 2) return null;
  const cur = s.rankHist[keys[keys.length - 1]], prev = s.rankHist[keys[keys.length - 2]];
  const ups = [], downs = [];
  Object.entries(cur.lifts || {}).forEach(([n, sc]) => { const p = prev.lifts?.[n]; if (p === undefined) return; if (sc - p >= 0.34) ups.push(n); else if (p - sc >= 0.34) downs.push(n); });
  const dOverall = (cur.overall || 0) - (prev.overall || 0);
  const xpGain = (cur.xp || 0) - (prev.xp || 0);
  const focus = downs[0] || stalledLifts(s)[0]?.name || Object.entries(GROUP_WEIGHT).sort((a, b) => ((cur.groups?.[a[0]] || 0) - (cur.groups?.[b[0]] || 0)))[0][0];
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} style={{ color: C.cyan }} />Weekly rank report</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
          <div>Overall score {dOverall >= 0 ? "+" : ""}{dOverall.toFixed(2)} · {xpGain.toLocaleString()} XP earned</div>
          <div style={{ color: C.green }}>Moved up: {ups.length ? ups.join(", ") : "nothing yet"}</div>
          <div style={{ color: C.orange }}>Slipping: {downs.length ? downs.join(", ") : "nothing"}</div>
          <div style={{ color: C.cyan }}>Focus next week: {focus}</div>
        </div>
      )}
    </div>
  );
}


/* ---------- Generic line chart + exercise page ---------- */

/* ---------- Today dashboard + check-in ---------- */
const SLEEP_OPTS = [5, 6, 7, 8, 9];
const SCALE_COLORS = ["#FF4D6D", "#FF9340", "#FFD447", "#9BE15D", "#3DF08A"];
const MOOD_OPTS = ["Wrecked", "Meh", "Good", "Fired up"];
function Dashboard({ s, setS, goTrain, goRun, saveOk, saveAt, storageOk }) {
  const d = today();
  const t = targets(s.profile), tot = mealTotals(s.meals[d]);
  const day = s.days?.[d];
  const qDone = (day?.list || []).filter((q) => q.claimed).length, qAll = Math.max(3, (day?.list || []).length || 3);
  const ci = s.checkins?.[d] || {};
  const [ciEdit, setCiEdit] = useState(false);
  const setCi = (k, v) => {
    setS((p) => {
      const cur = { ...(p.checkins?.[d] || {}), [k]: v };
      delete cur.edit;
      return { ...p, checkins: { ...(p.checkins || {}), [d]: cur } };
    });
    setCiEdit(false);
  };
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const ciDone = ci.sleep && ci.mood && !ciEdit;
  return (
    <div className="panel p-3 space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Streak", `${streakOf(s)}d`, C.orange], ["Quests", `${qDone}/${qAll}`, C.gold], ["Cal left", Math.max(0, Math.round(t.cal - tot.cal)), C.cyan], ["Protein left", `${Math.max(0, Math.round(t.protein - tot.p))}g`, C.green]].map(([l, v, c]) => (
          <div key={l}><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <button onClick={goRun} className="w-full flex items-center gap-3 px-1" aria-label="Open run and steps">
        <Footprints size={16} style={{ color: C.green }} />
        <div className="flex-1"><div className="h-1.5 overflow-hidden" style={{ borderRadius: 999, background: C.glassLine }}><div style={{ height: "100%", width: `${Math.min(100, ((s.steps?.[d] || 0) / (s.settings?.stepGoal || 10000)) * 100)}%`, background: C.green, borderRadius: 999 }} /></div></div>
        <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{(s.steps?.[d] || 0).toLocaleString()} steps</span>
        <ChevronRight size={14} style={{ color: C.mute }} />
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={goTrain} className="btn py-2.5 text-sm flex items-center justify-center gap-2"><Dumbbell size={16} />{s.active ? "Resume workout" : "Start training"}</button>
        <GymCheckBtn s={s} setS={setS} />
      </div>
      {(() => {
        const blocked = storageOk === false;
        const bad = blocked || saveOk === false;
        const age = saveAt ? Math.round((Date.now() - saveAt) / 1000) : null;
        const when = age == null ? "" : age < 12 ? "just now" : age < 60 ? `${age}s ago` : age < 3600 ? `${Math.max(1, Math.round(age / 60))}m ago` : "a while ago";
        const text = blocked ? "Progress can't save on this device. Check your connection or sign back in." : bad ? "Last save didn't go through. Gyms eat signal — keep logging, we'll retry." : saveAt ? `You're good. Last saved ${when}.` : "You're good. Saves are landing.";
        return (
          <div className="flex items-center gap-2 body text-xs px-1" style={{ color: bad ? C.orange : C.green }}>
            <SaveMark />
            <span>{text}</span>
          </div>
        );
      })()}
      {ciDone ? (
        <button onClick={() => setCiEdit(true)} className="w-full flex items-center justify-between body text-xs px-1">
          <span style={{ color: C.dim }}>Checked in · +15 pts <Check size={12} className="inline" style={{ color: C.green }} /></span>
          <span><span style={{ color: SCALE_COLORS[SLEEP_OPTS.indexOf(ci.sleep)] }}>{ci.sleep}{ci.sleep === 9 ? "+" : ""}h sleep</span> · <span style={{ color: SCALE_COLORS[[0, 1, 3, 4][MOOD_OPTS.indexOf(ci.mood)]] }}>{ci.mood}</span></span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Sleep</span>
            {SLEEP_OPTS.map((h, i) => { const col = SCALE_COLORS[i], on = ci.sleep === h; return <button key={h} onClick={() => setCi("sleep", h)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.sleep && !on ? 0.45 : 1 }}>{h}{h === 9 ? "+" : ""}h</button>; })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Mood</span>
            {MOOD_OPTS.map((m, i) => { const col = SCALE_COLORS[[0, 1, 3, 4][i]], on = ci.mood === m; return <button key={m} onClick={() => setCi("mood", m)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.mood && !on ? 0.45 : 1 }}>{m}</button>; })}
          </div>
        </>
      )}
    </div>
  );
}


/* ---------- Fuel extras ---------- */
function WaterTracker({ s, setS, gainXp, d }) {
  const target = Math.max(8, Math.round((+s.profile.weight || 170) / 2 / 8));
  const w = s.water?.[d] || { n: 0, xp: false };
  const set = (n) => setS((p) => {
    const cur = p.water?.[d] || { n: 0, xp: false };
    const next = { ...cur, n: Math.max(0, n) };
    let hit = false;
    if (!cur.xp && next.n >= target) { next.xp = true; hit = true; }
    if (hit) setTimeout(() => { gainXp(WATER_XP, "Water goal", `water_${d}`); SFX.water(); }, 0);
    return { ...p, water: { ...(p.water || {}), [d]: next } };
  });
  return (
    <div className="panel p-3 flex items-center gap-3">
      <Droplets size={20} style={{ color: C.cyan }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm"><span className="font-semibold">Water</span><span className="body" style={{ color: w.n >= target ? C.green : C.dim }}>{w.n} / {target} cups{w.xp ? " · +25 XP" : ""}</span></div>
        <div className="mt-1"><Bar pct={(w.n / target) * 100} color={C.cyan} /></div>
      </div>
      <button aria-label="Less water" onClick={() => set(w.n - 1)} className="ghost w-8 h-8 flex items-center justify-center"><Minus size={14} /></button>
      <button aria-label="Add a cup" onClick={() => set(w.n + 1)} className="btn w-8 h-8 flex items-center justify-center"><Plus size={14} /></button>
    </div>
  );
}

/* ---------- Body tracking ---------- */
function ProgressPhotos({ s }) {
  const [keys, setKeys] = useState([]);
  const [imgs, setImgs] = useState({});
  const [pick, setPick] = useState([]);
  const [slider, setSlider] = useState(50);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const camRef = useRef(null), libRef = useRef(null);
  const load = async () => {
    try { const res = await window.storage.list("photo:", false); const ks = (res?.keys || []).sort().reverse(); setKeys(ks); const out = {}; await Promise.all(ks.slice(0, 12).map(async (k) => { try { const r = await window.storage.get(k, false); if (r?.value) out[k] = r.value; } catch (e) { /* skip */ } })); setImgs(out); } catch (e) { /* offline */ }
  };
  useEffect(() => { if (open) load(); }, [open]);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true);
    try { const small = await shrinkPhoto(f, 700); const k = `photo:${today()}-${Date.now().toString(36)}`; await window.storage.set(k, small, false); await load(); } catch (err) { /* ignore */ }
    setBusy(false);
  };
  const del = async (k) => {
    try {
      await window.storage.delete(k, false);
      setPick((x) => x.filter((y) => y !== k));
      setKeys((ks) => ks.filter((x) => x !== k));
      setImgs((m) => { const n = { ...m }; delete n[k]; return n; });
    } catch (e) { /* keep showing until it actually deletes */ }
  };
  const label = (k) => { const m = k.match(/^photo:(\d{4}-\d{2}-\d{2})/); return m ? new Date(m[1] + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : ""; };
  const [a, b] = pick;
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><ImageIcon size={16} style={{ color: C.cyan }} />Progress photos{keys.length ? ` (${keys.length})` : ""}</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="body text-xs" style={{ color: C.dim }}>Private to you. Take one a month in the same spot and light. Tap two to compare.</div>
          <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onFile} style={{ display: "none" }} />
          <input ref={libRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => camRef.current?.click()} disabled={busy} className="btn py-2.5 text-sm flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}Take photo</button>
            <button onClick={() => libRef.current?.click()} disabled={busy} className="ghost py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Upload size={16} />Choose photo</button>
          </div>
          {a && b && imgs[a] && imgs[b] && (
            <div className="space-y-2">
              <div className="relative select-none" style={{ aspectRatio: "3/4", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={imgs[b]} alt="Before" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, width: `${slider}%`, overflow: "hidden" }}><img src={imgs[a]} alt="After" style={{ width: `${10000 / slider}%`, height: "100%", objectFit: "cover", maxWidth: "none" }} /></div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${slider}%`, width: 2, background: C.cyan, boxShadow: `0 0 8px ${C.glow}` }} />
                <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(a)}</span>
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(b)}</span>
              </div>
              <input type="range" min="2" max="98" value={slider} onChange={(e) => setSlider(+e.target.value)} className="w-full" aria-label="Compare slider" style={{ accentColor: C.cyan }} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {keys.slice(0, 12).map((k) => (
              <div key={k} className="relative">
                <button onClick={() => setPick((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k].slice(-2)))} className="w-full" style={{ aspectRatio: "3/4", borderRadius: 6, overflow: "hidden", border: `2px solid ${pick.includes(k) ? C.cyan : C.border}`, background: C.soft }}>
                  {imgs[k] ? <img src={imgs[k]} alt={label(k)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Loader2 size={16} className="animate-spin m-auto" />}
                </button>
                <div className="flex justify-between items-center body text-xs mt-0.5" style={{ color: C.dim }}><span>{label(k)}</span><button aria-label="Delete photo" onClick={() => ask("Delete this photo?", () => del(k), "Delete")} style={{ color: C.mute }}><Trash2 size={12} /></button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const MEASURES = [["arms", "Arms"], ["chest", "Chest"], ["waist", "Waist"], ["legs", "Thighs"]];
function Measurements({ s, setS }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [pick, setPick] = useState("arms");
  const log = s.measure || {};
  const dates = Object.keys(log).sort();
  const last = dates.length ? log[dates[dates.length - 1]] : {};
  const save = () => {
    const entry = {}; MEASURES.forEach(([k]) => { if (+vals[k]) entry[k] = +vals[k]; });
    if (!Object.keys(entry).length) return;
    setS((p) => ({ ...p, measure: { ...(p.measure || {}), [today()]: { ...(p.measure?.[today()] || {}), ...entry } } })); setVals({});
  };
  const pts = dates.filter((d) => log[d][pick]).map((d) => ({ d, v: log[d][pick] }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><Ruler size={16} style={{ color: C.cyan }} />Measurements{dates.length ? ` · ${MEASURES.filter(([k]) => last[k]).map(([k, l]) => `${l} ${last[k]}"`).join(", ")}` : ""}</span><ChevronDown size={16} className="shrink-0" style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">{MEASURES.map(([k, l]) => <label key={k} className="body text-xs text-center" style={{ color: C.dim }}>{l}<input type="text" inputMode="decimal" className="inp text-center mt-0.5" placeholder={last[k] || "in"} value={vals[k] || ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>)}</div>
          <button onClick={save} className="btn w-full py-2 text-sm">Log today</button>
          {dates.length > 0 && (
            <>
              <div className="flex gap-2">{MEASURES.map(([k, l]) => <button key={k} onClick={() => setPick(k)} className="flex-1 py-1.5 text-xs font-semibold" style={{ borderRadius: 999, background: pick === k ? C.blue : C.soft, color: pick === k ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>)}</div>
              <LineChart pts={pts} color={C.cyan} unit="in" fmt={(v) => v.toFixed(1)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Social: feed, crew goal, duels, sharing ---------- */
// Preset that keeps the exact structure: exercise order, set count, and each set's weight and reps
function presetFromExercises(name, exercises) {
  return { id: uid(), name, exercises: exercises.map((e) => ({ name: e.name, sets: e.sets.length, plan: e.sets.map((st) => ({ w: st.w ?? "", r: st.r ?? "" })), ...(e.wMode ? { wMode: e.wMode } : {}) })) };
}
function RankChip({ rank, div, size = "xs" }) {
  const r = RANKS.find((x) => x.id === rank);
  if (!r) return null;
  return <span className={`ranklabel shrink-0 px-1.5 text-${size}`} style={{ borderRadius: 4, color: r.color, background: `${r.color}1F`, border: `1px solid ${r.color}66`, lineHeight: 1.5 }}>{r.id}{div ? ` ${div}` : ""}</span>;
}
function FeedWorkoutSheet({ s, setS, post, onClose }) {
  const [saved, setSaved] = useState(false);
  // Newer posts carry the full workout. Your own older posts can be rebuilt from your log.
  const own = post.from === s.playerId ? s.workouts.find((w) => post.key?.endsWith(`_workout_${w.id}`)) : null;
  const w = post.workout || (own ? workoutPayload(s, own) : null);
  const legacyNames = !w ? (post.detail || "").split(",").map((x) => x.trim()).filter(Boolean) : [];
  const mine = post.from === s.playerId;
  const titleWord = w?.title || (post.text.match(/finished an? (.+?) ?workout/)?.[1] || "").trim();
  const defOf = (e) => allExercises(s).find((d) => d.name === e.name) || { name: e.name, type: e.type || "weighted" };
  const totalSets = w ? w.exercises.reduce((a, e) => a + e.sets.length, 0) : 0;
  const save = () => {
    const base = `${mine ? "" : `${post.name}'s `}${titleWord || "workout"}`.trim();
    const name = base.charAt(0).toUpperCase() + base.slice(1);
    const preset = w ? presetFromExercises(name, w.exercises) : { id: uid(), name, exercises: legacyNames.map((n) => ({ name: n, sets: 3 })) };
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), preset] }));
    setSaved(name);
  };
  return (
    <Sheet title={`${mine ? "Your" : `${post.name}'s`} ${titleWord ? `${titleWord} ` : ""}workout`} onClose={onClose}>
      <div className="flex items-center gap-2 -mt-1 mb-3 body text-xs" style={{ color: C.dim }}>
        {post.rank && <RankChip rank={post.rank} div={post.div} />}
        <span>{w?.date ? fmtDay(w.date) : new Date(post.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
      {w ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[["XP", `+${w.xp}`], ["Sets", totalSets], ["Volume", w.volume ? `${w.volume.toLocaleString()}` : "–"], ["Time", w.minutes ? `${w.minutes}m` : "–"]].map(([l, v]) => <div key={l} className="panel py-2 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold text-sm tabular-nums">{v}</div></div>)}
          </div>
          {w.exercises.map((ex, i) => {
            const def = defOf(ex);
            return (
              <div key={i} className="panel p-3">
                <div className="flex justify-between items-baseline gap-2">
                  <div className="font-semibold min-w-0 truncate" style={{ color: C.cyan }}>{ex.name}</div>
                  <div className="body text-xs shrink-0" style={{ color: C.mute }}>{ex.sets.length} set{ex.sets.length === 1 ? "" : "s"}{ex.wMode === "hand" ? " · per hand" : ""}</div>
                </div>
                <div className="mt-1.5 grid gap-x-3 gap-y-0.5 body text-sm" style={{ gridTemplateColumns: "auto 1fr" }}>
                  {ex.sets.map((st, j) => <React.Fragment key={j}><span style={{ color: C.dim }}>Set {j + 1}</span><span className="font-semibold text-right tabular-nums">{def.type === "weighted" && st.w ? `${st.w} lb × ${st.r}` : def.type === "bodyweight" ? `${st.w ? `+${st.w} lb × ` : ""}${st.r} reps` : setLabel(def, st)}</span></React.Fragment>)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel p-3 space-y-1">
          <div className="body text-xs" style={{ color: C.dim }}>This was posted before feed workouts carried sets and reps, so only the exercise list is available.</div>
          {legacyNames.length ? legacyNames.map((n) => <div key={n} className="font-semibold text-sm" style={{ color: C.cyan }}>{n}</div>) : <div className="body text-sm">No exercise list on this post.</div>}
        </div>
      )}
      {(w || legacyNames.length > 0) && (
        <div className="mt-3 space-y-1.5">
          <button onClick={save} disabled={!!saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to My Presets</> : <><Bookmark size={16} />Save to My Presets</>}</button>
          <div className="body text-xs text-center" style={{ color: saved ? C.green : C.mute }}>{saved ? `"${saved}" is in Train → Presets, with ${w ? "every set's weight and reps filled in" : "3 sets per exercise"}.` : w ? "Copies every exercise, set, weight and rep. You can change the numbers when you load it." : "Saves the exercise list with 3 sets each."}</div>
        </div>
      )}
    </Sheet>
  );
}
function FeedMealSheet({ s, setS, post, onClose }) {
  const [added, setAdded] = useState(false);
  const m = post.meal || {};
  const add = () => {
    const d = today();
    setS((p) => ({ ...p, meals: { ...p.meals, [d]: [...((p.meals || {})[d] || []), { name: m.name, cal: m.cal, p: m.p, c: m.c, f: m.f, ...(m.ingredients ? { ingredients: m.ingredients, meal: true } : {}), id: uid(), qty: 1 }] } }));
    setAdded(true);
  };
  return (
    <Sheet title={m.name || "Shared meal"} onClose={onClose}>
      <div className="body text-xs -mt-1 mb-3" style={{ color: C.dim }}>Shared by {post.from === s.playerId ? "you" : post.name}{m.ai ? " · AI estimate" : ""}</div>
      <div className="grid grid-cols-4 gap-2">{[["Cal", m.cal], ["Protein", `${m.p}g`], ["Carbs", `${m.c}g`], ["Fat", `${m.f}g`]].map(([l, v]) => <div key={l} className="panel py-2 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
      {m.ingredients?.length > 0 && <div className="panel p-3 mt-2 space-y-0.5">{m.ingredients.map((it, i) => <div key={i} className="flex justify-between body text-sm gap-2"><span className="truncate">{it.name}</span><span className="shrink-0 tabular-nums" style={{ color: C.dim }}>{Math.round(it.cal)} cal</span></div>)}</div>}
      <button onClick={add} disabled={added} className="btn w-full py-3 mt-3 flex items-center justify-center gap-2">{added ? <><Check size={16} />Logged for today</> : <><Plus size={16} />Log it for today</>}</button>
    </Sheet>
  );
}
// Posts from before exact tiers said "D-Rank · Beginner". Crossing into a letter always lands on division III.
const fixRankText = (t) => String(t || "").replace(/\b(SS|[EDCBAS])-Rank(?: · [A-Za-z' -]+?)?(?=( overall)?$)/, "$1 III");
function Feed({ s, setS, openProfile, rows = [] }) {
  const [items, setItems] = useState(null);
  const [openPost, setOpenPost] = useState(null);
  const load = async () => {
    const all = (await readShared("feed:")).sort((a, b) => (b.t || 0) - (a.t || 0));
    const seen = new Map(), keep = [], dupes = [];
    all.forEach((x) => {
      const sig = `${x.from}|${x.type}|${(x.text || "").replace(/\+\d+ XP/, "")}|${x.detail || ""}`;
      const prev = seen.get(sig);
      if (prev && Math.abs((prev.t || 0) - (x.t || 0)) < 24 * 3600 * 1000) { dupes.push(x); return; }
      seen.set(sig, x); keep.push(x);
    });
    setItems(keep.slice(0, 40));
    dupes.filter((x) => x.from === s.playerId).slice(0, 25).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
    const cutoff = Date.now() - 14 * 86400000;
    all.filter((x) => (x.t || 0) < cutoff).slice(0, 10).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
  };
  useEffect(() => { load(); }, []);
  const icon = { pr: "🏆", rank: "⬆️", ach: "🎖️", workout: "🏋️", run: "🏃", meal: "🍽️", duel: "⚔️", mog: "🐟", level: "✨" };
  const tint = { pr: C.gold, rank: "#B14BFF", ach: C.orange, workout: C.cyan, run: C.green, meal: C.green, duel: "#FF2D6F", mog: C.green, level: C.gold };
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
  // Exact rank + division: stamped on the post when it was made, otherwise the author's current board card
  const rankOf = (it) => {
    if (it.rank) return { rank: it.rank, div: it.div };
    const c = rows.find((r) => r.id === it.from || r.key === `lb:${it.from}`);
    return c?.rank ? { rank: c.rank, div: c.div } : null;
  };
  // Old run posts were typed "workout"; they have no exercises to open
  const isRun = (it) => it.type === "run" || (it.type === "workout" && /^(ran|walked) [\d.]+ mi/.test(it.text || ""));
  const opensWorkout = (it) => it.type === "workout" && !isRun(it) && !!(it.workout || it.detail);
  const opens = (it) => opensWorkout(it) || (it.type === "meal" && !!it.meal);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <div>
      {items === null && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading feed…</div>}
      {items?.length === 0 && <Empty>Nothing yet. PRs, rank-ups, achievements, shared workouts and meals from the whole crew show up here.</Empty>}
      {items?.length > 0 && (
        <div className="panel overflow-hidden">
          {items.map((it, i) => {
            const rk = rankOf(it), clickable = opens(it), wo = it.workout;
            const kind = isRun(it) ? "run" : it.type;
            const prestige = it.type === "rank" && it.tier >= 5 ? RANKS[Math.min(6, it.tier)] : null;
            return (
              <div key={it.key} {...(clickable ? { role: "button", tabIndex: 0, onClick: () => setOpenPost(it), onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenPost(it); } }, "aria-label": `Open ${it.name}'s ${it.type === "meal" ? "meal" : "workout"}` } : {})} className={`feedrow flex gap-3 items-start px-3 py-3${clickable ? " feedtap" : ""}`} style={{ ...(i ? { borderTop: `1px solid ${C.border}` } : null), ...(prestige ? { background: `linear-gradient(90deg, ${prestige.glow}, transparent 70%)`, borderLeft: `3px solid ${prestige.color}`, boxShadow: `inset 0 0 22px ${prestige.glow}` } : null) }}>
                <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 36, height: 36, borderRadius: 999, background: `${tint[kind] || C.cyan}22`, border: `1px solid ${tint[kind] || C.cyan}55` }}>{icon[kind] || "•"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button onClick={stop(() => openProfile(it.from))} className="font-bold text-sm truncate min-w-0"><FancyName name={it.name} look={it.look} /></button>
                    {rk && <RankChip rank={rk.rank} div={rk.div} />}
                    <span className="body text-xs shrink-0 ml-auto" style={{ color: C.mute }}>{ago(it.t)}</span>
                  </div>
                  <div className="body text-sm" style={{ color: C.text }}>{it.type === "rank" ? fixRankText(it.text) : it.text}</div>
                  {it.type === "meal" && it.meal ? (
                    <div className="body text-xs mt-0.5 tabular-nums" style={{ color: C.dim }}>{it.meal.cal} cal · P {it.meal.p} · C {it.meal.c} · F {it.meal.f}</div>
                  ) : wo ? (
                    <div className="body text-xs mt-0.5 truncate" style={{ color: C.dim }}>{wo.exercises.map((e) => `${e.name} ×${e.sets.length}`).join(" · ")}</div>
                  ) : it.detail ? <div className="body text-xs mt-0.5 truncate" style={{ color: C.dim }}>{it.detail}</div> : null}
                  {clickable && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: tint[kind] || C.cyan }}>
                      {it.type === "meal" ? <><Utensils size={12} />See macros &amp; log it</> : wo ? <><Dumbbell size={12} />{wo.exercises.length} exercises · {wo.exercises.reduce((a, e) => a + e.sets.length, 0)} sets</> : <><Dumbbell size={12} />See exercises</>}
                      <ChevronRight size={13} />
                    </div>
                  )}
                </div>
                {it.from === s.playerId && <button aria-label="Delete post" onClick={stop(() => ask(it.cmeal ? "Delete this post? The meal also comes off the community list." : "Delete this post?", async () => { try { await window.storage.delete(it.key, true); if (it.cmeal) window.storage.delete(it.cmeal, true).catch(() => {}); setItems((x) => x.filter((y) => y.key !== it.key)); } catch (e) { /* ignore */ } }, "Delete"))} className="p-1 shrink-0" style={{ color: C.mute }}><Trash2 size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}
      {openPost && openPost.type === "meal" && <FeedMealSheet s={s} setS={setS} post={openPost} onClose={() => setOpenPost(null)} />}
      {openPost && openPost.type !== "meal" && <FeedWorkoutSheet s={s} setS={setS} post={openPost} onClose={() => setOpenPost(null)} />}
    </div>
  );
}
const IOS_LOC = "On iPhone: Settings → Privacy & Security → Location Services (on), then Settings → Apps → Safari → Location → Allow. Reload this page in Safari (not an in-app browser) and tap Allow when asked. The site has to be HTTPS.";
const fmtHMS = (sec) => {
  const s = Math.max(0, Math.floor(+sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
const fmtAgo = (t, now = Date.now()) => {
  const m = Math.max(0, Math.floor((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};
function getGps(opts = {}) {
  if (opts.test && opts.gym && Number.isFinite(+opts.gym.lat)) return Promise.resolve({ lat: +opts.gym.lat, lng: +opts.gym.lng, mock: true });
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject({ code: 0, message: "no-geo" }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 },
    );
  });
}
function locErrorText(err) {
  if (err?.code === 1) return `Location is blocked. ${IOS_LOC}`;
  if (err?.code === 2) return "Couldn't find you. Step outside or near a window and try again.";
  if (err?.code === 3) return "Location timed out. Try again in a spot with a clearer sky.";
  if (err?.message === "no-geo") return "This browser can't share location.";
  return "Couldn't get your location.";
}
async function stampPresence(s, setS, t, drop = false) {
  const now = t || Date.now();
  if (s.test) {
    patchGhost(setS, (g) => {
      const presence = { ...(g.presence || {}) };
      if (drop) delete presence[s.playerId];
      else presence[s.playerId] = now;
      let raid = g.raid;
      if (drop && raidPhase(raid, now) === "lobby") {
        const got = applyRaidAction(raid, "drop", { playerId: s.playerId, now, presence, memberCount: g.crew.members.length });
        if (got.ok) raid = got.raid;
      }
      return { ...g, presence, raid };
    });
    setS((p) => ({ ...p, atGym: drop ? null : now }));
    return;
  }
  setS((p) => ({ ...p, atGym: drop ? null : now }));
  if (!s.crew?.code) return;
  const wrote = await casPres(s.crew.code, (rec) => {
    const at = { ...(rec.at || {}) };
    if (drop) delete at[s.playerId];
    else at[s.playerId] = now;
    return { ...rec, at };
  });
  if (drop) await casRaid(s.crew.code, "drop", { playerId: s.playerId, now, presence: prunePresence(wrote?.at, now), memberCount: RAID_NEED });
}
function GymCheckBtn({ s, setS }) {
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
function GymSpotBanner({ s, setS }) {
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
function Crew({ s, setS, gainXp, rows, openProfile }) {
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
function downloadText(name, text) {
  const blob = new Blob([text], { type: "text/csv" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function exportWorkouts(s) {
  const rows = [["date", "title", "exercise", "set", "weight", "reps", "workout_xp"]];
  s.workouts.forEach((w) => w.exercises.forEach((ex) => ex.sets.forEach((st, i) => rows.push([w.date, w.title || "", ex.name, i + 1, st.w ?? "", st.r ?? "", w.xp ?? ""]))));
  downloadText("ascend-workouts.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}
function exportFood(s) {
  const rows = [["date", "food", "servings", "calories", "protein", "carbs", "fat"]];
  Object.keys(s.meals || {}).sort().forEach((d) => (s.meals[d] || []).forEach((m) => rows.push([d, m.name, m.qty, Math.round(m.cal * m.qty), Math.round(m.p * m.qty), Math.round(m.c * m.qty), Math.round(m.f * m.qty)])));
  downloadText("ascend-food.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  const src = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); if (row.some((x) => String(x).trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some((x) => String(x).trim())) rows.push(row); }
  return rows;
}
function parseImportDate(v) {
  const t = String(v || "").trim();
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const y = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${y}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const d = new Date(t);
  return Number.isNaN(+d) ? today() : dkey(d);
}
function hdrKey(h) { return String(h || "").trim().toLowerCase().replace(/[\s_]+/g, " "); }
function importWorkoutsFromCsv(s, text) {
  const table = parseCsv(text);
  if (table.length < 2) return { ok: false, err: "That file has no rows." };
  const head = table[0].map(hdrKey);
  const col = (...names) => {
    for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const iDate = col("date", "start time", "start_time", "workout date", "time");
  const iTitle = col("title", "workout name", "workout", "name");
  const iEx = col("exercise", "exercise name", "exercise title", "exercise_title");
  const iW = col("weight", "weight kg", "weight_kg", "kg", "lbs", "lb");
  const iR = col("reps", "rep", "repetitions");
  const iSet = col("set", "set order", "set_index", "set index");
  const iUnit = col("weight unit", "weight_unit", "unit");
  const iType = col("set type", "set_type");
  if (iEx < 0 || iDate < 0) return { ok: false, err: "Need a CSV with date, exercise, weight, and reps (Strong, Hevy, or Ascend export)." };
  const kgish = head.some((h) => h.includes("weight kg") || h === "weight_kg" || h === "kg");
  const sessions = new Map();
  table.slice(1).forEach((row) => {
    const name = String(row[iEx] || "").trim();
    if (!name) return;
    const kind = iType >= 0 ? String(row[iType] || "").toLowerCase() : "";
    if (kind.includes("warmup") || kind === "warmup") return;
    const date = parseImportDate(row[iDate]);
    const title = iTitle >= 0 ? String(row[iTitle] || "").trim() : "";
    const key = `${date}\t${title}`;
    if (!sessions.has(key)) sessions.set(key, { date, title, lifts: new Map() });
    const sess = sessions.get(key);
    if (!sess.lifts.has(name)) sess.lifts.set(name, []);
    let w = iW >= 0 ? parseFloat(String(row[iW] ?? "").replace(",", ".")) : NaN;
    if (!Number.isFinite(w)) w = "";
    const unit = iUnit >= 0 ? String(row[iUnit] || "").toLowerCase() : "";
    if (typeof w === "number" && (kgish || unit.includes("kg"))) w = Math.round(w * 2.20462 * 2) / 2;
    const r = iR >= 0 ? parseFloat(String(row[iR] ?? "").replace(",", ".")) : NaN;
    const drop = kind.includes("drop");
    sess.lifts.get(name).push({ w: w === "" ? "" : String(w), r: Number.isFinite(r) ? String(r) : "", done: true, drop, ord: iSet >= 0 ? +row[iSet] || 0 : sess.lifts.get(name).length });
  });
  const fingerprints = new Set((s.workouts || []).map((w) => `${w.date}|${(w.title || "").toLowerCase()}|${(w.exercises || []).map((e) => e.name).join(",")}`));
  const added = [];
  let skipped = 0;
  let acc = { ...s, workouts: [...(s.workouts || [])] };
  for (const sess of sessions.values()) {
    if (added.length >= 400) break;
    const exercises = [...sess.lifts.entries()].map(([name, sets]) => ({
      name,
      sets: sets.sort((a, b) => a.ord - b.ord).map(({ w, r, done, drop }) => ({ w, r, done, drop })),
    })).filter((e) => e.sets.some((st) => +st.r > 0 || +st.w > 0));
    if (!exercises.length) continue;
    const fp = `${sess.date}|${sess.title.toLowerCase()}|${exercises.map((e) => e.name).join(",")}`;
    if (fingerprints.has(fp)) { skipped++; continue; }
    fingerprints.add(fp);
    const res = workoutXp(acc, exercises, computeBests(acc), { workout: { gym: null, date: sess.date }, history: collectPrHistory(acc, findEx) });
    const workout = { id: uid(), date: sess.date, title: sess.title, exercises, volume: res.volume, xp: res.xp, lines: res.lines, prBonus: res.prBonus, source: "import" };
    acc = { ...acc, workouts: [...acc.workouts, workout] };
    added.push(workout);
  }
  if (!added.length) return { ok: false, err: skipped ? `Already imported (${skipped} duplicate session${skipped === 1 ? "" : "s"}).` : "No set rows found." };
  const r = recountXp({ ...s, workouts: [...(s.workouts || []), ...added] });
  try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
  return { ok: true, s: r.s, n: added.length, skipped, xp: r.s.xp - (s.xp || 0) };
}

/* ---------- Versus (PvP) ---------- */
function VersusPanel({ s, data, me, id, setS, gainXp }) {
  const mine = profileCard(s);
  const them = data;
  const mr = RANKS.find((r) => r.id === mine.rank) || RANKS[0], tr = RANKS.find((r) => r.id === them.rank) || RANKS[0];
  const row = (label, a, b, fmt = (v) => v) => {
    const av = a ?? 0, bv = b ?? 0;
    return <div key={label} className="grid items-center text-sm" style={{ gridTemplateColumns: "1fr auto 1fr" }}><span className="text-right font-bold" style={{ color: av > bv ? C.green : av < bv ? C.dim : C.text }}>{fmt(av)}</span><span className="body text-xs px-3" style={{ color: C.mute }}>{label}</span><span className="font-bold" style={{ color: bv > av ? C.green : bv < av ? C.dim : C.text }}>{fmt(bv)}</span></div>;
  };
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: "#FF2D6F" }}>
      <div className="flex items-center justify-between"><div className="font-bold flex items-center gap-2"><Swords size={18} style={{ color: "#FF2D6F" }} />Versus</div><span className="body text-xs" style={{ color: C.dim }}>duels & mog-offs</span></div>
      <div className="flex items-center gap-2">
        <VersusSide c={mine} r={mr} />
        <div className="text-3xl font-extrabold shrink-0" style={{ color: "#FF2D6F", textShadow: "0 0 14px rgba(255,45,111,.7)", fontFamily: "'Cinzel', serif" }}>VS</div>
        <VersusSide c={them} r={tr} />
      </div>
      <div className="space-y-1 py-2" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        {row("level", mine.lvl, them.lvl)}
        {row("points", mine.points, them.points, (v) => v.toLocaleString())}
        {row("streak", mine.streak, them.streak, (v) => `${v}d`)}
        {row("XP this week", mine.weekXp, them.weekOf === mine.weekOf ? them.weekXp : 0, (v) => v.toLocaleString())}
        {row("workouts", mine.stats?.workouts, them.stats?.workouts)}
      </div>
      <RivalryButton s={s} setS={setS} them={{ ...them, id }} />
      <DuelButton s={s} targetId={id} targetName={them.name} targetUid={them.uid} nemesis={isMutualNemesis(s, { ...them, id })} />
      <MogSection s={s} setS={setS} gainXp={gainXp} me={me} targetId={id} targetName={them.name} targetUid={them.uid} embedded />
    </div>
  );
}


function QuestAdd({ unit, onAdd }) {
  const [v, setV] = useState("");
  const go = () => { const n = +v; if (n > 0) { onAdd(n); setV(""); } };
  return (
    <div className="flex items-center gap-1">
      <input type="text" inputMode="decimal" className="inp text-sm" style={{ width: 62, padding: "5px 6px" }} placeholder={unit} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label={`Add ${unit}`} />
      <button onClick={go} disabled={!(+v > 0)} className="btn px-2.5 py-1.5 text-sm">Add</button>
    </div>
  );
}

/* ---------- Physique avatars ---------- */
function Physique({ tier = 0, height = 220, aura, caption, sex }) {
  const id = TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))];
  const rank = RANKS[Math.max(0, Math.min(6, Math.floor(tier)))];
  const female = bodySex({ sex }) === "f";
  const src = physiqueSrc(sex, tier);
  const [fail, setFail] = useState(false);
  useEffect(() => { setFail(false); }, [src]);
  return (
    <div className="relative flex flex-col items-center" style={{ height: height + (caption ? 24 : 0) }}>
      <div className="absolute" style={{ top: height * 0.08, width: height * 0.62, height: height * 0.8, borderRadius: "50%", background: `radial-gradient(closest-side, ${rank.glow}, transparent)`, filter: "blur(10px)" }} />
      {aura && aura !== "none" && <AuraCanvas aura={aura} mode="body" w={Math.round(height * (aura === "ascended" ? 0.48 : 0.8))} h={Math.round(height * (aura === "ascended" ? 0.66 : 1.02))} style={{ left: "50%", top: -height * 0.02, transform: "translateX(-50%)" }} />}
      {fail && <PhysiquePlaceholder female={female} height={height} color={rank.color} />}
      <img src={src} alt={`${id}-rank physique`} onError={() => setFail(true)} onLoad={() => setFail(false)} style={{ height, width: "auto", position: fail ? "absolute" : "relative", opacity: fail ? 0 : 1, pointerEvents: "none", filter: `drop-shadow(0 8px 24px rgba(0,0,0,.6))` }} />
      {caption && <div className="body text-xs mt-1" style={{ color: C.dim }}>{caption}</div>}
    </div>
  );
}

/* ---------- Auras + borders ---------- */
const BORDERS = [
  { id: "none", name: "Default", how: "" },
  { id: "steel", name: "Steel", how: "Any lift at D", tier: 1, css: "linear-gradient(135deg,#dfe6ee,#6f7c8c,#dfe6ee)" },
  { id: "gold", name: "Gold", how: "Any lift at B", tier: 3, css: "linear-gradient(135deg,#fff1b8,#c9962e,#fff1b8)" },
  { id: "prism", name: "Prism", how: "Any lift at A", tier: 4, css: "conic-gradient(#ff3cac,#ffb43c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)", spin: true },
  { id: "obsidian", name: "Obsidian", how: "Any lift at S", tier: 5, css: "conic-gradient(#000,#FFD447,#000,#FFD447,#000)", spin: true },
  { id: "bone", name: "Bone crown", how: "Defeat any boss", loot: "any", css: "linear-gradient(135deg,#f4ead2,#8a7a5c,#f4ead2)" },
  { id: "laurel", name: "Laurel", how: "Top 3 in a season", season: true, css: "linear-gradient(135deg,#caffb0,#2f8f3a,#caffb0)" },
  { id: "seraph", name: "Ophanim", how: "Finish a season as global #1", seasonFirst: true, img: "/season-one.svg", spin: true },
  { id: "relic", name: "Pulse", how: "Anime Crate · rare", crate: true, effect: "pulse", css: "linear-gradient(135deg,#7DF9FF,#38C6FF)" },
  { id: "orbit", name: "Orbit", how: "Anime Crate · rare", crate: true, effect: "orbit", css: "conic-gradient(#38C6FF,transparent,#FFD447,transparent,#38C6FF)" },
  { id: "chase", name: "Chase", how: "Anime Crate · rare", crate: true, effect: "chase", css: "conic-gradient(from 0deg,transparent 0 70%,#fff 88%,#38C6FF 100%)" },
  { id: "fracture", name: "Fracture", how: "Anime Crate · rare", crate: true, effect: "fracture", css: "repeating-conic-gradient(#ec4899 0 24deg,transparent 24deg 45deg)" },
  { id: "crate_tide", name: "Tide", how: "Anime Crate · rare", crate: true, effect: "tide", css: "conic-gradient(#38C6FF,#a855f7,#38C6FF)" },
];
const bestTier = (s) => Math.floor(Object.values(groupScores(s)).reduce((a, b) => Math.max(a, b), 0));
const longestRun = (days) => { let best = 0, run = 0, prev = null; [...days].sort().forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }); return best; };
// Feat auras: each has a check and a progress readout. Once met, the unlock is saved to s.auraUnlocks for good.
const AURA_TASKS = {
  streak30: (s) => { const v = longestRun(activeDays(s)); return { done: v >= 30, v: Math.min(v, 30), goal: 30, label: `Best streak ${Math.min(v, 30)} / 30 days` }; },
  weatherRun: (s) => { const hit = (s.workouts || []).some((w) => w.run?.wx && (w.run.wx.wet || w.run.wx.t <= 40)); return { done: hit, v: hit ? 1 : 0, goal: 1, label: hit ? "Braved the weather" : "Runs record the weather where you start" }; },
  dawn: (s) => { const hit = (s.workouts || []).some((w) => { if (!w.startedAt) return false; const h = new Date(w.startedAt).getHours(); return h >= 4 && h < 6; }); return { done: hit, v: hit ? 1 : 0, goal: 1, label: hit ? "Up before the sun" : "Counts from when you tap Start" }; },
  steps7: (s) => { const v = longestRun(Object.keys(s.steps || {}).filter((d) => (+s.steps[d] || 0) >= 10000)); return { done: v >= 7, v: Math.min(v, 7), goal: 7, label: `Best run ${Math.min(v, 7)} / 7 days at 10k` }; },
};
function unlocked(item, s) {
  if (item.id === "none") return true;
  if (s.test) return true;
  if (item.crate && s.crateUnlocks?.[item.id]) return true;
  if (item.soon) return false;
  if (item.reigning) return !!s.lbReigning;
  if (item.worldFirst) return Object.keys(s.worldFirsts || {}).length > 0;
  if (item.seraph) return backToBackSeasonFirsts(s);
  if (item.seasonFirst) return Object.values(s.seasonBadges || {}).some((b) => b.place === 1);
  if (item.task) return !!s.auraUnlocks?.[item.id] || AURA_TASKS[item.task](s).done;
  if (item.nemesis) return nemesisWins(s) >= item.nemesis;
  if (item.tier !== undefined) return bestTier(s) >= item.tier;
  if (item.loot) return item.loot === "any" ? (s.loot?.bosses || []).length > 0 : (s.loot?.bosses || []).includes(item.loot);
  if (item.ach) return !!s.ach?.[item.ach];
  if (item.season) return item.id === "champion" ? Object.values(s.seasonBadges || {}).some((b) => b.place === 1) : Object.keys(s.seasonBadges || {}).length > 0;
  return false;
}
function stripGhostCosmetics(s) {
  const real = { ...s, test: false };
  const auraOk = (id) => {
    const a = AURAS.find((x) => x.id === id);
    return !id || id === "none" || (a && unlocked(a, real));
  };
  const borderOk = (id) => {
    const b = BORDERS.find((x) => x.id === id);
    return !id || id === "none" || (b && unlocked(b, real));
  };
  const title = equippedTitle(real);
  return stripGhostCosmeticsState(s, { allowAura: auraOk, allowBorder: borderOk, titleId: title?.id || "none" });
}


/* ---------- Anime Crate ---------- */
const CRATE_RARITY = {
  common: { name: "Common", color: "#9AA7BD", refund: 60 },
  uncommon: { name: "Uncommon", color: "#3DF08A", refund: 90 },
  rare: { name: "Rare", color: "#38C6FF", refund: 130 },
  epic: { name: "Epic", color: "#B14BFF", refund: 170 },
  legendary: { name: "Legendary", color: "#FFD447", refund: 220 },
  mythic: { name: "Mythic", color: "#ec4899", core: "#fff", refund: 300 },
  gilded: { name: "Gilded", color: "#E8C56A", refund: 400 },
  secret: { name: "Secret", color: "#FFFFFF", refund: 750 },
};
Object.entries(CRATE_RARITY).forEach(([id, r]) => { r.chance = `${(ANIME_CRATE_WEIGHTS[id] * 100).toFixed(id === "gilded" || id === "secret" ? 1 : 1).replace(/\.0$/, "")}%`; });
const CRATE_RARITY_DESC = [...ANIME_RARITY_ORDER].reverse();
const CRATES = [
  {
    id: "reliquary-1",
    name: "Anime Crate",
    tag: "Original cosmetic crate",
    blurb: "Original titles, animated borders, and auras. Opens spend board points; duplicates return points.",
    cost: 250,
    theme: { gold: "#FFD447", void: "#6A00FF", rose: "#FF2D6F" },
    prizes: [
      { rarity: "common", type: "title", id: "chud", name: "OG", flavor: "Plain. Worn. Still here." },
      { rarity: "common", type: "title", id: "crate_rookie", name: "Rookie", flavor: "Every climb starts at zero." },
      { rarity: "common", type: "title", id: "crate_grinder", name: "Grinder", flavor: "The work is the point." },
      { rarity: "common", type: "title", id: "crate_no_days_off", name: "No Days Off", flavor: "Momentum has no calendar." },
      { rarity: "common", type: "title", id: "crate_certified", name: "Certified", flavor: "Stamped by effort." },
      { rarity: "uncommon", type: "title", id: "crate_ascended", name: "Ascended", flavor: "The ceiling moved." },
      { rarity: "uncommon", type: "title", id: "crate_built_different", name: "Built Different", flavor: "Same iron. Different answer." },
      { rarity: "uncommon", type: "aura", id: "sigil", name: "Spirit Spark", flavor: "Embers that refuse to fade." },
      { rarity: "uncommon", type: "aura", id: "steadybreath", name: "Steady Breath", flavor: "Stillness under pressure." },
      { rarity: "uncommon", type: "aura", id: "iaidraw", name: "Iai Draw", flavor: "Silence, then one perfect line." },
      { rarity: "rare", type: "border", id: "relic", name: "Pulse", flavor: "A rhythm around the frame." },
      { rarity: "rare", type: "border", id: "orbit", name: "Orbit", flavor: "Three lights refuse to land." },
      { rarity: "rare", type: "border", id: "chase", name: "Chase", flavor: "Always one step ahead." },
      { rarity: "rare", type: "border", id: "fracture", name: "Fracture", flavor: "Broken, never apart." },
      { rarity: "rare", type: "border", id: "crate_tide", name: "Tide", flavor: "The colour keeps moving." },
      { rarity: "epic", type: "aura", id: "glassfire", name: "Cursed Ember", flavor: "Violet fire at the edge." },
      { rarity: "epic", type: "aura", id: "stormstep", name: "Stormstep", flavor: "Thunder without warning." },
      { rarity: "epic", type: "aura", id: "zeropoint", name: "Zero Point", flavor: "The air freezes first." },
      { rarity: "epic", type: "aura", id: "ninetail", name: "Ninetail", flavor: "Nine flames answer as one." },
      { rarity: "legendary", type: "aura", id: "crownfall", name: "Redline", flavor: "Power beyond the gauge." },
      { rarity: "legendary", type: "aura", id: "ledger", name: "The Ledger", flavor: "Every debt is written." },
      { rarity: "legendary", type: "aura", id: "bonewright", name: "Bonewright", flavor: "Pressure makes armour." },
      { rarity: "mythic", type: "aura", id: "nullpoint", name: "Nullpoint", flavor: "Motion ends at the shell." },
      { rarity: "mythic", type: "aura", id: "carve", name: "Carve", flavor: "The frame remembers every cut." },
      { rarity: "mythic", type: "aura", id: "brandmark", name: "Brandmark", flavor: "One mark outlasts iron." },
      { rarity: "gilded", type: "aura", id: "eclipseheart", name: "Eclipseheart", flavor: "The old sun still burns." },
      { rarity: "secret", type: "aura", id: "blacksun", name: "Black Sun", flavor: "Daylight ends without a sound." },
    ],
  },
];
const ACTIVE_CRATE = CRATES[0];
function crateOwned(s, prize) {
  if (prize.type === "title") return !!s.crateUnlocks?.[prize.id] || TITLES.find((t) => t.id === prize.id)?.req(s);
  const item = prize.type === "aura" ? AURAS.find((a) => a.id === prize.id) : BORDERS.find((b) => b.id === prize.id);
  return item ? unlocked(item, s) : !!s.crateUnlocks?.[prize.id];
}
function secureRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
function crateReallyOwned(s, prize) {
  return crateOwned({ ...s, test: false }, prize);
}
function cratePityOf(s, sandbox) {
  if (sandbox) return Math.max(0, +(s.testCrate?.pity) || 0);
  return typeof s.cratePity === "number" ? s.cratePity : Math.max(0, +(s.cratePity?.legendary || 0));
}
function rollCratePrize(s, crate = ACTIVE_CRATE, rng = secureRandom, opts = {}) {
  const pity = opts.pity != null ? opts.pity : cratePityOf(s, opts.sandbox);
  if (opts.forcePrize) {
    const prize = opts.forcePrize;
    const rolled = rollAnimeRarity(pity, rng);
    const nextPity = prize.rarity === "secret" ? pity : (["legendary", "mythic", "gilded"].includes(prize.rarity) ? 0 : pity + 1);
    return { ...prize, nextPity, forced: true, rolled };
  }
  const rolled = opts.forceRarity
    ? { rarity: opts.forceRarity, pity: opts.forceRarity === "secret" ? pity : (["legendary", "mythic", "gilded"].includes(opts.forceRarity) ? 0 : pity + 1), forced: true }
    : rollAnimeRarity(pity, rng);
  const pool = crate.prizes.filter((p) => p.rarity === rolled.rarity);
  const pick = pool[Math.min(Math.max(pool.length - 1, 0), Math.floor(rng() * Math.max(pool.length, 1)))] || crate.prizes[0];
  return { ...pick, nextPity: rolled.pity, forced: rolled.forced };
}
function packCratePrize(s, prize) {
  const dupe = crateReallyOwned(s, prize);
  const refund = dupe ? (CRATE_RARITY[prize.rarity]?.refund || 0) : 0;
  return { ...prize, dupe, refund };
}
function commitCratePrize(p, prize, crate, rollId, { sandbox = false, equip = true } = {}) {
  const packed = packCratePrize(p, prize);
  const entry = { t: Date.now(), rollId, crate: crate.id, rarity: prize.rarity, type: prize.type, id: prize.id, name: prize.name, dupe: packed.dupe, refund: packed.refund };
  if (sandbox) {
    const log = [entry, ...(p.testCrate?.log || [])].slice(0, 40);
    return { ...p, testCrate: { pity: prize.nextPity, log } };
  }
  if (crateBank(p) < crate.cost) return p;
  if (rollId && (p.crateLog || [])[0]?.rollId === rollId) return p;
  const spent = crate.cost - packed.refund;
  const crateUnlocks = { ...(p.crateUnlocks || {}), [prize.id]: today() };
  const look = { ...(p.profile.look || {}) };
  const profile = { ...p.profile, look };
  if (equip && !packed.dupe) {
    if (prize.type === "aura") { look.auraPrev = look.aura; look.aura = prize.id; }
    if (prize.type === "border") look.border = prize.id;
    if (prize.type === "title") profile.title = prize.id;
  }
  const log = [entry, ...(p.crateLog || [])].slice(0, 40);
  return { ...p, crateV: 2, crateSpent: Math.max(0, crateSpentOf(p) + spent), crateUnlocks, cratePity: prize.nextPity, crateLog: log, profile };
}
function applyCratePrize(p, prize, crate, rollId) {
  return commitCratePrize(p, prize, crate, rollId, { sandbox: false, equip: true });
}
function CrateTeaser({ s, onOpen }) {
  const crate = ACTIVE_CRATE;
  const bank = crateBank(s);
  return (
    <button type="button" onClick={onOpen} className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 text-left" style={{ borderRadius: 12, background: "linear-gradient(90deg, rgba(106,0,255,.18), rgba(255,212,71,.1))", border: `1px solid ${C.gold}55`, animation: "cratepulse 2.8s ease-in-out infinite" }}>
      <Crown size={18} style={{ color: C.gold }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{crate.name}</span>
        <span className="block body text-xs" style={{ color: C.dim }}>{s.test ? "Ghost sandbox · unlimited opens" : `${bank.toLocaleString()} pts ready · ${crate.cost} per open`}</span>
      </span>
      <ChevronRight size={16} style={{ color: C.gold }} />
    </button>
  );
}
function CrateVault({ s, setS }) {
  const crate = ACTIVE_CRATE;
  const sandbox = !!s.test;
  const bank = crateBank(s);
  const pity = cratePityOf(s, sandbox);
  const log = sandbox ? (s.testCrate?.log || []) : (s.crateLog || []);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(null);
  const [typeTab, setTypeTab] = useState("aura");
  const [secretToast, setSecretToast] = useState(false);
  const [forceRarity, setForceRarity] = useState("");
  const [forcePrizeId, setForcePrizeId] = useState("");
  const [previewLook, setPreviewLook] = useState(null);
  const openOnce = (n = 1) => {
    if (busy) return;
    if (!sandbox && bank < crate.cost) return;
    setBusy(true);
    const forcePrize = forcePrizeId ? crate.prizes.find((x) => x.id === forcePrizeId) : null;
    const forceR = forceRarity || undefined;
    setForceRarity("");
    setForcePrizeId("");
    let cursor = s;
    const rolls = [];
    for (let i = 0; i < n; i++) {
      const prize = rollCratePrize(cursor, crate, secureRandom, { sandbox, pity: cratePityOf(cursor, sandbox), forceRarity: i === 0 ? forceR : undefined, forcePrize: i === 0 ? forcePrize : null });
      const rollId = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      rolls.push({ prize, rollId });
      cursor = sandbox ? commitCratePrize(cursor, prize, crate, rollId, { sandbox: true, equip: false }) : applyCratePrize(cursor, prize, crate, rollId);
    }
    const last = rolls[rolls.length - 1];
    const packed = { ...last.prize, ...packCratePrize(s, last.prize), sandbox };
    const secret = last.prize.rarity === "secret";
    if (secret) {
      document.documentElement.classList.add("black-sun-pull");
      Groove.stop(); Jingle.stop();
    }
    setTimeout(() => {
      setS((p) => {
        let next = p;
        rolls.forEach(({ prize, rollId }) => { next = sandbox ? commitCratePrize(next, prize, crate, rollId, { sandbox: true, equip: false }) : applyCratePrize(next, prize, crate, rollId); });
        return next;
      });
      setShow(packed);
      setBusy(false);
      document.documentElement.classList.remove("black-sun-pull");
      if (secret) {
        setSecretToast(true); setTimeout(() => setSecretToast(false), 4200);
        if (!sandbox) XpSync.add({ e: `crate_secret_${last.rollId}`, a: 0, m: "Anime Crate: Black Sun", d: today(), t: Date.now() });
      }
      if (["secret", "gilded", "mythic", "legendary"].includes(last.prize.rarity)) SFX.levelUp();
      else if (last.prize.rarity === "epic") SFX.achievement();
      else SFX.click();
    }, secret ? 800 : 900);
  };
  const roll = () => openOnce(1);
  const meta = show && CRATE_RARITY[show.rarity];
  const visible = crate.prizes.filter((p) => p.type === typeTab && (p.rarity !== "secret" || s.test || crateOwned(s, p) || show?.id === p.id)).sort((a, b) => CRATE_RARITY_DESC.indexOf(a.rarity) - CRATE_RARITY_DESC.indexOf(b.rarity));
  const secretLocked = typeTab === "aura" && !s.test && !s.crateUnlocks?.blacksun && show?.id !== "blacksun";
  const canOpen = sandbox || bank >= crate.cost;
  return (
    <>
    <div className="panel overflow-hidden" style={{ borderColor: `${crate.theme.gold}44` }}>
      <div className="px-4 pt-4 pb-3 space-y-1" style={{ background: "radial-gradient(80% 90% at 50% 0%, rgba(106,0,255,.28), transparent 70%)" }}>
        <div className="body text-xs uppercase tracking-wider font-bold" style={{ color: C.gold }}>{crate.tag}{sandbox ? " · sandbox" : ""}</div>
        <div className="text-xl font-bold">{crate.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{sandbox ? "Ghost sandbox. Opens are free and do not save unlocks, points, or pity on your real account." : crate.blurb}</div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="body text-sm" style={{ color: C.dim }}>Board points</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: sandbox || bank >= crate.cost ? C.gold : C.mute }}>{sandbox ? "Unlimited" : bank.toLocaleString()}</span>
        </div>
        {!sandbox && crateAuraBest(s) && <div className="body text-xs" style={{ color: C.gold }}>{crateAuraBest(s).name} · +{Math.round(crateAuraBest(s).ptsMult * 100)}% on all points</div>}
        <button type="button" disabled={busy || !canOpen} onClick={roll} className="btn w-full py-3 flex items-center justify-center gap-2" style={{ opacity: canOpen ? 1 : 0.5 }}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {busy ? "Opening…" : sandbox ? "Open · free" : `Open · ${crate.cost} pts`}
        </button>
        {!sandbox && bank < crate.cost && <div className="body text-xs text-center" style={{ color: C.mute }}>Need {(crate.cost - bank).toLocaleString()} more points.</div>}
        {sandbox && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => openOnce(10)} className="ghost py-2 text-sm font-bold">Open ×10</button>
              <button type="button" disabled={busy} onClick={() => setS((p) => ({ ...p, testCrate: { pity: 0, log: [] } }))} className="ghost py-2 text-sm font-bold">Reset sandbox</button>
            </div>
            <label className="body text-xs block" style={{ color: C.dim }}>Force rarity
              <select className="inp mt-1" value={forceRarity} onChange={(e) => { setForceRarity(e.target.value); if (e.target.value) setForcePrizeId(""); }} aria-label="Force rarity">
                <option value="">RNG</option>
                {ANIME_RARITY_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="body text-xs block" style={{ color: C.dim }}>Force prize
              <select className="inp mt-1" value={forcePrizeId} onChange={(e) => { setForcePrizeId(e.target.value); if (e.target.value) setForceRarity(""); }} aria-label="Force prize">
                <option value="">RNG</option>
                {crate.prizes.map((p) => <option key={p.id} value={p.id}>{p.rarity} · {p.name}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="px-2.5 py-2" style={{ borderRadius: 10, background: C.glass, border: `1px solid ${C.glassLine}` }}>
          <div className="body text-xs flex justify-between" style={{ color: C.mute }}><span>Legendary+ pity{sandbox ? " (sandbox)" : ""}</span><span>Secret stays 1/1000</span></div>
          <div className="text-sm font-bold tabular-nums">{Math.min(ANIME_PITY_AT - 1, pity)} / {ANIME_PITY_AT - 1} misses</div>
        </div>
        <div className="grid grid-cols-3 gap-1">{[["aura", "Auras"], ["title", "Titles"], ["border", "Borders"]].map(([id, label]) => <button key={id} onClick={() => setTypeTab(id)} className="py-2 text-xs font-bold" style={{ borderRadius: 9, background: typeTab === id ? C.cyan : C.soft, color: typeTab === id ? "#001018" : C.text }}>{label}</button>)}</div>
        <div className="space-y-1.5">
          {secretLocked && <div className="flex items-center gap-2 py-2 px-2" style={{ borderRadius: 10, background: "#050505", border: "1px solid #333" }}><Lock size={14} /><span className="w-20 text-xs font-bold uppercase">Secret</span><span className="flex-1 text-sm font-semibold">???</span><span className="body text-xs">undiscovered</span></div>}
          {visible.map((p) => {
            const r = CRATE_RARITY[p.rarity];
            const have = crateOwned(s, p);
            const gilded = p.rarity === "gilded";
            const mythic = p.rarity === "mythic";
            return (
              <div key={p.id} className="relative flex items-center gap-2 py-1.5 px-1.5 overflow-hidden" style={{ borderRadius: 10, background: gilded ? "linear-gradient(90deg, rgba(255,212,71,.14), transparent 70%)" : mythic ? "linear-gradient(90deg,rgba(168,85,247,.18),rgba(236,72,153,.12),transparent)" : "transparent", border: gilded ? "1px solid rgba(255,212,71,.35)" : mythic ? "1px solid rgba(236,72,153,.4)" : "1px solid transparent" }}>
                {gilded && <span aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "32%", background: "linear-gradient(90deg, transparent, rgba(255,246,201,.3), transparent)", animation: "gildsweep 4.8s ease-in-out infinite" }} /></span>}
                <span className="w-20 text-xs font-bold tracking-wider uppercase" style={{ color: r.color }}>{r.name}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate" style={{ color: have ? C.text : C.dim }}>{p.name}</span><span className="block body text-xs truncate" style={{ color: C.mute }}>{p.flavor}</span></span>
                {have ? <Check size={14} style={{ color: C.green }} /> : <Lock size={12} style={{ color: C.mute }} />}
                <span className="body text-xs tabular-nums w-12 text-right" style={{ color: C.mute }}>{r.chance}</span>
              </div>
            );
          })}
        </div>
        {log.length > 0 && (
          <div className="body text-xs" style={{ color: C.mute }}>Last: {log.slice(0, 6).map((x) => x.name).join(" · ")}</div>
        )}
      </div>
    </div>
      {(busy || show) && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6" style={{ background: "rgba(2,4,12,.86)" }} onClick={() => !busy && setShow(null)}>
          {busy && <div className="w-28 h-28" style={{ borderRadius: 18, background: `conic-gradient(${crate.theme.gold}, ${crate.theme.void}, ${crate.theme.rose}, ${crate.theme.gold})`, animation: "cratespin 0.9s linear infinite", boxShadow: `0 0 40px ${crate.theme.gold}` }} />}
          {show && meta && (
            <div style={{ animation: "cratereveal .55s cubic-bezier(.2,.8,.2,1)", width: "100%", maxWidth: "24rem" }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 space-y-3 text-center" style={{ background: C.sheet, border: `1px solid ${meta.color}`, borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,.18)" }}>
              <div className="text-xs font-extrabold tracking-widest uppercase" style={{ color: meta.color }}>{meta.name}</div>
              {show.type === "aura" ? (
                <div className="relative mx-auto overflow-hidden" style={{ width: 160, height: 160 }}><AuraCanvas aura={previewLook?.aura || show.id} w={160} h={160} ringR={52} style={{ left: 0, top: 0 }} /></div>
              ) : show.type === "border" ? (
                <div className="relative mx-auto" style={{ width: 72, height: 72 }}><AnimatedBorder border={BORDERS.find((b) => b.id === show.id)} color={C.cyan} /><div className="absolute" style={{ inset: 7, borderRadius: 999, background: C.sheet }} /></div>
              ) : (
                <div className="text-3xl font-black tracking-wider uppercase" style={{ color: C.gold }}>{show.name}</div>
              )}
              <div className="text-xl font-bold">{show.name}</div>
              <div className="body text-sm" style={{ color: C.dim }}>{show.sandbox ? (show.dupe ? "Already owned on the real account. Sandbox didn't change it." : "Sandbox pull — not saved to the real account.") : (show.dupe ? `Already owned · ${show.refund} pts back` : "Unlocked. Equip it in Customize.")}</div>
              {show.sandbox && (
                <button type="button" className="ghost w-full py-3 font-bold" onClick={() => {
                  setS((p) => {
                    const look = { ...(p.profile.look || {}) };
                    const profile = { ...p.profile, look };
                    if (show.type === "aura") { look.auraPrev = look.aura; look.aura = show.id; }
                    else if (show.type === "border") look.border = show.id;
                    else if (show.type === "title") profile.title = show.id;
                    return { ...p, profile };
                  });
                  setPreviewLook(show.type === "aura" ? { aura: show.id } : show.type === "border" ? { border: show.id } : null);
                }}>Equip preview</button>
              )}
              <button type="button" onClick={() => { setShow(null); setPreviewLook(null); }} className="btn w-full py-3">Continue</button>
              </div>
            </div>
          )}
        </div>
      )}
      {secretToast && <div className="fixed z-[90] left-1/2 top-8 -translate-x-1/2 px-5 py-3 font-black tracking-widest uppercase" style={{ background: "#fff", color: "#000", boxShadow: "0 0 40px #fff", borderRadius: 10 }}>Secret found · Black Sun</div>}
    </>
  );
}
/* ---------- The Juice ---------- */
function JuiceBurst({ kind }) {
  const big = kind === "pr";
  const n = big ? 42 : 22;
  const cols = big ? ["#FFD447", "#FFFFFF", "#FF9340", "#F5D27A"] : ["#38C6FF", "#FFFFFF", "#3DF08A"];
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[65] pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: big ? "radial-gradient(circle at 50% 45%, rgba(255,212,71,.35), transparent 60%)" : "radial-gradient(circle at 50% 45%, rgba(56,198,255,.22), transparent 55%)", animation: "juiceflash .7s ease-out forwards" }} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2, d = (big ? 180 : 120) + ((i * 37) % 120);
        return <span key={i} style={{ position: "absolute", left: "50%", top: "45%", width: i % 4 ? 6 : 10, height: i % 5 ? 6 : 14, borderRadius: i % 3 ? 999 : 2, background: cols[i % cols.length], boxShadow: `0 0 8px ${cols[i % cols.length]}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d + 60}px`, "--rot": `${(i * 47) % 360}deg`, animation: `juicespark ${0.9 + (i % 5) * 0.12}s cubic-bezier(.15,.8,.3,1) forwards` }} />;
      })}
      {big && <div className="absolute left-1/2 top-[38%] text-5xl font-black tracking-widest" style={{ transform: "translateX(-50%)", color: "#FFD447", textShadow: "0 0 30px rgba(255,212,71,.9)", fontFamily: "'Cinzel', serif", animation: "juicetext 1.4s ease-out forwards" }}>PR</div>}
    </div>
  );
}

/* ---------- Share receipts ---------- */

/* ---------- Boss fights ---------- */
// Damage dealt each day this month, with that day's sleep/mood buff baked in
function dayDamageMap(s, mk = monthKey()) {
  const out = {};
  (s.workouts || []).filter((w) => w.date.startsWith(mk)).forEach((w) => {
    let dmg = 0;
    w.exercises.forEach((ex) => { const def = findEx(s, ex.name); workSets(ex.sets).forEach((st) => {
      if (def.type === "timed") { if (def.group === "Cardio") dmg += (+st.w || 0) * 800; return; }
      const wt = def.type === "assisted" ? movedLb(s.profile, +st.w || 0) : +st.w || 0;
      dmg += wt * (+st.r || 0) + (+st.r || 0) * 5;
    }); });
    out[w.date] = (out[w.date] || 0) + dmg;
  });
  Object.keys(out).forEach((d) => { out[d] = Math.round(out[d] * buffOn(s, d)); });
  return out;
}
// Sleeping well and feeling good makes you hit harder today
function buffToday(s) { return buffOn(s, today()); }
function buffOn(s, d) {
  if (!s) return 1;
  const ci = s.checkins?.[d] || {};
  let m = 1;
  if (ci.sleep >= 8) m += 0.05; else if (ci.sleep === 7) m += 0.02;
  if (ci.mood === "Fired up") m += 0.05; else if (ci.mood === "Good") m += 0.02;
  return Math.round(m * 100) / 100;
}
// Damage from `since` (a date) onward. Your own comes live from your log; others come from their board card.
const bossDamage = (card, mk, selfState = null, since = `${mk}-01`) => {
  const sumFrom = (dd) => Object.entries(dd || {}).filter(([d]) => d >= since && d.startsWith(mk)).reduce((a, [, v]) => a + (+v || 0), 0);
  if (selfState) return sumFrom(dayDamageMap(selfState, mk));
  if (card?.month?.key !== mk) return 0;
  if (card.month.dd) return sumFrom(card.month.dd);
  // Older app versions only sent a monthly total: count it for the global boss, not for a crew that started later
  return since <= `${mk}-01` ? Math.round((card.month.volume || 0) + (card.month.reps || 0) * 5 + (card.month.miles || 0) * 800) : 0;
};
function BossFight({ s, setS, gainXp, rows, openProfile, scope = "global", crewId = null }) {
  const mk = monthKey();
  const [crew, setCrew] = useState(null);
  const [roster, setRoster] = useState(null);
  useEffect(() => { if (crewId) readCrew(crewId).then(setCrew); }, [crewId]);
  useEffect(() => {
    if (scope !== "crew" || !crewId) { setRoster(null); return; }
    let stop = false;
    loadCrewRoster(crewId, s, rows).then((got) => { if (!stop) { setRoster(got.rows); if (got.rec) setCrew(got.rec); } }).catch(() => {});
    return () => { stop = true; };
  }, [scope, crewId, rows, s.playerId, s.crew?.since]);
  const mi = (parseInt(mk.slice(5, 7), 10) - 1) % BOSSES.length;
  const boss = scope === "crew" ? BOSSES[(mi + 6) % BOSSES.length] : BOSSES[mi];
  // Crew members are whoever's board card, crew record, or join key says they're in this crew
  const meRow = rows.find((r) => r.id === s.playerId) || { id: s.playerId, name: s.profile.name, look: s.profile.look };
  const crewRows = liveBoard(scope === "crew" ? (roster?.length ? roster : [meRow, ...rows.filter((r) => r.id !== s.playerId && r.crew?.code === crewId)]) : rows).filter((r) => !(s.test && r.id === s.playerId));
  const players = Math.max(1, crewRows.length);
  const hp = scope === "crew" ? crewBossHp(players) : globalBossHp(players);
  const sinceOf = (r) => (scope !== "crew" ? `${mk}-01` : r.id === s.playerId ? s.crew?.since || today() : r.crew?.since || today());
  const dmg = crewRows.map((r) => ({ r, d: bossDamage(r, mk, r.id === s.playerId ? s : null, sinceOf(r)) })).sort((a, b) => b.d - a.d);
  const total = dmg.reduce((a, x) => a + x.d, 0);
  const left = Math.max(0, hp - total), dead = left === 0, pct = left / hp;
  const mine = dmg.find((x) => x.r.id === s.playerId)?.d || 0;
  const claimed = s.loot?.claimed?.[`${mk}_${scope}`] || (scope === "global" && s.loot?.claimed?.[mk]);
  const [hit, setHit] = useState(false);
  const [raid, setRaid] = useState(null);
  const prev = useRef(total);
  // Kill recap: saved once, the first time you see the global boss dead with damage of your own on it
  useEffect(() => {
    if (scope !== "global" || !dead || mine <= 0) return;
    const key = `${mk}_global`;
    setS((p) => (p.bossRecaps?.[key] ? p : { ...p, bossRecaps: { ...(p.bossRecaps || {}), [key]: { boss: boss.id, name: boss.name, mk, mine, total, players, hp, t: Date.now(), seen: false } } }));
  }, [scope, dead, mine, total, players, hp, mk, boss.id]);
  // World First: claim the killing blow if the boss was still alive before my latest workout,
  // stamped with when that workout ended so every device resolves the same winner.
  const [worldFirst, setWorldFirst] = useState(null);
  useEffect(() => {
    if (scope !== "global" || !dead || mine <= 0 || s.test || s.wfClaim?.[mk] || !window.storage?.set) return;
    const mineW = (s.workouts || []).filter((w) => isWorkout(w) && w.date.startsWith(mk));
    const lastW = mineW[mineW.length - 1];
    if (!lastW) return;
    const before = bossDamage(meRow, mk, { ...s, workouts: (s.workouts || []).filter((w) => w.id !== lastW.id) }, sinceOf(meRow));
    if (total - (mine - before) >= hp) return;
    const t = lastW.startedAt ? lastW.startedAt + (lastW.minutes || 0) * 60000 : Date.now();
    (async () => {
      try {
        await window.storage.set(`wfclaim:${mk}:${s.playerId}`, JSON.stringify({ id: s.playerId, name: s.profile.name, t, boss: boss.id }), true);
        setS((p) => ({ ...p, wfClaim: { ...(p.wfClaim || {}), [mk]: true } }));
      } catch { /* offline, try again next open */ }
    })();
  }, [scope, dead, mine, total, hp, mk]);
  useEffect(() => {
    if (scope !== "global" || !window.storage?.list) return;
    let stop = false;
    const pull = async () => {
      try {
        const win = resolveWorldFirst(await readShared(`wfclaim:${mk}:`));
        if (stop) return;
        setWorldFirst(win);
        if (win && win.id === s.playerId) setS((p) => (p.worldFirsts?.[mk] ? p : { ...p, worldFirsts: { ...(p.worldFirsts || {}), [mk]: boss.id } }));
      } catch { /* offline */ }
    };
    pull();
    const id = setInterval(pull, 30000);
    return () => { stop = true; clearInterval(id); };
  }, [scope, mk, dead, s.wfClaim?.[mk]]);
  useEffect(() => { if (total > prev.current) { setHit(true); const t = setTimeout(() => setHit(false), 500); prev.current = total; return () => clearTimeout(t); } prev.current = total; }, [total]);
  useEffect(() => {
    if (scope !== "crew" || !crewId) { setRaid(null); return; }
    let stop = false;
    const pull = async () => { try { const r = await readRaid(crewId); if (!stop) setRaid(r); } catch { /* */ } };
    pull();
    const id = setInterval(pull, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [scope, crewId]);
  const monthName = new Date(`${mk}-01T12:00`).toLocaleDateString(undefined, { month: "long" });
  const claim = () => {
    setS((p) => ({ ...p, loot: { ...(p.loot || {}), bosses: [...new Set([...(p.loot?.bosses || []), boss.id])], claimed: { ...(p.loot?.claimed || {}), [`${mk}_${scope}`]: true } } }));
    gainXp(BOSS_XP, `Defeated ${boss.name}`, `boss_${mk}_${boss.id}${crewId ? `_${crewId}` : ""}`); juice("pr");
  };
  return (
    <div className="panel p-5 space-y-4 overflow-hidden" style={{ borderColor: `${boss.color}55` }}>
      <div className="relative -mx-5 -mt-5 px-5 pt-4 pb-1 flex flex-col items-center text-center" style={{ background: dead ? "none" : `radial-gradient(70% 75% at 50% 48%, ${pct <= 0.5 ? "rgba(255,45,45,.16)" : `${boss.color}22`}, transparent 72%)` }}>
        <div className="flex items-center gap-2">
          <span className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>{scope === "crew" ? `${crew?.name || "Crew"} boss` : `Global boss · ${monthName}`}</span>
          {pct <= 0.5 && !dead && <span className="text-xs font-extrabold px-2" style={{ borderRadius: 999, color: "#fff", background: "#D61F3A", boxShadow: "0 0 12px rgba(255,45,45,.6)", animation: "aurapulse 1.1s ease-in-out infinite" }}>Enraged</span>}
        </div>
        <div className="relative mt-2" style={{ width: 156, height: 156 }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "12%", right: "12%", bottom: 2, height: 14, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.55), transparent)" }} />
          <BossArt boss={boss} pct={pct} dead={dead} hit={hit} size={156} />
        </div>
        <div className="text-xl font-bold mt-1" style={{ color: dead ? C.dim : C.text, textDecoration: dead ? "line-through" : "none" }}>{boss.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{boss.tag}</div>
        {scope === "global" && worldFirst && <div className="body text-xs font-semibold mt-1" style={{ color: "#C2001F" }}>World First · {worldFirst.id === s.playerId ? "you" : worldFirst.name} landed the killing blow</div>}
      </div>
      <div>
        <div className="h-4 overflow-hidden relative" style={{ borderRadius: 999, background: "rgba(255,255,255,.08)", boxShadow: pct <= 0.5 && !dead ? "0 0 14px rgba(255,45,45,.5)" : "none" }}>
          <div className="h-full" style={{ width: `${(left / hp) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, #FF2D6F, ${boss.color})`, transition: "width .8s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 14px ${boss.color}` }} />
        </div>
        <div className="flex justify-between body text-xs mt-1.5" style={{ color: C.dim }}><span>{dead ? "Defeated" : `${left.toLocaleString()} HP left`}</span><span>{hp.toLocaleString()} HP</span></div>
      </div>
      {scope === "crew" && raidActive(raid) && (
        <div className="body text-xs font-bold flex justify-between" style={{ color: C.orange }}>
          <span>Raid night live · {fmtClock(Math.max(0, Math.ceil((raid.end - Date.now()) / 1000)))}</span>
          <span>{Object.keys(raid.hits || {}).length}/{RAID_NEED} logged{raid.cleared ? " · cleared" : ""}</span>
        </div>
      )}
      <div className="body text-xs" style={{ color: C.dim }}>{scope === "crew" ? `Crew HP is ${hp.toLocaleString()} for ${players} member${players === 1 ? "" : "s"} (same formula as the global boss: 150k + 150k per person). Only damage after you joined counts (joined ${fmtDay(s.crew?.since || today())}).` : `Scaled to the ${players} player${players === 1 ? "" : "s"} in the season (${hp.toLocaleString()} HP).`} Every pound lifted is 1 damage, every rep is 5, and every cardio mile is 800. Logging 8h sleep and a good mood adds up to a 1.1× multiplier today (yours: {buffToday(s)}×). Loot: the {AURAS.find((a) => a.loot === boss.id)?.name} aura, the {boss.title} title, the Bone crown border, and {BOSS_XP} XP for everyone who hit it.</div>
      {dmg.filter((x) => x.d > 0).length > 0 && (
        <div className="space-y-1.5">
          {dmg.filter((x) => x.d > 0).map(({ r, d }) => (
            <button key={r.key || r.id} onClick={() => openProfile(r.id)} className="w-full flex items-center gap-2 text-sm">
              <span className="flex-1 text-left truncate"><FancyName name={r.name} look={r.look} /></span>
              <span className="body text-xs" style={{ color: C.dim }}>{Math.round((d / Math.max(1, total)) * 100)}%</span>
              <span className="font-semibold tabular-nums">{d.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
      {dead && mine > 0 && !claimed && <button onClick={claim} className="btn w-full py-3">Claim loot</button>}
      {claimed && <div className="body text-sm text-center" style={{ color: C.green }}>Loot claimed. Equip it in Profile → Customize.</div>}
      {dead && mine === 0 && <div className="body text-xs text-center" style={{ color: C.dim }}>Log a workout this month to earn a share of the loot.</div>}
      {scope === "global" && <PastKills s={s} />}
    </div>
  );
}
// Everything you earned from a boss you helped kill, in one card you can also share
const recapLoot = (bossId) => {
  const b = BOSSES.find((x) => x.id === bossId);
  return b ? [AURAS.find((a) => a.loot === b.id)?.name, b.title, "Bone crown"].filter(Boolean) : [];
};
const recapShare = (rec) => Math.round((rec.mine / Math.max(1, rec.total)) * 100);
function BossRecapCard({ s, rec, onDismiss }) {
  const boss = BOSSES.find((b) => b.id === rec.boss);
  const monthName = new Date(`${rec.mk}-01T12:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (!boss) return null;
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: `${boss.color}66` }}>
      <div className="flex items-center gap-3">
        <BossArt boss={boss} pct={0} dead size={56} />
        <div className="flex-1 min-w-0">
          <div className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>{monthName} · boss defeated</div>
          <div className="text-lg font-bold truncate" style={{ color: boss.color }}>{boss.name}</div>
          <div className="body text-xs" style={{ color: C.sub }}>{rec.mine.toLocaleString()} damage · {recapShare(rec)}% of the kill</div>
        </div>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Loot: {recapLoot(rec.boss).join(", ")}, and {BOSS_XP} XP.</div>
      <div className="flex gap-2">
        {onDismiss && <button onClick={onDismiss} className="ghost flex-1 py-2 text-sm font-bold">Nice</button>}
        <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: "Boss defeated", headline: boss.name, sub: monthName, tierImg: Math.floor(overallInfo(s).score), rows: [["Your damage", rec.mine.toLocaleString()], ["Share of the kill", `${recapShare(rec)}%`], ["Fighters", rec.players], ["Loot", recapLoot(rec.boss)[0] || "—"]] })} />
      </div>
    </div>
  );
}
function PastKills({ s }) {
  const [open, setOpen] = useState(false);
  const list = Object.entries(s.bossRecaps || {}).filter(([k]) => k.endsWith("_global")).map(([, v]) => v).sort((a, b) => (a.mk < b.mk ? 1 : -1));
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(!open)} className="body text-xs underline" style={{ color: C.cyan }}>{open ? "Hide" : `Past kills (${list.length})`}</button>
      {open && list.map((rec) => <BossRecapCard key={rec.mk} s={s} rec={rec} />)}
    </div>
  );
}
// First app open after the kill: show the recap once, then it lives under the boss
function BossRecapBanner({ s, setS }) {
  const entry = Object.entries(s.bossRecaps || {}).find(([k, v]) => k.endsWith("_global") && !v.seen);
  if (!entry) return null;
  const [key, rec] = entry;
  const seen = () => setS((p) => ({ ...p, bossRecaps: { ...(p.bossRecaps || {}), [key]: { ...p.bossRecaps[key], seen: true } } }));
  return <BossRecapCard s={s} rec={rec} onDismiss={seen} />;
}

/* ---------- Seasons ---------- */
const seasonKey = (d = today()) => `${d.slice(0, 4)}-S${Math.floor((parseInt(d.slice(5, 7), 10) - 1) / 3) + 1}`;
const seasonStart = (key) => { const [y, q] = key.split("-S"); return `${y}-${String((+q - 1) * 3 + 1).padStart(2, "0")}-01`; };
const nextSeasonStart = (key) => { const [y, q] = key.split("-S").map(Number); return q === 4 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`; };
const prevSeasonKey = (key) => { const [y, q] = key.split("-S").map(Number); return q === 1 ? `${y - 1}-S4` : `${y}-S${q - 1}`; };
const seasonXp = (s, key) => { const a = seasonStart(key), b = nextSeasonStart(key); return Object.entries(s.xpLog || {}).filter(([d]) => d >= a && d < b).reduce((t, [, v]) => t + v, 0); };
async function settleSeason(s, setS, rows) {
  const last = prevSeasonKey(seasonKey());
  let rec = null;
  try { const r = await window.storage.get(`season:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    const ranked = rows.filter((r) => r.prevSeason?.key === last && r.prevSeason.xp > 0).sort((a, b) => b.prevSeason.xp - a.prevSeason.xp).slice(0, 3);
    if (!ranked.length) return;
    rec = { key: last, winners: ranked.map((r, i) => ({ id: r.id, name: r.name, xp: r.prevSeason.xp, place: i + 1 })), t: Date.now() };
    try { await window.storage.set(`season:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine && !s.seasonBadges?.[last]) setS((p) => ({ ...p, seasonBadges: { ...(p.seasonBadges || {}), [last]: { place: mine.place, xp: mine.xp } } }));
}
function applyReigning(s, setS, rows) {
  const sk = seasonKey();
  const xpOf = (r) => (r?.season?.key === sk ? r.season.xp : 0) || 0;
  const mine = seasonXp(s, sk);
  const myId = s.playerId;
  const bestOther = (rows || []).filter((r) => (r.id || (r.key || "").slice(3)) !== myId).reduce((m, r) => Math.max(m, xpOf(r)), 0);
  const on = !!s.lb && !s.test && mine > 0 && mine > bestOther;
  setS((p) => {
    const look = { ...(p.profile.look || {}) };
    let changed = !!p.lbReigning !== on;
    if (!on && look.aura === "ascended" && !p.test) {
      look.aura = look.auraPrev && look.auraPrev !== "ascended" ? look.auraPrev : "none";
      changed = true;
    }
    if (!changed) return p;
    return { ...p, lbReigning: on, profile: { ...p.profile, look } };
  });
}
function SeasonBanner() {
  const key = seasonKey();
  const days = Math.max(0, Math.ceil((new Date(nextSeasonStart(key) + "T00:00") - new Date()) / 86400000));
  return (
    <div className="panel px-4 py-3 flex items-center justify-between">
      <div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Season {key.split("-S")[1]} · {key.slice(0, 4)}</div><div className="text-sm font-semibold">#1 wears the Ascended aura. Finish 1st to keep the Ophanim border.</div></div>
      <div className="text-right"><div className="text-xl font-bold tabular-nums">{days}</div><div className="body text-xs" style={{ color: C.dim }}>days left</div></div>
    </div>
  );
}
const MEDAL = ["", "🥇", "🥈", "🥉"];
function SeasonBadges({ badges }) {
  const list = Object.entries(badges || {}).sort(([a], [b]) => (a < b ? 1 : -1));
  if (!list.length) return null;
  return <div className="flex gap-2 flex-wrap">{list.map(([k, b]) => <span key={k} className="px-2.5 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: "rgba(255,212,71,.12)", border: "1px solid rgba(255,212,71,.35)", color: "#FFD447" }}>{MEDAL[b.place]} {k.replace("-S", " S")}</span>)}</div>;
}

/* ---------- PVP: 7-day duels + mutual Nemesis ---------- */
const DUEL_DAYS = 7;
const DUEL_CONDS = {
  xp: { label: "Most XP", short: "XP", unit: "XP", idx: 0 },
  steps: { label: "Most steps", short: "Steps", unit: "steps", idx: 1 },
  workouts: { label: "Most workouts", short: "Workouts", unit: "workouts", idx: 2 },
};
const duelCond = (d) => (DUEL_CONDS[d?.cond] ? d.cond : "xp");
// Legacy duels ran the calendar week they were sent in; new ones run 7 days from the day they're accepted
const duelWindow = (d) => { const start = d?.start || d?.ws; return start ? { start, end: shift(start, DUEL_DAYS - 1) } : null; };
// Last 21 days of [xp, steps, workouts] for the board card. Zeros included, so others can tell the card is current.
function dailyStats(s, n = 21) {
  const out = {}, t = today();
  for (let i = n - 1; i >= 0; i--) {
    const d = shift(t, -i);
    out[d] = [Math.round(s.xpLog?.[d] || 0), Math.round(+s.steps?.[d] || 0), (s.workouts || []).filter((w) => w.date === d && isWorkout(w)).length];
  }
  return out;
}
function selfScore(s, cond, start, end) {
  if (cond === "steps") return Object.entries(s.steps || {}).filter(([d]) => d >= start && d <= end).reduce((a, [, v]) => a + Math.round(+v || 0), 0);
  if (cond === "workouts") return (s.workouts || []).filter((w) => w.date >= start && w.date <= end && isWorkout(w)).length;
  return Object.entries(s.xpLog || {}).filter(([d]) => d >= start && d <= end).reduce((a, [, v]) => a + v, 0);
}
// Opponent's score from their board card: { v, final } or null if their card can't tell yet
function cardScore(card, cond, start, end) {
  if (!card) return null;
  if (card.daily) {
    const idx = DUEL_CONDS[cond].idx;
    const v = Object.entries(card.daily).filter(([d]) => d >= start && d <= end).reduce((a, [, arr]) => a + (+arr?.[idx] || 0), 0);
    return { v, final: Object.keys(card.daily).some((d) => d > end) };
  }
  // Older app versions only publish weekly XP
  if (cond !== "xp") return null;
  if (card.weekOf === start) return { v: card.weekXp || 0, final: false };
  if (card.prevWeek?.key === start) return { v: card.prevWeek.xp || 0, final: true };
  return null;
}
function duelState(d, s, otherCard) {
  const w = duelWindow(d), cond = duelCond(d), t = today();
  if (!w || d.status !== "on") return { w, cond, phase: d.status === "pending" ? "pending" : "unknown" };
  const mine = selfScore(s, cond, w.start, w.end);
  const th = cardScore(otherCard, cond, w.start, w.end);
  const over = t > w.end;
  const day = Math.min(DUEL_DAYS, Math.max(1, Math.round((new Date(`${t}T12:00`) - new Date(`${w.start}T12:00`)) / 86400000) + 1));
  if (!over) return { w, cond, phase: "live", mine, theirs: th?.v ?? null, day };
  if (!th?.final) return { w, cond, phase: "waiting", mine, theirs: th?.v ?? null };
  const r = mine > th.v ? "w" : th.v > mine ? "l" : "t";
  return { w, cond, phase: "done", mine, theirs: th.v, r };
}
const nemesisWins = (s) => Object.values(s.duelResults || {}).filter((x) => x.nem && x.r === "w").length;
function rivalRecord(s, id) {
  const rec = { w: 0, l: 0, t: 0 };
  Object.values(s.duelResults || {}).forEach((x) => { if (x.vs === id) rec[x.r] = (rec[x.r] || 0) + 1; });
  return rec;
}
const isMutualNemesis = (s, card) => !!card && s.nemesis?.id === card.id && card.rivalWith === s.playerId;
const NEMESIS_REWARDS = [
  { wins: 1, kind: "Badge", name: "Rivalbreaker badge" },
  { wins: 3, kind: "Title", name: "Nemesis Slayer title" },
  { wins: 5, kind: "Aura", name: "Vendetta aura" },
];

// Settles finished duels in the background: records W/L/T in your own save (so the lifetime record survives
// deleted duels), posts Nemesis wins to the feed, and announces newly earned rivalry rewards.
async function resolveDuels(s, setS, toast) {
  if (!s.playerId) return;
  let duels = [];
  try { duels = (await readShared("duel:")).filter((d) => (d.from === s.playerId || d.to === s.playerId) && d.status === "on" && !(s.duelResults || {})[d.id]); } catch (e) { return; }
  const settled = [];
  for (const d of duels) {
    const w = duelWindow(d);
    if (!w || today() <= w.end) continue;
    const otherId = d.from === s.playerId ? d.to : d.from;
    let card = null;
    try { const r = await window.storage.get(`lb:${otherId}`, true); card = r?.value ? JSON.parse(r.value) : null; } catch (e) { /* not on board */ }
    const st = duelState(d, s, card);
    if (st.phase !== "done") continue;
    settled.push({ id: d.id, r: st.r, vs: otherId, name: d.from === s.playerId ? d.toName : d.fromName, cond: st.cond, nem: !!d.nemesis, mine: st.mine, theirs: st.theirs, end: w.end });
  }
  if (!settled.length) return;
  const before = nemesisWins(s);
  const results = { ...(s.duelResults || {}) };
  settled.forEach((x) => { results[x.id] = x; });
  setS((p) => ({ ...p, duelResults: { ...(p.duelResults || {}), ...Object.fromEntries(settled.map((x) => [x.id, x])) } }));
  settled.filter((x) => x.nem && x.r === "w").forEach((x) => postFeed(s, "duel", `defeated their Nemesis ${x.name} in ${x.cond === "xp" ? "an XP" : x.cond === "steps" ? "a steps" : "a workouts"} duel`, { detail: `${x.mine.toLocaleString()} to ${x.theirs.toLocaleString()} ${DUEL_CONDS[x.cond].unit}` }, `nemwin_${x.id}`));
  const after = nemesisWins({ ...s, duelResults: results });
  const earned = NEMESIS_REWARDS.filter((r) => before < r.wins && after >= r.wins);
  if (earned.length) toast?.(`Nemesis defeated! Unlocked: ${earned.map((r) => r.name).join(", ")}`);
  else if (settled.some((x) => x.r === "w")) toast?.(settled.length === 1 ? `You won your duel against ${settled[0].name}` : "Duel results are in");
}

function RivalBadge({ wins, size = "sm" }) {
  if (!wins) return null;
  return (
    <span title={`Beat their Nemesis ${wins} time${wins === 1 ? "" : "s"}`} className={`inline-flex items-center gap-1 font-bold shrink-0 ${size === "sm" ? "text-xs px-1.5" : "text-sm px-2 py-0.5"}`} style={{ borderRadius: 999, color: "#FFD9DF", background: "linear-gradient(135deg,#7A0019,#FF1F4B)", border: "1px solid #FF6B8F", boxShadow: "0 0 10px rgba(255,31,75,.45)" }}>
      <Swords size={size === "sm" ? 11 : 13} />Rivalbreaker{wins > 1 ? ` ×${wins}` : ""}
    </span>
  );
}

function DuelButton({ s, targetId, targetName, targetUid, nemesis = false, onSent }) {
  const [forfeit, setForfeit] = useState("");
  const [cond, setCond] = useState("xp");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    if (!s.lb || !s.profile.name) { setErr("Join the leaderboard first."); return; }
    const id = uid();
    try {
      await window.storage.set(`duel:${id}`, JSON.stringify({ id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, cond, forfeit: forfeit.trim().slice(0, 60), status: "pending", t: Date.now() }), true);
      setSent(true); onSent?.();
    } catch (e) { setErr("Couldn't send the duel. Check your connection."); }
  };
  if (sent) return <div className="body text-sm" style={{ color: C.green }}>Duel sent. It starts the day {targetName} accepts. Track it on Board → Crew.</div>;
  if (!open) return <button onClick={() => setOpen(true)} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: nemesis ? "#FF6B8F" : C.cyan, borderColor: nemesis ? "rgba(255,45,111,.5)" : undefined }}><Swords size={16} />{nemesis ? "Challenge your Nemesis" : "Challenge to a 7-day duel"}</button>;
  return (
    <div className="panel p-3 space-y-2.5" style={nemesis ? { borderColor: "rgba(255,45,111,.5)" } : null}>
      <div className="text-sm font-bold">Win condition</div>
      <div role="radiogroup" aria-label="Win condition" className="grid grid-cols-3 gap-2">
        {Object.entries(DUEL_CONDS).map(([k, c]) => (
          <button key={k} role="radio" aria-checked={cond === k} onClick={() => setCond(k)} className="py-2 text-sm font-bold flex flex-col items-center gap-0.5" style={{ borderRadius: 12, background: cond === k ? `${C.cyan}1F` : C.glass, border: `1.5px solid ${cond === k ? C.cyan : C.glassLine}`, color: cond === k ? C.text : C.dim }}>
            {k === "xp" ? <Zap size={16} /> : k === "steps" ? <Footprints size={16} /> : <Dumbbell size={16} />}{c.label}
          </button>
        ))}
      </div>
      <div className="body text-xs" style={{ color: C.sub }}>Runs 7 days from the day {targetName} accepts. Winner gets {DUEL_XP} XP.{nemesis ? " This is a Nemesis duel: wins count toward your rivalry rewards." : ""}</div>
      <input className="inp text-sm" placeholder="Forfeit (optional), e.g. buys the shakes" value={forfeit} onChange={(e) => setForfeit(e.target.value)} />
      {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      <div className="grid grid-cols-2 gap-2"><button onClick={() => setOpen(false)} className="ghost py-2 text-sm">Cancel</button><button onClick={send} className="btn py-2 text-sm">Send duel</button></div>
    </div>
  );
}

// Profile head-to-head: propose / accept / show the rivalry
function RivalryButton({ s, setS, them }) {
  const mineOn = s.nemesis?.id === them.id, theirsOn = them.rivalWith === s.playerId;
  const rec = rivalRecord(s, them.id);
  const set = (n) => setS((p) => ({ ...p, nemesis: n, nemesisSeen: {} }));
  const replace = (fn) => (s.nemesis?.id && s.nemesis.id !== them.id ? ask(`Replace ${s.nemesis.name || "your current Nemesis"} with ${them.name}? Your record against them stays saved.`, fn, "Replace") : fn());
  const style = { color: "#FF6B8F", borderColor: "rgba(255,45,111,.5)" };
  if (mineOn && theirsOn) return <button onClick={() => ask(`End your rivalry with ${them.name}? Your ${rec.w}–${rec.l}${rec.t ? `–${rec.t}` : ""} record stays saved.`, () => set(null), "End rivalry")} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={style}>😈 Your Nemesis · {rec.w}–{rec.l}{rec.t ? `–${rec.t}` : ""}</button>;
  if (mineOn) return <button onClick={() => set(null)} className="ghost w-full py-2.5 text-sm font-semibold" style={{ color: C.dim }}>Rivalry proposed · waiting for {them.name} · tap to cancel</button>;
  if (theirsOn) return <button onClick={() => replace(() => set({ id: them.id, name: them.name, since: today() }))} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2">😈 Accept {them.name}'s rivalry</button>;
  return <button onClick={() => replace(() => set({ id: them.id, name: them.name, since: today() }))} className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={style}>😈 Propose a Nemesis rivalry</button>;
}

function RivalryCard({ s, setS, rows, openProfile }) {
  const [challenge, setChallenge] = useState(false);
  const cardOf = (id) => rows.find((r) => r.id === id);
  const nemCard = s.nemesis?.id ? cardOf(s.nemesis.id) : null;
  const mutual = isMutualNemesis(s, nemCard);
  const incoming = rows.filter((r) => r.rivalWith === s.playerId && r.id !== s.playerId && s.nemesis?.id !== r.id && !(s.rivalDeclined || {})[r.id]);
  const wins = nemesisWins(s);
  const accept = (r) => {
    const go = () => setS((p) => ({ ...p, nemesis: { id: r.id, name: r.name, since: today() }, nemesisSeen: {} }));
    if (s.nemesis?.id) ask(`Replace ${s.nemesis.name || "your current Nemesis"} with ${r.name}? Your record against them stays saved.`, go, "Replace"); else go();
  };
  return (
    <div className="space-y-2">
      {incoming.map((r) => (
        <div key={r.id} className="panel p-3 flex items-center gap-3" style={{ borderColor: "rgba(255,45,111,.5)" }}>
          <Avatar src={r.avatar} name={r.name} size={36} look={r.look} />
          <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate"><FancyName name={r.name} look={r.look} /> wants you as their Nemesis</div><div className="body text-xs" style={{ color: C.dim }}>Accept to make it official. Duels between you count toward rivalry rewards.</div></div>
          <div className="flex flex-col gap-1.5 shrink-0"><button onClick={() => accept(r)} className="btn px-3 py-1.5 text-xs">Accept</button><button onClick={() => setS((p) => ({ ...p, rivalDeclined: { ...(p.rivalDeclined || {}), [r.id]: Date.now() } }))} className="ghost px-3 py-1.5 text-xs">Decline</button></div>
        </div>
      ))}
      {s.nemesis?.id && mutual ? (() => {
        const rec = rivalRecord(s, s.nemesis.id);
        return (
          <div className="panel p-4 space-y-3" style={{ borderColor: "rgba(255,45,111,.55)", background: "linear-gradient(160deg, rgba(122,0,25,.28), transparent 60%)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => openProfile(nemCard.id)} aria-label={`Open ${nemCard.name}'s profile`}><Avatar src={nemCard.avatar} name={nemCard.name} size={52} look={nemCard.look} /></button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FF6B8F" }}>😈 Your Nemesis</div>
                <div className="text-lg font-bold truncate"><FancyName name={nemCard.name} look={nemCard.look} /></div>
                <div className="body text-xs" style={{ color: C.dim }}>Rivals since {fmtShort(s.nemesis.since || today())}</div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-extrabold tabular-nums" aria-label={`Record ${rec.w} wins, ${rec.l} losses${rec.t ? `, ${rec.t} ties` : ""}`}><span style={{ color: C.green }}>{rec.w}</span><span style={{ color: C.mute }}>–</span><span style={{ color: "#FF6B8F" }}>{rec.l}</span>{rec.t ? <><span style={{ color: C.mute }}>–</span><span style={{ color: C.dim }}>{rec.t}</span></> : null}</div>
                <div className="body" style={{ fontSize: 10.5, color: C.mute }}>lifetime W–L{rec.t ? "–T" : ""}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NEMESIS_REWARDS.map((r) => { const got = wins >= r.wins; return (
                <div key={r.wins} className="text-center py-2 px-1" style={{ borderRadius: 10, background: got ? "rgba(255,31,75,.16)" : C.glass, border: `1px solid ${got ? "#FF6B8F" : C.glassLine}` }}>
                  <div className="text-xs font-bold" style={{ color: got ? "#FFD9DF" : C.dim }}>{got ? "✓ " : ""}{r.kind}</div>
                  <div className="body" style={{ fontSize: 10.5, color: got ? C.sub : C.mute }}>{got ? r.name.replace(/ (badge|title|aura)$/, "") : `${Math.min(wins, r.wins)}/${r.wins} Nemesis wins`}</div>
                </div>
              ); })}
            </div>
            {challenge ? <DuelButton s={s} targetId={nemCard.id} targetName={nemCard.name} targetUid={nemCard.uid} nemesis onSent={() => setChallenge(false)} /> : <button onClick={() => setChallenge(true)} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2"><Swords size={16} />Challenge {nemCard.name}</button>}
          </div>
        );
      })() : s.nemesis?.id ? (
        <div className="panel p-3 body text-sm flex items-center justify-between gap-2" style={{ color: C.dim }}><span>Rivalry proposed to <b style={{ color: C.text }}>{s.nemesis.name}</b>. Waiting for them to accept.</span><button onClick={() => setS((p) => ({ ...p, nemesis: null }))} className="text-xs underline shrink-0" style={{ color: C.mute }}>Cancel</button></div>
      ) : !incoming.length ? (
        <div className="body text-xs" style={{ color: C.dim }}>No Nemesis yet. Open a player's profile from the board and propose a rivalry. Beat your Nemesis in duels to earn the Rivalbreaker badge (1 win), Nemesis Slayer title (3) and Vendetta aura (5).</div>
      ) : null}
    </div>
  );
}

function DuelsPanel({ s, setS, gainXp, rows, openProfile }) {
  const [duels, setDuels] = useState(null);
  useEffect(() => { readShared("duel:").then((d) => setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))).catch(() => setDuels([])); }, []);
  const cardOf = (id) => rows.find((r) => r.id === id || r.key === `lb:${id}`);
  const accept = async (d) => {
    const other = cardOf(d.from);
    const rec = { ...d, key: undefined, status: "on", start: today(), acceptedAt: Date.now(), nemesis: isMutualNemesis(s, other) };
    try { await window.storage.set(d.key, JSON.stringify(rec), true); setDuels((x) => x.map((y) => (y.key === d.key ? { ...rec, key: d.key } : y))); } catch (e) { /* ignore */ }
  };
  const remove = async (d) => { try { await window.storage.delete(d.key, true); setDuels((x) => x.filter((y) => y.key !== d.key)); } catch (e) { /* ignore */ } };
  const claim = (d) => { setS((p) => ({ ...p, duelClaimed: { ...(p.duelClaimed || {}), [d.id]: true } })); gainXp(DUEL_XP, "Duel win", `duel_${d.id}`); };
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18} />Duels &amp; rivalry</h2>
      <RivalryCard s={s} setS={setS} rows={rows} openProfile={openProfile} />
      {duels === null && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading duels…</div>}
      {duels?.length === 0 && <Empty>No duels yet. Open someone's profile from the board and challenge them: most XP, most steps, or most workouts over 7 days.</Empty>}
      {duels?.map((d) => {
        const me = d.from === s.playerId, other = me ? d.toName : d.fromName, otherId = me ? d.to : d.from;
        const oc = cardOf(otherId), mc = cardOf(s.playerId);
        const saved = (s.duelResults || {})[d.id];
        const st = saved ? { ...duelState(d, s, oc), phase: "done", r: saved.r, mine: saved.mine, theirs: saved.theirs } : duelState(d, s, oc);
        const c = DUEL_CONDS[st.cond], fmtV = (v) => (v === null || v === undefined ? "?" : Number(v).toLocaleString());
        const expired = d.status === "pending" && Date.now() - (d.t || 0) > 7 * 86400000;
        return (
          <div key={d.key} className="panel p-3 space-y-1.5" style={d.nemesis ? { borderColor: "rgba(255,45,111,.5)" } : null}>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-right min-w-0"><div className="font-bold text-sm truncate"><FancyName name={s.profile.name} look={s.profile.look} /></div>{mc?.title && <div className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: s.profile.look?.accent || C.cyan }}>{mc.title}</div>}</div>
              <span className="font-extrabold px-2" style={{ color: "#FF2D6F", fontFamily: "'Cinzel', serif" }}>VS</span>
              <button onClick={() => openProfile(otherId)} className="flex-1 text-left min-w-0"><div className="font-bold text-sm truncate"><FancyName name={other} look={oc?.look} /></div>{oc?.title && <div className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: oc?.look?.accent || C.cyan }}>{oc.title}</div>}</button>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap body text-xs" style={{ color: C.dim }}>
              <span className="font-bold px-2" style={{ borderRadius: 999, color: C.cyan, border: `1px solid ${C.cyan}55` }}>{c.label}</span>
              {d.nemesis && <span className="font-bold px-2" style={{ borderRadius: 999, color: "#FF6B8F", border: "1px solid rgba(255,45,111,.5)" }}>😈 Nemesis duel</span>}
              <span>{st.w ? `${fmtShort(st.w.start)} – ${fmtShort(st.w.end)}` : "Starts the day it's accepted"}{st.phase === "live" ? ` · day ${st.day} of 7` : ""}</span>
            </div>
            {d.forfeit && <div className="body text-xs text-center" style={{ color: C.orange }}>Loser: {d.forfeit}</div>}
            {expired ? <div className="body text-xs text-center" style={{ color: C.mute }}>Expired. Never accepted.</div>
              : d.status === "pending" && !me ? <div className="grid grid-cols-2 gap-2"><button onClick={() => remove(d)} className="ghost py-2 text-sm">Decline</button><button onClick={() => accept(d)} className="btn py-2 text-sm">Accept · starts today</button></div>
              : d.status === "pending" ? <div className="body text-xs text-center" style={{ color: C.dim }}>Waiting for {other} to accept.</div> : null}
            {st.phase === "live" && <div className="body text-sm text-center">You <b className="tabular-nums">{fmtV(st.mine)}</b> · {other} <b className="tabular-nums">{fmtV(st.theirs)}</b> <span style={{ color: C.dim }}>{c.unit}</span></div>}
            {st.phase === "waiting" && <div className="body text-xs text-center" style={{ color: C.dim }}>Finished. Waiting for {other} to open the app so their final score posts.</div>}
            {st.phase === "done" && (
              <div className="font-bold text-center" style={{ color: st.r === "w" ? C.gold : st.r === "l" ? "#FF6B8F" : C.dim }}>
                {st.r === "t" ? `Dead heat, ${fmtV(st.mine)} each.` : st.r === "w" ? `You won ${fmtV(st.mine)} to ${fmtV(st.theirs)}` : `${other} won ${fmtV(st.theirs)} to ${fmtV(st.mine)}`}
                {st.r === "w" && !(s.duelClaimed || {})[d.id] && <button onClick={() => claim(d)} className="btn px-3 py-1 text-xs ml-2">Claim {DUEL_XP} XP</button>}
              </div>
            )}
            <div className="text-center"><button onClick={() => ask("Delete this duel? Your win/loss record stays saved.", () => remove(d), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button></div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Nemesis alerts (mutual rivals only) ---------- */
function NemesisAlert({ s, setS, openProfile }) {
  const [card, setCard] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const nem = s.nemesis;
  useEffect(() => { if (!nem?.id) { setCard(null); return; } window.storage.get(`lb:${nem.id}`, true).then((r) => setCard(r?.value ? JSON.parse(r.value) : null)).catch(() => {}); }, [nem?.id]);
  useEffect(() => { if (!s.lb) return; readShared("lb:").then((rows) => setIncoming(rows.filter((r) => r.rivalWith === s.playerId && r.id !== s.playerId && s.nemesis?.id !== r.id && !(s.rivalDeclined || {})[r.id]))).catch(() => {}); }, [s.lb, s.nemesis?.id]);
  const mutual = isMutualNemesis(s, card);
  useEffect(() => { if (mutual && s.nemesisSeen?.workouts === undefined) setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } })); }, [mutual, card]);
  if (incoming.length) {
    const r = incoming[0];
    return (
      <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,45,111,.45)" }}>
        <span className="text-2xl">😈</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#FF6B8F" }}>{r.name} wants you as their Nemesis</div>
          <div className="body text-sm" style={{ color: C.sub }}>Accept on their profile or in Board → Crew → Duels &amp; rivalry.</div>
          <button onClick={() => openProfile(r.id)} className="body text-sm font-semibold mt-1.5" style={{ color: C.cyan }}>View {r.name}</button>
        </div>
      </div>
    );
  }
  if (!mutual) return null;
  const seen = s.nemesisSeen || {};
  const myPoints = pointsOf(s);
  const alerts = [];
  if ((card.stats?.workouts || 0) > (seen.workouts ?? card.stats?.workouts ?? 0)) alerts.push(`${card.name} just logged a workout.`);
  if ((card.points || 0) > myPoints && (seen.points ?? 0) <= myPoints) alerts.push(`${card.name} passed you in points (${card.points.toLocaleString()} vs ${myPoints.toLocaleString()}).`);
  if (seen.workouts === undefined || !alerts.length) return null;
  const dismiss = () => setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } }));
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,45,111,.45)" }}>
      <span className="text-2xl">😈</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: "#FF6B8F" }}>Nemesis alert</div>
        {alerts.map((a, i) => <div key={i} className="body text-sm" style={{ color: C.text }}>{a}</div>)}
        <div className="flex gap-3 mt-2"><button onClick={() => { dismiss(); openProfile(nem.id); }} className="body text-sm font-semibold" style={{ color: C.cyan }}>View rival</button><button onClick={dismiss} className="body text-sm" style={{ color: C.dim }}>Dismiss</button></div>
      </div>
    </div>
  );
}

/* ---------- Proactive Sterling ---------- */
function brokenStreak(s) {
  const days = [...activeDays(s)].sort();
  if (!days.length) return null;
  const last = days[days.length - 1];
  const gap = Math.round((new Date(today() + "T12:00") - new Date(last + "T12:00")) / 86400000);
  if (gap < 2) return null;
  let run = 1, d = last;
  while (days.includes(shift(d, -1))) { run++; d = shift(d, -1); }
  return run >= 2 ? { run, gap } : null;
}
const ROAST_FALLBACK = [
  "A {run}-day streak, abandoned like a gym membership in February. The dumbbells have filed a missing persons report.",
  "{gap} days off. Even your shadow has been lifting more than you. Shall we fix that, or shall I inform the family?",
  "I had your {run}-day streak framed. I've now had to use the frame for kindling. Back to it.",
];
function RoastCard({ s, setS }) {
  const d = today();
  const b = brokenStreak(s);
  const [busy, setBusy] = useState(false);
  if (!b || s.roasts?.[d]?.dismissed) return null;
  const cached = s.roasts?.[d]?.text;
  const play = async () => {
    if (cached) { sterlingSay(s, cached); return; }
    if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* unlock */ } }
    setBusy(true);
    let text = ROAST_FALLBACK[(b.run + b.gap) % ROAST_FALLBACK.length].replace("{run}", b.run).replace("{gap}", b.gap);
    try { const r = await askJson(STERLING_SYS, `The user had a ${b.run}-day training streak and has now skipped ${b.gap} days. Write a short, savage but affectionate roast in 2 sentences that ends by pushing them to train today. No insults about their body. Respond ONLY with JSON: {"text": "..."}`, 300); if (r.text) text = String(r.text).slice(0, 280); } catch (e) { /* fallback */ }
    setBusy(false);
    setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { text } } }));
    sterlingSay(s, text);
  };
  return (
    <div className="panel p-4 flex items-center gap-3">
      <button onClick={play} aria-label="Play Sterling's message" className="btn shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 999 }}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}</button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Sterling left you a message</div>
        <div className="body text-xs" style={{ color: C.dim }}>{cached || `About that ${b.run}-day streak…`}</div>
      </div>
      <button aria-label="Dismiss" onClick={() => setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { ...(p.roasts?.[d] || {}), dismissed: true } } }))} style={{ color: C.mute }}><X size={16} /></button>
    </div>
  );
}

/* ---------- Dynamic warm-ups ---------- */

/* ---------- Muscle photos ---------- */

/* ---------- Chud King ---------- */
/* ---------- Boss illustrations (SVG, animated by CSS classes) ---------- */
// Every boss is drawn on a 120×120 canvas. Parts carry bs-* classes so they can breathe, flap, sway and glow.
// Swap-in: drop /public/bosses/<id>.webp (transparent, square) and BossArt uses it instead, with the same idle motion.
const OL = "#0A0E18"; // outline
function Grad({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, radial, cx = 0.5, cy = 0.5, r = 0.5 }) {
  const kids = stops.map(([o, c, a = 1], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a} />);
  return radial ? <radialGradient id={id} cx={cx} cy={cy} r={r}>{kids}</radialGradient> : <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{kids}</linearGradient>;
}
const Eye = ({ x, y, r = 3.2, c, slit }) => (
  <g className="bs-eye">
    <circle cx={x} cy={y} r={r * 2.4} fill={c} opacity=".28" />
    {slit ? <ellipse cx={x} cy={y} rx={r} ry={r * 0.9} fill={c} /> : <circle cx={x} cy={y} r={r} fill={c} />}
    {slit ? <ellipse cx={x} cy={y} rx={r * 0.28} ry={r * 0.85} fill={OL} /> : <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#fff" opacity=".9" />}
  </g>
);

function WyrmSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}st`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E3EAF2"], [0.45, "#8C99AA"], [1, "#2D3644"]]} />
        <Grad id={`${u}belly`} stops={[[0, "#B6FFD9"], [1, "#2E9F63"]]} />
        <Grad id={`${u}horn`} x1={0} y1={1} x2={1} y2={0} stops={[[0, "#3A2A12"], [1, "#FFE9A8"]]} />
      </defs>
      <g className="bs-sway">
        <path d="M18 104 C4 86 10 62 30 58 C48 54 44 78 62 80 C84 82 96 64 92 46" fill="none" stroke={OL} strokeWidth="23" strokeLinecap="round" />
        <path d="M18 104 C4 86 10 62 30 58 C48 54 44 78 62 80 C84 82 96 64 92 46" fill="none" stroke={`url(#${u}st)`} strokeWidth="19" strokeLinecap="round" />
        <path d="M22 100 C12 86 16 68 30 64 C44 61 42 82 62 86 C82 88 94 72 90 56" fill="none" stroke={`url(#${u}belly)`} strokeWidth="6" strokeLinecap="round" opacity=".85" />
        {[[14, 86], [22, 64], [40, 60], [52, 76], [70, 80], [86, 68]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 9} l4 -8 l3 8 z`} fill="#6FD9A0" stroke={OL} strokeWidth="1" transform={`rotate(${i * 18 - 40} ${x} ${y})`} />)}
        {[[18, 80], [26, 62], [44, 66], [58, 80], [76, 78]].map(([x, y], i) => <path key={i} d={`M${x - 5} ${y} q5 -4 10 0`} stroke="#4B5563" strokeWidth="1.2" fill="none" />)}
      </g>
      <g className="bs-breathe">
        {/* horns */}
        <path d="M70 30 C62 14 72 4 84 2 C76 10 76 18 80 26 Z" fill={`url(#${u}horn)`} stroke={OL} strokeWidth="1.6" />
        <path d="M86 24 C92 10 90 4 82 -2 C86 8 84 16 80 22 Z" fill="#6B5424" stroke={OL} strokeWidth="1.4" />
        {/* skull */}
        <path d="M64 36 C64 22 78 18 88 20 C102 22 108 32 106 44 L112 52 C114 58 108 62 100 60 L74 60 C66 58 62 48 64 36 Z" fill={`url(#${u}st)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 32 C76 26 88 24 98 28" stroke="#fff" strokeWidth="1.5" opacity=".55" fill="none" strokeLinecap="round" />
        <path d="M74 42 L98 40 M78 48 L102 47" stroke="#4B5563" strokeWidth="1" opacity=".7" />
        {/* brow ridge */}
        <path d="M78 34 L96 32 L100 38 L82 40 Z" fill="#5B6676" stroke={OL} strokeWidth="1.2" />
        <Eye x={92} y={38} r={3.2} c={eye} slit />
        <circle cx="108" cy="52" r="1.3" fill={OL} />
        {/* jaw */}
        <g className="bs-jaw">
          <path d="M74 58 L104 60 C108 62 106 68 100 68 L78 66 C72 64 70 60 74 58 Z" fill="#6B7888" stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
          {[80, 86, 92, 98].map((x) => <path key={x} d={`M${x} 60 l1.6 -4 l1.6 4 z`} fill="#F4F0E0" />)}
        </g>
        {[82, 88, 94, 100].map((x) => <path key={x} d={`M${x} 60 l1.6 4 l1.6 -4 z`} fill="#F4F0E0" stroke={OL} strokeWidth=".6" />)}
        <path d="M66 50 C58 50 54 58 58 64" stroke={OL} strokeWidth="2" fill="none" />
      </g>
      <g className="bs-rise" opacity=".7"><circle cx="112" cy="46" r="3" fill="#9FB0C4" opacity=".5" /><circle cx="116" cy="41" r="2" fill="#9FB0C4" opacity=".35" /></g>
    </>
  );
}

function ColossusSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}ice`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2FCFF"], [0.5, "#9FDDF5"], [1, "#2F7FA8"]]} />
        <Grad id={`${u}dark`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#7CC4E4"], [1, "#1A4A66"]]} />
        <Grad id={`${u}core`} radial stops={[[0, "#FFFFFF"], [0.4, eye], [1, eye, 0]]} />
      </defs>
      <g className="bs-breathe">
        {/* arms */}
        <path d="M12 52 L26 46 L30 86 L16 96 L8 82 Z" fill={`url(#${u}dark)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M108 52 L94 46 L90 86 L104 96 L112 82 Z" fill={`url(#${u}dark)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 92 L22 88 L30 100 L20 112 L6 106 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M114 92 L98 88 L90 100 L100 112 L114 106 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        {/* torso */}
        <path d="M28 44 L60 34 L92 44 L96 80 L78 104 L42 104 L24 80 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M28 44 L60 34 L60 70 L24 80 Z" fill="#fff" opacity=".22" />
        <path d="M60 70 L96 80 L78 104 L60 104 Z" fill="#0B3550" opacity=".28" />
        <path d="M42 60 L50 76 M78 58 L70 74 M52 92 L60 84 L68 92" stroke="#2F7FA8" strokeWidth="1.2" fill="none" opacity=".7" />
        {/* core */}
        <circle cx="60" cy="66" r="14" fill={`url(#${u}core)`} className="bs-glow" />
        <path d="M60 56 L66 66 L60 76 L54 66 Z" fill="#fff" stroke={eye} strokeWidth="1.2" className="bs-glow" />
        {/* shoulder crystals */}
        {[[24, 44, -25], [32, 38, -10], [96, 44, 25], [88, 38, 10]].map(([x, y, r], i) => <path key={i} d={`M${x - 5} ${y} L${x} ${y - 20} L${x + 5} ${y} Z`} fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.4" transform={`rotate(${r} ${x} ${y})`} />)}
        {/* head */}
        <path d="M46 22 L60 14 L74 22 L72 38 L60 42 L48 38 Z" fill={`url(#${u}ice)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M49 28 L71 28 L69 33 L51 33 Z" fill="#0B2536" />
        <rect x="52" y="29.5" width="6" height="2" fill={eye} className="bs-eye" /><rect x="62" y="29.5" width="6" height="2" fill={eye} className="bs-eye" />
        <path d="M60 14 L58 6 L62 2 L64 10 Z" fill="#fff" stroke={OL} strokeWidth="1" />
        {/* icicles */}
        {[[36, 104, 8], [48, 104, 11], [72, 104, 9], [84, 104, 7]].map(([x, y, l], i) => <path key={i} d={`M${x - 2.5} ${y} L${x} ${y + l} L${x + 2.5} ${y} Z`} fill="#DDF6FF" stroke={OL} strokeWidth=".8" />)}
      </g>
    </>
  );
}

function GravemawSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}bone`} x1={0} y1={0} x2={0.6} y2={1} stops={[[0, "#FFF8E6"], [0.55, "#D8C9A3"], [1, "#7A6A4A"]]} />
        <Grad id={`${u}fl`} stops={[[0, "#FF7AE0", 0], [0.4, "#B14BFF"], [1, "#4A0FA8"]]} />
      </defs>
      <g className="bs-flicker">
        <path d="M30 34 C24 18 34 10 36 0 C42 12 46 14 48 4 C54 14 58 10 60 0 C62 10 66 14 72 4 C74 14 78 12 84 0 C86 10 96 18 90 34 Z" fill={`url(#${u}fl)`} opacity=".9" />
        <path d="M40 34 C38 24 44 20 46 12 C50 20 54 20 56 12 C58 22 64 22 66 12 C68 20 74 22 76 14 C80 22 82 28 80 34 Z" fill="#E6BFFF" opacity=".6" />
      </g>
      <g className="bs-breathe">
        {/* spine */}
        {[96, 104, 111].map((y, i) => <rect key={y} x={54 - i} y={y} width={12 + i * 2} height="6" rx="2" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="1.4" />)}
        {/* cranium */}
        <path d="M22 56 C18 30 38 20 60 20 C82 20 102 30 98 56 C96 66 90 70 86 74 L34 74 C30 70 24 66 22 56 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="2.2" />
        <path d="M34 30 C44 24 56 23 66 24" stroke="#fff" strokeWidth="2" opacity=".7" fill="none" strokeLinecap="round" />
        <path d="M70 22 L66 32 L72 38 L68 46" stroke={OL} strokeWidth="1.4" fill="none" />
        <path d="M30 60 C26 50 30 46 34 44" stroke="#7A6A4A" strokeWidth="1.2" fill="none" />
        {/* sockets */}
        <path d="M32 50 C32 40 42 38 50 42 C54 46 52 58 44 60 C36 62 32 56 32 50 Z" fill="#12061E" stroke={OL} strokeWidth="1.5" />
        <path d="M88 50 C88 40 78 38 70 42 C66 46 68 58 76 60 C84 62 88 56 88 50 Z" fill="#12061E" stroke={OL} strokeWidth="1.5" />
        <Eye x={43} y={50} r={3.4} c={eye} /><Eye x={77} y={50} r={3.4} c={eye} />
        <path d="M56 58 L60 66 L64 58 Z" fill="#12061E" stroke={OL} strokeWidth="1.2" />
        {/* upper teeth */}
        <path d="M34 74 L86 74 L84 80 L36 80 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="1.5" />
        {[38, 44, 50, 56, 62, 68, 74, 80].map((x) => <path key={x} d={`M${x} 80 l2.5 6 l2.5 -6`} fill="#FFF8E6" stroke={OL} strokeWidth=".9" />)}
      </g>
      <g className="bs-jaw">
        <path d="M32 88 C34 100 44 104 60 104 C76 104 86 100 88 88 L84 90 L36 90 Z" fill={`url(#${u}bone)`} stroke={OL} strokeWidth="2" />
        {[38, 44, 50, 56, 62, 68, 74, 80].map((x) => <path key={x} d={`M${x} 90 l2.5 -6 l2.5 6`} fill="#FFF8E6" stroke={OL} strokeWidth=".9" />)}
      </g>
    </>
  );
}

function ChudSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}skin`} x1={0} y1={0} x2={0.4} y2={1} stops={[[0, "#FFE0C4"], [1, "#D9986E"]]} />
        <Grad id={`${u}robe`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E0304F"], [1, "#6E0F24"]]} />
        <Grad id={`${u}gold`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF1A8"], [0.5, "#FFD447"], [1, "#B8860B"]]} />
        <Grad id={`${u}bun`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#F6B25E"], [1, "#B8681F"]]} />
      </defs>
      {/* burger throne */}
      <ellipse cx="60" cy="112" rx="50" ry="6" fill="#000" opacity=".3" />
      <path d="M10 96 C10 88 110 88 110 96 L110 104 C110 110 10 110 10 104 Z" fill={`url(#${u}bun)`} stroke={OL} strokeWidth="1.8" />
      <path d="M8 92 L112 92 L106 97 L96 94 L86 98 L74 94 L62 98 L50 94 L38 98 L26 94 L14 97 Z" fill="#6BBF3A" stroke={OL} strokeWidth="1.2" />
      <rect x="10" y="84" width="100" height="9" rx="4" fill="#6B3418" stroke={OL} strokeWidth="1.6" />
      <path d="M12 84 L108 84 L104 88 L94 85 L84 89 L72 85 L60 89 L48 85 L36 89 L24 85 L16 88 Z" fill="#FFC928" />
      <g className="bs-breathe">
        {/* robe body */}
        <path d="M22 86 C18 56 34 44 60 44 C86 44 102 56 98 86 Z" fill={`url(#${u}robe)`} stroke={OL} strokeWidth="2" />
        <path d="M60 46 L60 86" stroke="#FFF6E8" strokeWidth="9" />
        {[52, 62, 72, 82].map((y) => <circle key={y} cx="60" cy={y} r="1.2" fill={OL} />)}
        <path d="M22 84 L98 84" stroke="#FFF6E8" strokeWidth="5" strokeLinecap="round" />
        {/* belly */}
        <ellipse cx="60" cy="70" rx="20" ry="15" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="1.6" />
        <path d="M46 66 C52 62 60 62 66 64" stroke="#fff" strokeWidth="1.6" opacity=".55" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="74" r="1.8" fill="#9C5A38" />
        {/* arms */}
        <path d="M28 58 C16 64 16 78 26 82" stroke={OL} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M28 58 C16 64 16 78 26 82" stroke={`url(#${u}robe)`} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M92 58 C104 62 106 70 102 76" stroke={OL} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M92 58 C104 62 106 70 102 76" stroke={`url(#${u}robe)`} strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* burger scepter */}
        <g transform="translate(103 70)">
          <rect x="-1.5" y="-4" width="3" height="18" fill={`url(#${u}gold)`} stroke={OL} strokeWidth=".8" />
          <path d="M-9 -6 C-9 -14 9 -14 9 -6 Z" fill={`url(#${u}bun)`} stroke={OL} strokeWidth="1" />
          <rect x="-9.5" y="-6.5" width="19" height="2.4" fill="#6BBF3A" /><rect x="-9" y="-4.3" width="18" height="3" rx="1.2" fill="#6B3418" /><rect x="-9" y="-1.6" width="18" height="2.6" rx="1.2" fill={`url(#${u}bun)`} stroke={OL} strokeWidth=".8" />
        </g>
        {/* head */}
        <ellipse cx="60" cy="42" rx="17" ry="8" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="1.5" />
        <circle cx="60" cy="30" r="16" fill={`url(#${u}skin)`} stroke={OL} strokeWidth="2" />
        <path d="M50 20 C54 17 60 16 66 18" stroke="#fff" strokeWidth="1.5" opacity=".6" fill="none" strokeLinecap="round" />
        <path d="M49 26 L56 27 M64 27 L71 26" stroke={OL} strokeWidth="1.8" strokeLinecap="round" />
        <g className="bs-eye"><circle cx="53" cy="30" r="2.2" fill={eye === "#FF2D2D" ? eye : OL} /><circle cx="67" cy="30" r="2.2" fill={eye === "#FF2D2D" ? eye : OL} /></g>
        <path d="M53 38 Q60 42 68 37" stroke="#8A4B2A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="46" cy="35" rx="3.5" ry="2.5" fill="#F29A9A" opacity=".6" /><ellipse cx="74" cy="35" rx="3.5" ry="2.5" fill="#F29A9A" opacity=".6" />
        <path d="M77 22 q2 4 0 6 q-2 -2 0 -6" fill="#9BE7FF" stroke={OL} strokeWidth=".6" className="bs-drip" />
        {/* crown */}
        <path d="M44 16 L46 2 L53 10 L60 -1 L67 10 L74 2 L76 16 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="44" y="13" width="32" height="4" fill="#B8860B" stroke={OL} strokeWidth="1" />
        <circle cx="60" cy="8" r="2.2" fill="#FF2D6F" stroke={OL} strokeWidth=".6" /><circle cx="50" cy="11" r="1.6" fill="#38C6FF" /><circle cx="70" cy="11" r="1.6" fill="#3DF08A" />
      </g>
    </>
  );
}

function RustSVG({ u, eye }) {
  const gear = (cx, cy, r, n) => { let d = ""; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.22; d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `; } return `${d}Z`; };
  return (
    <>
      <defs>
        <Grad id={`${u}met`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#E7A26A"], [0.45, "#A8592B"], [1, "#4A2410"]]} />
        <Grad id={`${u}plate`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#8E9AA8"], [1, "#3B4250"]]} />
      </defs>
      <g className="bs-rise" opacity=".55"><circle cx="30" cy="20" r="5" fill="#C8C8C8" /><circle cx="26" cy="12" r="3.5" fill="#C8C8C8" opacity=".7" /></g>
      <g className="bs-breathe">
        {/* legs */}
        <rect x="36" y="88" width="16" height="22" rx="2" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" /><rect x="68" y="88" width="16" height="22" rx="2" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" />
        <rect x="32" y="106" width="24" height="8" rx="2" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" /><rect x="64" y="106" width="24" height="8" rx="2" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" />
        {/* arms */}
        <path d="M18 48 L30 44 L32 80 L20 84 Z" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" /><path d="M102 48 L90 44 L88 80 L100 84 Z" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.8" />
        <rect x="12" y="80" width="22" height="16" rx="4" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.8" /><rect x="86" y="80" width="22" height="16" rx="4" fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.8" />
        {/* torso */}
        <path d="M28 40 L92 40 L88 90 L32 90 Z" fill={`url(#${u}met)`} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M32 44 L88 44" stroke="#FFD2A8" strokeWidth="1.4" opacity=".6" />
        <rect x="44" y="56" width="32" height="24" rx="3" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.6" />
        {[48, 54, 60, 66, 72].map((x) => <rect key={x} x={x} y="60" width="3" height="16" fill="#1F242E" />)}
        {[[34, 46], [86, 46], [34, 84], [86, 84], [46, 52], [74, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#FFD2A8" stroke={OL} strokeWidth=".6" />)}
        <path d="M36 70 C40 66 38 62 42 60" stroke="#6B8E6A" strokeWidth="2.5" opacity=".6" fill="none" />
        <path d="M80 86 C84 82 82 78 86 74" stroke="#6B8E6A" strokeWidth="2" opacity=".55" fill="none" />
        {/* head */}
        <rect x="44" y="18" width="32" height="24" rx="4" fill={`url(#${u}plate)`} stroke={OL} strokeWidth="2" />
        <rect x="47" y="26" width="26" height="8" rx="4" fill="#12151C" />
        <g className="bs-eye"><ellipse cx="60" cy="30" rx="9" ry="4.5" fill={eye} opacity=".35" /><ellipse cx="60" cy="30" rx="4.5" ry="2.6" fill={eye} /><circle cx="58.5" cy="29" r="1" fill="#fff" /></g>
        <path d="M30 34 L30 22 L36 22 L36 38" fill="none" stroke={OL} strokeWidth="5" /><path d="M30 34 L30 22 L36 22 L36 38" fill="none" stroke="#6F7885" strokeWidth="3" />
      </g>
      {/* shoulder gears */}
      <g className="bs-spin"><path d={gear(96, 40, 10, 10)} fill={`url(#${u}met)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="96" cy="40" r="4" fill="#2A160A" stroke={OL} strokeWidth="1" /></g>
      <g className="bs-spin-r"><path d={gear(22, 44, 7, 8)} fill={`url(#${u}plate)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" /><circle cx="22" cy="44" r="2.6" fill="#1F242E" /></g>
    </>
  );
}

function HarpySVG({ u, eye }) {
  const wing = (
    <>
      <path d="M48 44 C36 28 20 18 2 18 C8 26 10 32 8 38 L16 42 L8 50 L20 52 L14 60 L28 61 L24 70 L38 66 L40 74 L50 62 Z" fill={`url(#${u}fe)`} stroke={OL} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M48 44 C38 36 28 32 18 32 C24 38 26 42 24 46 L34 48 L30 56 L44 56 Z" fill={`url(#${u}fe2)`} stroke={OL} strokeWidth="1.1" strokeLinejoin="round" opacity=".95" />
      <path d="M46 46 L16 42 M46 48 L20 52 M46 50 L28 61 M46 54 L38 66" stroke="#1E4E8C" strokeWidth=".9" opacity=".7" />
      <path d="M12 22 C24 22 36 28 44 38" stroke="#fff" strokeWidth="1.3" opacity=".6" fill="none" strokeLinecap="round" />
    </>
  );
  return (
    <>
      <defs>
        <Grad id={`${u}fe`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#E8F7FF"], [0.5, "#7DD3FC"], [1, "#1E4E8C"]]} />
        <Grad id={`${u}fe2`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#B8E6FF"], [1, "#2A5DA8"]]} />
        <Grad id={`${u}body`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#5C7FB8"], [1, "#1B2A4E"]]} />
        <Grad id={`${u}beak`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF27A"], [1, "#C79A12"]]} />
      </defs>
      <g className="bs-flicker"><path d="M10 20 L20 34 L14 36 L26 54" stroke="#FFF27A" strokeWidth="2.4" fill="none" strokeLinejoin="round" /><path d="M110 24 L100 38 L106 40 L94 58" stroke="#FFF27A" strokeWidth="2.4" fill="none" strokeLinejoin="round" /></g>
      <g className="bs-flap-l">{wing}</g>
      <g className="bs-flap-r"><g transform="translate(120 0) scale(-1 1)">{wing}</g></g>
      <g className="bs-breathe">
        {/* talons */}
        <path d="M50 94 L46 108 M50 94 L50 110 M50 94 L54 108 M70 94 L66 108 M70 94 L70 110 M70 94 L74 108" stroke={`url(#${u}beak)`} strokeWidth="3" strokeLinecap="round" />
        <path d="M44 98 L56 98 M64 98 L76 98" stroke={OL} strokeWidth="1" />
        {/* body */}
        <path d="M44 40 C38 60 40 86 52 96 L68 96 C80 86 82 60 76 40 Z" fill={`url(#${u}body)`} stroke={OL} strokeWidth="2" />
        {[54, 62, 70, 78, 86].map((y, i) => <path key={y} d={`M${48 + i} ${y} q12 6 ${24 - i * 2} 0`} stroke="#9BC6F0" strokeWidth="1.2" fill="none" opacity=".6" />)}
        {/* head + crest */}
        <path d="M50 18 L40 2 L54 12 L56 0 L62 12 L70 2 L68 18 Z" fill={`url(#${u}fe)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M44 32 C44 16 76 16 76 32 C76 42 70 46 60 46 C50 46 44 42 44 32 Z" fill={`url(#${u}body)`} stroke={OL} strokeWidth="2" />
        <path d="M49 26 L57 30 M71 26 L63 30" stroke={OL} strokeWidth="2.2" strokeLinecap="round" />
        <Eye x={53} y={32} r={2.6} c={eye} slit /><Eye x={67} y={32} r={2.6} c={eye} slit />
        <path d="M55 36 L65 36 L60 48 Z" fill={`url(#${u}beak)`} stroke={OL} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </>
  );
}

function WardenSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}arm`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2F5FA"], [0.4, "#A3AEBE"], [1, "#39414F"]]} />
        <Grad id={`${u}cape`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#3A2C4E"], [1, "#120C1C"]]} />
        <Grad id={`${u}blade`} x1={0} y1={0} x2={1} y2={0} stops={[[0, "#E9EEF5"], [0.5, "#FFFFFF"], [1, "#8A95A6"]]} />
      </defs>
      <g className="bs-float">
        <g className="bs-sway"><path d="M30 44 C22 70 24 98 20 112 L34 106 L44 114 L54 104 L66 114 L76 104 L86 114 L100 106 C96 94 98 70 90 44 Z" fill={`url(#${u}cape)`} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" /></g>
        {/* greatsword */}
        <path d="M57 50 L63 50 L63 108 L60 116 L57 108 Z" fill={`url(#${u}blade)`} stroke={OL} strokeWidth="1.4" />
        <rect x="48" y="46" width="24" height="5" rx="2" fill="#8A6A2A" stroke={OL} strokeWidth="1.2" />
        {/* body plates */}
        <path d="M36 44 L84 44 L80 80 L60 88 L40 80 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 50 L76 50 M46 58 L74 58" stroke="#5B6676" strokeWidth="1.2" />
        <path d="M60 44 L60 86" stroke="#FFFFFF" strokeWidth="1.2" opacity=".5" />
        {/* pauldrons */}
        <path d="M20 44 C20 32 34 28 42 34 L44 50 C36 54 24 54 20 44 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.8" />
        <path d="M100 44 C100 32 86 28 78 34 L76 50 C84 54 96 54 100 44 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.8" />
        {[[24, 42], [30, 38], [96, 42], [90, 38]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#3B4250" />)}
        {/* gauntlets on pommel */}
        <path d="M46 46 C44 40 52 38 56 42 L58 50 L48 52 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.4" /><path d="M74 46 C76 40 68 38 64 42 L62 50 L72 52 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="1.4" />
        {/* helm */}
        <path d="M44 22 C44 6 76 6 76 22 L76 38 C70 44 50 44 44 38 Z" fill={`url(#${u}arm)`} stroke={OL} strokeWidth="2.2" />
        <path d="M60 4 L60 42" stroke="#39414F" strokeWidth="1.5" />
        <path d="M48 12 C52 8 58 7 62 8" stroke="#fff" strokeWidth="1.6" opacity=".7" fill="none" strokeLinecap="round" />
        <path d="M46 24 L74 24 L72 30 L48 30 Z" fill="#05070C" />
        <Eye x={53} y={27} r={2} c={eye} /><Eye x={67} y={27} r={2} c={eye} />
        {[50, 54, 66, 70].map((x) => <rect key={x} x={x} y="33" width="1.6" height="5" fill="#05070C" />)}
        <path d="M60 4 C66 -2 76 0 80 6 C72 4 66 6 62 10" fill="#8E1B2E" stroke={OL} strokeWidth="1" />
      </g>
    </>
  );
}

function LeviathanSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}sk`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6FB2FF"], [0.5, "#2F6BFF"], [1, "#0B1E5C"]]} />
        <Grad id={`${u}fin`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#9BF6FF"], [1, "#0A6E8A"]]} />
        <Grad id={`${u}sea`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#1A5CC8"], [1, "#061A45"]]} />
      </defs>
      {/* tentacles */}
      <g className="bs-sway"><path d="M16 104 C4 80 16 62 26 66 C34 70 26 82 30 88" fill="none" stroke={OL} strokeWidth="9" strokeLinecap="round" /><path d="M16 104 C4 80 16 62 26 66 C34 70 26 82 30 88" fill="none" stroke={`url(#${u}sk)`} strokeWidth="6" strokeLinecap="round" />{[76, 84, 92].map((y, i) => <circle key={y} cx={10 + i} cy={y} r="1.2" fill="#BFE3FF" />)}</g>
      <g className="bs-sway-r"><path d="M104 104 C118 84 106 64 96 68 C88 72 96 84 92 90" fill="none" stroke={OL} strokeWidth="9" strokeLinecap="round" /><path d="M104 104 C118 84 106 64 96 68 C88 72 96 84 92 90" fill="none" stroke={`url(#${u}sk)`} strokeWidth="6" strokeLinecap="round" /></g>
      <g className="bs-breathe">
        {/* neck */}
        <path d="M44 110 C40 80 44 56 54 42 L78 42 C84 60 80 86 76 110 Z" fill={`url(#${u}sk)`} stroke={OL} strokeWidth="2" />
        {[60, 70, 80, 90, 100].map((y) => <path key={y} d={`M${50} ${y} q12 5 24 0`} stroke="#9BCBFF" strokeWidth="1.3" fill="none" opacity=".55" />)}
        {/* frills */}
        <path d="M46 30 L24 16 L30 30 L16 32 L34 40 L22 50 L46 46 Z" fill={`url(#${u}fin)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M86 30 L106 14 L102 30 L116 30 L98 40 L110 50 L86 46 Z" fill={`url(#${u}fin)`} stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
        {/* head */}
        <path d="M40 34 C40 18 54 10 66 10 C80 10 92 20 92 34 C92 44 86 52 76 54 L56 54 C46 52 40 44 40 34 Z" fill={`url(#${u}sk)`} stroke={OL} strokeWidth="2.2" />
        <path d="M50 18 C56 14 64 13 70 14" stroke="#CFE6FF" strokeWidth="1.6" opacity=".7" fill="none" strokeLinecap="round" />
        {[[52, 22], [60, 18], [70, 20], [80, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill="#9BF6FF" opacity=".8" />)}
        <path d="M50 30 C54 24 64 24 66 30 C64 38 54 38 50 30 Z" fill="#FFF8D6" stroke={OL} strokeWidth="1.4" />
        <Eye x={58} y={31} r={3.4} c={eye} slit />
        <path d="M72 30 C76 26 82 26 84 30" stroke={OL} strokeWidth="1.8" fill="none" />
        <path d="M52 46 C60 50 74 50 84 42" stroke={OL} strokeWidth="2" fill="none" />
        {[58, 64, 70, 76].map((x) => <path key={x} d={`M${x} ${47 + (x > 70 ? -1 : 0)} l2 4 l2 -4`} fill="#fff" stroke={OL} strokeWidth=".6" />)}
      </g>
      {/* waves */}
      <g className="bs-bob">
        <path d="M0 102 Q10 94 20 102 T40 102 T60 102 T80 102 T100 102 T120 102 L120 120 L0 120 Z" fill={`url(#${u}sea)`} stroke={OL} strokeWidth="1.6" />
        <path d="M0 102 Q10 94 20 102 T40 102 T60 102 T80 102 T100 102 T120 102" stroke="#BFF4FF" strokeWidth="2" fill="none" opacity=".8" />
        {[[14, 108], [50, 112], [92, 108]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#BFF4FF" opacity=".6" />)}
      </g>
    </>
  );
}

function BehemothSVG({ u, eye }) {
  const cracks = "M40 56 L48 64 L44 74 M76 54 L70 64 L78 72 M54 86 L60 78 L66 88 M34 80 L40 88 M86 80 L80 90";
  return (
    <>
      <defs>
        <Grad id={`${u}rock`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6A4A40"], [0.5, "#3A2622"], [1, "#160C0A"]]} />
        <Grad id={`${u}lava`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#FFF2A8"], [0.4, "#FFB43C"], [1, "#FF3A0F"]]} />
      </defs>
      <g className="bs-breathe">
        {/* arms */}
        <path d="M22 46 L34 44 L36 84 L18 96 L10 80 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M98 46 L86 44 L84 84 L102 96 L110 80 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 70 L26 74 L22 84 M102 70 L94 74 L98 84" stroke={`url(#${u}lava)`} strokeWidth="2.2" fill="none" className="bs-glow" />
        {/* torso */}
        <path d="M30 42 L60 30 L90 42 L96 96 L24 96 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2.2" strokeLinejoin="round" />
        <path d={cracks} stroke="#FF3A0F" strokeWidth="5" fill="none" opacity=".45" strokeLinecap="round" className="bs-glow" />
        <path d={cracks} stroke={`url(#${u}lava)`} strokeWidth="2.2" fill="none" strokeLinecap="round" className="bs-glow" />
        <path d="M34 46 L60 36" stroke="#9A7266" strokeWidth="1.5" opacity=".6" />
        {/* base */}
        <path d="M20 96 L100 96 L106 110 L14 110 Z" fill="#241412" stroke={OL} strokeWidth="1.8" />
        <path d="M30 104 C40 100 50 106 60 102 C70 98 80 106 92 102" stroke={`url(#${u}lava)`} strokeWidth="2.4" fill="none" className="bs-glow" />
        {/* head */}
        <path d="M44 20 L60 12 L76 20 L78 38 L60 46 L42 38 Z" fill={`url(#${u}rock)`} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 22 C36 14 30 6 28 0 C38 6 44 10 50 16 Z" fill="#2A1A16" stroke={OL} strokeWidth="1.4" /><path d="M76 22 C84 14 90 6 92 0 C82 6 76 10 70 16 Z" fill="#2A1A16" stroke={OL} strokeWidth="1.4" />
        <path d="M47 26 L57 29 M73 26 L63 29" stroke={OL} strokeWidth="2.4" strokeLinecap="round" />
        <Eye x={52} y={30} r={2.6} c={eye} /><Eye x={68} y={30} r={2.6} c={eye} />
        <path d="M52 38 L68 38 L64 42 L56 42 Z" fill={`url(#${u}lava)`} stroke={OL} strokeWidth="1" className="bs-glow" />
      </g>
      <g className="bs-drip"><path d="M36 96 q2 6 0 9 q-2 -3 0 -9" fill="#FFB43C" /><path d="M84 96 q2 5 0 8 q-2 -3 0 -8" fill="#FF7A2D" /></g>
    </>
  );
}

function RatlordSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}fur`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#9A8F80"], [0.5, "#5E554A"], [1, "#2A241E"]]} />
        <Grad id={`${u}cloak`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#4E6B26"], [1, "#1A2A0C"]]} />
        <Grad id={`${u}gold`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#E8D37A"], [1, "#7A5A12"]]} />
        <Grad id={`${u}mist`} radial stops={[[0, "#B6F06A", 0.55], [1, "#8BC34A", 0]]} />
      </defs>
      <ellipse cx="60" cy="104" rx="56" ry="14" fill={`url(#${u}mist)`} className="bs-glow" />
      <g className="bs-sway"><path d="M84 100 C104 104 116 90 110 76 C106 68 98 72 102 80" stroke={OL} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M84 100 C104 104 116 90 110 76 C106 68 98 72 102 80" stroke="#D9A39A" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
      <g className="bs-breathe">
        {/* cloak body */}
        <path d="M26 110 C24 80 36 62 60 60 C84 62 96 80 94 110 Z" fill={`url(#${u}cloak)`} stroke={OL} strokeWidth="2" />
        <path d="M40 110 L44 96 L48 110 M70 110 L74 98 L78 110" stroke={OL} strokeWidth="1.2" fill="none" />
        <path d="M44 66 C52 72 68 72 76 66" stroke="#8BC34A" strokeWidth="1.5" fill="none" opacity=".6" />
        {/* claws holding staff */}
        <rect x="26" y="40" width="3" height="68" fill="#5A3A1A" stroke={OL} strokeWidth=".8" />
        <circle cx="27.5" cy="38" r="5" fill="#C6F07A" stroke={OL} strokeWidth="1.2" className="bs-glow" />
        <path d="M24 76 C30 70 36 74 34 80 C32 84 26 82 24 76 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.2" />
        {/* ears */}
        <path d="M34 30 C22 18 26 4 38 8 C46 12 46 22 44 30 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.8" /><path d="M36 26 C30 18 32 10 38 12 C42 14 42 20 41 26 Z" fill="#D9A39A" />
        <path d="M86 30 C98 18 94 4 82 8 C74 12 74 22 76 30 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="1.8" /><path d="M84 26 C90 18 88 10 82 12 C78 14 78 20 79 26 Z" fill="#D9A39A" /><path d="M92 12 L88 16 L94 18" stroke={OL} strokeWidth="1.2" fill="none" />
        {/* head */}
        <path d="M36 40 C36 22 84 22 84 40 C84 50 74 56 68 64 C64 70 56 70 52 64 C46 56 36 50 36 40 Z" fill={`url(#${u}fur)`} stroke={OL} strokeWidth="2" />
        <path d="M44 30 C50 26 58 25 64 26" stroke="#C9C0B0" strokeWidth="1.5" opacity=".6" fill="none" strokeLinecap="round" />
        <Eye x={49} y={40} r={2.8} c={eye} /><Eye x={71} y={40} r={2.8} c={eye} />
        <ellipse cx="60" cy="64" rx="4" ry="3" fill="#E08A8A" stroke={OL} strokeWidth="1" />
        <path d="M58 68 L58 72 L60 71 L62 72 L62 68" fill="#FFF3C4" stroke={OL} strokeWidth=".7" />
        <g className="bs-whisk"><path d="M54 62 L36 58 M54 64 L34 66 M66 62 L84 58 M66 64 L86 66" stroke="#E6DDCB" strokeWidth=".9" /></g>
        {/* crooked crown */}
        <g transform="rotate(-12 60 22)"><path d="M46 24 L48 12 L54 18 L60 8 L66 18 L72 12 L74 24 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.5" strokeLinejoin="round" /><circle cx="60" cy="16" r="1.8" fill="#8BC34A" /></g>
      </g>
      <g className="bs-rise" opacity=".8"><circle cx="18" cy="96" r="3" fill="none" stroke="#C6F07A" strokeWidth="1" /><circle cx="100" cy="92" r="2.2" fill="none" stroke="#C6F07A" strokeWidth="1" /></g>
    </>
  );
}

function PharaohSVG({ u, eye }) {
  return (
    <>
      <defs>
        <Grad id={`${u}gold`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#FFF1B8"], [0.45, "#E8C872"], [1, "#8A6212"]]} />
        <Grad id={`${u}lapis`} x1={0} y1={0} x2={0} y2={1} stops={[[0, "#3E6FD8"], [1, "#132E6E"]]} />
        <Grad id={`${u}wrap`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#F2E6C8"], [1, "#9C8A62"]]} />
      </defs>
      <g className="bs-sway" opacity=".55"><path d="M4 96 C30 84 50 104 76 92 C96 84 110 94 118 88" stroke="#E8C872" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M10 106 C36 96 60 112 88 102" stroke="#D9B45A" strokeWidth="2" fill="none" strokeLinecap="round" /></g>
      <g className="bs-float">
        {/* shoulders + collar */}
        <path d="M18 108 C18 84 34 74 60 74 C86 74 102 84 102 108 Z" fill={`url(#${u}wrap)`} stroke={OL} strokeWidth="2" />
        <path d="M30 84 C44 94 76 94 90 84 L94 92 C78 104 42 104 26 92 Z" fill={`url(#${u}lapis)`} stroke={OL} strokeWidth="1.4" />
        <path d="M28 88 C44 98 76 98 92 88" stroke={`url(#${u}gold)`} strokeWidth="2.2" fill="none" />
        {[34, 60, 86].map((x) => <path key={x} d={`M${x - 10} 100 L${x + 10} 96`} stroke="#9C8A62" strokeWidth="1" />)}
        {/* crook + flail */}
        <path d="M44 110 L72 80" stroke={OL} strokeWidth="5" strokeLinecap="round" /><path d="M44 110 L72 80" stroke={`url(#${u}gold)`} strokeWidth="3" strokeLinecap="round" /><path d="M72 80 C78 72 70 66 66 72" stroke={`url(#${u}gold)`} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M76 110 L48 80" stroke={OL} strokeWidth="5" strokeLinecap="round" /><path d="M76 110 L48 80" stroke={`url(#${u}lapis)`} strokeWidth="3" strokeLinecap="round" />{[-5, 0, 5].map((d) => <path key={d} d={`M48 80 L${42 + d} 90`} stroke={`url(#${u}gold)`} strokeWidth="1.8" strokeLinecap="round" />)}
        {/* nemes headdress */}
        <clipPath id={`${u}nm`}><path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" /></clipPath>
        <path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" fill={`url(#${u}gold)`} />
        <g clipPath={`url(#${u}nm)`}>{[18, 26, 34, 42, 50, 58, 66, 74].map((y) => <rect key={y} x="0" y={y} width="120" height="4" fill={`url(#${u}lapis)`} />)}<path d="M30 10 C40 20 44 40 42 70 L30 80 Z M90 10 C80 20 76 40 78 70 L90 80 Z" fill="#000" opacity=".18" /></g>
        <path d="M30 34 C30 10 90 10 90 34 L96 76 L80 66 L40 66 L24 76 Z" fill="none" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        <path d="M36 16 C46 10 60 9 70 10" stroke="#fff" strokeWidth="1.6" opacity=".6" fill="none" strokeLinecap="round" />
        <path d="M40 24 C48 20 72 20 80 24 L80 28 L40 28 Z" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.2" />
        {/* face */}
        <path d="M42 28 L78 28 L76 56 C72 64 48 64 44 56 Z" fill={`url(#${u}wrap)`} stroke={OL} strokeWidth="1.8" />
        {[34, 42, 50].map((y) => <path key={y} d={`M43 ${y} L77 ${y + 3}`} stroke="#9C8A62" strokeWidth=".9" opacity=".8" />)}
        <path d="M46 36 L56 36 L56 42 L46 42 Z M64 36 L74 36 L74 42 L64 42 Z" fill="#1A1206" />
        <Eye x={51} y={39} r={2.3} c={eye} /><Eye x={69} y={39} r={2.3} c={eye} />
        <path d="M44 40 L40 42 M76 40 L80 42" stroke="#1A1206" strokeWidth="1.8" />
        {/* beard */}
        <path d="M56 60 L64 60 L63 72 L57 72 Z" fill={`url(#${u}lapis)`} stroke={OL} strokeWidth="1.2" />
        {/* uraeus */}
        <path d="M60 22 C54 20 56 12 60 12 C64 12 66 18 62 22 L60 30" fill={`url(#${u}gold)`} stroke={OL} strokeWidth="1.2" /><circle cx="60" cy="16" r="1.3" fill="#FF2D2D" />
      </g>
    </>
  );
}

function VoidSVG({ u, eye }) {
  const stars = [[42, 58], [70, 48], [52, 76], [78, 70], [60, 88], [38, 70], [84, 58], [48, 46], [66, 80]];
  return (
    <>
      <defs>
        <Grad id={`${u}orb`} radial cx={0.4} cy={0.35} r={0.65} stops={[[0, "#3A1070"], [0.55, "#12002A"], [1, "#030006"]]} />
        <Grad id={`${u}rim`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#C9A8FF"], [0.5, "#6A00FF"], [1, "#2A0060"]]} />
        <Grad id={`${u}obs`} x1={0} y1={0} x2={1} y2={1} stops={[[0, "#6A5A8A"], [1, "#0A0414"]]} />
      </defs>
      {/* halo ring behind */}
      <g className="bs-spin-slow"><ellipse cx="60" cy="62" rx="54" ry="54" fill="none" stroke={`url(#${u}rim)`} strokeWidth="1.5" strokeDasharray="3 7" opacity=".8" /></g>
      {/* tendrils */}
      <g className="bs-sway">{[34, 48, 62, 76, 88].map((x, i) => <path key={x} d={`M${x} 88 C${x - 6 + i * 2} 100 ${x + 8 - i * 3} 106 ${x - 2} 118`} stroke={OL} strokeWidth="6" fill="none" strokeLinecap="round" />)}{[34, 48, 62, 76, 88].map((x, i) => <path key={x} d={`M${x} 88 C${x - 6 + i * 2} 100 ${x + 8 - i * 3} 106 ${x - 2} 118`} stroke="#2A0A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" />)}</g>
      <g className="bs-breathe">
        {/* crown spikes */}
        {[-50, -30, -12, 0, 12, 30, 50].map((a, i) => <path key={i} d={`M56 30 L60 ${i === 3 ? 0 : 8 + Math.abs(a) * 0.12} L64 30 Z`} fill={`url(#${u}obs)`} stroke={OL} strokeWidth="1.2" transform={`rotate(${a} 60 62)`} />)}
        {/* orb */}
        <circle cx="60" cy="62" r="32" fill={`url(#${u}orb)`} stroke={`url(#${u}rim)`} strokeWidth="2.4" />
        {stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.8 : 1.3} fill="#fff" opacity={0.5 + (i % 3) * 0.2} className={i % 2 ? "bs-eye" : ""} />)}
        <path d="M40 46 C46 38 56 35 64 36" stroke="#C9A8FF" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round" />
        {/* the eye */}
        <g className="bs-eye">
          <ellipse cx="60" cy="62" rx="14" ry="7" fill={eye} opacity=".25" />
          <path d="M46 62 C52 54 68 54 74 62 C68 70 52 70 46 62 Z" fill="#F4ECFF" stroke={OL} strokeWidth="1.4" />
          <ellipse cx="60" cy="62" rx="4.5" ry="5.5" fill={eye} />
          <ellipse cx="60" cy="62" rx="1.3" ry="4.8" fill={OL} />
        </g>
      </g>
    </>
  );
}

const BOSS_SVGS = { wyrm: WyrmSVG, colossus: ColossusSVG, gravemaw: GravemawSVG, chud: ChudSVG, rust: RustSVG, harpy: HarpySVG, warden: WardenSVG, leviathan: LeviathanSVG, behemoth: BehemothSVG, ratlord: RatlordSVG, pharaoh: PharaohSVG, void: VoidSVG };
function BossFigure({ boss, size, rage, dead }) {
  const u = `b${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Art = BOSS_SVGS[boss.id];
  const eye = rage ? "#FF2D2D" : boss.eye || boss.color;
  if (!Art) return <span style={{ fontSize: size * 0.62 }}>{boss.icon}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={boss.name} className={`bossfig${rage ? " bs-rage" : ""}${dead ? " bs-dead" : ""}`} style={{ overflow: "visible" }}>
      <Art u={u} eye={eye} />
    </svg>
  );
}
// Painted art, if present in /public/bosses, replaces the SVG. We check once per session and remember the answer.
const bossImgCache = {};
function useBossImage(id) {
  const [ok, setOk] = useState(bossImgCache[id] === true);
  useEffect(() => {
    if (bossImgCache[id] !== undefined) { setOk(bossImgCache[id] === true); return; }
    const img = new Image();
    img.onload = () => { bossImgCache[id] = img.naturalWidth > 0; setOk(bossImgCache[id]); };
    img.onerror = () => { bossImgCache[id] = false; };
    img.src = `/bosses/${id}.webp`;
  }, [id]);
  return ok;
}

/* ---------- Support ---------- */
function SupportForm({ s, tab = "settings" }) {
  const [cat, setCat] = useState("Bug");
  const [msg, setMsg] = useState("");
  const [state, setState] = useState({ status: "idle", text: "" });
  const send = async () => {
    setState({ status: "sending", text: "" });
    try {
      const auth = window.ascendAuth;
      const token = auth?.token ? await auth.token() : "";
      const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ category: cat, message: msg, name: s.profile.name, info: { tab, ua: navigator.userAgent } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Couldn't send");
      setMsg(""); setState({ status: "sent", text: "Sent. You'll get a reply at your account email." });
    } catch (e) { setState({ status: "error", text: String(e.message || e) }); }
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Bug", "Feature idea", "Account", "Other"].map((c) => <button key={c} onClick={() => setCat(c)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: cat === c ? C.blue : C.glass, color: cat === c ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{c}</button>)}
      </div>
      <textarea className="inp body text-sm" rows={4} maxLength={4000} placeholder={cat === "Bug" ? "What happened, and what did you expect?" : "Tell us what's on your mind"} value={msg} onChange={(e) => { setMsg(e.target.value); if (state.status !== "sending") setState({ status: "idle", text: "" }); }} aria-label="Support message" />
      <button onClick={send} disabled={msg.trim().length < 5 || state.status === "sending"} className="btn w-full py-3 flex items-center justify-center gap-2" style={msg.trim().length < 5 ? { opacity: 0.5 } : null}>{state.status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send to support</button>
      {state.text && <div className="body text-sm" style={{ color: state.status === "sent" ? C.green : C.red }}>{state.text}</div>}
    </div>
  );
}

/* ---------- Geo helpers ---------- */

/* ---------- Live run tracker (full screen) ---------- */


/* ---------- Steps ---------- */

/* ---------- Route planner + run hub ---------- */

/* ---------- Onboarding ---------- */
function Confetti({ onDone }) {
  useEffect(() => { SFX.levelUp(); const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  const cols = ["#FFD447", "#3DF08A", "#38C6FF", "#B14BFF", "#FF2D6F", "#FFFFFF"];
  return (
    <div className="fixed inset-0 z-[68] pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: 70 }, (_, i) => (
        <span key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: -20, width: i % 3 ? 8 : 12, height: i % 4 ? 12 : 6, background: cols[i % cols.length], borderRadius: i % 3 ? 2 : 999, "--sx": `${((i * 53) % 120) - 60}px`, "--rot": `${(i * 97) % 720}deg`, animation: `confetti ${1.6 + ((i * 13) % 10) / 10}s ${(i % 8) * 0.07}s cubic-bezier(.2,.6,.4,1) forwards` }} />
      ))}
    </div>
  );
}
function Onboarding({ s, setS, step, onNext }) {
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  const [name, setName] = useState(p.name || "");
  const ft = Math.floor((p.height || 70) / 12), inch = Math.round((p.height || 70) % 12);
  const setHeight = (f, i2) => set("height", Math.max(48, Math.min(90, f * 12 + i2)));
  const wrap = (children) => (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-1.5 pt-2">{[0, 1, 2, 3].map((i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 999, background: i <= step ? C.cyan : C.glassLine, transition: "width .2s" }} />)}</div>
      {children}
    </div>
  );
  if (step === 0) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <img src="/logo.webp" alt="" style={{ width: 96, margin: "0 auto", display: "block" }} />
        <div className="text-center"><div className="text-2xl font-bold">Welcome to Ascend</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Your lifts get ranked E through S, scaled to your body. First, the basics.</div></div>
        <label className="body text-sm block">What should we call you?
          <input autoFocus className="inp mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && (set("name", name.trim()), onNext())} />
        </label>
        <button disabled={!name.trim()} onClick={() => { set("name", name.trim()); onNext(); }} className="btn w-full py-3" style={!name.trim() ? { opacity: 0.5 } : null}>Continue</button>
      </div>,
    );
  }
  if (step === 1) {
    const cur = bodySex(p);
    return wrap(
      <div className="panel p-5 space-y-4">
        <div><div className="text-xl font-bold">Body type</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Ranks and calorie targets use this so a given letter is equally hard for everyone. You can change it later; achievements, XP, titles, and cosmetics stay.</div></div>
        <div className="grid grid-cols-2 gap-2">
          {[["m", "Male"], ["f", "Female"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => set("sex", id)} className="py-4 font-bold" style={{ borderRadius: 12, background: cur === id ? C.blue : C.glass, color: cur === id ? "#fff" : C.text, border: `1px solid ${cur === id ? C.cyan : C.glassLine}` }}>{label}</button>
          ))}
        </div>
        <button onClick={onNext} className="btn w-full py-3">Continue</button>
      </div>,
    );
  }
  if (step === 2) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <div><div className="text-xl font-bold">Your body stats</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Every rank target and calorie goal is built from these. You can change them any time.</div></div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<NumField inputMode="decimal" className="inp mt-1" value={p.weight} onCommit={(v) => { if (v === "") return; set("weight", v); }} /></label>
          <label>Age<NumField inputMode="numeric" className="inp mt-1" value={p.age} onCommit={(v) => { if (v === "") return; set("age", v); }} /></label>
          <label className="col-span-2">Height<div className="flex gap-1 mt-1"><NumField inputMode="numeric" className="inp text-center" value={ft} onCommit={(v) => { if (v === "") return; setHeight(v, inch); }} aria-label="Feet" /><span className="self-center body text-xs" style={{ color: C.dim }}>ft</span><NumField inputMode="numeric" className="inp text-center" value={inch} onCommit={(v) => { if (v === "") return; setHeight(ft, v); }} aria-label="Inches" /><span className="self-center body text-xs" style={{ color: C.dim }}>in</span></div></label>
          <label className="col-span-2">Training now<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <label className="col-span-2">Goal<select className="inp mt-1" value={p.goal} onChange={(e) => set("goal", e.target.value)}>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
        </div>
        <button onClick={() => { setS((x) => ({ ...x, weightLog: { ...(x.weightLog || {}), [today()]: +x.profile.weight || 170 } })); onNext(); }} className="btn w-full py-3">Save stats</button>
      </div>,
    );
  }
  return wrap(
    <div className="panel p-5 space-y-4">
      <div><div className="text-xl font-bold">Join the season</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Season {seasonKey().split("-S")[1]} is live. Joining puts you on the leaderboard, the feed, boss fights, and duels. Your food log and workout details stay private.</div></div>
      <div className="panel p-3 flex items-center gap-3" style={{ background: "transparent" }}>
        <Avatar name={p.name} size={44} ring={C.cyan} />
        <div className="min-w-0"><div className="font-bold truncate">{p.name}</div><div className="body text-xs" style={{ color: C.dim }}>{p.weight} lb · {ft}'{inch}" · {GOALS.find((g) => g.id === p.goal)?.label}</div></div>
      </div>
      <button onClick={() => { setS((x) => ({ ...x, lb: true })); onNext(); }} className="btn w-full py-3">Join the leaderboard</button>
      <button onClick={onNext} className="body text-sm w-full" style={{ color: C.mute }}>Skip for now</button>
    </div>,
  );
}

/* ---------- Crews ---------- */
const crewCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
async function readCrew(code) {
  try { const r = await window.storage.get(`crew:${code}`, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
async function listCrewMemberIds(code, rec, rows) {
  const fromCards = (rows || []).filter((r) => r.crew?.code === code).map((r) => r.id).filter(Boolean);
  const fromRec = rec?.members || [];
  let fromKeys = [];
  try {
    const list = await window.storage.list(`crewmem:${code}:`, true);
    fromKeys = (list?.keys || []).map((k) => k.slice(`crewmem:${code}:`.length)).filter(Boolean);
  } catch { /* shared list may fail offline */ }
  return [...new Set([...fromCards, ...fromRec, ...fromKeys])];
}
async function loadCrewRoster(code, s, rows) {
  const rec = await readCrew(code);
  const ids = await listCrewMemberIds(code, rec, rows);
  if (s?.playerId && !s.test && !ids.includes(s.playerId)) ids.push(s.playerId);
  const byId = new Map();
  (rows || []).forEach((r) => { if (r.id && !r.ghost) byId.set(r.id, r); });
  const missing = ids.filter((id) => !byId.has(id));
  await Promise.all(missing.map(async (id) => {
    try {
      const r = await window.storage.get(`lb:${id}`, true);
      if (r?.value) {
        const card = JSON.parse(r.value);
        if (card.ghost) return;
        byId.set(id, { key: `lb:${id}`, ...card });
      } else if (!(id === s.playerId && s.test)) byId.set(id, { id, name: id === s.playerId ? s.profile.name : "Teammate" });
    } catch { if (!(id === s.playerId && s.test)) byId.set(id, { id, name: id === s.playerId ? s.profile.name : "Teammate" }); }
  }));
  if (s?.playerId && !s.test) {
    const me = byId.get(s.playerId) || {};
    byId.set(s.playerId, { ...me, id: s.playerId, name: s.profile.name || me.name, look: s.profile.look || me.look, avatar: s.profile.avatar || me.avatar, crew: s.crew });
  }
  return { rec, rows: ids.map((id) => byId.get(id)).filter((r) => r && !r.ghost) };
}
async function writeCrewMembership(code, rec, s, join) {
  const memKey = `crewmem:${code}:${s.playerId}`;
  if (join) {
    try { await window.storage.set(memKey, JSON.stringify({ id: s.playerId, name: s.profile.name, since: today(), uid: window.ascendUserId || null }), true); } catch (e) { /* still joined locally */ }
    const members = [...new Set([...(rec?.members || []), s.playerId])];
    try { await window.storage.set(`crew:${code}`, JSON.stringify({ ...rec, members }), true); } catch (e) { /* owner-only write blocked */ }
    return { ...rec, members };
  }
  try { await window.storage.delete(memKey, true); } catch (e) { /* none */ }
  const members = (rec?.members || []).filter((id) => id !== s.playerId);
  try { if (rec) await window.storage.set(`crew:${code}`, JSON.stringify({ ...rec, members }), true); } catch (e) { /* owner-only */ }
  return rec ? { ...rec, members } : rec;
}
// Cosmetic only: a pennant showing how many weekly crew quests this player has banked
function CrewBanner({ count = 1, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5" style={{ borderRadius: 999, border: `1px solid ${C.cyan}66`, background: "rgba(56,198,255,.12)" }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 1h10v11l-5-3-5 3z" fill={C.cyan} opacity="0.85" />
        <path d="M3 1h10v11l-5-3-5 3z" fill="none" stroke={C.cyan} strokeWidth="1" />
      </svg>
      <span className="body text-xs font-bold" style={{ color: C.cyan }}>Crew banner{count > 1 ? ` ×${count}` : ""}</span>
    </span>
  );
}
// Shared weekly quests for the crew. Pooled across members, targets scale with headcount,
// and none of it touches boss HP or boss damage.
function CrewQuests({ s, setS, rows, crew, code }) {
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
function raidStatus(id, presence, raid, now) {
  const gym = presenceActive(presence?.[id], now);
  const ready = raidPhase(raid, now) === "lobby" && gym && raid?.ready?.[id] != null && !(raid.left?.[id] != null && +raid.left[id] >= +raid.ready[id]);
  if (ready) return "ready";
  if (gym) return "at-gym";
  return "not-here";
}
function RaidNight({ s, setS, crew, code, people, presence, raid, setRaid, ghost, gainXp }) {
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
function CrewGymBlock({ s, setS, crew, setCrew, presence, people, ghost }) {
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
function GhostCrew({ s, setS, gainXp }) {
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
function CrewPanel({ s, setS, rows, openProfile, gainXp }) {
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
function BossArt({ boss, pct, dead, hit, size = 84 }) {
  const enraged = pct <= 0.5 && !dead;
  const img = useBossImage(boss.id);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {!dead && <div style={{ position: "absolute", inset: -size * 0.08, borderRadius: "50%", background: `radial-gradient(closest-side, ${enraged ? "rgba(255,45,45,.38)" : `${boss.color}40`}, transparent)`, animation: `aurapulse ${enraged ? 1.1 : 2.6}s ease-in-out infinite` }} />}
      {enraged && Array.from({ length: 8 }, (_, i) => <span key={i} style={{ position: "absolute", left: `${30 + ((i * 37) % 40)}%`, top: "62%", width: 5, height: 5, borderRadius: 999, background: i % 2 ? "#FF7A2D" : "#FF2D2D", boxShadow: "0 0 6px #FF2D2D", "--dx": `${((i * 47) % 70) - 35}px`, "--dy": `${-size * 0.35 - ((i * 23) % 40)}px`, "--rot": "0deg", animation: `juicespark ${1.2 + (i % 3) * 0.3}s ${i * 0.18}s linear infinite` }} />)}
      <div className="absolute inset-0 flex items-center justify-center" style={{ filter: dead ? "none" : `drop-shadow(0 0 ${enraged ? 14 : 8}px ${enraged ? "rgba(255,45,45,.8)" : `${boss.color}AA`})`, opacity: dead ? 0.55 : 1, animation: hit ? "bosshit .45s ease-out" : "none" }}>
        {img
          ? <img src={`/bosses/${boss.id}.webp`} alt={boss.name} className={`bossimg${enraged ? " bs-rage" : ""}${dead ? " bs-dead" : ""}`} style={{ width: size, height: size, objectFit: "contain" }} />
          : <div className={dead ? "" : "bs-hover"}><BossFigure boss={boss} size={size} rage={enraged} dead={dead} /></div>}
      </div>
    </div>
  );
}

/* ---------- XP ledger ---------- */
/* ---------- XP ledger ---------- */
// Every XP award is one row with a stable event id. The same id can never count twice (enforced by
// the xp_logs primary key on the server). Totals on the boards are sums of these rows by day.
// Rebuild every award from the records that prove it happened

// One-time (per version) rebuild: totals, per-day log and detail all come from the rows above

// Offline-safe sync to the xp_logs table. Rows wait in localStorage until the server has them.

// What the server saw from this person's Shortcut: last attempts + whether their code is registered

// Card flips roll into one session: a flip within 15 minutes of the previous flip extends it.
const CARD_GAP_MS = 15 * 60000;
const isCardFlip = (x) => /^deck_/.test(x.event_id || "") || /^Card deck( ·| cleared)/.test(x.source || "");
function groupCardSessions(list) {
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
const fmtMins = (m) => (m < 1 ? "under 1 min" : m < 60 ? `${m} min${m === 1 ? "" : "s"}` : `${Math.floor(m / 60)} h ${m % 60} min`);

function XpLedger({ s, onBack, drawer = false }) {
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
function LogWorkoutSheet({ s, setS, w, onClose }) {
  const [saved, setSaved] = useState(false);
  const savePreset = () => {
    const name = w.title ? `${w.title} (${fmtDay(w.date)})` : `Workout ${fmtDay(w.date)}`;
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), presetFromExercises(name, w.exercises)] }));
    setSaved(true);
  };
  return (
    <Sheet title={`${w.title || "Workout"} · ${fmtDay(w.date)}`} onClose={onClose}>
      {gymLabel(s, workoutGym(w)) ? <div className="body text-xs" style={{ color: C.mute }}>{gymLabel(s, workoutGym(w))}</div> : null}
      <div className="grid grid-cols-3 gap-2">
        {[["XP", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Time", w.minutes ? `${w.minutes} min` : "–"]].map(([l, v]) => <div key={l} className="panel py-2.5 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold">{v}</div></div>)}
      </div>
      {w.exercises.map((ex, i) => {
        const def = findEx(s, ex.name);
        return (
          <div key={i} className="panel p-3">
            <div className="font-semibold" style={{ color: C.cyan }}>{ex.name}</div>
            {ex.sets.map((st, j) => <div key={j} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Set {j + 1}</span><span className="font-semibold">{setLabel(def, st)}</span></div>)}
          </div>
        );
      })}
      <button onClick={savePreset} disabled={saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to presets</> : <><Bookmark size={16} />Save as my preset</>}</button>
    </Sheet>
  );
}

/* ---------- Hydration bar (sits beside the macros) ---------- */
