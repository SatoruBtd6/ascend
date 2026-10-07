// Quest + rest-timer notification plumbing. The pure decisions
// (toggle state, should-fire, label) are exported for tests; the DOM and
// service-worker calls sit behind them and no-op where unsupported.
import { supabase, configured } from "../supabase.js";

const VAPID_PUBLIC = (import.meta.env?.VITE_VAPID_PUBLIC_KEY || "").trim();

// Pure: what the Settings "Quest alerts" row can do.
//   "ready"       — toggle usable (permission granted or still askable)
//   "denied"      — OS said no; can't re-prompt, toggle shows a note
//   "install"     — iOS without a home-screen install: no Notification API
//   "unsupported" — no Notification API at all (non-iOS)
export function questAlertToggleState({ hasApi, isIOS, installed, permission }) {
  if (!hasApi) return isIOS ? "install" : "unsupported";
  if (isIOS && !installed) return "install";
  if (permission === "denied") return "denied";
  return "ready";
}

// Pure: fire only when the claimable count ROSE while the toggle is on and
// the OS granted permission. Same count the nav badge shows.
export function questAlertShouldFire(prev, next, { enabled, permission }) {
  return !!(enabled && permission === "granted" && next > prev);
}

// Pure: notification text. Shared by the foreground alert and (Stage 2) the
// daily push so the wording can't drift.
export const questAlertText = (n) => ({ title: "Quests ready", body: `You have ${n} quest${n === 1 ? "" : "s"} waiting.` });

export const isIOSDevice = () => /iP(hone|ad|od)/.test(navigator.platform || "") || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
export const isInstalledPwa = () => navigator.standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches;
export const notifyPermission = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

// One shared permission request for quest alerts and the rest timer. MUST be
// called synchronously inside a user gesture (Quest alerts toggle, set-done
// tap) — iOS silently ignores requests fired from effects or timers. Returns
// the requestPermission promise (or null when nothing was asked).
export function requestNotifyPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") return Notification.requestPermission().catch(() => {});
  } catch { /* no API */ }
  return null;
}

// Foreground banner for a newly-claimable quest. tag collapses several
// unlocks into one banner; falls back to the service worker on platforms
// where page-constructed notifications throw.
export function fireQuestAlert(n) {
  const { title, body } = questAlertText(n);
  try { new Notification(title, { body, tag: "ascend-quest", icon: "/icon-192.png" }); return true; } catch { /* fall through */ }
  try { navigator.serviceWorker?.ready?.then((r) => r?.showNotification?.(title, { body, tag: "ascend-quest", icon: "/icon-192.png" })); } catch { /* none */ }
  return false;
}

const urlB64ToU8 = (b64) => {
  const clean = b64.replace(/\s/g, ""); // env values sometimes carry a pasted newline/space
  const pad = "=".repeat((4 - (clean.length % 4)) % 4);
  const bin = atob((clean + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64key = (buf) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))) : null);

// Keep the push_subscriptions row in step with the toggle. ON: subscribe (or
// reuse the current subscription — upsert also covers iOS rotating endpoints)
// and upsert {uid, endpoint, keys, player_id}. OFF: unsubscribe + delete the
// user's rows, so the daily job can't reach them.
// Returns true on success, otherwise a short reason string — also logged as
// console.error("[ascend-push] ...") so a phone user can see WHY it failed
// (the Settings row surfaces it too).
export async function syncPushSubscription(on, playerId) {
  const fail = (why, e) => { const m = `${why}${e ? ` — ${e?.message || e}` : ""}`; try { console.error(`[ascend-push] ${m}`); } catch { /* console? */ } return m; };
  try {
    if (!configured || !supabase) return fail("no Supabase client (env missing)");
    if (!VAPID_PUBLIC) return fail("VITE_VAPID_PUBLIC_KEY missing from this build — set it in Vercel and redeploy");
    const uid = window.ascendUserId;
    if (!uid) return fail("no signed-in user id");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return fail("PushManager unsupported — on iPhone install the app to the home screen");
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error("service worker never became active")), 8000)),
    ]);
    if (!on) {
      try { const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); } catch (e) { console.error("[ascend-push] unsubscribe", e); }
      const { error } = await supabase.from("push_subscriptions").delete().eq("uid", uid);
      return error ? fail("row delete failed", error) : true;
    }
    if (typeof Notification === "undefined") return fail("no Notification API");
    if (Notification.permission !== "granted") return fail(`permission is ${Notification.permission}, not granted`);
    let sub = null;
    try { sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(VAPID_PUBLIC) }); }
    catch (e) { return fail("pushManager.subscribe threw", e); }
    if (!sub) return fail("subscribe() returned no subscription");
    const j = sub.toJSON ? sub.toJSON() : {}; // early iOS 16.4 lacks toJSON — fall back to getKey
    const keys = j.keys || { p256dh: b64key(sub.getKey?.("p256dh")), auth: b64key(sub.getKey?.("auth")) };
    const { error } = await supabase.from("push_subscriptions").upsert({ uid, endpoint: sub.endpoint, keys, player_id: playerId || null, updated_at: new Date().toISOString() }, { onConflict: "uid,endpoint" });
    return error ? fail("push_subscriptions write failed (RLS?)", error) : true;
  } catch (e) { return fail("unexpected", e); }
}
