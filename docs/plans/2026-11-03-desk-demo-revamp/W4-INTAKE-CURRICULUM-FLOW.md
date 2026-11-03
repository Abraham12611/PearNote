# W4 — The real subject-creation → upload → AI path/lesson/practice flow

## What already exists (verified @ develop — do NOT rebuild)

`upload → sources.register (sha-verified) → learningImport.begin →
ingestMeta.runJob → pdfExtractionNode (real pdf.js) / text split →
recordSegments → gated Meta call (MODEL_API_KEY + PDF_MODEL_AUTHORIZED
set on dev) → metaProposal parse+citation+evidence validation →
IntakeReview UI → learningReview.review (atomic materialization:
subjects, subjectSources, concepts, objectives, sections/units/lessons,
draft curriculumVersion) → curricula.getPath → learningRuntime
(getLesson / submitAttempt / practiceProposals / mastery).`

## Gaps to close in this workstream

1. **Publish flow** — approved curricula sit at `state:"draft"` forever.
   Add `curricula.publish` (owner, validates tree integrity + every
   lesson's sourceRefs ⊆ approved segments) and a "publish path" step in
   the review/drawer UI; `getPath` prefers latest `published`, falls
   back to `draft` while unreviewed.
2. **Lesson/activity generation** — today only the hardcoded
   `CELLS_CLASSIFY` template can materialize a scored activity. Add
   `internal.ingestMeta.generateActivities` action: per lesson, Meta
   produces a *typed* activity set (lessonCard, multipleChoice,
   shortAnswer, classify, teachBack) with objectives + segment
   citations; validate with the same citation/evidence gates
   (cited ⊆ stored segments; quotes verbatim; answer keys server-only);
   write `activities` rows; surface in the drawer preview. User-visible
   state machine on subjects: `needs_material → generating →
   needs_review → ready`.
3. **Practice questions** — `practiceProposals.spec` from the same
   generator (triggered by ≥2 incorrect attempts today), replacing the
   one-off template path; attestation flow stays.
4. **Resume point** — derive `ResumePoint` (last lesson with attempts,
   in-progress unit) from attempts/mastery in `desk.get`/`LiveDataBridge`
   (currently hardcoded null).
5. **End-to-end verification on dev** — real PDF → proposals →
   approve → published path → lesson activities → attempt → mastery →
   XP/activity events → resume on desk. Record honest log/cost notes in
   the PR (Meta calls credited on the dev deployment only).

Non-goals: OCR (honest "scanned PDFs not supported yet"), multi-doc
merge UX beyond existing review, any client-trusted scoring.

## Acceptance

- New account: create subject (empty) → upload PDF → see extraction
  progress → review AI proposal → approve → path drawer shows authored
  sections/units/lessons with status → open lesson → generated
  activities render + score → wrong×2 proposes practice → resume card
  on desk. All on live dev backend, no fixtures.
- Adversarial: proposal citations rejected when not in segments; two
  users' imports isolated; idempotent re-upload doesn't duplicate.
- If Meta credentials fail on dev, the PR reports the failure honestly
  with the parked `awaiting_model` state — never a silent fixture.

Owned paths: `convex/curricula.ts`, `convex/learningImport.ts`,
`convex/ingestMeta.ts`, `convex/metaProposal.ts`,
`convex/learningRuntime.ts`, `convex/learningReview.ts`,
`convex/desk.ts`, `src/pearnotes/ingestion/*`,
`src/pearnotes/ui/LearningPathDrawer.tsx` (publish affordance),
`src/pearnotes/shell/data.ts`, tests.
