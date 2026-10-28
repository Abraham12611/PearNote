# Journey / Learning Path — hybrid redesign spec

Owner direction: synthesize the four mockups into one hybrid — do not pick one
and discard the rest. This document is the contract for the implemented
`JourneyDrawer` component (`src/pearnotes/ui/JourneyDrawer.tsx`).

## Synthesis

| Source | What we take |
| --- | --- |
| Mockup 1 | **Default structure** — compact numbered lesson list: "learn path" kicker, subject title + mascot sticker, one-line social strip, per-unit progress bar, emphasised current node ("jump in!"), sticky bottom CTA. But at **~26vw, not ~50%**. |
| Mockup 3 | **Expanded structure** — richer map view: hero unit banner, zigzag path with big nodes + side cards, sticky-note encouragement, "study with your crew" footer. |
| Mockup 4 | Vertical dotted path reading order, "next" pill language, **Guidebook** alternate-view affordance, milestone iconography (trophy checkpoint, headphones, star practice). |
| Mockup 2 | Unit card hero ("tiny but mighty!" sticker + continue chip), per-lesson duration metadata ("Lesson · 6 min"), "complete unit" reward footer. |
| Duolingo (saved page) | Rhythm of locked/current/done states on a winding trail; celebration copy kept short. |

## Modes

**Compact (default).** A narrow right drawer: `clamp(340px, 26vw, 430px)` on
desktop — the owner asked for 25–30% of viewport. Flat numbered list, grouped
by unit with a per-unit progress bar. One social line maximum per row, only on
rows that have it. Sticky CTA bar pinned to the drawer bottom.

**Expanded.** The "guidebook" map: `clamp(560px, 48vw, 760px)` on desktop.
Winding trail, hero unit banner, side cards with objectives/duration, sticky
notes, crew footer. This is the rich optional view, never the default.

## Toggle (decision)

- **Location: header control.** One icon-button in the drawer header
  (`guidebook` label in compact, `list` in expanded) next to back/close.
  Rationale: the toggle must be discoverable where the owner already looks; an
  inline toggle inside the list competes with lesson rows; a settings page is
  too far away for a preview-strength feature.
- **Persistence: localStorage** `pn.journey.mode`, read once for the
  uncontrolled default; `mode`/`onModeChange` props allow controlled use.
  Not a server setting — Phase 00 has no preference store, and per-device is
  the right scope for a density preference. Global (not per-subject): density
  is a learner preference, not a curriculum property.
- Escape/select/close behaviour is unchanged between modes — same props
  contract as `LearningPathDrawer`.

## Responsive

| Viewport | Compact | Expanded |
| --- | --- | --- |
| ≥1200px desktop | `clamp(340px, 26vw, 430px)` | `clamp(560px, 48vw, 760px)` |
| 768–1199px tablet | `min(46vw, 460px)` | `min(72vw, 720px)` |
| <768px mobile | full-screen sheet (list density) | full-screen sheet (map) |

Mobile keeps the toggle: compact → flat list, expanded → the same winding map
fit to screen width. The drawer stays a right-hand layer over Home — never a
route/page replacement.

## Node state model

Existing `PathNodeState` values map to visual treatments; the additive
`PathLesson.kind` distinguishes structural node types. States are never
invented: a node renders exactly what `state`/`kind`/`recommended` say.

| Model | Compact row | Expanded node |
| --- | --- | --- |
| `demonstrated` | subject-hue check disc | subject-hue node + check |
| `in_progress` | lime disc + play glyph, "jump in!" tag, progress ring | large play node + "in progress" card + social line |
| `recommended` (flag) | "next" pill on the row | "next" pill on the node |
| `available`/`not_started` | numbered outline disc | numbered node |
| `locked` | dim disc + lock, row inert | dim node + lock, card inert |
| `needs_review` | amber "!"/review chip | amber dashed node |
| `practicing` (state) or `kind:"practice"` | amber/practice glyph + "practice" chip | practice glyph node |
| `kind:"checkpoint"` | trophy disc + "checkpoint" chip | trophy node (unit quiz/wrap-up milestone) |

`remedial` keeps meaning an adaptive practice branch (renders smaller, stepped
off the main trail in expanded, flagged "practice" in compact).

## Social snippets — placement rules

One line maximum per surface, always below/inside the row it belongs to,
never floating:

- Header strip: `N friends studied this` + up-to-3 face pile (+overflow count).
- Completed node: `N friends completed this`.
- Current/in-progress node: `N studying now with you`.
- Expanded footer: `N friends are learning {subject}` + Invite affordance.

If a lesson carries no `social` data, nothing renders — no empty avatars, no
"0 friends". All social data is optional additive contract data; fixtures are
labelled `prototype fixture` exactly like today.

## Decorative stickers — placement rules

- Confined to **margins and the trail's open side**: header mascot corner,
  the gap beside the current node, the footer card. Never behind text, never
  on interactive rows.
- Budget: **≤3 decorations visible per viewport** (header sticker + one note +
  one footer doodle). Compact keeps at most the header sticker.
- All decorative elements are `aria-hidden`, honor reduced-motion (bobbing
  only in expanded), and use the existing palette/tokens.

## Data honesty

- New contract fields are all optional: `PathLesson.kind`,
  `PathLesson.durationMin`, `PathLesson.social`, `LearningPath.social`.
  A path without them renders a perfectly usable drawer.
- Social numbers, durations and checkpoint nodes exist **only in fixtures**
  until the domain layer emits them; they are never hard-coded in components.
- Statuses (loading/generating/needs_material/needs_review/error) render the
  same honest states as the previous drawer.

## Unresolved questions for owner/coordinator

1. "Guidebook" naming: implemented as the expanded/map mode label — is that
   the intended meaning, or is Guidebook a separate reference view?
2. Persistence scope: per-device localStorage chosen; should mode follow the
   account once a preference store exists?
3. Social data source: assumed Phase 01+ domain emits `social` per lesson and
   `LearningPath.social` per path — confirm shape with Engineer 4.
4. Checkpoints: modelled as `kind:"checkpoint"` on a lesson node — should a
   unit quiz instead be a distinct entity (own id space)?
5. Invite affordance in expanded footer routes where? Kept as a callback only.
