# Learning widgets — four typed assessed widgets (issue #25)

**Module:** `src/pearnotes/learning-widgets/**` · **Gallery:**
`?scene=widget-board|widget-challenge|widget-lesson|widget-source|widget-teachback`
in the UI preview entry (`/src/pearnotes/ui/preview/index.html`).

## The four widgets

| Widget | File | Renders | Emits |
| --- | --- | --- | --- |
| LessonCard | `LessonCardWidget.tsx` | `lessonCard` spec — heading/body, objective + citation chips, expandable reader dialog, select-text → "ask about this" | nothing assessed; `onRequestTutor` + `onOpenSource` only |
| SourceViewer | `SourceViewerWidget.tsx` | literal excerpt from `port.loadSegment(ref)`; ready/loading/missing/forbidden/deleted | nothing — never invents text |
| Challenge | `ChallengeCard.tsx` + `ClassificationChallenge.tsx` | `classify` (tactile sort board), `multipleChoice`, `shortAnswer` | `AttemptSubmission` → `AttemptResult` |
| TeachBack | `TeachBackWidget.tsx` | `teachBack` spec — prompt, rubric preview, textarea | `{kind:"text"}` submission → rubric marks |

## Contract (exported from `learning-widgets/types.ts` via `index.ts`)

- `ActivityEnvelope` — `lessonId`, `activityId`, `activityRevision`,
  `objectiveIds`, `sourceRefs`. Every assessed widget needs one.
- `WidgetActivitySpec` — engine `ActivitySpec` **plus** the proposed
  `ClassificationSpec` (below).
- `AttemptSubmission` = envelope + `AttemptResponsePayload`
  (`choice` / `text` / proposed `classification`).
- `AttemptResult` — verdict, optional score/feedback/explanation/
  `marks` (per-item) / `rubric` (per-criterion).
- `LearningWidgetPort` — the ONLY outward seam:
  `submitAttempt()`, `loadSegment()`, optional `onRequestTutor()`.
  Real adapter maps these onto Convex; `createFixturePort` is the
  labelled deterministic stand-in.

## Classification interaction

Three equivalent input modes:

1. **Pointer drag** — press a chip (>6px), drag, release on a tray.
2. **Tap-tap** (mouse & touch) — tap a chip to lift it, tap a tray to
   drop; tap a placed chip to return it to the pile.
3. **Keyboard** — Tab to chip, Enter/Space picks up, Tab to tray,
   Enter drops, Escape cancels, Enter on a placed chip returns it.

`aria-live` announcements narrate pick-up/drop/verdict. Submit requires
all items placed; a failed submit keeps placements (error state shows
retry with nothing lost). After evaluation, correct chips get ✓ stamps,
wrong chips get "→ expected tray" stamps — explicit wrong-answer
feedback with per-item marks (`AttemptResult.marks`).

## PROPOSED backend extensions (request to Engineer 4 via coordinator)

Engineer's `ActionKind` already includes `"classification"`, but the
persisted unions lack the matching shapes. Two additive members:

```ts
// convex/tables/learning.ts — activitySpec union, new member:
v.object({
  kind: v.literal("classify"),
  prompt: v.string(),
  items: v.array(v.object({ id: v.string(), label: v.string(), caption: v.optional(v.string()) })),
  buckets: v.array(v.object({ id: v.string(), label: v.string(), hint: v.optional(v.string()) })),
  // correct assignment lives server-side in an evaluator field/table,
  // NOT in the spec shipped to the client.
})

// attemptResponse union, new member:
v.object({
  kind: v.literal("classification"),
  assignments: v.array(v.object({ itemId: v.string(), bucketId: v.string() })),
})

// attemptEvaluation gains optional per-item marks:
marks: v.optional(v.array(v.object({
  itemId: v.string(), correct: v.boolean(), expectedBucketId: v.optional(v.string()),
})))
```

Optional rubric marks for teach-back: `rubric: v.optional(v.array(
v.object({ criterion: v.string(), covered: v.boolean() })))`.

Until adopted, `classify`/`classification` shapes exist only in fixture
data — the widgets already speak the final contract.

## Adapter plan (integration PR, not this one)

| Port method | Convex mapping |
| --- | --- |
| `submitAttempt` | mutation writing `attempts` row (state `submitted`), then evaluator attaches `attemptEvaluation` and returns the evaluated attempt → `AttemptResult` |
| `loadSegment` | query over `sourceSegments` by id, gated by `assertSourceReadable` → `SegmentLoadResult` (`forbidden` on denied) |
| `onRequestTutor` | routes to tutor surface with selected text + objective context |

Widgets never query Convex directly, never see another learner's data,
never award XP. `activityRevision` is echoed back so the server can pin
attempts to what the learner saw.

## Fixture scope (what is NOT real yet)

- `createFixturePort` — deterministic local grading; latency simulated.
  Labelled "fixture grader / fixture feedback" on-screen.
- `FIXTURE_*` ids/strings — shape mirrors the real Muse proposal
  (pp. 1–2, 3 objectives) but excerpt text is original paraphrase.
- Hero image — Flora-generated original art (see
  `public/pearnotes/learning/ATTRIBUTION.md`).
- Everything else (specs, envelopes, port, lifecycle, marks) is the
  same contract the real adapter will satisfy.

## Accessibility & states

- Keyboard-complete classification (verified with real key events:
  Tab→chip→Enter→tray→Enter places a chip; counter reaches 1/9).
- Chips/trays are focusable controls with names; trays announce counts;
  `aria-live` region narrates actions; wrong chips carry accessible
  expected-tray text.
- Reduced motion: shake/pulse/lift transitions collapse under
  `prefers-reduced-motion`.
- Mobile: trays stack full-width; tap-tap is the primary pointer mode.
- Missing/forbidden/deleted sources render honest empty states.
- Gallery scenes cover: board, classify, lesson card (+reader),
  source states ×4, teach-back; `?fail=1` makes the first submit error
  to demo answer-preserving retry.

## Tests

`tests/learning-widgets/classify.test.ts` — 14 cases: spec validation,
assignment helpers, deterministic response order, fixture graders
(correct/partial/incorrect + marks + feedback), verdict mapping,
teach-back rubric coverage, choice grading. `npx vitest run` — all pass.

## Flora generation record

`cells-hero-plant-vs-animal-01.png` — Nano Banana 2.1, 3:2, $0.052,
run `run_m17ehdbxp73es3fkeqqykx1hj58han3e`. Prompt: *"Flat vector
die-cut sticker illustration on solid near-black background hex
#0e0d0f. Two friendly stylized cells side by side: LEFT a rounded-square
plant cell in fresh green #7fca5a … RIGHT a soft blob-shaped animal
cell in violet #7853ff … absolutely no text or labels."*
