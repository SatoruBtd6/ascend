# Aura brief — Descended (filled example, written after the fact)

This is what the template looks like filled in, reconstructed from the
shipped aura (`AURA_FX.descended` + `AURA_ART.descended` in
`src/auras/AuraCanvas.jsx`). It shows the level of detail a real brief needs —
especially the layer table and the must-have list. The Descended first pass
put the eyes on a plain even ring instead of in the wing sockets; items 1–3
of the checklist are exactly the sentences that would have prevented it.

## Identity
- **Name:** Descended
- **id:** `descended`
- **Slot & unlock:** special — monthly champion award, granted once, kept forever
- **Ladder rung:** R5 (unrestricted; moment + painter art)
- **One-line concept:** a black wing-wheel of eyes that pull free and watch you — Ascended's fallen mirror
- **Closest look-alikes:** ascended (same layout, must read black/crimson not gold), wheel (gold eye-rings — Descended's eyes are organic, not ornate-gear), blacksun (also dark — Descended has structure, not an eclipse)

## Reference images
- **Files attached:** `descended-wings.webp`, `descended-emblem.webp`, `descended-eye.webp` (the keyed assets themselves — the art *is* the reference)
- **What each is for:** wings = the wheel shape and where the sockets are; emblem = the stationary centre mark; eye = the single watcher cloned eight times

## Silhouette & footprint
- **Overall footprint:** a wing wheel ~1.45× the photo's canvas diameter at ring/inspect size — the tips deliberately run off-frame at ring141/crate160/figure sizes (approved exception); clamped inside at board size
- **Behind the photo / around the rim:** the rotating wing wheel, a stationary gothic emblem at centre, a gunmetal ring with filigree + ink at r 1.1, a near-black silhouette bleed hugging the wings with crimson showing through
- **Over the photo (front of the avatar):** the eight eyes during their airborne phase only (the handoff to the over canvas)
- **Figure view:** emblem sits behind the figure's torso (mirroring the photo); wing wheel fills the body canvas; eyes wander the figure's chest area
- **Edge behaviour:** wingtips bleed off the large canvases (the one approved bleed); airborne eyes never leave the frame — clamped 1px inside; everything else inside

## Layers at rest — one row per layer

| # | Layer | Anchor | Colour(s) | Rest motion | Canvas | Notes |
|---|-------|--------|-----------|-------------|--------|-------|
| 1 | Wing wheel (sprite) | canvas centre, whole-sprite | blackened iron + crimson tint | slow idle rock (~±0.02 rad) + faint breathe 1.5% | behind | 8 mirrored wings; art reach normalized to 0.9 of half-width |
| 2 | Eight eyes (sprite ×8) | **asset-measured points — the eight almond sockets at the wing shoulders, NOT an even ring** (`DESC_SOCKS`, measured on the normalized sprite; small sizes keep an even ring at 0.74× half-width) | crimson `#C2001F` | open lids (~0.9), ride the wing transform (rotation + shear + breathe) | behind, seated inside the socket art | eye size ≈ 0.115× canvas; brightness 0.7 at rest, red halo + shadowBlur at ≥110px |
| 3 | Centre emblem (sprite) | canvas centre, stationary — does NOT rotate with the wheel | dark gothic | none | behind photo / behind torso | 0.42× canvas |
| 4 | Orbit ring | orbit ring r=1.1 | `#23262B` | 0.02 rad/s spin | behind | w 2.2, filigree 16, inked |
| 5 | Ambient smoke | free particles, rising, spawn r 1.0–1.08 | `#0E1016` / `#1A0509` | 4–9 px/s, 2.2–3.4 s life | behind | n=6, near-black — silhouette depth |
| 6 | Ambient embers | orbit ring r 0.98–1.08 | `#FF5A1F` / `#C2001F` | very slow orbit 0.05–0.12, twinkle | behind | n=5, small motes — the only warm sparks |

## The moment — "the watch" (painter-driven, 45 s `clock` cycle)
- **Kind:** painter-driven sequence — no spec `moment:` block; beats keyed in absolute seconds on `clock % 45`
- **Cadence:** continuous loop, one 45 s cycle
- **Duration:** 45 s
- **Beat-by-beat:**
  1. **REST 0–6 s** — eyes open and visibly seated in the sockets, drawn with the wings on the main canvas; wheel still.
  2. **SURGE 6–14 s** — wings spin up smoothly (0 → 3.4 rad/s cap); eyes stay seated and ride the wheel; the wing mass shears tangentially so feathers trail like dragged weight; eye brightness swells 0.7 → 1.0; motion smear copies scale with speed.
  3. **ARREST ~14–16.4 s** — the wheel overruns the stop once and settles back (one swing); eyes pull OUT of their sockets *inward*, converging near the avatar centre; at launch each eye hands off main canvas → over canvas at an identical pixel position (no pop).
  4. **WATCHING 14–40 s** — all eight eyes drift on independent bounded wander paths (ellipses 0.5–0.78×R) over the front of the avatar; each blinks on its own 3.5–8.5 s period; each faces along its direction of travel; eyes are in-bounds-clamped.
  5. **RETURN 40–45 s** — deliberate drift back to the sockets; on reseat they hand back to the main canvas; lids settle to rest.
- **Ring equivalent:** the sequence IS the ring view — eyes wander across the photo itself and the wheel runs behind it.
- **Flashes:** none — this aura never calls `noteStrikeFlash`; every brightness change is a slow keyframed swell (≥0.8 s rise, ≥1.2 s fall), nothing tied to rotation phase.

## Assets
| File | What it is | Placement/anchor | Notes |
|------|------------|------------------|-------|
| `public/aura/descended-wings.webp` | ring of 8 mirrored wings with 8 empty sockets at the shoulders | canvas centre, rotating | art reaches ~1.28× half-width pre-normalization; normalized once so reach = 0.9; sockets at `DESC_SOCKS` measured points |
| `public/aura/descended-emblem.webp` | gothic centre mark | canvas centre, stationary | drawn under the photo (ring) / torso (figure) |
| `public/aura/descended-eye.webp` | one ornate crimson eye | the 8 socket points; cloned | reach ≈ 0.68 of half-width; procedural fallback eye if the webp fails |

## Must-have details — the checklist
- [x] 1. At rest the eight eyes sit **inside the wing art's sockets** — not on an even ring, not floating near the wings. (Seating on an even 8-way ring leaves them in dead feather space — the measured `DESC_SOCKS` points are the requirement.)
- [x] 2. Eyes are visibly *open* at rest (lid ≈ 0.9) — they read as eyes in the sockets, not empty holes.
- [x] 3. On the arrest beat the eyes pull out of the sockets **inward toward centre**, then wander over the *front* of the avatar — the main→over canvas handoff must produce no pixel pop.
- [x] 4. The emblem never rotates; only the wheel spins.
- [x] 5. No flashes anywhere — wing heat/eye glow are slow swells only.
- [x] 6. Under reduced motion and under 110 px: frozen rest pose, eyes open mid-dim.
- [x] 7. Wingtips bleed off-frame only at ring141+/crate/figure; fully inside at board size.

## Flash-safety & perf notes
- **Flash sources:** none — zero `noteStrikeFlash` calls.
- **Reduced-motion version:** frozen rest pose, eyes open at ~0.55–0.7 alpha.
- **Small-size version (<110 px):** painter renders the rest pose only; `small: { scale: 0.6 }` shrinks ambient particles; even-ring eye seat at 0.74× half-width (the approved small look).
- **Perf concerns:** three webp sprites, per-instance rotation accumulation, up to 2 smear copies during surge; one of the 10 heaviest auras on the leaderboard stress set — any painter change reruns that gate (p95 < 16 ms).

## Sign-off
- **Brodan approved concept + layer plan + checklist on:** (shipped — this brief reconstructed post-hoc)
