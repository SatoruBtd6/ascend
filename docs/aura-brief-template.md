# Aura brief — template + build loop

Every new aura (and every major aura rework) starts from this brief. Fill
every field; where something doesn't apply write **"none"** — never leave a
field blank. A blank field is a decision handed back to Devin to guess, and
guessing is how "eyes in the sockets" turned into "eyes in a plain circle".

A filled example lives at `docs/aura-brief-descended.md` — it was written
after the fact from the finished aura, so it also shows what level of detail
"done" looks like.

## The build loop

1. **Brodan supplies** this brief + reference images (put the files in
   `docs/refs/` or attach them in the message; note exact filenames below).
2. **Devin responds with**: a one-paragraph concept, a per-layer plan that
   names the anchoring vocabulary for every layer, AND the must-have
   checklist restated verbatim. No code yet.
3. **Brodan approves or corrects** the plan + checklist.
4. **Devin builds**, then reports the checklist **item by item** — PASS/FAIL
   per item, with a screenshot path for every visible must-have (ring view
   first, then figure/board as relevant). Anything not checked gets said so
   plainly.
5. **Review.** Corrections go back as edits to the checklist, not as new
   prose — the checklist is the contract.

---

# Aura brief — <name>

## Identity
- **Name:**
- **id** (lowercase, never reuse a retired id — renames need a migration + alias):
- **Slot & unlock** (rank tier / feat / boss loot / crate rarity / special):
- **Ladder rung** (R1–R5 per `docs/aura-style-guide.md`; the rung sets glow, particle sizes, layer counts):
- **One-line concept** (≤15 words):
- **Closest look-alikes** (auras this must still be instantly distinguishable from at ring size):

## Reference images
- **Files attached:**
- **What each is for** (palette / shape / motion / mood):

## Silhouette & footprint
- **Overall footprint** (how big vs the avatar photo, e.g. "a wheel ~1.3× the photo's diameter"):
- **Behind the photo / around the rim:**
- **Over the photo (front of the avatar):**
- **Figure view** (what the full-body figure shows that the ring can't):
- **Edge behaviour** (default: nothing clipped — only transient burst debris may leave the frame; anything else must be explicitly approved, like Descended's wingtips):

## Layers at rest — one row per layer

For each layer say what it is, **exactly where it sits** (name the anchor —
"near the face" is not an anchor), its colour(s), its rest motion, and which
canvas it paints on. Anchor vocabulary the renderer actually supports — pick
one and name it:

- `orbit ring` — orbits the ring at `r` ≈ 1.0–1.3× ring radius, evenly spaced or locked to an angle
- `head anchor` — pins to the figure's head (hats, halos); `hover` sets the gap above it
- `rim anchor` — sits on the avatar ring's top edge
- `shoulders` — a mirrored pair at the shoulder line (pauldrons)
- `face/eye anchor` — the avatar's eye line and eye spacing
- `asset-measured point` — a fixed point measured off the sprite itself (like Descended's wing sockets); attach a marked-up image with the points indicated
- `figure landmark` — shoulder line / chest / sigil point on the physique art
- `none` — free particles (rising / falling / bubbling / drifting inward)

| # | Layer | Anchor | Colour(s) | Rest motion | Canvas (behind / over / figure only) | Notes |
|---|-------|--------|-----------|-------------|--------------------------------------|-------|
| 1 |       |        |           |             |                                      |       |
| 2 |       |        |           |             |                                      |       |
| 3 |       |        |           |             |                                      |       |

## The moment (signature sequence)
- **Kind:** spec moment (timed bursts/flash/shake) · painter-driven sequence (clock beats) · none
- **Cadence** (how often it fires, e.g. every 16–24 s):
- **Duration:**
- **Beat-by-beat** — what each layer/asset does and when:
  1.
  2.
  3.
- **Ring equivalent** (hard rule: anything the moment does on the figure needs a ring version — behind the photo and around its edge):
- **Flashes:** (max 1 per moment, ≤3/s page-wide, none under reduced motion — say "none" if there are none)

## Assets (custom sprites)
| File | What it is | Placement/anchor | Notes (content reach, measured points, transparency) |
|------|------------|------------------|------------------------------------------------------|
|      |            |                  |                                                      |

## Must-have details — the checklist
The specific things that make this aura *this* aura. Each item must be
checkable in a screenshot or a number. Devin reports PASS/FAIL per item plus
a screenshot path — this list is the contract.

- [ ] 1.
- [ ] 2.
- [ ] 3.
- [ ] 4.
- [ ] 5.

## Flash-safety & perf notes
- **Flash sources:**
- **Reduced-motion version** (required — what the calm version looks like):
- **Small-size version** (board 32 / 59 px — what gets simplified):
- **Perf concerns** (particle counts, big sprites, shadowBlur, per-frame image work):

## Sign-off
- **Brodan approved concept + layer plan + checklist on:**
