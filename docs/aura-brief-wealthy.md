# Aura Brief — Wealthy

> Filled-in `aura-brief-template.md`. Sections marked REQUIRED are checked
> item-by-item after the build and reported PASS/FAIL with a screenshot per
> visible item (ring view first). See `docs/wealthy-concept.md` for the
> approved concept + per-layer plan.

## IDENTITY

- **Name:** Wealthy.
- **Rank/slot:** Monthly Points prize aura (the `monthlyPrize` slot). A
  catalog row exists so the aura is visible in the `?auras=1` dev gallery;
  the reward/unlock wiring (award flag, monthly-prize plumbing, auto-equip)
  is NOT part of this build — deferred per the sign-off below.
- **One-line concept:** money-mogul flex — an oversized black top hat
  bobbing above the photo, a gold sunburst pulsing behind, a cartoon money
  gun on the right rim raining bills up-and-out, and a field of tumbling
  green bills plus twinkling gold `$`s around the ring; every ~20 s the
  payout gag fires — hat dips, pops up and tips, green `$` eyes burst over
  the photo's eye-line, a red cartoon tongue unrolls from photo centre —
  then it all snaps back.

## REFERENCES

- `wealthy-tophat` raw art (Brodan-supplied PNG, magenta background, kept
  outside the repo) → `public/aura/wealthy-tophat.webp`. Black top hat with
  a gold band and a black feather, drawn with a slight jaunty tilt — keep it.
- `wealthy-gun` raw art (same sheet style) → `public/aura/wealthy-gun.webp`.
  Grey cartoon revolver with gold trim and a gold `$` on the barrel, drawn
  aiming right and slightly DOWN — it is rotated in code so the barrel aims
  up-and-out; do not repaint or re-aim the art.
- Anti-reference: **The Mask / Jim Carrey** — no green face or skull-face,
  no yellow zoot suit, no that-character hat styling. This is a money-mogul
  aura: hat, cash, gun-as-gag. An uninformed viewer should read "money",
  not a character.

## SILHOUETTE & FOOTPRINT

- The hat sits ABOVE the photo on the head anchor, oversized at ~0.8–1.0×
  the photo width (the crown overhangs the photo's top edge on both sides)
  with a visible hover gap — it floats, it does not sit on the photo rim.
- The sunburst halo is the behind-the-photo disc: gold rays spinning slowly
  at low alpha, reaching past the ring edge but capped inside the canvas
  (`rays.fit`) so tips never clip the frame border.
- The money gun is mounted at the right rim — muzzle pointed up-and-out,
  roughly 45° — with its bill stream arcing up over the photo's upper-right
  and raining down around it.
- Ambient bills tumble through the band around the photo; `$` twinkles orbit
  at the band edge; nothing covers the photo at rest — the gag owns the
  photo during the moment, the ambient field owns the band.

## LAYERS (rest state — every visible element)

1. **Sunburst rays** — thin gold wedges radiating behind the photo, slow
   spin (~0.03), low alpha with a warm-white core glow. Behind everything.
2. **Top hat** — the keyed top-hat sprite worn on the head anchor, hovering
   with a gap above the photo crown; gentle bob plus a slight wobble that
   keeps its drawn jaunty tilt alive.
3. **Money gun** — the keyed gun sprite at the right rim, rotated ~45° so
   the muzzle aims up-and-out. Fires CONTINUOUSLY at rest: small green bills
   spawn at the measured muzzle point (not the sprite centre), arc
   ballistically up-and-out, tumble under gravity, and rain down; the gun
   kicks slightly with each shot.
4. **Ambient bill storm** — flat green notes drifting down/around the band,
   tumbling as they fall; a few rise/drift. Green leads the read.
5. **`$` sparkle field** — small gold `$` glyphs orbiting slowly at the
   band edge, twinkling in and out (drawn glyphs, not emoji — tints to the
   palette and renders identically on every OS).
6. **Warm-white core glow** — the palette's base glow disc behind the
   photo, gold-white, breathing gently.

## MOMENT

The gun does NOT gate to the moment — it runs continuously at rest. The
moment is the face gag on top, riding the normal spec scheduler
(`every: [16, 24]` randomized, `dur: 2.3`), so gallery Play, `seekMoment`
and the reduce gate all work for free. Beats (`mt` = normalized moment
time; at dur 2.3 s the beats land ≈0.3/0.9/1.4/2.0 s):

1. **WIND (mt 0–0.13):** tiny hat dip/anticipation (spec `mY` keyframe);
   a subtle ka-ching sparkle near the hat band (spec burst at ~0.15,
   anchored to the head).
2. **POP (mt ~0.13–0.4):** green `$` eyes burst outward over the photo's
   eye-line — overshoot ease, bounce back to a held pop; simultaneously the
   hat pops up — lifts, tips, small hop — and settles (`mY`/`mRot`/`mScale`
   on the hat layer). One synced cartoon beat.
3. **TONGUE (mt ~0.26–0.6):** a red cartoon tongue unrolls from photo
   centre downward over the front of the photo — fast, slight overshoot,
   curled tip, settles (procedural ribbon).
4. **HOLD (mt ~0.6–0.85):** eyes held as `$`, tongue out, hat settling,
   gun still firing; a small extra bill flurry fires once on the POP/HOLD
   boundary (fired-once flag, reset when the moment clears).
5. **RETRACT (mt ~0.85–1):** tongue rolls back up, `$` eyes shrink and
   vanish, hat returns to idle.

- Ring view: the moment renders directly over the profile photo (over
  canvas); hat pop and gun flurry are visible behind/beside it.
- Flashes: NONE. The sunburst brightening on POP is a slow swell via
  `mA`/`mLen` on the rays, not a `noteStrikeFlash`. The ka-ching sparkle is
  a scale/alpha twinkle.

## ASSETS

- `public/aura/wealthy-tophat.webp` — keyed from the raw PNG through the
  magenta-key script; seated on the head anchor; measured brim-centre
  anchor point declared.
- `public/aura/wealthy-gun.webp` — keyed likewise; mounted at the right
  rim, ~45° up-out, measured muzzle point declared.
- Bills, tongue, and `$` eyes are procedural (new shared `bill` and
  `dollar` particle shapes + painter glyphs) — no additional sprite assets.
- Any new `.webp` goes through `scripts/aura-asset-key-*.mjs` and lands in
  `public/aura/`; raw PNGs stay outside the repo.

## MUST-HAVE CHECKLIST (verified item-by-item after build)

1. `$` eyes are real green `$` glyphs at ring size — not circles, not
   plain bug-eyes.
2. Does NOT resemble The Mask / Jim Carrey in any way.
3. `$` eyes and tongue render over the profile PHOTO: eyes at the photo's
   eye-line, tongue from photo centre downward over the front of the
   photo. Not on a detached face, not floating beside it.
4. Money gun on the RIGHT rim, fires continuously at rest; bills arc
   up-and-out then rain down; emitted from the measured muzzle point, not
   the sprite centre.
5. Hat oversized (~0.8–1.0× photo width), seated on the head anchor,
   idle-wobbles, and POPS UP on the moment synced to the eye-pop beat.
6. Green leads the palette, gold accents, black hat. Reads money/cash
   instantly at ring size; sparkling gold `$` signs in the surround.
7. No flashes anywhere — zero `noteStrikeFlash` calls. Verified with
   `aura:flashaudit`.
8. **Reduced motion:** "Reduce = gag + gun suppressed; ambient drifts at
   the standard 35% calm (matches every aura)". (This REPLACES the earlier
   "static rich pose" wording.) Reported PASS against this exact behavior.
9. Small size (board 32, <110 px): hat + a few bills + sunburst glow only;
   gun, tongue and `$` eyes dropped; still reads as the money aura.
10. `anchorPoints` declared — hat brim-centre, gun muzzle, eye-line L/R,
    tongue attach — so the gallery anchor overlay validates seating at
    rest. Review habit: anchors ON with scrub parked at rest.

## FLASH/PERF NOTES

- Zero `noteStrikeFlash`: no `moment.flash`, no `flare`, no painter flash.
  All brightening is slow swell (`mA`/`mLen` keyframes, twinkles).
- Two continuous particle systems (gun bills + ambient storm) plus the `$`
  field: bill spawn is capped so the board-32 fixture stays in budget.
  `shadowBlur` stays OFF for all particles.
- Perf-check against boardsim-32: p95 under 16 ms. The gallery perf HUD at
  studio size is NOT the ship gate; boardsim-32 is.
- Edge rule: fired-bill frame-edge exit is allowed only as transient burst
  debris; every steady element stays inside the border (border alpha 0).

## REVIEW LOOP

Concept + checklist approved (see sign-off) → build → verify every
must-have item above with a screenshot (ring view first) → Brodan reviews
in `?auras=1` (anchors ON, scrub parked at rest; Play for the moment) →
any missed item feeds back as a checklist fix.

## SIGN-OFF

Concept + per-layer plan + checklist approved by Brodan on 2026-10-07
(with the item 8 change above, art supplied by Brodan, reward/unlock
wiring deferred).
