# Engineering backlog — dependency-ordered actionable tickets

**Workflow:** convert IDs to GitHub issues. Each ticket includes UI/backend work, tests and docs updates. Estimations are relative and intentionally omitted until codebase audit.

| ID | Priority | Ticket | Depends on | Acceptance |
|---|---|---|---|---|
| F-01 | P0 | Fork/pin current main; attribution; isolate deployment | — | baseline build and SHA recorded |
| F-02 | P0 | Inventory registry/auth/canvas and smoke tests | F-01 | two-user old room works |
| F-03 | P0 | New PearNotes shell, rail, Home empty state | F-02 | no fake subjects or personas |
| F-04 | P0 | Subject picker modal + dashed plus + avatar selector | F-03 | keyboard + mobile usable |
| F-05 | P0 | New tables and auth wrappers | F-01 | cross-user queries denied |
| F-06 | P0 | PDF/text intake and parse job | F-05 | source IDs/pages/segments persisted |
| F-07 | P0 | Meta classification proposals + review UI | F-06 | multiple subjects can be edited/approved |
| F-08 | P0 | Subject CRUD and avatar persistence | F-04,F-05,F-07 | manual and AI subject creation |
| F-09 | P0 | Curriculum planner and validator | F-06,F-08 | valid ordered sections/units/lessons |
| F-10 | P0 | Right path drawer, routes and progress states | F-03,F-09 | opens correct lesson and back |
| F-11 | P0 | Lesson/canvas binding + Guided/Explore Compass | F-02,F-09 | lesson world loads with layout |
| F-12 | P0 | LessonCard + SourceViewer | F-11 | cited PDF page opens |
| F-13 | P0 | Challenge widget + server attempt record | F-11,F-05 | correct/incorrect feedback persisted |
| F-14 | P0 | TeachBack widget + rubric-based Meta evaluation | F-13 | explain and receive supported feedback |
| F-15 | P0 | Contextual tutor dock and authorized source search | F-12,F-14 | no cross-user retrieval |
| F-16 | P0 | Simplified mastery state projection and resume | F-13 | page reload restores state |
| F-17 | P0 | Adaptive practice proposed widget | F-14,F-16 | repeated gap produces reviewable remedial task |
| F-18 | P1 | One group study room adaptation | F-02,F-05 | two-window presence/chat/edits work |
| F-19 | P1 | Chat→note promotion + attribution | F-18 | object appears for all authorized members |
| F-20 | P1 | Server XP ledger and first trophy | F-16 | cannot farm on retry |
| F-21 | P0 | Test suite for source/AI/security and workflow | F-06…F-20 | test matrix pass |
| F-22 | P0 | Public deploy/video/submission and evidence | F-21 | playable app and docs ready |

## Subtasks all P0 tickets should include

- Define TS types/validators; implement Convex query/mutation/action; enforce user/space authorization; build UI; handle no-data/loading/failure; write unit+integration test; record manual visual QA; update relevant spec.

## Phase 2–8 ticket epics

- `CORE-` source Library, versions, editing, mobile, personalization, widget A pack.
- `LEARN-` knowledge graph, calibrated mastery, review scheduling, tutor pedagogy.
- `GAME-` quests, trophy collectibles, streaks, seasonal league/anti-farm.
- `GROUP-` group HQ, projects, brainstorm, revision arena, roles/moderation.
- `MEDIA-` audio, video, images, PPTX/DOCX, simulations, discipline packs.
- `OPS-` production auth, observability, billing, accessibility, localization.
- `ECOSYS-` teacher editing, institutions, creator marketplace, integrations.

## Pull-request checklist

Feature flag? Scope validation? Source provenance? Existing canvas no regression? Mobile/focus/reduced motion? Test fixtures? Failure and retry? Cost guard? Docs current? No license or branding violations? No hardcoded student/subject fixtures on normal accounts?
