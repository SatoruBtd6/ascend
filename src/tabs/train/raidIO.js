import { applyRaidAction, reconcileRaid, prunePresence, RAID_NEED } from "../../math.js";
export function ghostBundle(s) {
  const pid = s.playerId || "me";
  if (s.ghost?.crew) return s.ghost;
  return {
    crew: { code: "LOCAL", name: "Test crew (this device only)", owner: pid, members: [pid, "g1", "g2", "g3"] },
    gym: { lat: 41.8827, lng: -87.6233, t: 1 },
    presence: {},
    ping: null,
    onWay: {},
    raid: null,
    mocks: { g1: { id: "g1", name: "Mock Rio" }, g2: { id: "g2", name: "Mock Sage" }, g3: { id: "g3", name: "Mock Quinn" } },
  };
}
export function patchGhost(setS, fn) {
  setS((p) => ({ ...p, ghost: fn(ghostBundle(p)) }));
}
export async function readPres(code) {
  try { const r = await window.storage.get(`crewpres:${code}`, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
export async function writePres(code, rec) {
  try { await window.storage.set(`crewpres:${code}`, JSON.stringify(rec), true); return true; } catch { return false; }
}
export async function casPres(code, mut) {
  for (let i = 0; i < 8; i++) {
    const rec = (await readPres(code)) || { at: {}, ping: null, onWay: {}, rev: 0 };
    const next = mut({ ...rec, at: { ...(rec.at || {}) }, onWay: { ...(rec.onWay || {}) } });
    const latest = await readPres(code);
    if ((latest?.rev || 0) !== (rec.rev || 0)) {
      const merged = mut({
        ...latest,
        at: { ...(latest.at || {}), ...(next.at || {}) },
        onWay: { ...(latest.onWay || {}), ...(next.onWay || {}) },
        ping: next.ping !== undefined ? next.ping : latest.ping,
      });
      merged.rev = (latest.rev || 0) + 1;
      if (await writePres(code, merged)) return merged;
      continue;
    }
    next.rev = (rec.rev || 0) + 1;
    if (await writePres(code, next)) return next;
  }
  return null;
}
export async function readRaid(code) {
  try { const r = await window.storage.get(`crewraid:${code}`, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
export async function writeRaid(code, rec) {
  try { await window.storage.set(`crewraid:${code}`, JSON.stringify(rec), true); return true; } catch { return false; }
}
export async function casRaid(code, action, ctx) {
  if (ctx.ghostMode) {
    const { ok, raid, reason } = applyRaidAction(ctx.ghostRaid, action, ctx);
    return { ok, raid, reason };
  }
  for (let i = 0; i < 8; i++) {
    const remote = await readRaid(code);
    const { ok, raid, reason } = applyRaidAction(remote, action, ctx);
    if (!ok) return { ok, raid: remote, reason };
    const latest = await readRaid(code);
    if ((latest?.rev || 0) !== (remote?.rev || 0)) {
      const merged = reconcileRaid(raid, latest);
      const again = applyRaidAction(merged, action, ctx);
      const out = again.ok ? again.raid : merged;
      if (await writeRaid(code, out)) return { ok: true, raid: out };
      continue;
    }
    if (await writeRaid(code, raid)) return { ok: true, raid };
  }
  return { ok: false, reason: "busy", raid: null };
}
export async function noteRaidHitFor(s, setS, workout) {
  const ctxBase = { playerId: s.playerId, name: s.profile.name, workout, now: Date.now() };
  if (s.test) {
    const g = ghostBundle(s);
    const presence = prunePresence(g.presence, ctxBase.now);
    const { ok, raid } = applyRaidAction(g.raid, "hit", { ...ctxBase, presence, memberCount: g.crew.members.length, ghostMode: true, ghostRaid: g.raid });
    if (ok) patchGhost(setS, (prev) => ({ ...prev, raid }));
    return;
  }
  if (!s.crew?.code || !s.playerId) return;
  const pres = await readPres(s.crew.code);
  await casRaid(s.crew.code, "hit", { ...ctxBase, presence: prunePresence(pres?.at, ctxBase.now), memberCount: RAID_NEED });
}
