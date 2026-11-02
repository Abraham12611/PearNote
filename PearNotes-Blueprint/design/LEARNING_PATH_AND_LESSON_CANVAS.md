# Learn → Subject → Path → Lesson — spatial UX and runtime adaptation

**Status:** owner-directed normative design, 2026-11-02. **See:** `OURSPACES_FIDELITY_CONTRACT.md`, `SCREEN_BY_SCREEN_REDESIGN.md`, `../learning/LESSON_RUNTIME.md`, `../learning/WIDGETS.md`. A right-side learning path is navigation; the full OurSpaces-style canvas is the lesson experience; server evidence is assessment truth.

## A. End-to-end information and navigation model

Flow: Home original-dock Learn → inherited `pick a subject` modal → selected subject illustrated circle → Enter path → right-hand **learning path drawer** → select lesson node/preview → open whole room-style lesson canvas → read source → interact with challenge → teach back → record evidence/consent to practice → return path and Home.

**Routes:** `/app/learn`; `/app/subjects/:subjectId`; `/app/subjects/:subjectId/sources`; `/app/subjects/:subjectId/lessons/:lessonId`. Under `/demo`, preserve route identity with `demoMode` and `?fixtures=1` for sample content; never enable live reads/writes by a URL flag alone. Route IDs for fixtures are human prototype IDs, not Convex database IDs.

**Preserved context:** subject id, selected section/unit/node, drawer scrollY, camera and focused widget, navigation entry origin, user/session id, content version, mode Guided/Explore, privacy scope. Browser Back from lesson restores drawer + node without resetting Home; Escape closes focused lesson object before exiting entire lesson.

## B. Learn subject selector

**Ancestor:** original OurSpaces modal and circular avatar picker. Body has easy-to-scan subject discs, name and source status, a dashed circle + for new subject; at first launch only + and "your first subject starts with a source". Add blank subject manually or upload material first, without assuming user wants AI splitting. Never seed Biology as account data. The selected subject gets native lime ring/lift, "Enter learning path" pill; keyboard arrows, Tab, Escape and touch usable.

**Per-subject state distinctions:** `ready` (approved path exists), `needs_material`, `intake_running` (show extraction step), `proposal_pending` (ask learner to review), `failed` (retry), `untracked` (source exists but no objectives), `no_access` (not yours), `deleted` (safe recovery). Do not conflate a data loader's undefined with an empty path. If user asks to "Learn" a subject with no path, remain in the familiar right drawer and offer create/upload/review rather than a blank panel.

**Subject discs:** original avatar style but distinct learning icons for science, mathematics, chemistry etc; assignment automatically suggested from name/type, editable by student, persisted. No used or guessed subject artwork when there is no actual subject.

## C. Right-hand learning drawer

**Visual:** inherit the same physical edge and dark board/paper materials as the improved existing `JourneyDrawer.tsx`, and coordinate with original OurSpaces panel controls. Desktop width 50–55vw, minimum 420px and max appropriate to viewport; from right over dimmed readable Home, focus trap, clear close/back, clipped scrolling inside. Tablet can use ~65vw; mobile full-screen sheet with sticky heading and primary CTA.

**Header:** subject illustrated disc, name, approved source count, verified current status, sections/units; compact Edit subject / Add material / Library / Back. Avoid fake social "4 friends studying" for genuine users; show face group only when real membership opt-in or marked sample in demo. Never show unearned completed lessons based on static index.

**Unit presentation:** distinct cream paper chapter bands and winding path with SVG/CSS nodes, small die-cut sticker illustrations, accessible connecting line, lesson labels. Node statuses must be semantic and colored+shape-labeled: blocked by prerequisite, not_started, learning, practicing, demonstrated, needs_review; lesson completion is separate from mastery. Current node bright lime with animation, completed node mint with check, locked node visibly inaccessible and reason, review node pink/dotted. Branching practice uses small leaf pathway anchored to the concept, never behind an invisible arrow.

**Node card/preview:** one title, objective statement(s), evaluated attempt count, number of source citations, estimated activity count/duration as genuine spec not arbitrary number, progress meaning, start/resume/review CTA. If source unavailable, say "source missing" and prevent falsely grounded scored interaction. No one-card-per-subject assumption; each approved lesson has own id, revision, sourceRefs and progress.

**Manage curriculum:** edit mode is not inline text on a generated JSX node. Offer Rename/reorder/merge/split/revise proposal as a native overlay; show current approved version and proposed changes side-by-side; confirm before changing; preserve attempt history and citation version. A subject can have multiple sections, units and lessons; remote data is the authority.

**Explicit empty drawer state:** warm cream with readable **ink text**, a deliberately illustrated pinned "nothing here *yet*" slip, visible Back, Add source, Review proposal or Create first objective CTA according to state. Error has source error code and Retry. The screenshot of nearly invisible white text on cream is a **P0 contrast failure**. No blank white full drawer and no loading forever if a path will never exist.

## D. Fixture consistency — the reported second-subject bug

The current prototype source `src/pearnotes/ui/fixtures.ts` includes three visible sample subjects but only one `FIXTURE_PATH` and one `FIXTURE_LESSON`. `src/pearnotes/shell/data.ts`'s `pathFor(id)` returns the same single path only if its subjectId matches. Selecting Linear Algebra or Organic Chemistry can therefore produce a blank path while Cell Biology appears complete. This is a *fixture model mismatch*, not proof those other subjects have data.

**Specification to correct:**
- Use `FIXTURE_PATHS_BY_SUBJECT` keyed by fixture subject ID (and independently `FIXTURE_LESSONS_BY_ID`); build complete distinct prototype hierarchies for **Cell Biology, Linear Algebra and Organic Chemistry**, with lesson IDs, source references explicitly marked synthetic, node states and initial/locked/review examples.
- Every selectable fixture disc must resolve one of: (a) an authored sample subject path with at least one openable sample lesson; (b) an explicitly designed unavailable-in-demo state **if removed from sample subject list**. The chosen policy is (a) for all three displayed subjects; no invisible empty fallback.
- Demo Biology examples: membrane structure, diffusion/osmosis, active transport and ATP, source excerpt, classification challenge, teach-back. Algebra examples: expressions, linear equations, inequalities, slope/graphs, word problems; chemistry examples: bonding/functional groups, naming, isomerism, reaction types and spectroscopic evidence. **These are demo-only educational examples** until source-approved live data exists.
- Demo cards and social progress must say SAMPLE / prototype fixture; do not confuse sample passages with real uploaded citations. Each fixture-specific path and lesson has its own state, not global `FIXTURE_PATH`.
- Deep-link per subject/lesson, refresh and switch Biology → Algebra → Chemistry → Biology. Verify no stale node selection, current unit, lesson title, progress or scroll contamination; no "undefined" or pale blank area.
- Real owners with no source must show designed empty state; DO NOT populate a real account's missing path using Biology fixture or generic AI output.

### Fixture test matrix

| Scenario | Expected |
|---|---|
| `/demo?fixtures=1` | labelled Demo, sample subjects, no real account reads |
| Learn → Cell Biology | path and at least one sample lesson; no false live progress |
| Learn → Linear Algebra | different populated authored path and openable sample lesson |
| Learn → Organic Chemistry | different populated authored path and openable sample lesson |
| Switch rapidly between three | only selected subject's path visible |
| Direct link to valid sample lesson | opens proper room canvas, sample activities |
| Direct link to invalid sample lesson | recoverable "sample lesson not found", not infinite spinner |
| Genuine `/app` with `?fixtures=1` in production | no demo fixture injection |
| Genuine manually created subject with zero sources | intentional no-path slip, upload CTA |
| Foreign subject or lesson id | identical safe denied/not-found behavior, no information leak |

## E. The lesson space MUST BE an adapted OurSpaces room

The student's reported issue is not merely missing styling. The current PearNotes shell uses a stripped/empty canvas and detached learning components; that is not enough. **Re-host learning inside the original room runtime** instead of simulating a room with a visually unrelated page.

**Required native elements kept:**
- **Top-left breadcrumb:** same OurSpaces placement and black pill mechanics, e.g. Home / Cell Biology / Unit 1 / Diffusion and osmosis. Back goes to previous path node and position, not arbitrary Home.
- **Bottom-left activities list pill:** same existing placement and look. It opens list of this lesson's objects (source, cards, notes, challenge, teach-back), progress and jump-to-object; retains native selection, reorder/pin rules per permission.
- **Canvas/viewport:** original pan/zoom, drag/select/resize/stack, anchored world coordinates, native widget hover, focus and edit controls. Preserve background art and sense of a genuine room; do not create a static grid of cards.
- **Original widget family:** notes, paper cards, images, polls/checklists, threads and media as appropriate; education widgets extend WidgetCard shell.
- **Top-right presence/control pill:** genuine own avatar and joined peers **only** when studying in a shared authorized room; personal lesson shows self/session status, no fabricated members.
- **Native action dock:** Add a note, insert allowed widget, show sources, ask Pear Tutor, focus next activity; property menu and permissions mimic native space.
- **Sync banner:** truthfully shows saved/pending/reconnecting/offline; demo shows "sample only" rather than "live".
- **Room identity:** subject accent, source-based widgets, personal user identity/cursor and contextual name; never the old crew party photos as lesson content.

### World template and camera

Use an original room world with bounded readable anchor zones rather than blank 1600×1200 stage:
1. Welcome/briefing: source-grounded objective card and lesson map; an illustrated pin/title.
2. Source table: actual source excerpts, page links, citations and optional page images.
3. Explain/concept: lesson card, diagrams, examples strictly sourced or labelled illustrative.
4. Practice: challenge card(s) and classification/recall widget, focus controls.
5. Teach back/reflect: editable note and text/voice later, server evaluation only where supported.
6. Remediation corner: proposed "try this" ghost sticker only after evidence and explicit consent.
7. Personal scratch zone: user-owned movable papers, highlights, reminders.

Camera begins at welcome anchor and adjusts to user-chosen Guided/Explore; no widget lives beneath fixed dock/overflow mask. On mobile, offer an alternate linear lesson activity list with same data and submissions; preserve progress if switching layouts.

## F. Detailed four educational widget extensions

Every new education widget MUST use inherited `WidgetCard` frame behavior: material, border, shadow, control handles, drag regions, focus, aria labels, safe input focus and persistence. Schema-validated data only; no AI-invented React components.

### Lesson Card
- Header with lesson index, objective, subject sticker, source-approved citation count, optional illustrated diagram.
- "Open source" provenance affordance; never AI claims with no segment.
- Reading/finished reading **not** evidence of mastered concept; progress from attempts only.
- Focus mode shows full text while camera and personal annotation are preserved.

### Source Viewer
- Native source card displays title, doc type, page number, excerpt, citation ID and highlight link, read-only original content.
- Click goes to accessible PDF/text page anchored to segment; missing/deleted source shows transparent unavailable state, not a fictional quote.
- Owner permissions checked on server; group room sees only explicitly shared source segment copies or permitted refs.

### Challenge Card (including classification)
- Styled as native original interactive choice/poll/checklist widget; options with large hit areas and clear selected/unselected/disabled/focus states.
- Submit sends revision + attemptKey + response; optimistic pending not counted as mastery; evaluation response may be correct/partial/incorrect/needs_review.
- Wrong per-item marks never disclose correct bucket; explain mistakes with citations where safe; prevent duplicate XP on retries.
- On two related wrong attempts, possible practice proposal appears (not auto inserted), with citation and "why you're seeing this".
- Keyboard and screen-reader sorting alternatives for draggable classification; touch handles separate from canvas pan.

### Teach-Back
- Native editable paper note or thread with prompt and source preview; user types or later records verbal explanation if supported.
- Distinguish "saved draft", "submitted" and "evaluated" explicitly; do not invent open-ended LLM grading when unavailable.
- Retain text across navigation/reconnect, limit PII exposure and respect group/private sharing toggle.

## G. Practice, tutor and mastery

- Pear Tutor opens via original contextual action pill at lower action dock; show current lesson, object and sources; requests need approved cost/model permission when applicable. AI cannot modify board without preview and confirmation.
- Repeated wrong attempts can propose a ghost **practice** widget with source-linked reason. Accept/Not now/Review source. Proposal untrusted until attested and user accepts.
- Actual learning progress values originate from owner-scoped server state (objectives attempted, evaluated, demonstrated, lesson completion); never derive purely from showing "2 of 5" fixture cards or clicking node.
- Return to subject path highlights appropriate lesson and practice branch; reward animation only after a server-issued achievement.

## H. Lesson behavior matrix

| State | Required view/action |
|---|---|
| No approved lesson version | readable warm-paper "lesson isn't ready", check sources/back, no empty stage |
| Loading | native staged card/skeleton + cancel/back; never render previous student's data |
| Missing source ref | source citation broken; disable scored claim if unsupported |
| Source parsing partial | show actual extracted excerpts only; offer retry/review |
| Ready | full spatial lesson with widgets, breadcrumb, activities pill, source access |
| Challenge awaiting response | focus, large choices, no fake completion |
| Attempt pending | blocking duplicate submission UI + durable attemptKey |
| Needs review | explicit "not graded", no leaked marks |
| Practice proposed | translucent ghost sticker + accept/reject controls |
| Offline | local draft stays, server result unknown, retry/back, no premature mastery |
| Source/curriculum revised | clear version badge; historical attempts remain |
| Permission denied | native safe slip and back; no leaked lesson title/data |
| Demo | fixed persona, labelled samples, local interactions only, no auth or real scoring |
| Group lesson | proper authorized presence/cursors and shared vs private object scope |

## I. Exact acceptance cases

1. With no sources, a real new user never sees prebuilt lessons.
2. Open each of the three sample subjects; inspect independently nonempty paths and one valid lesson per path.
3. Open/close right drawer via mouse, Escape and browser back; focus returns, scroll and selection preserved.
4. At 1440 and 390: no white-on-cream unreadable text or clipped fixed pill.
5. Enter lesson from node; original-style breadcrumb **and** activities-list pill visible, responsive and functional.
6. Pan/zoom, focus/drag a note, type in challenge without dragging canvas, jump from activities pill and return camera.
7. Reconnect while editing; no lost draft or fictitious graded success.
8. Propose practice after evidenced mistakes; no false mastery, answer-key leak or unapproved mutation.
9. Two real accounts cannot see each other's source, attempt, lesson or cursor except explicitly shared room presence.
10. Confirm all new widget controls and paper designs match original OurSpaces visual screenshot pairs.

**Reference source files:** `src/pages/LiveSpace.tsx`, `src/components/Canvas.tsx`, `src/components/WidgetCard.tsx`, `src/components/Rail.tsx`, `src/pearnotes/learning-widgets/*`, `src/pearnotes/ui/LearningPathDrawer.tsx`, `src/pearnotes/ui/fixtures.ts`, `src/pearnotes/shell/data.ts`.
