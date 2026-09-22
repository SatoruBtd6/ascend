import { RAID_NEED, applyRaidAction, prunePresence, raidPhase } from "../../math.js";
import { casPres, casRaid, patchGhost } from "../train/raidIO.js";
export const IOS_LOC = "On iPhone: Settings → Privacy & Security → Location Services (on), then Settings → Apps → Safari → Location → Allow. Reload this page in Safari (not an in-app browser) and tap Allow when asked. The site has to be HTTPS.";
export const fmtHMS = (sec) => {
  const s = Math.max(0, Math.floor(+sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
export const fmtAgo = (t, now = Date.now()) => {
  const m = Math.max(0, Math.floor((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};
export function getGps(opts = {}) {
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
export function locErrorText(err) {
  if (err?.code === 1) return `Location is blocked. ${IOS_LOC}`;
  if (err?.code === 2) return "Couldn't find you. Step outside or near a window and try again.";
  if (err?.code === 3) return "Location timed out. Try again in a spot with a clearer sky.";
  if (err?.message === "no-geo") return "This browser can't share location.";
  return "Couldn't get your location.";
}
export async function stampPresence(s, setS, t, drop = false) {
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
