# PearNotes design system — Lived-in Learning Worlds

**Design lineage:** OurSpaces' internal concept is a *lived-in sticker wall*: digital bedroom wall and scrapbook, not a corporate dashboard. Preserve that design grammar. The PearNotes learning metaphor adds paths, collectible artifacts, illustrated subject identities and educational objects without flattening the canvas into tiles.

## Principles

- **Material, not template:** paper, sticky notes, vinyl stickers, photographed media, tape, labels and black interactive slabs each have distinct silhouettes; maintain coherence through shared material/typography/motion.
- **Room has identity:** a subject receives one signature hue and an illustrated circular avatar. Different lessons can vary secondary palette without losing identity.
- **Hierarchy from texture and proportion:** a challenge is visibly different from a citation slip or teach-back card before users read text.
- **Spatial agency:** students may move ordinary notes and explore. Guided activity grouping uses clear anchors without disabling navigation.
- **Live presence is human:** cursors and chat can exist alongside study objects; AI proposals are distinguishable from human artifacts.
- **No gratuitous 3D:** 2D/2.5D illustrations, SVG, CSS and subtle parallax should achieve responsive, inexpensive depth.

## Tokens — starting palette, adjust against upstream CSS

| Token | Value / intent |
|---|---|
| `--ink` | `#0b0b0d`, black pill/surface |
| `--panel-dark` | `#151517`, interface chrome |
| `--lime` | `#c6f750`, sparse primary affordance, status, selection |
| `--paper` | `#f5efdf`, readable warm white card |
| `--text-on-dark` | `#ffffff`, on near-black |
| `--text-muted` | `#bac2c6`, helper copy on dark |
| `--subject-biology` | `#59b995`, biology default identity (proposal) |
| `--subject-math` | `#7c5cff`, mathematics (proposal) |
| `--subject-physics` | `#3f70ff`, physics (proposal) |
| `--subject-chemistry` | `#ffad59`, chemistry (proposal) |
| `--subject-medicine` | `#e46a94`, medicine (proposal) |

Upstream canonical reference: `DESIGN.md` from the fork pinned commit. These names supplement rather than override its existing tokens without review. Maintain accessible contrast; pastel cards use dark ink.

## Typography

- **Display:** Bricolage Grotesque, strong and slightly irreverent, for labels, subject names, numbers, progression states.
- **Reading:** IBM Plex Sans, regular body weights for long explanations, tooltips, chat and exercise instructions.
- **Numerals:** tabular figures for XP, timers, streaks and lesson progress where supported.
- Use one obvious primary heading per panel; avoid 10pt source text at zoomed-out canvas sizes. Prefer detailed reading in focused view.

## Base components

**Global rail:** floating dark rounded column; identity mark, Home, Learn, Library, Groups, Achievements, Profile, create. Active destination has bright state and descriptive tooltip; may compact on mobile.

**Black pill:** primary controls, live badges, subject labels, move/edit affordances. Use lime rarely and meaningfully.

**Paper widgets:** sticky notes, source excerpt slips, lesson handouts. Use physically plausible tape/pins and irregular cuts sparingly.

**Illustrated subject discs:** same 8–12 circular compositions, consistent illustration scale, distinct identity background; editable subject label; selection has 6–8px lime ring. Always include a dashed-plus creation tile, including populated state.

**Curriculum path nodes:** original SVG/CSS stepping-stones, distinct current/completed/locked/review states. Never copy Duolingo mascots, path artwork or proprietary characters.

**Compass:** small fixed learning control showing lesson name, progress, guided/explore switch, next objective, exit.

**Tutor dock:** existing bottom dock grammar, one contextual AI entry, not an always-open chatbot sidebar. Requests show source scope and tool action review.

**Trophy shelf:** collect illustrated paper/metal/clay-like achievements; earned objects can be pinned to Home or profile. Rewards are visibly separate from learning mastery.

## Spacing and elevation

Use spacing units 4/8/12/16/24/32px; floating chrome radius ~24–28px; tiles 14–18px; pills fully round. Shadows should reinforce touch/pick-up, not decorate all objects. Slight rotation ±2° for notes; no excessive skew on reading cards. Preserve board navigation at a readable fitted zoom.

## States

Active selection: lime ring; hovered widget: lift + slight shadow; dragging: stable z-index + ghost placement; processing: progressively updated process slip; accepted AI content: normal widget with small `AI-assisted` source metadata; proposed content: visually translucent ghost with Accept/Reject. Errors: visible recoverable torn-paper slip, not a vanishing toast.

## Brand differentiation and licensing

Keep the *design philosophy*, but make original PearNotes logos, subject illustrations, trophies and lesson assets. Audit upstream sample photos, sound and fonts individually. Preserve MIT attribution and do not claim OurSpaces authorship.
