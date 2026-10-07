// Quest + rest-timer notification plumbing. The pure decisions
// (toggle state, should-fire, label) are exported for tests; the DOM and
// service-worker calls sit behind them and no-op where unsupported.

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
