# Phase 00 — Learning-domain data model and authorization foundations

**Owner:** Engineer 4 (issue #6 / P00.4) · **Date:** 2026-10-28 ·
**Specs:** `PearNotes-Blueprint/engineering/{DATA_MODEL,PERMISSIONS,API_CONTRACTS,STATE_AND_EVENTS,ARCHITECTURE}.md`, `learning/INGESTION.md`, `delivery/SECURITY_PRIVACY.md`.

**Deployment status:** `not deployed / blocked on P00.1B`. All code is
additive and typechecks locally; nothing was pushed to any Convex deployment —
the only configured deployment values in this repo still point at the
inherited upstream backend (`necessary-cobra-892`), which must not receive
PearNotes functions.

## 1. What was added

| Path | Contents |
|---|---|
| `convex/tables/learning.ts` | 13 additive table definitions (validators + indexes) |
| `convex/learningAuth.ts` | Centralized identity + ownership assertions |
| `convex/subjects.ts` | `listMine`, `get`, `createManual`, `rename`, `setStatus` |
| `convex/sources.ts` | `createUploadUrl`, `register`, `listMine`, `get`, `listSegments`, `getSegment`, `remove` |
| `convex/schema.ts` | Additive table wiring only — no existing table touched |
| `tests/learning.privacy.test.ts` | 14 adversarial + functional tests (convex-test + vitest) |
| `package.json` | `test` script; devDeps `convex-test@0.0.63`, `vitest@5.0.5` |

No edits to `convex/auth.ts`, `convex/tables/rooms.ts`, `convex/convex.config.ts`,
`src/App.tsx`, or any deployment file. Existing room/mail/voice/game tables,
Convex Auth, guest identity continuity (`createOrUpdateUser` fold-in), and all
installed components are untouched.

## 2. Schema (additive, forward-compatible)

All 13 issue-required tables are defined. Field/index detail lives in
`convex/tables/learning.ts` doc comments; highlights:

- `subjects` — `ownerId: v.id("users")`, `status` (`manual_empty|draft|active|archived`), `by_owner`.
- `sources` — `ownerId`, `storageId: v.id("_storage")`, `mime`, `sizeBytes`, `sha256`, `status` (`uploaded|parsing|indexed|failed|deleted`); `by_owner`, `by_owner_sha` (dedupe), `by_storage` (claim check).
- `sourceSegments` — `sourceId`, `segmentNo`, `page?`, `text`, `kind?`, `quoteStart/End?`; `by_source`, `by_source_number`.
- `subjectSources` — many-to-many link with `segmentIds[]` (empty = whole source) and `origin` (`manual|ai_proposal|user_edit`); `by_subject`, `by_source`, `by_subject_source`.
- `concepts`, `objectives` — `by_subject`; `sourceRefs[]` citations per the grounding contract.
- `curriculumVersions` — immutable generations, `state` (`draft|validated|published|superseded|rejected`); `by_subject`, `by_subject_state`. The "at most one published head" rule is enforced by the Phase 01 publish mutation, not the table.
- `sections`/`units`/`lessons` — ordered children via `by_version_order`, `by_section_order`, `by_unit_order`; `lessons.canvasSpaceId` points at an ordinary `spaces` row (`by_canvas_space`) — no duplicate canvas tables.
- `activities` — `spec` is a closed discriminated union (`lessonCard | multipleChoice | shortAnswer | teachBack`), never an opaque record; `revision` pins what an attempt answered; `by_lesson`.
- `attempts` — personal, immutable: `userId`, `activityId`, `activityRevision`, `response` (typed union), `evaluation?`, `state`; `by_user_activity`, `by_user_time`.
- `mastery` — one row per `(userId, objectiveId)`: `by_user_objective` (upsert key), `by_user`.

**Attempts and mastery never live in widgets** (ARCHITECTURE invariant 4) and
never reference `spaces`/`widgets` rows. Canvas records likewise must not
store learning state — `lessons.canvasSpaceId` is the only pointer, and it
points at the room, not the other way.

**Deferred (documented, not built):** `conceptLinks`, `reviewItems`,
`studySessions`, `adaptationProposals`, gamification (`xpLedger`, `streaks`,
reward tables), `groups`/`groupMembers`/`invites`, `tutorThreads`. Each needs
its Phase 01+ writer service before the table has a producer; adding empty
tables now would only invite unvalidated writes.

## 3. Authorization model

`convex/learningAuth.ts` is the single door (PERMISSIONS.md "Authorization
patterns"):

- Identity always comes from `getAuthUserId(ctx)` (Convex Auth). **No args
  shape anywhere accepts an owner/user id**, so there is nothing to forge.
- Guests (anonymous accounts) can create subjects/sources — an anonymous
  `users` row is a real persistent identity that survives the guest→join
  upgrade unchanged, per the existing `createOrUpdateUser` fold-in. Learning
  is not behind a registration wall.
- **Fail closed:** `ownedSubject`/`ownedSource`/`ownedSegment` return `null`
  for not-owner *and* not-found — a guessed id leaks neither existence nor
  ownership. Write-path variants (`requireOwned*`) throw `UNAUTHORIZED`.
- Segment text is only reachable via `ownedSegment`, which resolves
  segment → parent source → owner before any text is read.

Error codes follow API_CONTRACTS.md: `UNAUTHORIZED`, `INVALID_INPUT`,
`UNSUPPORTED_SOURCE`, delivered as `ConvexError` data payloads.

## 4. Source storage security

- Blobs live in Convex file storage; rows store only the `storageId`.
  **No persistent URL is stored or returned.** `sources.get` mints a
  short-lived URL per call, only after the owner check passes.
- `register` verifies the upload against the `_storage` system row (server-
  computed `sha256`/`size`); client-claimed values are validated, not trusted.
- MIME allowlist for Phase 1 scope: `application/pdf`, `text/plain`; size cap
  25 MB; sha must be a 64-hex string. Real content-type/magic-byte checks
  belong to the Phase 01 parser (INGESTION stage 1), which also owns the
  `parsing/indexed/failed` transitions.
- **Storage claim check:** a `storageId` bound to an existing source row can
  never be registered under a different owner — a guessed storageId yields
  `UNAUTHORIZED`, not a window onto the original uploader's bytes. Same-owner
  re-registration is idempotent (revives a `deleted` row to preserve
  segment/subject links).
- Dedupe: same owner + same server-verified sha returns the existing row
  (`deduplicated: true`) instead of a corrupt duplicate (E06).
- `remove` is a soft delete (lifecycle-compliant); blob/segment retention
  cleanup is a future scheduled job.

## 5. Function contracts (Phase 00 surface)

| Function | Args → Returns | Auth |
|---|---|---|
| `subjects.listMine` | `{}` → `SubjectSummary[]` | owner scope; `[]` signed out |
| `subjects.get` | `subjectId` → `SubjectSummary \| null` | owner only; `null` otherwise |
| `subjects.createManual` | `name, avatarId?, theme?, goal?` → `{subjectId}` | signed in; `manual_empty` status |
| `subjects.rename` | `subjectId, name` → `null` | owner only |
| `subjects.setStatus` | `subjectId, status` → `null` | owner only |
| `sources.createUploadUrl` | `{}` → `{uploadUrl}` | signed in |
| `sources.register` | `storageId, title, mime, sizeBytes, sha256` → `{sourceId, deduplicated}` | signed in + claim check |
| `sources.listMine` | `{}` → `SourceMeta[]` (no URLs) | owner scope; `[]` signed out |
| `sources.get` | `sourceId` → `SourceMeta & {url} \| null` | owner only |
| `sources.listSegments` | `sourceId` → `Segment[]` (≤500) | owner only; `[]` otherwise |
| `sources.getSegment` | `segmentId` → `Segment \| null` | parent source owner |
| `sources.remove` | `sourceId` → `null` | owner only; soft delete |

Empty subjects stay empty: nothing creates subject content except
`createManual` (learner-named) and, later, an approved import proposal.

## 6. Phase 01 interface (next steps, not implemented)

- Ingestion pipeline writers (internal functions): parse → `sourceSegments`
  insert, `sources` status transitions, `subjectSources` link on proposal
  accept, `concepts`/`objectives` generation.
- `curricula.getPath`, `curricula.publishDraft` (atomic head swap),
  `lessons.get`, `activities.submit` (immutable attempt write), mastery
  projection upserting `by_user_objective`.
- `listSegments` bounded at 500 rows; replace with cursor pagination when the
  library/source-viewer UI lands.
- Segment-level vector/RAG retrieval must filter by authorized source ids
  **before** search (DATA_MODEL.md privacy-first indexes); no global RAG.

## 7. Test evidence

`npm test` → `vitest run` → `tests/learning.privacy.test.ts`: **14/14 pass**
(convex-test 0.0.63 in-memory backend, no deployment involved).

Adversarial coverage (PERMISSIONS.md threat list):

- User B reads user A's subject/source/segment by guessed id → `null`/`[]`
  (indistinguishable from missing).
- User B registers user A's `storageId` → `UNAUTHORIZED` (claim check).
- User B mutates user A's subject (`rename`, `setStatus`) → `UNAUTHORIZED`.
- Unauthenticated writes (`createManual`, `rename`, `createUploadUrl`,
  `register`) → `UNAUTHORIZED`; unauthenticated reads → `null`/`[]`.
- No client-supplied owner field exists in any args shape.
- `remove` owner-only; deleted sources hidden from `get`/`listSegments`/`listMine`.

Functional coverage: owner stamping on insert, `manual_empty` initial status,
upload-URL minting, register validation (mime/sha/size/existence),
checksum/size verification against `_storage`, same-bytes dedupe, short-lived
URL minted for owner only, segment ordering reads, soft-delete + revive.

Mock-fidelity note: convex-test 0.0.63 stores `_storage.sha256` base64-encoded
where the real backend stores hex; `register` normalizes the stored digest
before comparing, so the check means "claimed digest === stored digest" in
both environments. `ctx.db.system.get("_storage", id)` is used instead of the
deprecated `getMetadata`.

## 8. Verification run

| Check | Result |
|---|---|
| `npx tsc -p convex/tsconfig.json --noEmit` | pass, 0 errors |
| `npm test` (vitest) | 14/14 pass |
| `npm run build` (`tsc -b && vite build`) | pass |
| Convex codegen/push | **not run — blocked on P00.1B** isolated deployment |

`_generated/api.d.ts` predates these modules (codegen requires a deployment);
`api`/`internal` resolve through the `anyApi` proxy at runtime, so client and
test references like `api.subjects.get` work once functions are deployed.
Regenerate `_generated` at first authorized push.
