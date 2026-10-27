# Backend function contracts and client/server boundaries

**These are proposed function names and conceptual schemas**, not existing endpoints. Use Convex typed queries, mutations, actions and internal functions; update names only with matching changes in tests and docs.

| Operation | Interface | Input → output | Security |
|---|---|---|---|
| `subjects.listMine` | Query | none → own subject summaries | `authUser` |
| `imports.begin` | Mutation | upload IDs, idempotencyKey → job ID | owns storage refs, limit/quota |
| `imports.getStatus` | Query | job ID → stage, error, proposalIds | owner |
| `imports.review` | Mutation | job, edits, approval → accepted subject IDs | validates proposal and ownership |
| `subjects.createManual` | Mutation | name, avatar, goal → subject ID | owner |
| `subjects.rename` | Mutation | subject ID, name → revision | owner |
| `curricula.getPath` | Query | subject ID → sections/units/lesson statuses | owner |
| `curricula.publishDraft` | Mutation | version ID → published | owner, validated generation |
| `lessons.get` | Query | lesson ID → spec and canvas ref | authorized learner |
| `sessions.resume` | Query | user → last study location | owner |
| `activities.submit` | Action/mutation workflow | activityId, response, key → evaluation ID | owner and verified activity revision |
| `tutor.ask` | Action/stream | scope, question, selected object → grounded turn | scoped retrieval |
| `tutor.proposeWidget` | Action | lesson/context → typed proposal | owner; no write yet |
| `tutor.acceptProposal` | Mutation | proposalId → created widget | owner, schema validation |
| `groups.create` | Mutation | name, theme → group+HQ IDs | authenticated |
| `groups.join` | Mutation | inviteToken → membership | token and role validation |
| `groups.postMessage` | Mutation | roomId, thread, text → ID | room membership |
| `groups.promoteMessage` | Mutation | messageId, proposed note → widget ID | room member, owner rules |
| `rewards.mySummary` | Query | none → XP, streak, trophy IDs | owner |

## Example structured `LessonSpec` (illustrative)

```json
{
  "schemaVersion": 1,
  "title": "Diffusion and Active Transport",
  "objectiveIds": ["objective_diffusion", "objective_active_transport"],
  "sourceRefs": [{"sourceId": "srcA", "segmentId": "seg12", "page": 4}],
  "activities": [
    {"type": "lessonCard", "config": {"heading": "The membrane", "body": "..."}, "objectiveIds": ["objective_diffusion"]},
    {"type": "challenge", "config": {"kind": "multiple_choice", "prompt": "...", "options": []}, "objectiveIds": ["objective_active_transport"]}
  ]
}
```

Actual IDs and schema validators must be generated from the database model; this example is explanatory only.

## Tutor tool protocol

Tools return a typed envelope: `{kind, proposedChanges?, text?, sourceRefs?, confidence?, requiresApproval}`. Allowed read actions: `getLesson`, `searchAuthorizedSources`, `getAttemptSummary`, `focusWidget`; allowed proposed writes: `createPracticeActivity`, `pinExplanation`, `markForReview`. Disallow `deletePrivateNotes`, `publishToGroup`, `awardXP`, and raw unrestricted database mutations from model tool calls.

## Error model

Distinguish `UNAUTHORIZED`, `NOT_FOUND`, `INVALID_INPUT`, `UNSUPPORTED_SOURCE`, `MODEL_UNAVAILABLE`, `INVALID_MODEL_OUTPUT`, `IMPORT_FAILED`, `CONFLICT`, `RATE_LIMIT`, `QUOTA_EXCEEDED`. Return retryability and developer-safe error IDs, not secrets. UI shows recovery steps, preserved draft state, and a stable job/attempt reference.

## Performance and isolation

Pagination for large libraries, reactive indexes for active room widgets, denormalized learner path summaries when needed, sparse updates for presence. Long-running model calls in actions/workflows, not Convex mutations. No client-side model key.
