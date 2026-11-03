# W5 — Lesson space = an adapted OurSpaces room (not a new canvas)

## Direction (owner + Blueprint §E of LEARNING_PATH_AND_LESSON_CANVAS)

Today the lesson mounts the inherited `Canvas` engine with
`widgets={[]}` — a decorative empty board — and `LiveLessonBoard` lays
`pnlw-*` DOM cards on top. That is a second widget system beside the
native one. The lesson must instead **be** a room: the `/#/space/crew`
composition hosting education widgets.

## Required native elements

- **World:** real `.space-scroll`/`.canvas-stage`/`.canvas-scale-layer`
  with pan/zoom and a bounded world template — welcome/briefing,
  source table, explain, practice, teach-back, remediation corner,
  personal scratch zone (spec §E anchors).
- **Widgets:** register education types (`lessonCard`, `source`,
  `challenge`, `teachBack`, `practiceGhost`) inside the inherited
  `WidgetCard` shell — same frame, drag/resize/focus/manage handles,
  gestures, `widget.data` persistence. Reuse `LiveLessonBoard`'s
  activity renderers as the *card bodies*, not as a parallel system.
- **Chrome:** top-left breadcrumb pill (Home / Subject / Unit / Lesson),
  bottom-left activities list pill (native look; opens the lesson's
  object list with progress + jump-to), top-right presence capsule
  (self only for private lessons; real peers only in authorized shared
  rooms), native action dock (add note, show sources, ask tutor),
  honest sync chip.
- **Data:** `learningRuntime.getLesson/submitAttempt/listPractice`
  stay the truth; the room maps `activities` → widget specs with
  server positions + user-moved overrides for the scratch zone only.
- Demo: same room, seeded lesson widgets, "sample board" chip,
  local-only interactions.

## Approach (additive, no LiveSpace.tsx rewrite)

- `src/pearnotes/lesson-room/` new folder: `LessonRoom.tsx` composes
  `Canvas` + native chrome pieces; `lessonWidgets.ts` maps activity
  specs → `Widget[]`; card bodies live under
  `learning-widgets/` reused as WidgetCard renderers.
- `WidgetCard` gains the education `type`s via a thin registrar so the
  shared shell handles drag/focus/lease behavior unchanged.
- Route `/app/…/lessons/:lid` swaps `lessonCanvas + LiveLessonBoard`
  for `<LessonRoom>`; keep `LessonShell` loading/error/permission
  frames and guided/explore mode (camera presets per anchor zone).
- Old `pnlw` overlay path stays behind a `?legacy-lesson=1` flag for
  one release, then removed.

## Acceptance

- Pan/zoom/drag/focus work on lesson widgets like any OurSpaces widget;
  challenge input doesn't drag the canvas; activities pill jumps
  camera; breadcrumb returns to drawer at the same node.
- Mastery/XP unchanged (server truth); attempts persist across
  navigation; offline keeps drafts.
- Screenshot pair: `/#/space/crew` vs lesson room at 1440/390 —
  recognizably the same room family.
- No fabricated presence; demo shows "sample board".

Owned paths: `src/pearnotes/lesson-room/*` (new),
`src/components/WidgetCard.tsx` (registrar hook only),
`src/pearnotes/learning-widgets/*` (body reuse), `LessonShell.tsx`,
`PearNotesAppRoutes.tsx` (mount swap), `PearNotesCanvasShell.tsx`
(legacy parity), tests.
