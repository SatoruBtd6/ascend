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

// RING (7m Part 3): the ring-size stress set — a realistic worst screen, not a
// synthetic grid. The most >=110px aura canvases on any real screen is 3:
// profile header (~141px) + two VersusSide cards (~119-141px); CrateVault's
// 160px preview and the ~116px duel nemesis card are one-per-screen, and every
// board tile tops out ~107px so small: owns the leaderboard. 4 = the observed
// maximum + 1 headroom. Membership = the 4 heaviest auras by aura:perf
// median, ranked 2026-09-27 at commit b7d1eec (median of 5 --ab runs,
// board-32 circle, 4x CPU, moments forced). FROZEN; re-rank needs a proposal.
export const RING = ["eclipseheart", "godray", "blacksun", "huntersmoon"];

// SPECTACLE (7m part 4, proposal 4): the loudest auras after the ladder
// rework — a synthetic worst-case batch stress run alongside `fixed`. Same
// rules: board-32, circle, moments forced, p95 < 16 ms. Provisional until it
// re-freezes at the v7m tag.
export const SPECTACLE = ["yogurt", "vendetta", "ascended", "wheel", "champion", "eclipseheart", "blacksun", "godray"];

// P7M_FAIL_EXEMPT (7m part 4, proposal 3): while the ladder rework is in
// flight the aura:perf --ab FAIL rule (>15% AND >0.05 ms over baseline) does
// not apply to the seven 7m rework auras — their medians move by design this
// phase. They still measure and print verdicts; they just can't FAIL. The
// exemption lives here in the policy file, not in the gate math, and expires
// at the v7m tag when the baseline re-pins and these auras fall back under
// the normal rule.
export const P7M_FAIL_EXEMPT = new Set([
  "ironbound", "standardbearer", "forge", "huntersmoon", "fallenlight", "eclipseheart", "blacksun",
]);

export const STRESS_SETS = { fixed: FIXED, ledger: LEDGER, revamp: REVAMP, ring: RING, spectacle: SPECTACLE };

// AURA_RUNG (7m): every aura's ladder rung, mirroring the membership table in
// docs/phase-7m-ladder.md. soon_throne/soon_seraphim are placeholders —
// unassigned, untouched. Used by the per-rung ratio budget in aura:perf.
export const AURA_RUNG = {
  // R1 quiet
  sigil: 1, steadybreath: 1, iaidraw: 1, ember: 1, tide: 1,
  // R2 charged
  glassfire: 2, stormstep: 2, zeropoint: 2, ninetail: 2, ironbound: 2, storm: 2,
  // R3 heavy
  smolder: 3, stormborn: 3, dawn: 3, wanderer: 3, atlas: 3, forge: 3,
  standardbearer: 3, wyrm: 3, frost: 3, abyss: 3, chud: 3, rust: 3, thunder: 3,
  hollow: 3, deep: 3, magma: 3, plague: 3, sand: 3, void: 3, ledger: 3,
  ossuary: 3, redline: 3, bonewright: 3, inferno: 3,
  // R4 showcase
  nullpoint: 4, carve: 4, brandmark: 4, fallenlight: 4, halo: 4, huntersmoon: 4,
  // R5 spectacle
  yogurt: 5, vendetta: 5, ascended: 5, wheel: 5, champion: 5,
  eclipseheart: 5, blacksun: 5, godray: 5,
};

// Per-rung ratio budgets (7m Part 7 item K) — aura median / stormstep median,
// WARN when an aura costs more than its rung's proven maximum. Derived from
// the seven pilot auras' measured medians at both sizes: each line is ~10%
// above the costliest approved member of that rung, rounded up. R1 has no
// pilot (pilots span R2–R5), so its line is ~10% over the costliest EXISTING
// R1 member instead — tide, 0.84x board / 1.15x ring. Replaces the flat 1.3x
// line, which every R5 aura violated by design and so warned on nothing.
// stormstep (R2, the ref) is always exempt by position. Unassigned auras
// fall back to the old 1.3 line.
export const RUNG_RATIO_BUDGET = {
  board: { 1: 0.95, 2: 1.3, 3: 1.7, 4: 3.5, 5: 5.5 },
  ring: { 1: 1.3, 2: 1.3, 3: 2.7, 4: 3.6, 5: 4.5 },
};

// Session-relative perf policy (D15, phase 7l).
// PERF_REF: measured on every aura:perf run, even when not in --only. The
//   ratio WARN is per-rung (RUNG_RATIO_BUDGET above); RATIO_BUDGET remains the
//   fallback for auras with no assigned rung.
export const PERF_REF = "stormstep";
export const RATIO_BUDGET = 1.3;
// The FAIL rule is perf --ab: current vs the pinned baseline in one session,
// alternating per aura; FAIL only if B-A > 0.05 ms AND > 15%, with one
// automatic re-run before an aura may fail.
