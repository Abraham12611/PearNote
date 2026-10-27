# Lesson Space runtime, continuous learning, and session lifecycle

## The central design

**Learning Path = navigation. Lesson Canvas = experience. Learning State = evidence.** One learner may follow Guided mode or freely explore the same board; both update the same underlying attempt and mastery records.

## First entry

1. Authorize user+lesson and load published `LessonSpec`, authorized source excerpts, existing attempt summaries, widget layout and session state.
2. Start camera at lesson entrance frame, not arbitrary `(0,0)`; show objective in fixed Lesson Compass.
3. Render source excerpt, explanation, assessment and teach-back objects with curated placement. These are prebuilt React components fed validated AI data.
4. Default Guided mode pans/focuses to next recommended activity but never disables exploration.
5. Student chooses activities; interactive controls must not unintentionally trigger dragging.

## Activity states

`not_started → started → submitted → evaluated`; optional `needs_retry` or `review_due`. For hints, store type and count. Assessments use server-evaluated responses; open-ended answers can have uncertainty and human-review escalation later. Only assessed evidence changes mastery; clicking a lesson card does not.

## Mastery and continuity

- Objective state: `not_started`, `learning`, `practicing`, `demonstrated`. `Demonstrated` requires defined evidence/rubric. Retention is separately measured over time.
- Record immutable attempts, then update a derived per-user objective projection.
- Distinguish `lesson completed` (required activities done) from `objective demonstrated` (quality threshold met).
- Preserve session camera, active widget, notes and last interaction timestamp for Resume.
- On path reentry, reflect changes through reactive subscriptions.

## Adaptive practice loop (Phase 1 narrow slice)

1. One wrong answer only triggers targeted feedback/hint.
2. Multiple related wrong attempts or failed teach-back produce `suspected_gap` evidence.
3. Rule+model pipeline proposes a **single** practice widget on one prerequisite topic.
4. Validate concept, source refs, activity schema and correct answer; store a pending proposal.
5. Place a ghost in open practice zone with `Accept`/`Not now` and reason; do not move student objects.
6. If accepted, create typed widget + activity relation; persist independently of generic lesson spec.
7. On correct follow-up, record `improved evidence`; if mastery threshold met, update state. Link remediation as a path-side branch if appropriate.
8. Repeated failure escalates to alternate explanation and optional human help, never punishes with XP debt.

## Guided and Explore mode

| Dimension | Guided | Explore |
|---|---|---|
| Camera | focuses next suggested objective | freely pan/zoom |
| Compass | visible step / next action | compact objective summary |
| Editing | source objects mostly anchored, personal note movable | personal notes freely arranged |
| Activity order | recommended sequence | non-linear order where prerequisites allow |
| Progress | same attempt store | same attempt store |
| Rejoin | resume step and camera | resume last camera and selected object |

## Lesson completion UX

A light-weight paper slip summarizes objectives assessed, concepts to revisit, XP earned if eligible, and next recommended unit. Offer `Back to path`, `Keep exploring`, `Review mistakes`. No claim that one session proves long-term retention.

## Versioning

When lesson content changes, preserve completed attempts against `activityRevision` and prompt user to accept substantial updates. Recalculate only affected derived mastery when objective/rubric semantics change with a documented migration.

## Failure semantics

Network disconnect: preserve local input until server ack. Tutor outage: lesson and deterministic exercises still usable. Invalid generated activity: do not render; show safe fallback explanation and repair job. Inaccessible source: flag absent citation rather than generating a fake quote.
