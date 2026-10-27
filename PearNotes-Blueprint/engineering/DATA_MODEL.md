# Proposed Convex schema, keys, indexes and integrity rules

**Status:** logical schema for implementation; verify current `convex/tables/rooms.ts`, `convex/schema.ts` and Convex limits before adding actual validators. Upstream uses typed Convex tables for `spaces`, `members`, `widgets`, `messages`, `presence` and others. Extend, do not overwrite blindly.

## Core ownership

| Table | Key fields | Essential indexes / rules |
|---|---|---|
| `users` (existing) | auth identity, profile attrs | authenticated identity |
| `subjects` | `ownerId`, name, avatarId, theme, status, createdAt | `by_owner`, unique per ID (names may repeat) |
| `sources` | `ownerId`, storageId, mime, sha256, title, status, createdAt | `by_owner`, `by_owner_sha`, no public file URL |
| `sourceSegments` | `sourceId`, segmentNo, page, timeStart, text, refs | `by_source_number`, authorized vector retrieval scope |
| `subjectSources` | `subjectId`, sourceId, segmentIds, origin | `by_subject`, `by_source`; many-to-many |
| `concepts` | `subjectId`, label, summary, provenance, version | `by_subject`, avoid duplicate IDs on reindex |
| `conceptLinks` | `fromConceptId`, `toConceptId`, kind, sourceRefs | `by_from`, `by_to`, acyclic prerequisite candidate checks |
| `objectives` | `subjectId`, conceptIds, assessableStatement, rubricRef | `by_subject`, stable ID across versions where valid |
| `curriculumVersions` | `subjectId`, version, state, generatedFromJobId | `by_subject`, at most one published head per subject |
| `sections` | `versionId`, order, title, theme | `by_version_order` |
| `units` | `sectionId`, order, title | `by_section_order` |
| `lessons` | `unitId`, order, objectiveIds, canvasSpaceId, specVersion | `by_unit_order`, `by_canvasSpace` |
| `activities` | `lessonId`, type, specJson validated, objectiveIds, refs | `by_lesson`; immutable version for past attempts |
| `attempts` | `userId`, activityId, activityRevision, response, evaluation, createdAt | `by_user_activity`, `by_user_time` |
| `mastery` | `userId`, objectiveId, state, scoreBand, evidence, updatedAt | unique `by_user_objective` |
| `reviewItems` | `userId`, objectiveId, nextDueAt, scheduleState | `by_user_due` |
| `studySessions` | `userId`, lessonId, lastFocusWidget, camera, lastActive | `by_user_lesson` |
| `adaptationProposals` | `userId`, lessonId, gapEvidence, spec, state | `by_user_lesson_state` |

## Existing canvas and groups

| Table | Change |
|---|---|
| `spaces` | add `kind: home/lesson/group_hq/study/brainstorm/project/revision`, `ownerId`, `groupId?`, `lessonId?` with migration; original `type: ongoing/event` can coexist temporarily |
| `widgets` | link `activityId?`, `origin: human/ai/template`, `sourceRefs?`, `visibility`, specVersion; keep x/y/w/h/z and strong discriminated validator |
| `members` | preserve per-room membership; add group membership as distinct auth relation; don't infer access from presence |
| `messages` | retain room/widget threads; add provenance of promoted message; private tutor threads separate |
| `presence` | keep transient cursors/locks with existing indexes and TTL rules |
| `groups` | `ownerId`, name, theme, createdAt |
| `groupMembers` | `groupId`, `userId`, `role`, status; `by_group_user` unique |
| `invites` | groupId, tokenHash, role, expiresAt, uses |
| `tutorThreads`, `tutorTurns` | userId, subjectId, lessonId, selectedWidgetId, response, sourceRefs, toolAudit |

## Gamification

| Table | Key fields |
|---|---|
| `xpLedger` | `userId`, `eventKey` unique, eligibleAttemptId, amount, ruleVersion, createdAt |
| `rewardDefinitions` | `rewardId`, rules, artwork, kind, season |
| `userRewards` | `userId`, rewardId, earnedAt, placement, evidenceKey |
| `quests` / `questProgress` | definitions, eligibility, progress (later) |
| `streaks` | userId, timezone, qualifiedDays, grace-state |

## Privacy-first indexes

Prefer `by_owner`/`by_user` and indexed `by_space` access. A user must always be authorized to read source segments before a vector search returns or expands content. Filter by owner/authorized source IDs. Never perform global RAG over all users and filter model output afterward.

## IDs, mutations and atomicity

- IDs are generated server-side. User-provided display names are not identity.
- Enrollment and subject creation need idempotency tokens.
- Publishing a curriculum version updates the `publishedVersionId` pointer atomically after all validations pass.
- Attempt submission records immutable response/evaluation before mastery projection and reward award.
- Reward event ID derives from verified attempt/objective and rule version to prevent replay.
- Deleting a source must trigger controlled unlink/reindex/retention logic and preserve minimal attempt audit without exposing deleted text.

## Suggested example types

```ts
type SpaceKind = 'home'|'lesson'|'group_hq'|'study'|'brainstorm'|'project'|'revision';
type MasteryState = 'not_started'|'learning'|'practicing'|'demonstrated';
type CurriculumState = 'draft'|'published'|'superseded';
type WidgetOrigin = 'human'|'ai'|'template';
```

Implement with Convex `v.object`, `v.union`, explicit indexes and backend authorization wrappers. Do not leave education specs as unlimited opaque `Record<string, unknown>` in persistent data.
