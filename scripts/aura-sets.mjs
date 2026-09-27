// Frozen stress sets for aura:stress — decision D11 (phase 7l).
//
// FIXED: the leaderboard stress set from AGENTS.md.
// LEDGER: the Ledger-swap set — FIXED with inferno -> ledger.
// REVAMPED_38: the 51 FX auras minus the 13 left untouched in 7k
//   (bonewright, blacksun, champion, eclipseheart, godray, halo, huntersmoon,
//   inferno, ironbound, redline, standardbearer + soon_throne, soon_seraphim),
//   proven by a full aura:diff against da967d0 on 2026-09-26.
// REVAMP: the 10 heaviest of REVAMPED_38 by aura:perf average at v7k —
//   ranked 2026-09-26 at commit 7f0c6ba, median of 3 runs, board-32 circle,
//   4x CPU, moments forced. FROZEN: never recomputed automatically; changing
//   it needs a proposal.

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
  "atlas", "fallenlight", "nullpoint", "carve", "wyrm",
  "wanderer", "ledger", "forge", "vendetta", "void",
];

export const STRESS_SETS = { fixed: FIXED, ledger: LEDGER, revamp: REVAMP };
