import { PENDING_KEY_LEGACY, claimUnscopedPending, isVerifiedLocalCopy, makeVerifiedCopy, pendingKey, verifiedCopyKey } from "./math.js";
export const DEFAULT = {
  profile: { name: "", weight: 170, height: 70, age: 20, sex: "m", activity: 1.55, goal: "lean" },
  xp: 0, xpLog: {}, workouts: [], active: null, days: {}, meals: {}, weekly: {}, monthly: {}, rankSnap: null, rankHist: {}, steps: {}, stepXp: {}, savedRoutes: [], stepToken: null, stepTokenHash: null, loot: {}, seasonBadges: {}, nemesis: null, nemesisSeen: {}, roasts: {}, checkins: {}, atGym: null, water: {}, dayTemplates: [], measure: {}, groupClaimed: {}, duelClaimed: {}, lastSummary: null, playerId: null, lb: false, test: false, ghost: null, bossRecaps: {}, streakNagDay: null, worldFirsts: {}, wfClaim: {}, crewBanners: {}, custom: [], fuelClaimed: {}, chat: [], ach: {}, achV: 3, mogClaimed: {}, xpDetail: {}, xpDone: {}, presets: [], weightLog: {}, community: { ex: [], foods: [] }, savedFoods: [], gyms: [], currentGym: null, gymSpecific: {}, testCrate: { pity: 0, log: [] },
  settings: { theme: "dark", zesty: false, voice: true, voiceStyle: "goblin", sounds: true, rest: 90, dysFont: false, custom: { on: false, cyan: "#00D9FF", blue: "#0A84FF", bg: "#000000" } },
};

export let pendingWarned = false;
export function deviceUserId() {
  return (typeof window !== "undefined" && (window.ascendUserId || window.__ascendStorageUser)) || "me";
}
export function readPending() {
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
export function writePending(state, snap) {
  if (typeof window !== "undefined" && window.__ascendNoPersist) return;
  try { localStorage.setItem(pendingKey(deviceUserId()), JSON.stringify({ state, snap, t: Date.now() })); }
  catch (e) { if (!pendingWarned) { pendingWarned = true; console.warn("[ascend] pending copy failed", e); } }
}
export function clearPending() {
  try { localStorage.removeItem(pendingKey(deviceUserId())); } catch (e) { /* private mode */ }
}
export function readVerifiedCopy(userId = deviceUserId()) {
  try {
    const raw = localStorage.getItem(verifiedCopyKey(userId));
    if (!raw) return null;
    const copy = JSON.parse(raw);
    return isVerifiedLocalCopy(copy, userId) ? copy : null;
  } catch { return null; }
}
export function writeVerifiedCopy(state) {
  if (typeof window !== "undefined" && window.__ascendNoPersist) return;
  const uid = deviceUserId();
  const copy = makeVerifiedCopy(uid, state);
  if (!isVerifiedLocalCopy(copy, uid)) return;
  try { localStorage.setItem(verifiedCopyKey(uid), JSON.stringify(copy)); }
  catch (e) { /* private mode */ }
}
export const WIPE_SAVE_NOTE = "Couldn't save: this would wipe your progress. Local copy kept.";
export const URGENT_SAVE = ["meals", "workouts", "weightLog", "presets", "savedFoods", "dayTemplates", "fuelClaimed", "water", "measure"];

/* ---------- App ---------- */
// Bump with every update so it's easy to confirm which version is live (Settings shows it)
export const APP_VERSION = "7c.2";
export function stateSizeKb(obj) {
  try {
    const n = JSON.stringify(obj || {}).length;
    return Math.round(n / 1024);
  } catch { return 0; }
}




export const BACKUP_KEY = "ascend-state-backup-6z";
// Pre-built iPhone Shortcut URL only. Ingest rules live in api/steps.js. Replace PUT_HASH_HERE with the iCloud share hash.
// Which built bundle this page is running, e.g. "index-Ab12Cd.js"
export const runningBundle = () => { try { return [...document.querySelectorAll('script[src*="/assets/"]')].map((x) => x.getAttribute("src").split("/assets/").pop()).find((n) => /^index-/.test(n)) || null; } catch (e) { return null; } };
