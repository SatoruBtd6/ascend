// Frozen stress sets for aura:stress — decision D11 (phase 7l).
//
// FIXED: the leaderboard stress set from AGENTS.md.
// LEDGER: the Ledger-swap set — FIXED with inferno -> ledger.
// REVAMPED_38: the 51 FX auras minus the 13 left untouched in 7k
//   (bonewright, blacksun, champion, eclipseheart, godray, halo, huntersmoon,
//   inferno, ironbound, redline, standardbearer + soon_throne, soon_seraphim),
//   proven by a full aura:diff against da967d0 on 2026-09-26.
// REVAMP: the 10 heaviest of REVAMPED_38 by aura:perf average at v7k that are
//   NOT in FIXED or LEDGER — ranked 2026-09-26 at commit 7f0c6ba, median of 3
//   runs, board-32 circle, 4x CPU, moments forced; re-ranked 2026-09-27 (P3,
//   same v7k numbers) to drop the FIXED/LEDGER overlap. FROZEN: never
//   recomputed automatically; changing it needs a proposal.
// GRANDFATHERED: auras that may exceed the 0.6 ms budget at v7k — the 13
//   untouched in 7k plus atlas/forge/fallenlight/ledger/ossuary/nullpoint,
//   whose 7k change was ring-only (D14). Each ceiling = its v7k aura:perf
//   median x1.10, measured 2026-09-27 at commit 3d5bb12, median of 3 runs,
//   board-32 circle, 4x CPU, moments forced. aura:perf fails a grandfathered
//   aura only above its own ceiling.
// KNOWN_OVER: carve and wyrm — revamped in 7k and over 0.6 at v7k. WARN, not
//   FAIL; value is the v7k median (trim in the next aura phase).

export const FIXED = [
  "atlas", "forge", "fallenlight", "ossuary", "ironbound",
  "standardbearer", "ascended", "bonewright", "nullpoint", "inferno",
];

export const LEDGER = FIXED.map((id) => (id === "inferno" ? "ledger" : id));

export const REVAMPED_38 = [
  "ember", "tide", "storm", "smolder", "stormborn", "dawn", "wanderer",
  "atlas", "forge", "wyrm", "frost", "abyss", "chud", "rust", "thunder",
  "hollow", "deep", "magma", "plague", "sand", "void", "yogurt", "vendetta",
  "ascended", "wheel", "sigil", "steadybreath", "iaidraw", "glassfire",
  "stormstep", "zeropoint", "ninetail", "ledger", "ossuary", "nullpoint",
  "carve", "brandmark", "fallenlight",
];

export const REVAMP = [
  "carve", "wyrm", "wanderer", "vendetta", "void",
  "ninetail", "sand", "glassfire", "stormborn", "dawn",
];

export const GRANDFATHERED = {
  inferno: 0.770,
  halo: 0.850,
  godray: 1.164,
  standardbearer: 0.156,
  champion: 0.814,
  huntersmoon: 0.943,
  soon_throne: 0.436,
  soon_seraphim: 0.514,
  ironbound: 0.239,
  redline: 0.740,
  bonewright: 0.646,
  eclipseheart: 1.675,
  blacksun: 1.219,
  atlas: 0.848,
  forge: 0.653,
  fallenlight: 0.897,
  ledger: 0.623,
  ossuary: 0.549,
  nullpoint: 0.770,
};

export const KNOWN_OVER = {
  carve: 0.606,
  wyrm: 0.696,
};

export const STRESS_SETS = { fixed: FIXED, ledger: LEDGER, revamp: REVAMP };
