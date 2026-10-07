# Part 3b — Step 1 audit: the five gallery commits

Audit requested before any Part 3b build work. HEAD at audit time:
`091bd72` (docs: Part 3 aura tooling investigation report) — pulled and
confirmed clean against `origin/main`.

The five commits landed from an earlier Devin session (author
SatoruBtd6, Oct 7), between `0b49588` and `614b411`, and were not
approved by Brodan. All five are `feat(aura gallery)`/`fix(aura gallery)`
— dev tooling for `?auras=1`.

## Commit-by-commit

| Commit | What it changed | Files |
|---|---|---|
| `dd16f1a` | Sequence scrub: draggable timeline under the preview stages, play/pause, "next moment" stepper. Adds **opt-in dev hooks to shipped `AuraCanvas.jsx`**: `api.seek`, `api.seekMoment`, `api.clock`, `api.cycle`; `AURA_ART.descended.cycle = 45`. Plus seek tests. | `src/auras/AuraCanvas.jsx` (+41), `src/auras/devGallery.jsx` (+106), `src/auras/rendererAdditions.test.mjs` (+80) |
| `9bee871` | Toolbar grouped into labelled sections (Backdrop / Figure / Theme / Size / Overlays); not-dirty reset fields show a muted dot instead of a dead ⟲ button; ●/○/× legend chip. No control removed or rewired. | `src/auras/devGallery.jsx` (±103 lines) |
| `b02fb1c` | Anchor overlay draws eye-line + sigil landmarks (violet) and painter-declared sprite seats (crimson rings). Adds **`AURA_ART.descended.anchorPoints`** — the eight rest-pose socket positions — to shipped `AuraCanvas.jsx`. | `src/auras/AuraCanvas.jsx` (+24), `src/auras/devGallery.jsx` (+21) |
| `50a6a8b` | Read-only "Driving / source" rows in the spec panel: painter ids (`art`/`overArt`), strike `from` directions, layer placements, image/frame/glyph/icon sources. Inert rows, no edits. | `src/auras/devGallery.jsx` (+30) |
| `d52dc31` | Fix: crate-160 preview no longer mounts a stray letter face (crate mounts no photo); `none` tile is disabled and marked "no spec" instead of opening an empty editor. | `src/auras/devGallery.jsx` (±7) |

## Flags

- **Only 3 files touched across all five commits:** `devGallery.jsx`
  (dev-only module), `AuraCanvas.jsx` (shipped renderer),
  `rendererAdditions.test.mjs` (tests). Nothing under `api/`, no
  Supabase/kv, no `APP_VERSION`, no `changelog.js`, no catalog data.
- **`AuraCanvas.jsx` was touched by `dd16f1a` and `b02fb1c` — additive,
  opt-in, zero render change.** Verified by reading both diffs in full:
  every hunk is `+` lines only. Nothing in `AURA_FX` or any shipped spec
  value changed; nothing inside any painter's draw path changed. The one
  per-frame addition is `api.clock = clock` (a property write, no draw
  call). `api.seek`/`seekMoment`/`anchorPoints`/`cycle` are only invoked
  by the gallery — grepped for callers: none outside `devGallery.jsx` and
  the test file.
- **The dev hooks DO ship in the production bundle.** `AuraCanvas.jsx`
  is shared code, so `seekMoment`, `cycle = 45`, and `anchorPoints` are
  present in `dist/assets/index-*.js` — verified by grep on the build
  output. They are unreachable there (their only caller module is never
  emitted; see below), so the cost is ~1–2 KB of dead code and zero
  behaviour change. Flagging because "dev-only" here means "dev-only
  *used*", not "dev-only *shipped*". If Brodan wants them out of prod
  entirely they could move to a dev wrapper, but there is no safety or
  correctness risk as-is.
- **No `AURA_FX` shipped values changed.** All five commits pass the
  byte-identical rule for non-opted auras — the renderer additions are
  new api surface, not opt-in-to-render changes. (No `aura:diff` run —
  the pinned baseline worktree `ascend-baseline` does not exist on this
  Mac; the additions never touch draw paths, so there is nothing to
  diff.)

## Production-bundle exclusion — how checked

Ran `npm run build` on `091bd72` (build succeeded, 22 chunks emitted):

1. **No gallery chunk exists** — `ls dist/assets` shows no devGallery /
   dev chunk; the dynamic `import("./auras/devGallery.jsx")` in `Auth.jsx`
   sits behind `import.meta.env.DEV`, which Vite substitutes `false` in
   prod, so the whole branch (check + lazy import) is dead-code-
   eliminated and no chunk is emitted.
2. **Grep for gallery markers across `dist/assets/` — zero matches:**
   `DevAuraGallery`, `aura-scrub`, `aura-photo`, `aura-playpause`,
   "Aura gallery", "Show shapes", "Copy spec", `get("auras")`.
3. **The only "auras" strings in the bundle are unrelated shipped
   content** — help/changelog prose ("Aura Spin auras multiply…") and the
   Auras tab id — verified by inspecting each match's context.
4. **The seek/anchorPoints hooks are present but uncalled** (see flags) —
   `index-*.js` contains `seekMoment` and `descended.cycle=45`; nothing in
   the bundle references them.

Conclusion: **the gallery is fully excluded from production**; the only
residue is ~1–2 KB of unreachable renderer-side hooks.

## Verdict

All five commits are dev tooling in spirit and in effect. The only thing
outside the dev module is the additive, opt-in hook surface on
`AuraCanvas.jsx` — behaviour-neutral, verified by full diff read + prod
bundle grep. Safe to keep; the shipped-dead-code point above is the only
item worth a decision (keep as-is / move the hooks to a dev wrapper in a
later phase).

**Stopping here per the brief — Step 2 (Phase A build) waits for
Brodan's approval.**
