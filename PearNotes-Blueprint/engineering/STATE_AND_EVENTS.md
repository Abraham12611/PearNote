# UI state machines, domain events and persistence contracts

## Why state distinctions matter

A lesson is neither a page route nor a single widget. Upload, subject review, curriculum, assessment and AI suggestions are *independent state machines*, allowing reliable refresh/recovery, meaningful loading UI and exact event auditing.

## State machines

| Entity | Allowed transitions |
|---|---|
| `importJob` | `created → uploaded → extracting → classifying → awaiting_review → accepted → building → ready`; `failed/cancelled` from bounded states |
| `subject` | `manual_empty / draft / active / archived` |
| `curriculumVersion` | `draft → validated → published → superseded`; `rejected` optional |
| `lessonSession` | `not_started → active → paused → completed` (reopen permitted) |
| `activityAttempt` | `draft → submitted → evaluating → evaluated`; `failed` recoverable |
| `adaptationProposal` | `suggested → accepted/rejected/expired → applied`; distinguish accept vs actual write completion |
| `xpEvent` | `eligible → recorded` exactly once; rejected reason auditable |

## Event examples and effects

| Domain event | Produced by | Consequences |
|---|---|---|
| `SourceAccepted` | import review mutation | create subject/source associations, enqueue curriculum |
| `CurriculumPublished` | version publish mutation | path nodes become available |
| `LessonOpened` | authenticated navigation | resume state update only, no XP |
| `AttemptEvaluated` | assessment service | mastery projection, review schedule candidate |
| `GapSuspected` | mastery rule | bounded AI remediation proposal |
| `PracticeAccepted` | learner action | create verified activity widget in practice zone |
| `ObjectiveDemonstrated` | mastery projector | optional XP eligibility and path status change |
| `MessagePromoted` | group mutation | create note widget and provenance link |
| `RewardEarned` | reward transaction | ledger, trophy record, UI notification |

## Event idempotency and ordering

Each meaningful command carries a client request ID. Store source job key, attempt ID and reward event key separately. Multiple subscribers must see results from authoritative database rather than local optimistic reward increments. Concurrent source reimports require version checks. Curriculum replacement uses atomic pointer publication; old path remains visible while new version builds.

## UI control state vs durable domain state

Modal open/closed, selected avatar, path drawer animation and current hover are ephemeral UI state. Upload job, proposal edits, source links, curriculum version, lesson attempts, widget positions, mastery and earned trophies are durable data. Unsaved text draft may use local session state with explicit autosave strategy.

## Testing

Reload during every processing phase; retry same command; run two devices issuing same reward event; simultaneous subject rename and curriculum publish; cancel model job mid-run; navigate away during extraction and return; revoke membership while a room subscription is active.
