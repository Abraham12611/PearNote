# Adaptive runtime — typed contract (issue #29)

**Owner:** Engineer 1 · **Module:** `src/pearnotes/learning-engine/` ·
**Tests:** `tests/learning-engine/` · **Date:** 2026-10-29

Pure TypeScript learning-state/remediation engine. No Convex imports, no DOM,
no model calls, no wall clock — same inputs → same outputs, auditable at
every step.

## Boundary map

| Consumer | Consumes | Via |
|---|---|---|
| Engineer 4 (Convex + AI) | `LearningEnginePort`, `ValidatedActivityTemplate`, `validateTemplateChoice`, `evaluateObjectives` | `adapter.ts` |
| Engineer 2 (shell) | `JourneyState`, `RemediationProposal`, `ObjectiveMastery` | `journey.ts`, `types.ts` |
| Engineer 3 (widgets) | `ActivitySpec` (closed union), proposal ghost display | `types.ts` |

## Evidence contract (`ObjectiveEvidence`)

Backend-supplied only. Engine rejects: malformed records, unevaluated
submissions, duplicate `attemptId`s, wrong-user records when scoped, and any
record carrying client-assertable keys (`xp`, `xpAward`, `adminOverride`,
`forceMastery`, `trust`, …) — see `UNTRUSTED_CLAIM_KEYS`.

```ts
interface ObjectiveEvidence {
  attemptId; userId; objectiveId; activityId; activityRevision;
  actionKind: "classification"|"choice"|"text"|"teachBack";
  verdict: "correct"|"partial"|"incorrect"|"needs_review";
  score?: number;          // 0..1 rubric when graded
  hintsUsed?: number;
  sourceSegmentIds: string[]; // activity's own grounding, backend-verified
  lessonId: LessonId; evaluatedAt: number;
}
```

## Policy (conservative, documented — `DEFAULT_POLICY`)

- **R1 trigger:** ≥2 *distinct* attempts with `incorrect` on one objective →
  `suspected_gap` → one `RemediationProposal`. Same attemptId double-submit
  never counts twice.
- **R2 trigger (secondary):** ≥1 `incorrect` + `teachBack` scored below
  `0.5` → same outcome.
- **Abstain, never infer:** `needs_review` evidence, missing authorized
  citations, already-proposed trigger sets, or demonstrated objectives.
- **Mastery:** `not_started → learning → practicing → demonstrated`.
  `demonstrated` needs correct verdicts on **2 distinct activities** —
  a single easy correct never suffices. A later `incorrect` demotes
  `demonstrated → practicing` (no permanent immunity).
- **Error categories** are structural only (`repeated_incorrect`,
  `specific_distractor`, `partial_understanding`, `hint_dependent`,
  `unclassified`). Semantic misconception labels require a model/rubric —
  the engine emits `unclassified` rather than inventing one.

## Proposal contract (`RemediationProposal`)

Typed spec from the closed `ActivitySpec` union
(`lessonCard | multipleChoice | shortAnswer | teachBack`), citations taken as
the intersection of activity grounding ∩ `authorizedSegmentIds`, human-readable
`reason`, `priority`, deterministic `proposalId`, and
`requiresLearnerConsent: true` — always. `pending → accepted | rejected`;
only the owning learner may consent (`decideProposal` rejects
`not_learner`/`not_pending`). Rejected proposals are terminal for that
trigger set.

## Journey contract (`projectJourney`)

Returns `JourneyState{ nodes, masteryByObjective, recommendedNodeId }`:
core nodes in authored order (`locked → available → in_progress → completed`),
pending proposals as `proposed` ghosts, accepted as `remediation` branch nodes,
rejected as `declined` (audit-visible). The recommendation advances only from
evidence-derived completion — never from clicks or views.

## Adapter seam (Engineer 4)

`LearningEnginePort`: `loadEvidence`, `loadAuthorizedSegments`,
`persistAttempt`, `persistMastery`, `persistProposal`, `loadProposals`,
optional `selectRemediationTemplate` — a model may **choose one allowlisted
template**; `validateTemplateChoice` re-checks objective allowlist + segment
authorization before it can reach a proposal. `evaluateObjectives` runs the
whole loop against a port.

## Explicitly out of scope

Persistence (E4), UI (E2/E3), live model calls (E4/Muse), XP economy,
spaced-repetition scheduling (Phase 2+). The engine issues **no writes** —
only typed outcomes for the adapter to persist.

## Verification

`npm test` → `tests/learning-engine/` (28 assertions: trigger/abstention,
mastery transitions, consent guards, untrusted intake, journey projection,
determinism, full demo transcript). See PR body for actual output.
