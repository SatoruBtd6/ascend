# Wealthy — Sprite Generation Specs (v2 — tightened prompts)

Six sprites for Brodan to generate on the flat-magenta key, then run through
`scripts/aura-asset-key-wealthy.mjs`. Devin only keys, places, layers, scales,
and animates them — it does not draw any of this.

Base commit: `767976a`. Keep the two existing good sprites
(`wealthy-tophat.webp`, `wealthy-gun.webp`) — not regenerated.

## Locked decisions
- **Sun:** banded dome — red core → orange → gold, semicircle, no rays, no glass-reflection streaks.
- **Pool:** a cradle/crescent that WRAPS around the photo — low center with a concave semicircular hollow, tall peaks on both sides; bright green, labeled bills baked in.
- **Pool bill labels:** STOCK OPTIONS · BONDS · GAINS · XP.
- **$ eyes:** glossy green `$` on a white cartoon eyeball.
- **Tongue:** long & droopy.
- **Bezel:** gold coin-rim around the photo; center hole filled magenta.

## Global rules
- Background: one flat uniform vivid **magenta #E600E6**, no gradient/vignette.
- **No magenta/pink/purple inside the art** (except the bezel's intentional center hole).
- Style: glossy cel-shaded cartoon, thick uniform black outlines, bold saturated colors, high contrast — match the hat/gun.
- Generate big (≥1024 long edge; sun & pool ≥1536 wide). Margins don't matter — the keyer auto-crops to content and centers in a 512² webp.
- Save each PNG into `public/aura/` with the exact underscore name below.

---

## 1. Sun — `_wealthy-sun-raw.png` → `wealthy-sun.webp`
> A rising sun as a solid half-dome: a clean semicircle with a flat straight edge along the bottom and a smooth round arc on top. Three evenly-thick concentric bands from the center-bottom outward: (1) a deep crimson-red core half-circle sitting on the bottom edge (#D32F2F), (2) a vivid orange band around it (#F57C1F), (3) a rich golden-yellow outer rim (#F9B116). Smooth clean band edges, subtle soft radial glow. Thick uniform black outline around the whole outer arc and along the flat bottom edge. Glossy cel-shaded like a premium mobile-game icon, bold and saturated. Wide-and-short, about 2:1, the dome filling the frame. Do NOT add large diagonal glass-reflection streaks or mirror-like shine; no spiky rays, no sun face, no sky or clouds. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple inside the art, no drop shadow, no watermark.

**Devin:** flat bottom = photo center line; behind the photo, ~1.5× photo diameter wide.

## 2. Money pool — `_wealthy-pool-raw.png` → `wealthy-pool.webp`
> A tall, lush, overflowing heap of cash — one big rounded mound of US-style dollar bills. One single continuous pile, TALLEST in the center and tapering down to thin edges at the far left and right, roughly symmetrical — NO gap, notch, or valley in the middle. Dozens of overlapping bills; many at the top stick up and fan outward in different directions so the pile looks voluminous and bursting, with flatter stacked bills lower down. Colors: bright saturated money-green bill faces (#3DA64A), darker forest-green shadows between bills (#1F6B2E), pale mint-green and white for highlights and the oval portrait medallions, crisp black engraving lines. Four upright bills near the top carry bold black ALL-CAPS labels, clearly readable: 'STOCK OPTIONS', 'BONDS', 'GAINS', 'XP'. Thick uniform black outlines, glossy cel-shaded like a premium mobile-game icon, high saturation and contrast. Wide-and-short, about 2.2:1. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple inside the art, no drop shadow, no realism, no watermark, no extra objects.

**Devin:** layered in FRONT of the photo's bottom ~40% (occlusion = photo rising out). Width ~1.7× photo.

## 3. Bill — `_wealthy-bill-raw.png` → `wealthy-bill.webp`
> ONE single US-style dollar bill, flat and face-on (front parallel to the viewer), rectangular, landscape orientation. Bright saturated money-green (#3DA64A) with darker green engraving (#1F6B2E) and a pale mint/white oval portrait medallion in the center; ornate scrollwork in each of the four corners with a bold '$' symbol; fine line detail; NO readable denomination numbers. Slight glossy sheen, thick uniform black outline, glossy cel-shaded like a premium mobile-game icon. About 3:2. Just one flat bill — no stack, no folds, no perspective tilt. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple inside the art, no drop shadow, no watermark, no extra objects.

**Devin:** reusable — ambient storm, gun-muzzle stream, loose pool bills; rotate/scale.

## 4. Tongue — `_wealthy-tongue-raw.png` → `wealthy-tongue.webp`
> ONE long cartoon tongue hanging straight down, fully unrolled and extended, vertical. It starts at a clean flat horizontal root at the very top, widens slightly, then a long body droops in a gentle S-curve to a big rounded bulbous tip, with the lower third curling forward a little. A darker-red crease groove runs down the center from root to tip. Colors: bright candy-red main fill (#E53935), deeper maroon-red in the crease and underside (#9B1C1C), a glossy highlight in warm white (not pink) along one side. Thick uniform black outline, glossy cel-shaded like a premium mobile-game icon. Tall vertical, about 2:3, long and droopy. No mouth, no lips, no teeth, no face, no second tongue. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple inside the art, no drop shadow, no watermark.

**Devin:** root-center anchor at the photo mouth line; hidden behind photo, slide+scale down on the moment.

## 5. $-eye — `_wealthy-eye-raw.png` → `wealthy-eye.webp`
> ONE single cartoon 'money eye': a rounded, slightly oval pure-white eyeball (#FFFFFF with thin cool-grey edge shading) with a bold glossy GREEN dollar-sign '$' centered on it as the pupil. The '$' in saturated emerald green (#2E9E4A) with a darker green edge and a small warm-white gloss highlight dot on its upper-left. Thick uniform black outline around both the eyeball and the '$'. Glossy cel-shaded like a premium mobile-game icon. One eye only, roughly square 1:1. No face, no eyebrow, no eyelashes, no second eye. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple inside the art, no drop shadow, no watermark.

**Devin:** one unit; mirror horizontally for the pair; pop above the eye-line on the moment.

## 6. Gold bezel — `_wealthy-bezel-raw.png` → `wealthy-bezel.webp`
> A gold ring / coin-rim frame: a thick, perfectly circular beveled band of shiny gold, hollow in the center — like the rim of a gold coin or a round gold picture frame. Rich polished gold (#E7B10A) main fill, deep bronze-gold in the recesses (#9A6B06), bright pale-gold/white highlights along the top-left bevel (#FFF4C2). Thick uniform black outline on BOTH the outer and inner edges of the band. The band is fairly thick, about 15% of the overall diameter. CENTER: fill the entire hollow middle with solid flat magenta #E600E6, identical to the background, so it reads as a see-through hole — do NOT fill the center with gold or any other color. Perfectly round, 1:1, glossy cel-shaded like a premium mobile-game icon. Entire background one flat uniform vivid magenta #E600E6. No magenta/pink/purple anywhere except the intentional center hole, no drop shadow, no gemstones, no text, no watermark.

**Devin:** concentric with the photo, inner edge ≈ photo radius; z above sun, below hat.

---

## Keying workflow (PC, repo root)
Save the six PNGs into `public/aura/` with the underscore names, then:

```
node scripts/aura-asset-key-wealthy.mjs _wealthy-sun-raw.png    wealthy-sun.webp
node scripts/aura-asset-key-wealthy.mjs _wealthy-pool-raw.png   wealthy-pool.webp
node scripts/aura-asset-key-wealthy.mjs _wealthy-bill-raw.png   wealthy-bill.webp
node scripts/aura-asset-key-wealthy.mjs _wealthy-tongue-raw.png wealthy-tongue.webp
node scripts/aura-asset-key-wealthy.mjs _wealthy-eye-raw.png    wealthy-eye.webp
node scripts/aura-asset-key-wealthy.mjs _wealthy-bezel-raw.png  wealthy-bezel.webp
```

Check each: `keyed %` high, `pink-residue px` low; eyeball the `-dark.png` / `-light.png`
previews under `evidence/aura-asset-key-wealthy/` (clean edges, no magenta halo; bezel
center transparent). Don't commit the `_*-raw.png` inputs. Then tell me — I verify from
the repo before anything goes to Devin.
