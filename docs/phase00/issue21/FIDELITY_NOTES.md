# Issue #21 — Journey pixel-fidelity rebuild notes

## Reference pack status

The owner described a six-file ZIP (`PearNotes-Journey-Owner-Reference-Pack.zip`)
but the archive is **not present on this machine** — searched `~/Downloads`,
`~/Desktop`, `~/Documents`, `/tmp` (all filenames + Spotlight). The authoritative
target (`02_PIXEL_REFERENCE_TARGET_COPY_THIS.png`) **was** provided inline in the
assignment message and is what this build reproduces. Files 01/03 are negative
controls and 04/05 are optional no-connector inspiration — all four are described
precisely in the issue body, which was treated as the spec. This is the one
deviation the owner should be aware of: the ZIP README itself was never read.

## What was reproduced

- **Header**: dark `LEARN PATH` kicker (purple dot, letterspaced caps), big
  subject title, social/progress sub-line; the cream element is a **detached
  mascot card** top-right (scalloped corner) wearing a deterministic
  illustrated mascot (`pickSticker(theme, subject.id)`; biology →
  `cell-mascot`, generic → `you-got-this` pear) plus a lime `you got this!`
  sticky note. Owner confirmed: mockup's dark header beats the issue text's
  "cream header" wording.
- **Dark layered body**: flat ink panel, raised **dark social strip**
  (face pile + "N friends studied this" / "names are on this path." — only
  when `path.social` exists, nothing fabricated), raised dark **unit progress
  card** (purple glyph tile, gradient lime bar, `role="progressbar"`, `›`
  affordance, "Unit N progress").
- **Premium nodes**: `JourneyNode` (2.5D SVG — ground shadow, extruded skirt,
  squash-on-press) at 72px lesson / 60px practice / 84px checkpoint on a
  centered lane with subtle cyclic stagger; **numbered titles + objective
  subtitle + `{state} · {duration}` meta** under each node; lime `jump in!`
  tag on the current node; per-node social lines where data exists.
- **Fixed lime CTA**: `▶ Continue lesson N` capsule + dark arrow chip on the
  right; honest "every lesson finished" state when no open lesson exists.
- **Decorations** (owner approved adding them, margins only): mascot sticker
  + `you got this!` note + `small-steps` + `momentum-arrow` + squiggle/sparkle
  doodles, all deterministic + `aria-hidden`.

## Connector decision — Option A (the mockup's own connector)

The reference shows **small uniform down-chevrons between nodes**, not a drawn
spine. That is what ships in compact: one centered 16px `›`-down SVG between
every consecutive pair (`pnj-link`), identical size/color/opacity everywhere —
uniform, never crossing a node face, no grey fragments (the rejected 03 look).
Expanded uses the **single continuous dashed spine** (`trailD` cubic curve
through node centers, covered by the opaque node faces so it reads edge-to-edge).
Both are the "clean connector" option; there is no third behavior.

## Width contract — measured `getBoundingClientRect().width`

| Viewport | Mode | Computed | Ratio | Requirement | ✓ |
|---|---|---|---|---|---|
| 1440×900 | compact | 388.80px | 27.00% | ≤432px (25–30%) | ✓ |
| 1698×900 | compact | 458.45px | 27.00% | ≤509px | ✓ |
| 1920×900 | compact | 518.40px | 27.00% | ≤576px | ✓ |
| 1024×768 | compact | 389.12px | 38.00% | <40vw | ✓ |
| 390×844  | compact | 390px | 100% | full sheet | ✓ |
| 1440×900 | expanded | 691.20px | 48.00% | ~45–50% | ✓ |
| 1024×768 | expanded | 716.80px | 70.00% | ≤70vw intentional | ✓ |
| 1440×900 | legacy rollback (`?journey=legacy`) | 748.80px | 52% | unchanged | ✓ |

CSS: `.pn-drawer.pnj-compact { width:27vw; min-width:0; max-width:30vw }` —
the base `.pn-drawer` `min-width:480px`/`52vw` conflict is overridden by
qualified selectors (order-independent). Media: 900–1199px tablet,
≤899px full sheet, ≤520px height compresses hero/CTA.

## Verified

- `npx tsc -b` → clean; `npm run build` → pass (journey.css 9.4kB code-split)
- Live shell `?mock=1&pearnotes=1&fixtures=1#/learn/path/fixture-bio` →
  JourneyDrawer 388.8px; `?journey=legacy` → old drawer 748.8px unchanged
- No horizontal scroll at any measured viewport; CTA bottom edge at 830px of
  844px viewport; icon buttons 44px on the sheet; `aria-modal`, Escape/focus,
  `role=progressbar` preserved; `prefers-reduced-motion` block covers `pnj-*`.

## Shots (this directory)

- `before-legacy-drawer-1440.png` — rejected before-state (old drawer)
- `compact-1440.png` / `compact-1440-scrolled.png` — target reproduction
- `expanded-1440.png` — guidebook trail mode
- `mobile-390x844.png`, `short-390x667.png`, `empty-1440.png`
- `assets-1440.png` — `journey-assets` gallery (kit still intact)
- `live-shell-1440.png` — real app route

## Known gaps for owner review

1. ZIP reference pack unavailable locally (see above) — fidelity is against the
   inline target image + issue text only.
2. Locked checkpoint renders the honest lock state (fixture data is locked);
   the mockup's amber medal ring shows when a real path emits an unlocked
   `kind:"checkpoint"` node.
3. Owner visual acceptance pending — not claimed by this engineer.
