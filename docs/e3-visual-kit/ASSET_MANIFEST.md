# E3 · Asset slot manifest — E1 (entry surfaces) / E2 (in-app surfaces)

Status legend: **E** = exists in repo (reuse), **N** = new art needed (Flora-gated), **C** = compose from existing (CSS/DOM, no image). Every consumer must fill the *component reuse ledger* (native ancestor + screenshot pair) per `OURSPACES_FIDELITY_CONTRACT.md` §69–80. Illustrations are DOM-composed layers — no baked text, no flattened mockups.

## E1 — Landing / auth / modal surfaces

| Slot | Consumer (ancestor) | Content spec | Export | Status |
|---|---|---|---|---|
| `hero-collage-master` | `src/entry/LandingPage.tsx` hero (ancestor `src/pages/About.tsx`) | A-source-becomes-a-world modular collage: cream PDF slip w/ highlighter+page tab, thread→subject disc, 3-node path, mini canvas w/ lesson+source+challenge cards, citation tag. **Separate layers**, copy-free | master ~1600×1200 PNG/WebP transparent layers + 1 flattened fallback | **N** (Flora batch H) |
| `hero-collage-mobile` | same, ≤767px | single focal illustration cropped from master | 800×1000 | **N** (derived) |
| `modal-scene-panel` | `GetStartedModal.tsx` + auth pages (ancestor: screenshot-13 two-tone modal) | left ~40% violet/teal scene: taped paper, Sticker P, card cluster; copy-free | 800×1000 + 400×500 crop | **N** (batch H) |
| `section-spot-bring-source` | landing §material→understanding | tiny taped PDF/book | 512² | **N** (batch H) |
| `section-spot-review-path` | same | subject discs + editable path sketch | 512² | **N** (batch H) |
| `section-spot-study-space` | same | widget cards on teal room | 800×600 | **N** (batch H) |
| `section-spot-evidence` | same | checkpoint sticker + citation slip | 512² | **N** (batch H) |
| `section-spot-friends` | same | cursor/face-strip grammar, opt-in | 512² | **C** (avatars exist) |
| `story-deco-set` | landing story breaks | 2–3 hand-cut tags/tape/lime-highlight slips | SVG/PNG small | **C** (textures exist) |
| `signin-email-header` | `convex/emails/signIn.ts` | narrow brand header, absolute HTTPS at deploy time, alt text + plain-text parity | 1200×400 | **N** (batch H, low) |
| `mark`, `lockup` | all headers | Sticker P + lockups | SVG | **E** |

## E2 — Home / learn / lesson / groups / shelf

| Slot | Consumer (ancestor) | Content spec | Export | Status |
|---|---|---|---|---|
| `subject-disc-bio` | subject picker + discs (ancestor avatar buttons) | cell w/ nucleus, saturated bg, cream die-cut edge, readable 40px | 512/256/96 PNG+SVG | **N** (batch S) |
| `subject-disc-algebra` | same | graph/pi motif | same | **N** (batch S) |
| `subject-disc-chemistry` | same | bonded-sphere cluster | same | **N** (batch S) |
| `subject-disc-custom` | same | generic paper/plus fallback | same | **N** (batch S) |
| `path-node-stickers` | LearningPathDrawer/JourneyDrawer nodes | cell membrane, math glyph, lab glassware, generic lesson/quiz/practice family; **status drawn in code** | SVG, 24/32/48/96 | **N** (batch S) |
| `trophy-set-6` | Shelf (`/app/achievements`) | First Chapter, Deep Thinker, Study Buddy, Cell Explorer Chest, Explorer, Comeback — die-cut sticker/pin/chest forms | 512² PNG+SVG each | **N** (batch S) |
| `trophy-locked-peg` | Shelf empty states | peg/silhouette outline | SVG | **C** |
| `home-first-source` | new-account Home | giant paper invitation illustration | 1200×800 | **N** (batch H) |
| `home-empty-shelf` | Shelf empty | pegboard illustration | 800×600 | **N** (batch S) |
| `knows-paper-frames` | Home/Library (ancestor `RoomKnowsObjects.tsx`) | reuse textures+CSS | — | **E** |
| `calendar-pinboard` | This week module | pinned note/calendar frame; dates in DOM | CSS+texture | **C** |
| `dock-icon-set` | `SpaceDock` (from `Rail.tsx`) | 7 custom nav glyphs: home/book+path/library/faces/shelf/person/gear — 2–3px ink family | SVG ×7 | **N** (batch S, cheap) |
| `people-capsule` | top-right presence pill (ancestor MemberFace) | overlapping avatar rings + count | DOM | **E** |
| `lesson-diagram-*` | LessonBoard widgets | **source-derived only**, reviewer sign-off; not in base batch | per-lesson | **N later** |

## Responsive / a11y export matrix

Every N-slot ships: master (editable/vector or ≥2× raster) + `512` `256` `96` optimized PNG/WebP + dark **and** cream context preview + alt text in manifest + reduced-motion static variant where motion is implied. No artwork may carry live data (counts, names, citations, "live" badges).
