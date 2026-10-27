# Complete widget catalog and disposition matrix

**Reference:** original widget catalog documented in OurSpaces `docs/spaces-and-widgets.md`, `src/widgets/core.tsx`, `extras.tsx`, `buildroom.tsx`, and `src/data/types.ts`. Some newer `game`/`standings` types have prototype states. Verify at pinned commit.

## Current feature disposition

| Widget/type | Status in PearNotes | Context/use |
|---|---|---|
| `frame` | **Keep** | lesson zones, unit boards, group sections |
| `sticker` | **Keep** | identity, decoration, achievement pins |
| `note` | **Keep** | personal notes, kept explanations, sources |
| `media` | **Keep** | images/video players where source allowed |
| `chat` | **Keep** | room conversation; personal AI separate |
| `photoWall` | **Keep** | diagram and resource image collection |
| `linkCard` / `linkShelf` | **Keep** | references and curated source shelves |
| `messageWall` / `quote` | **Keep** | pinned discussion/definitions |
| `poll` | **Adapt** | simple quiz, peer opinion poll; answers vs votes distinguished |
| `dailyQ` | **Adapt** | daily recall/reflective question |
| `countdown` | **Adapt** | exam date, study/pomodoro timer (separate clock semantics) |
| `potluck` | **Adapt** | assign group tasks, commitment checklist |
| `rsvp` / `availability` | **Adapt** | study session planning |
| `decision` / `wheel` | **Adapt** | group consensus/random challenge |
| `itinerary` | **Adapt** | study plan/project timeline |
| `cozyColor` | **Adapt** | diagram regions / cooperative labeling with correctness layer |
| `linkPile` / `hotLinks` | **Adapt** | research queue and key resources |
| `roundtable` | **Adapt** | focused group discussion |
| `shipPost` | **Adapt** | project evidence / progress update |
| `letter` | **Later adapt** | future-self reflection/teacher note |
| `checkIn` / `standings` | **Review prototype** | practice logs/leagues if live-ready |
| `playlist` / `dualClock` | **Optional** | focus music/international groups |
| `weather`, `sports`, `expenseSplit`, `jokeRegistry` | **Hide from students** | no first-party study function |
| `backendLive`, game/scoreboard/jigsaw/keepsake variants | **Dev flag or future audit** | no uncontrolled direct exposure |

## New education widgets (Phase 1: exactly four)

### `lessonCard`

**Purpose:** concise grounded explanation and optional example. **Data:** title, body blocks, objectiveIds, sourceRefs, relatedConceptIds. **Interaction:** expand in readable focused view, highlight/copy notes, ask Tutor about selected part, navigate citation. **State:** informational; opening does not award mastery/XP.

### `sourceViewer`

**Purpose:** navigate to literal supporting source. **Data:** sourceId, segmentIds, page/timestamp, excerpt metadata. **Interaction:** open original page or passage, highlight, go back. **State:** viewport/bookmark; cannot claim unsupported sources. **Access:** owner or explicitly shared segment.

### `challenge`

**Purpose:** assessed practice. **Data:** objectiveId(s), prompt, challengeKind, choices/expected response or grading rubric, permitted hints, sourceRefs, difficulty. **Interaction:** answer → submit → immediate or queued evaluation → explanation → retry. **State:** server records per-student attempts; group challenge surface doesn't show peer answers automatically.

### `teachBack`

**Purpose:** learner explains the concept independently. **Data:** objective IDs, prompt, rubric criteria, minimum acceptable evidence, sources. **Interaction:** type an explanation; AI gives structured feedback, missing parts and follow-up. **State:** rubric outcome with uncertainty; no blanket passing score from a fluent response alone.

## Phase 2 education widgets

Recall Deck, Matching, Fill-the-blank, Sequence Builder, Concept Map, Worked Example, Formula Sheet, Timeline, Comparison Board, Essay Practice, Exam Paper. Each must define deterministic or calibrated grading, source linkage and keyboard-friendly interactions.

## Phase 6 specialized widgets

Interactive Diagram with SAM/object selection where helpful; Graph & Equation Explorer; Physics Simulator; Chemistry Model; Anatomy Labeler; Audio Pronunciation/Oral Exam; Coding Exercise/Debugger; Historical Map/Timeline; research evidence mapper. Different subjects choose a suitable bundle rather than every lesson receiving the same generic card set.

## Widget picker policy

Context-aware categories: `Learn`, `Practice`, `Explore`, `Organize`, `Collaborate`, `Decorate`. A private lesson picker shows appropriate study widgets; a General HQ shows organization and group widgets. Preserve compact quick-picks + full search/filter catalog + drawn miniature previews, per OurSpaces conventions.

## Rendering and storage rules

A widget's x/y/w/h/z/rotation are separate from activity grading. Generated widgets carry `origin=ai`, sourceRefs and generation version. Personal positions and authored notes persist independently of published curriculum content. Data mutations are authorized and validated on backend. Deleting a widget never silently deletes attempt history.
