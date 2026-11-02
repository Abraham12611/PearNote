# PearNotes documentation index

**Planning pack, 2026-10-27.** Source-of-truth for intended product and phased implementation. These files are *specifications*, not proof that features have been implemented.

## Scope summary

- Current OurSpaces `main` fork, pinned to a SHA prior to coding.
- No default subjects. AI-assisted editable creation from student PDF/text sources.
- Home → subject-picker modal → right learning-path drawer → full-screen interactive lesson canvas.
- Four new hackathon widgets, grounded Pear Tutor, adaptation after evidenced misconception, persistent progress.
- Single live collaborative study room; reward starter with verified XP/trophy.
- Nine phases including long-term gamification, multiplayer, multimodal, production and institutional ecosystem.

## All files

### Repository root

Project-level instructions and starting points

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | PearNotes coding-agent instructions |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | PearNotes implementation status and milestone tracker |
| [README.md](README.md) | PearNotes — Product & Engineering Blueprint |

### product

Product vision, decisions, requirements, personas and measures

| File | Purpose |
|---|---|
| [DECISIONS_AND_SCOPE.md](product/DECISIONS_AND_SCOPE.md) | Product decisions, scope boundaries, and assumption register |
| [GLOSSARY.md](product/GLOSSARY.md) | Canonical terminology and content hierarchy |
| [METRICS.md](product/METRICS.md) | Success metrics, product analytics, and research |
| [PERSONAS.md](product/PERSONAS.md) | Personas, jobs-to-be-done, and stories |
| [PRD.md](product/PRD.md) | PearNotes Product Requirements Document (PRD) |
| [VISION.md](product/VISION.md) | Product vision, positioning, and non-negotiable principles |

### design

Navigation, layouts, aesthetics, motion, screens and access

| File | Purpose |
|---|---|
| [ASSETS_BRANDING.md](design/ASSETS_BRANDING.md) | Visual assets, subject avatars, illustrations and branding system |
| [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) | PearNotes design system — Lived-in Learning Worlds |
| [FLOWS.md](design/FLOWS.md) | End-to-end user flows and state transitions |
| [INTERACTIONS_MOTION.md](design/INTERACTIONS_MOTION.md) | Spatial interaction, motion, and component behavior |
| [RESPONSIVE_ACCESSIBILITY.md](design/RESPONSIVE_ACCESSIBILITY.md) | Responsive, accessibility and internationalization requirements |
| [SCREEN_SPECS.md](design/SCREEN_SPECS.md) | Screen-by-screen interaction specifications |
| [SITEMAP.md](design/SITEMAP.md) | Information architecture and sitemap |

### engineering

Repository migration, architecture, data, permissions, APIs and DevOps

| File | Purpose |
|---|---|
| [API_CONTRACTS.md](engineering/API_CONTRACTS.md) | Backend function contracts and client/server boundaries |
| [ARCHITECTURE.md](engineering/ARCHITECTURE.md) | Technical architecture — vertical slices and system boundaries |
| [CODEBASE_MIGRATION.md](engineering/CODEBASE_MIGRATION.md) | OurSpaces → PearNotes migration plan |
| [DATA_MODEL.md](engineering/DATA_MODEL.md) | Proposed Convex schema, keys, indexes and integrity rules |
| [INFRA_DEVOPS.md](engineering/INFRA_DEVOPS.md) | Infrastructure, environments, build, and release engineering |
| [PERMISSIONS.md](engineering/PERMISSIONS.md) | Ownership, authorization, consent and AI-scope policy |
| [STATE_AND_EVENTS.md](engineering/STATE_AND_EVENTS.md) | UI state machines, domain events and persistence contracts |

### learning

Ingestion, curriculum, lessons, tutoring, assessment, widgets and rewards

| File | Purpose |
|---|---|
| [ASSESSMENT_MASTERY.md](learning/ASSESSMENT_MASTERY.md) | Assessment, mastery evidence, spaced revision and adaptation |
| [CURRICULUM.md](learning/CURRICULUM.md) | Subject, curriculum and learning path generation |
| [GAMIFICATION.md](learning/GAMIFICATION.md) | Gamification — XP, streaks, quests, achievements, trophy hunts |
| [INGESTION.md](learning/INGESTION.md) | Source ingestion and subject classification system |
| [LESSON_RUNTIME.md](learning/LESSON_RUNTIME.md) | Lesson Space runtime, continuous learning, and session lifecycle |
| [TUTOR_AND_AI.md](learning/TUTOR_AND_AI.md) | Pear Tutor, AI agents, tools, grounding, and action rights |
| [WIDGETS.md](learning/WIDGETS.md) | Complete widget catalog and disposition matrix |
| [WIDGET_SCHEMAS.md](learning/WIDGET_SCHEMAS.md) | Widget schema registry, rendering and validation contracts |

### collaboration

Group spaces, real-time editing, chat and shared knowledge

| File | Purpose |
|---|---|
| [CHAT_AND_THREADS.md](collaboration/CHAT_AND_THREADS.md) | Chat, threaded conversations, promotion and tutor separation |
| [GROUPS_AND_ROOMS.md](collaboration/GROUPS_AND_ROOMS.md) | Groups, shared spaces, live collaboration and project workflows |

### roadmap

Phase 00–08 with ordered sub-phases, deliverables and exit gates

| File | Purpose |
|---|---|
| [PHASE_00.md](roadmap/PHASE_00.md) | Phase 00 — Foundation and controlled fork |
| [PHASE_01.md](roadmap/PHASE_01.md) | Phase 01 — Meta Hackathon Edition |
| [PHASE_02.md](roadmap/PHASE_02.md) | Phase 02 — Complete the core learning platform |
| [PHASE_03.md](roadmap/PHASE_03.md) | Phase 03 — Advanced learning intelligence |
| [PHASE_04.md](roadmap/PHASE_04.md) | Phase 04 — Gamification, mastery artifacts and collectability |
| [PHASE_05.md](roadmap/PHASE_05.md) | Phase 05 — Complete multiplayer and group workspaces |
| [PHASE_06.md](roadmap/PHASE_06.md) | Phase 06 — Multimodal input and specialized educational worlds |
| [PHASE_07.md](roadmap/PHASE_07.md) | Phase 07 — Production, trust and sustainable operations |
| [PHASE_08.md](roadmap/PHASE_08.md) | Phase 08 — Ecosystem, distribution and research |
| [README.md](roadmap/README.md) | Multi-phase delivery roadmap — index and dependency graph |

### delivery

Hackathon submission, tickets, evaluations, privacy and QA

| File | Purpose |
|---|---|
| [ACCEPTANCE_TESTS.md](delivery/ACCEPTANCE_TESTS.md) | Product acceptance, integration and end-to-end testing matrix |
| [AI_EVALUATION.md](delivery/AI_EVALUATION.md) | Meta AI evaluation suite and content quality assurance |
| [BACKLOG.md](delivery/BACKLOG.md) | Engineering backlog — dependency-ordered actionable tickets |
| [DECISIONS_RISKS.md](delivery/DECISIONS_RISKS.md) | Decision log, unresolved questions and risk register |
| [HACKATHON.md](delivery/HACKATHON.md) | Meta Global AI Developer Hackathon — submission and judging strategy |
| [POST_HACKATHON_STRATEGY.md](delivery/POST_HACKATHON_STRATEGY.md) | Product commercialization, research and next steps after the hackathon |
| [RELEASE_CHECKLIST.md](delivery/RELEASE_CHECKLIST.md) | Final engineering, demo and submission checklist |
| [SECURITY_PRIVACY.md](delivery/SECURITY_PRIVACY.md) | Security, privacy, academic integrity and content governance |

## Build and maintenance

The authoring snapshot was created from the 2026-10-27 planning conversation and public source inspections. Validate all path assumptions and current Meta model/contest details before coding. Keep `PROJECT_STATUS.md` up to date with exact deployed build SHA, tests and implemented features. Do not mark speculative requirements as shipped.

### 2026-11-02 owner-directed OurSpaces fidelity reset — additional normative files

These documents were added after the initial planning pack, following owner rejection of the integrated visual UX. They **override ambiguous older visual guidance** while retaining existing privacy, grounding and accessibility rules. They are new specifications, **not proof that the screens are repaired**.

| File | Purpose / owner acceptance |
|---|---|
| [OURSPACES_FIDELITY_CONTRACT.md](design/OURSPACES_FIDELITY_CONTRACT.md) | Exact native component ancestry, screenshot matrix, physical interaction contract and automatic rejection rules |
| [SCREEN_BY_SCREEN_REDESIGN.md](design/SCREEN_BY_SCREEN_REDESIGN.md) | Detailed designs, data states and interactions for landing, original-style modal, Home, dock, Learn, Library, Groups, Shelf, Profile and Settings |
| [LEARNING_PATH_AND_LESSON_CANVAS.md](design/LEARNING_PATH_AND_LESSON_CANVAS.md) | Fix all three demo subjects, prevent empty path/contrast regressions, build true lesson canvas from inherited room with breadcrumb/activity pill and widget inheritance |
| [IDENTITY_FRIENDS_GROUPS.md](design/IDENTITY_FRIENDS_GROUPS.md) | One stable illustrated profile for each new account, original avatar chooser/cursors, authorized friend summaries and group rooms |
| [ASSET_AND_FLORA_BRIEF.md](design/ASSET_AND_FLORA_BRIEF.md) | Flora artwork briefs and production/licensing quality without unauthorized spending or replacement of owner-approved Sticker P |
| [AUTH_AND_ACCOUNT_RELIABILITY.md](engineering/AUTH_AND_ACCOUNT_RELIABILITY.md) | Gmail OTP failure investigation, safe error taxonomy, Google OAuth and full verified account lifecycle |
| [REDESIGN_RELEASE_GATES.md](delivery/REDESIGN_RELEASE_GATES.md) | Four-engineer dependency plan, exact route/interaction QA, priority blockers, source UI regression and owner release evidence |

At creation, current known merged baseline was `develop@2f6dc9744e310d2af7814387ca857886eb7a3fb6`; the screenshots 01–13 are user attachments described in the fidelity contract, not committed binary sources. Treat that SHA as a historical checkpoint and verify latest develop before any code work.
