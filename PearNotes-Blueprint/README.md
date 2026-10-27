# PearNotes — Product & Engineering Blueprint

**Edition:** 1.0 planning baseline · **Date:** 2026-10-27 · **Status:** Proposed, not implemented

> **North star:** Turn the material you need to study into a persistent, source-grounded world you can explore, practice in, and eventually master—with optional multiplayer learning. Preserve the tactile, colorful OurSpaces design language; do not turn it into a generic SaaS dashboard or merely embed a Duolingo clone in a whiteboard.

## Start here

1. Read [the product vision](product/VISION.md), [decisions and scope](product/DECISIONS_AND_SCOPE.md), and [requirements](product/PRD.md).
2. Understand [the sitemap](design/SITEMAP.md), [navigation and journeys](design/FLOWS.md), [design system](design/DESIGN_SYSTEM.md), and [screen specifications](design/SCREEN_SPECS.md).
3. Inspect the actual repository using [fork and migration map](engineering/CODEBASE_MIGRATION.md); review [architecture](engineering/ARCHITECTURE.md), [data model](engineering/DATA_MODEL.md) and [permissions](engineering/PERMISSIONS.md).
4. Build [content ingestion](learning/INGESTION.md), [subject/curriculum generation](learning/CURRICULUM.md), [lesson lifecycle](learning/LESSON_RUNTIME.md) and the [four initial widgets](learning/WIDGETS.md).
5. Follow the [roadmap index](roadmap/README.md): first the [foundation](roadmap/PHASE_00.md), then [hackathon release](roadmap/PHASE_01.md), followed by phases 02–08.
6. Validate with [acceptance tests](delivery/ACCEPTANCE_TESTS.md), [AI evaluations](delivery/AI_EVALUATION.md), [security checks](delivery/SECURITY_PRIVACY.md), and [submission checklist](delivery/HACKATHON.md).

## Document map

| Folder | Contract |
|---|---|
| `product/` | What we are building, for whom, why, measures, glossary |
| `design/` | Navigation, layouts, styles, motion, interactions, accessibility |
| `engineering/` | Original codebase boundaries, new data/types/APIs, deployment |
| `learning/` | Input → curriculum → lesson → assessment → adaptation → rewards |
| `collaboration/` | Group HQ, rooms, real-time editing, chat, permissions |
| `roadmap/` | Nine phases, each with multiple sub-phases, exit gates and dependencies |
| `delivery/` | Hackathon rubric, demo, quality, risks, releases and execution backlog |

## Locked decisions (user-selected)

- **Baseline:** current `main` of `thomasnguyen/ourspaces-app`, pinned to a commit before development. It contains **post-hackathon additions**. Audit, feature-flag, and reuse selectively.
- **Media in Phase 1:** PDF and text. Audio, MP4, DOCX/PPTX, web/video integrations follow in later phases.
- **Four new initial educational widgets:** Lesson Card, Source Viewer, Challenge Card, Teach-Back.
- **Initial collaboration:** one genuinely live shared study room, reusing OurSpaces.
- **Demo subject:** Biology / Cell Biology, dynamically generated from realistic source material, never presented as a default new-user subject.
- **New-user subject picker:** only a dashed/broken-circle `+` tile; user creates subjects manually or through source uploads. An AI mixed-subject proposal requires user approval.
- **Learning navigation:** Home → Learn subject-picker modal → right-hand half-screen learning path drawer → full lesson canvas. Returning learners have a Resume shortcut.
- **Appearance:** maintain OurSpaces paper, stickers, illustrated avatars, black pills, lime accents, mixed physical textures, colorful spaces, pan/zoom, cursors, persistent objects.
- **Hardware:** entirely software-based, browser and hosted APIs; no robots, sensor boxes, or Raspberry Pi.

## Reality checks and attribution

- This is a **specification pack**, not a claim that PearNotes has already been coded, deployed, tested, or accepted into the Meta hackathon.
- The current OurSpaces `main` **may change after these documents were authored**. Validate exact paths, type signatures, migration requirements, model APIs, and licenses at the pinned commit.
- OurSpaces is MIT-licensed; retain the copyright notice and LICENSE. Check separate rights for graphics, photos, fonts, sound and trademarks. Original source: https://github.com/thomasnguyen/ourspaces-app.
- Meta hackathon terms allow compliant open-source use when the entry enhances the underlying project; disclose the fork and identify original work. See https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver.
- **Track recommendation:** Indie Developer if accepted/eligible as an individual or ≤4-person team; Startup only if genuinely qualified as a startup representative. Application closed October 25, 2026; track selection may already be fixed. Verify with organizers. Winning cannot be guaranteed.

## Cross-cutting engineering rules

1. **Human approval** for subject grouping, curriculum replacement, private→group publishing, and consequential AI canvas edits.
2. **Ground all generated educational content** in addressable sources; distinguish generated examples and independently verified content.
3. **AI emits validated specifications, never arbitrary executable React from uploaded materials.**
4. **Presentation ≠ truth:** canvas coordinates and appearances are separate from curriculum entities and learner mastery.
5. **Student owns private study data.** Group members and group AI never access it without explicit scoped sharing.
6. **Server-authoritative rewards:** never award XP from client-side events alone.
7. **Reliable core over feature count:** the Phase 1 exit gate is a complete upload→learn→adapt→resume loop.
8. **Build tests alongside features.** Seeded demo content belongs to demo accounts only.

## Implementation source of truth

The documentation describes **proposed behavior**. Once a feature ships, update its file with links to the exact code, API contracts, automated tests, evidence, and any deviations. If code disagrees with this pack, record the discrepancy in [decision log](delivery/DECISIONS_RISKS.md) before silently changing the specification.
