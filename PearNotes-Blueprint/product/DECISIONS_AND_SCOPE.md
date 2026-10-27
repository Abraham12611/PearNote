# Product decisions, scope boundaries, and assumption register

## Confirmed by project owner, 2026-10-27

| ID | Decision | Consequence |
|---|---|---|
| D01 | Fork **current OurSpaces main**, not original September snapshot | Pin commit, review later features, reuse selectively |
| D02 | First sources: PDF + text | Provide typed/pasted text and file parsing; video/audio are roadmap |
| D03 | New education widgets: Lesson, Source, Challenge, Teach-Back | Others hidden/adapted; do not invent extra MVP engines |
| D04 | Collaboration: single shared study room | Leverage existing presence and chat; no full templates before demo |
| D05 | Biology / Cell Biology demo | Source-grounded generated lesson about membranes and transport |
| D06 | Empty subject picker with dashed `+` | No prefilled default subject or user progress; demo is segregated |
| D07 | AI mixed-subject sort and manual edit | Processing produces *proposals*; user accepts/merges/renames/splits |
| D08 | Preserve OurSpaces spatial visual identity | Tactile paper, stickers, mixed materials, motion, black pills, lime accent |
| D09 | Guided path drawer → full immersive lesson space | Path is navigation; canvas is learning |
| D10 | Build complete application in phases, hackathon subset first | All future features documented, not required for Phase 1 |

## Recommended (not yet explicit user decisions)

- Product working name: **PearNotes**; `pearnotes.app` owned by project owner. Brand/trademark search required before public commercialization.
- Indie Developer track **conditional on acceptance/eligibility**; compare with Startup before finalizing. Do not claim either is automatically available.
- Convex remains the primary source of truth; hosted Meta AI performs central intelligence tasks.
- First release targets desktop with responsive mobile essentials; mobile needs adapted reading/navigation, not a scaled canvas.
- Subject avatars come from a reusable, original illustrated asset library; choose fallback based on broad discipline, never infer sensitive traits from uploaded source.
- Curriculum and AI edits remain reviewable; initial path creation may be published after explicit acceptance of subject grouping.

## Phase 1 must ship

1. Fresh-user auth and empty Learn picker.
2. PDF/text upload, processing statuses, reviewable classification (including mixed-subject).
3. Subject creation and editable identity/avatar.
4. Valid sections/units/lessons and half-screen learning path drawer.
5. Interactive lesson canvas with four new educational widgets.
6. Source-grounded contextual Pear Tutor and persisted attempts.
7. Demonstrable targeted remediation activity after a defensible mistake sequence.
8. Resume after reload with saved answers, objects and progress.
9. One functioning shared study room with live presence/chat and optional chat→note promotion.
10. Minimal server-validated XP, one trophy; real build/deploy/tests/demo.

## Explicitly deferred

- Production video and audio ingestion, 3D/physics simulations, class administration, marketplace, institutional reports, complex leagues/economy, full specialized group-room templates, full mobile feature parity, payments, public discovery, creator tooling.

## Product decisions needing confirmation during implementation

- Subject naming taxonomy and subject merging semantics (prefer user approval).
- Subject path node locking vs freedom to skip (recommend allow open exploration, lock only rewards, not source access).
- Tutor grading thresholds (must be calibrated with educators/evaluation data).
- How much source material may leave the platform for AI processing (consent and provider terms).
- Whether demo uses email signup or existing auth; shipping must still respect permissions.

## Change-control rule

Record any changed decision in [delivery/DECISIONS_RISKS.md](../delivery/DECISIONS_RISKS.md), mark impact on dependencies, and update the roadmap, contracts and tests in the same change.
