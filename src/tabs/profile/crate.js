import { AURAS } from "../../auras/catalog.js";
import { today } from "../../lib/dates.js";
import { ANIME_CRATE_WEIGHTS, ANIME_RARITY_ORDER, rollAnimeRarity } from "../../math.js";
import { crateBank, crateSpentOf } from "./points.js";
import { TITLES } from "./titles.js";
import { BORDERS, unlocked } from "./unlock.js";
export const CRATE_RARITY = {
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
export const CRATE_RARITY_DESC = [...ANIME_RARITY_ORDER].reverse();
export const CRATES = [
  {
    id: "reliquary-1",
    name: "Aura Spin",
    tag: "Original cosmetic spin",
    blurb: "Original titles, animated borders, and auras. Spins spend board points; duplicates return points.",
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
      { rarity: "epic", type: "aura", id: "ironbound", name: "Ironbound", flavor: "The chains remember every rep." },
      { rarity: "legendary", type: "aura", id: "redline", name: "Redline", flavor: "Power beyond the gauge." },
      { rarity: "legendary", type: "aura", id: "ledger", name: "The Ledger", flavor: "Every debt is written." },
      { rarity: "legendary", type: "aura", id: "bonewright", name: "Bonewright", flavor: "Pressure makes armour." },
      { rarity: "legendary", type: "aura", id: "ossuary", name: "Ossuary", flavor: "Built from everything that broke before you." },
      { rarity: "mythic", type: "aura", id: "nullpoint", name: "Nullpoint", flavor: "Motion ends at the shell." },
      { rarity: "mythic", type: "aura", id: "carve", name: "Carve", flavor: "The frame remembers every cut." },
      { rarity: "mythic", type: "aura", id: "brandmark", name: "Brandmark", flavor: "One mark outlasts iron." },
      { rarity: "mythic", type: "aura", id: "fallenlight", name: "Fallen Light", flavor: "The halo broke on the way down." },
      { rarity: "gilded", type: "aura", id: "eclipseheart", name: "Eclipseheart", flavor: "The old sun still burns." },
      { rarity: "secret", type: "aura", id: "blacksun", name: "Black Sun", flavor: "Daylight ends without a sound." },
    ],
  },
];
export const ACTIVE_CRATE = CRATES[0];
export function crateOwned(s, prize) {
  if (prize.type === "title") return !!s.crateUnlocks?.[prize.id] || TITLES.find((t) => t.id === prize.id)?.req(s);
  const item = prize.type === "aura" ? AURAS.find((a) => a.id === prize.id) : BORDERS.find((b) => b.id === prize.id);
  return item ? unlocked(item, s) : !!s.crateUnlocks?.[prize.id];
}
export function secureRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
export function crateReallyOwned(s, prize) {
  return crateOwned({ ...s, test: false }, prize);
}
export function cratePityOf(s, sandbox) {
  if (sandbox) return Math.max(0, +(s.testCrate?.pity) || 0);
  return typeof s.cratePity === "number" ? s.cratePity : Math.max(0, +(s.cratePity?.legendary || 0));
}
export function rollCratePrize(s, crate = ACTIVE_CRATE, rng = secureRandom, opts = {}) {
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
export function packCratePrize(s, prize) {
  const dupe = crateReallyOwned(s, prize);
  const refund = dupe ? (CRATE_RARITY[prize.rarity]?.refund || 0) : 0;
  return { ...prize, dupe, refund };
}
export function commitCratePrize(p, prize, crate, rollId, { sandbox = false, equip = true } = {}) {
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
export function applyCratePrize(p, prize, crate, rollId) {
  return commitCratePrize(p, prize, crate, rollId, { sandbox: false, equip: true });
}
