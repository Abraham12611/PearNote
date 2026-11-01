# Account / Session Contract — learning backend (Assignment E4)

Audience: Engineer 1 (router/shell), Engineer 2 (ingestion + lesson UI),
anyone else wiring a client to the Convex learning backend. This is the
account-side of `DATA_AUTH.md` — read them together.

## 1. Who the caller is

Identity is Convex Auth. Server code calls `getAuthUserId(ctx)` and gets the
`users` row id — **never** a client-supplied `userId`/`ownerId` argument
(none exists in any public learning API signature).

| Kind | How it's created | `users.isAnonymous` | Persists? |
|---|---|---|---|
| **Anonymous guest** | silent `Anonymous` provider sign-in on first load | `true` | Yes — a real, durable `users` row. Subjects, sources, attempts and mastery written under it are **real production learner data**, scoped to that guest. |
| **Registered** | `EmailOtp` join, or `Google` when provisioned | absent / `undefined` | Same row — join *upgrades* the guest's own row (`createOrUpdateUser` in `convex/auth.ts` patches the email onto the existing id, so all prior guest data survives). |

Distinguish them client-side with **`api.auth.currentUser`** →
`{ userId, isAnonymous, name?, email?, color?, emoji?, image? } | null`.
`isAnonymous === true` is the only reliable guest discriminator — do not
infer "demo" from a missing name/email.

## 2. Which providers actually work

| Provider | Status |
|---|---|
| `Anonymous` | Always live. The whole product walks through it. |
| `EmailOtp` | Always live (the "join" path). |
| `Google` | Live **only** when `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` are set on the deployment. Query **`api.auth.signInOptions`** → `{ google: boolean }` before rendering the button. |
| Passkey / password | **Does not exist.** `@convex-dev/auth@0.0.95` ships no WebAuthn provider; email+password is deliberately never offered (`docs/data-model-plan.md` §1). |

There is no login wall for learning. Anonymous and registered callers get
identical treatment: every learning row is owned by the `users` id, and
ownership — not registration — gates every read and write.

## 3. Public demo vs production learner data

- **`?fixtures=1`** (or `#…&fixtures=1`) is the only supported demo surface.
  It loads labelled client-side fixture modules (`ui/fixtures.ts`) and calls
  **zero learning mutations** — nothing reaches the database. This is the
  correct choice for a public demo.
- A "demo account" on the production deployment is just an anonymous guest:
  writes it makes are real rows (`isAnonymous: true` owner). Do **not** run
  scripted demos against production learner tables — use `?fixtures=1`, or a
  dedicated demo/dev deployment if live writes must be shown.
- Never seed or fake subjects server-side. A fresh account's
  `subjects.listMine` returns `[]`; the honest empty desk is a feature.

## 4. URL/route selection never grants authorization

- No learning API takes a room slug, space id, or owner id. A route like
  `#/subject/<id>` only selects *which* owned row to ask for — the backend
  re-verifies `ownerId`/`userId` against `ctx.auth` on every call.
- Reads fail closed: not-owner is indistinguishable from not-found
  (`null` / `[]`); writes throw `ConvexError { code: "UNAUTHORIZED" }`.
- `lessons.canvasSpaceId` may reference a shared `spaces` row, but no
  canvas/room membership can ever unlock learning data — the chains
  (`lesson→unit→section→version→subject.ownerId`, `segment→source.ownerId`)
  are the only paths.

## 5. Function surface (Phase 00/01, owner-scoped)

| Function | Kind | Notes |
|---|---|---|
| `subjects.listMine / get / createManual / rename / setStatus` | q/m | `createManual` births `manual_empty` — never seeds content. |
| `sources.createUploadUrl / register / listMine / get / listSegments / getSegment / remove` | m/q | `register` verifies checksum/size against the `_storage` row; `get` mints a short-lived URL for the owner only. |
| `learningImport.begin / getStatus / getProposal / authorizeModelCall` | m/q | `begin` idempotent per (owner, source, key). Paid model calls require `PDF_MODEL_AUTHORIZED` **and** per-job `authorizeModelCall`. |
| `learningReview.review` | m | The only proposal→subjects+DRAFT path. Optimistic `expectedProposalRevision`; whitelisted edits; strict per-subject segment boundaries. |
| `curricula.getPath` | q | Latest eligible version tree. Each lesson carries `activityCount` and `progress` (below). |
| `learningRuntime.getLesson` | q | Activities (answer keys stripped), `sourceRefs`, and `objectives[] { _id, statement, mastery, evidenceCount }`. |
| `learningRuntime.getLessonSegments` | q | Lesson-approved segment text for review/attestation UI, owner only. |
| `learningRuntime.submitAttempt` | m | `attemptKey` idempotent; revision-pinned; returns `{ attemptId, verdict, masteryUpdated, marks? }` — `marks` = per-item `{itemId, correct}` for classify, absent for `needs_review`, never reveals the right bucket. |
| `learningRuntime.listPractice / reviewPractice` | q/m | Ghost practice consent. Repeat `accept` replays the stored `activityId`. |
| `learningRuntime.attestClassificationFacts` | m | Owner attests their own lesson's fact→bucket→segment bindings; schedules materialization. Sanity checks reject contradicted/out-of-scope segments. |

## 6. Error contract

`ConvexError { code, message }` — codes: `UNAUTHORIZED`, `INVALID_INPUT`,
`INVALID_STATE`, `CONFLICT`, `NEEDS_REVIEW`, `UNSUPPORTED_SOURCE`. Branch on
`code`, never message text.

## 7. Progress semantics (Issue #53)

`curricula.getPath` per-lesson `progress`:

| Field | Meaning |
|---|---|
| `tracked` | `false` when the lesson has no objectives → state is `"untracked"`. Render as "untracked/pending" — never as "not started" and never as "complete". |
| `state` | `"untracked" \| "not_started" \| "learning" \| "practicing" \| "demonstrated"` — derived only from server evidence: `not_started` = tracked, zero evidence; `learning` = evaluated evidence exists; `practicing` = an objective is in remedial practice; `demonstrated` = **every** tracked objective demonstrated. |
| `assessedObjectives` / `totalObjectives` | How many objectives have mastery rows vs. how many exist. |
| `evaluatedAttempts` | Count of this lesson's graded attempts. |

`learningRuntime.getLesson.objectives[]` supplies statements +
`{ mastery, evidenceCount }` for the lesson compass. `objectives: []` is the
honest "no tracked objectives" state — render it, don't fabricate coverage.
