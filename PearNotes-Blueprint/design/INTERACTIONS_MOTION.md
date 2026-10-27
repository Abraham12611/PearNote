# Spatial interaction, motion, and component behavior

## Navigation transition choreography

1. Home→Subject Picker: black modal materializes, backdrop dims, selection discs rise with a mild stagger (<250ms). No heavy 3D scene.
2. Select subject: selected disc gets lime ring, label and small scale change; other discs remain accessible.
3. Enter subject: modal closes while a right drawer slides in (~280–360ms); Home behind blur/dim remains visible for context.
4. Select path node: node preview anchors to selection; `Start` navigates into lesson. Lesson board camera fits predefined welcome frame before optionally panning to first activity.
5. Return: lesson exit restores selected subject, path scroll, and home context without duplicate wizard steps.
6. AI suggestion: ghost card fades into *designated* practice zone; no surprise movement of human widgets. Accepted card settles with a subtle squash/lift.
7. Reward: discrete, celebratory popup and optional on-canvas badge; no full-screen seizure of attention.

## Camera and layout semantics

- Store persisted canvas object positions in *board coordinates*, not CSS viewport coordinates.
- Each lesson template defines world dimensions, default camera fit, anchor zone IDs and mobile fallback order.
- Guided mode is a camera/action overlay on the same board as Explore mode; switching modes does not create a second copy of learning data.
- The learner can always return to an objective anchor. Avoid dragging the whole board unintentionally while manipulating text selections or activities.
- Peer cursors never occlude answer controls. Use throttled/batched presence and time-limited gesture leases inherited from OurSpaces.

## Widget manipulation contract

- `select`: opens floating controls.
- `drag`: begins only from a handle on interactive cards; text and quiz input remain usable.
- `resize`: enforces per-type readable min/max; prevents overlap with fixed tutor/Compass overlays.
- `focus`: detailed reading surface with escape/back, return scroll/camera preservation.
- `thread`: opens contextual discussion dock on selected object for authorized shared boards.
- `provenance`: source info always one click away on AI-generated instructional content.
- `delete`: user-owned objects require confirmation or undo; AI-created activity deletes must not erase attempts or mastery history.

## Motion guidelines

Use CSS transforms/opacity where possible. Prefer deterministic timing over spring chaos. Suggested duration: 120–180ms micro-interaction; 240–360ms navigation; 500ms max reward flourish. Honor `prefers-reduced-motion` by replacing pan/zoom with direct camera transition and suppressing celebratory burst. Never encode meaning in motion alone.

## Hover/touch parity

All tooltip-only information also appears on focus/tap. Mobile uses explicit drag handles, larger touch targets and optionally fixed linear activity navigation. Avoid desktop-only click-to-hover affordances.

## Not yet decided

Exact node path geometry, final mascot/illustration style, sounds, and path color families require design QA on real 1440px and mobile widths. Preserve upstream OurSpaces touch physics until direct observation shows a regression.
