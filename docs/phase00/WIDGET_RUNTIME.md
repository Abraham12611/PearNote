# Widget ↔ assessment runtime contract (issue #46)

**Module:** `src/pearnotes/learning-widgets/{runtime,LessonBoard,LiveLessonBoard}.tsx/ts`.
The same widgets from #43, now mounted on the real backend through one
seam. Fixture code stays — labelled, and structurally identical.

## Contract map

| Port method | Backend | Notes |
| --- | --- | --- |
| `port.submitAttempt(submission)` | `learningRuntime.submitAttempt` | sends `{activityId, activityRevision, attemptKey, response}`; server evaluates + writes mastery |
| `port.loadSegment(ref)` | `sources.getSegment` (one-shot `client.query`) | `null` → honest `missing` (missing/forbidden/deleted are indistinguishable — deliberate) |
| `port.listPractice(lessonId)` | `learningRuntime.listPractice` | reactive via `useQuery` — proposals appear live after a 2nd incorrect attempt |
| `port.reviewPractice(id, action)` | `learningRuntime.reviewPractice` | accept materializes a REAL `activities` row — arrives via `getLesson`, never rendered from the ghost spec |
| `useLearningRuntime(lessonId)` | `learningRuntime.getLesson` | `loading → ready | unavailable` |

## attemptKey policy

`createRuntimePort` keys attempts by `(activityId, serialized response)`:
the SAME response retried reuses the SAME key (server dedupe returns the
original attempt); a CHANGED response mints a NEW `crypto.randomUUID()`.
Never reuse a key across different answers — server throws CONFLICT.

## verdicts

`correct | partial | incorrect | needs_review`. Server returns
`{attemptId, verdict, masteryUpdated}` — no feedback/marks/explanation,
so live results show the verdict + honest "sent for review" copy for
`needs_review` (teach-back is never auto-graded). `masteryUpdated` is
surfaced as "progress saved" data, not XP.

## Mount contract for Engineer 2

```tsx
import { LiveLessonBoard } from "../learning-widgets";
// inside the lesson canvas children slot (PearNotesCanvasShell):
<LiveLessonBoard lessonId={route.lessonId} />
```

`LiveLessonBoard` owns loading/unavailable/pending states:
- `getLesson → null` → "isn't on your shelf" (other learner / deleted)
- `activities: []` → "practice is still being sketched" (materializer
  abstained — e.g. unverifiable source — never faked)

## Backend gaps flagged for Engineer 4

1. `getLesson` doesn't return activity `objectiveIds`/`sourceRefs` —
   citation chips + envelope grounding need them (adapter already
   maps them when present, defensive).
2. `submitAttempt` returns no `marks`/`feedback`/`score` — per-item
   wrong-answer stamps need `marks` added to the return validator.
3. No `needs_review` → reviewed evaluation path client-visible yet.

## Live vs fixture

- **Live:** everything through `useLearningRuntime` — no Biology fixture,
  no client grading, no fake mastery.
- **Fixture:** `?scene=widget-live` renders the identical `LessonBoard`
  with `createFixtureRuntime` (deterministic port; `?ghost=1` seeds a
  proposal; accept materializes a fixture activity row — same shape the
  server produces). `?scene=widget-pending` shows the zero-activity
  pending state.

## Tests

`tests/learning-widgets/runtime.test.ts` — 10 cases: attemptKey reuse on
identical retry, new key on changed answer, revision passthrough,
verdict mapping without invented fields, segment null→missing, practice
mapping + consent passthrough, error-code messages.
