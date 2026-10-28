# Journey interaction asset pack + decorative sticker system

**Issue:** journey interaction asset pack (Engineer 3, Phase 00) ·
**Branch:** `feature/journey-asset-pack` → `develop` ·
**Companion:** Engineer 2's `JourneyDrawer` (`feature/journey-path-redesign`,
PR #17) consumes the same `PathNodeState`/`kind` model — this pack is the
asset layer it can graduate to.

Two deliverables:

1. **Tactile node/button state pack** — `JourneyNode`, one layered-SVG
   component covering every state × kind (zero bitmaps, fully themeable).
2. **Decorative sticker system** — ten Flora-generated die-cut PNGs +
   `JourneySticker`/`JourneyDoodle`/`JourneyNote` primitives + a
   deterministic variant registry so decorations rotate.

## Export list

| Path | What |
| --- | --- |
| `src/pearnotes/ui/JourneyNode.tsx` | `JourneyNode` (state, kind, order, progress, recommended, remedial, loading, disabled, size, hue, label, onClick, as) |
| `src/pearnotes/ui/JourneySticker.tsx` | `JourneySticker` (PNG), `JourneyDoodle` (inline squiggle/arrow/sparkle/tape), `JourneyNote` (DOM-text sticky chip) |
| `src/pearnotes/ui/journeyAssets.ts` | `JOURNEY_STICKERS` registry, `pickSticker(theme, seed)`, `stickerUrl()` |
| `src/pearnotes/styles/journey-assets.css` | `pjn-*` node + `pjs-*` decor styles, hover/press physics, reduced-motion |
| `public/pearnotes/journey/stickers/*.png` | 10 die-cut stickers @512px (~45–60 KB each) + `ATTRIBUTION.md` (prompts, run_ids, cost) |
| `src/pearnotes/ui/preview/JourneyAssetGallery.tsx` | full state/kind/sticker gallery scene (`?scene=journey-assets`) |

## Node usage map — which asset where

| Journey data | Renders | Notes |
| --- | --- | --- |
| `state: available`/`not_started`, `kind: lesson` | paper face, number glyph | the resting node; hover lifts the face off its skirt |
| `state: in_progress` | lime face + play glyph + progress ring + gentle bob | the one ambient motion on the trail; collapses under reduced-motion |
| `recommended: true` | lime `next` tag on the node | pairs with any state |
| `state: demonstrated` | subject-hue face + check | `hue` prop = subject signature colour |
| `state: needs_review` | amber face + dashed rim + `!` | proposal awaiting learner decision |
| `state: practicing` / `kind: practice` | amber face + ascending-steps glyph | drill node; `remedial` renders it smaller off-trail |
| `kind: checkpoint` | violet face + trophy glyph | unit quiz/wrap-up milestone |
| `state: locked` | dark face + lock, inert | no hover reward |
| `loading` prop | grey pulse skeleton | path data resolving — prop, not invented state |
| `disabled` prop | dimmed + `aria-disabled` | unreachable variant |

**Press physics:** hover raises the top face 3px off its extruded skirt;
`:active` drives it 5px down into the skirt — the visible lip shrinks,
reading as a real squash. `size`: `sm` 44px compact rows, `md` 72px map,
`lg` 96px hero/gallery.

## Sticker usage map

Registry names → `JOURNEY_STICKERS` in `journeyAssets.ts`:

| Theme | Assets | Intended surface |
| --- | --- | --- |
| `encouragement` | `you-got-this`, `small-steps` | header corner, beside current node (expanded mode) |
| `momentum` | `momentum-arrow` | near an in-progress streak/sequence |
| `bio` | `cell-mascot`, `microscope`, `dna-helix` | subject-hued science subjects only |
| `study` | `sketchbook`, `bright-idea` | library/empty-path margins |
| `reward` | `nice-work`, `checkpoint-medal` | completed unit band, checkpoint demo moment |

Rotate with `pickSticker(theme, seed)` — deterministic (same seed, same
sticker), so a lesson keeps its sticker across renders but different
lessons/units get different ones.

## Implementation rules (binding)

- **Decor budget:** ≤3 decorations per viewport (JOURNEY_REDESIGN §decor
  rules); compact mode keeps at most the header sticker. Margins only,
  never behind text or on interactive rows.
- **A11y:** every sticker/doodle is `aria-hidden`; `JourneyNote` keeps
  copy as real DOM text (i18n + zoom), and callers may `aria-hidden` the
  whole chip when it's purely decorative.
- **Meaning never rides on decor:** state is carried by node
  colour + glyph + label text, not by stickers.
- **Nodes are interactive controls:** `JourneyNode` renders a real
  `<button>` with an accessible `label`; `as="span"` is the inert-art
  variant for side cards.
- **Dark-bg first:** stickers ship on the `#0e0d0f` ink wall; on light
  surfaces wrap them in `pjs-note`-style paper, don't invert.

## Provenance / licensing

Stickers were generated via **FLORA MCP** (Nano Banana 2.1,
`t2i-elote-gateway`, 1:1, $0.052 each — **$0.52 total**) into project
"PearNotes — Journey Asset Pack". Prompts, run_ids and regeneration
instructions: `public/pearnotes/journey/stickers/ATTRIBUTION.md`.
AI-generated original works; no third-party characters or trademarked
art (the pear motif is PearNotes' own). Nodes/doodles/notes are
hand-authored SVG+CSS, MIT-licensed with the repo.

## Preview

`npm run dev` →
`/src/pearnotes/ui/preview/index.html?scene=journey-assets`
(screenshots under `docs/phase00/screenshots/journey-assets/`).
