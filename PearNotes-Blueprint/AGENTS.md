# PearNotes coding-agent instructions

This file is intended for coding agents operating in the forked repository. It is a planning contract, **not a claim that implementation exists**.

## Read order for any change

1. `README.md` and `product/DECISIONS_AND_SCOPE.md` for locked product decisions.
2. Relevant exact spec: `design/`, `learning/`, `engineering/`, or `collaboration/`.
3. `roadmap/PHASE_01.md` and `delivery/BACKLOG.md` for current milestone.
4. `delivery/ACCEPTANCE_TESTS.md` and `delivery/SECURITY_PRIVACY.md` for proof obligations.
5. Current source code at the pinned OurSpaces commit; **actual source signatures outrank guessed examples in docs**.

## Non-negotiables

- Retain OurSpaces MIT copyright and link; do not claim upstream code or assets as original PearNotes implementation.
- Preserve the floating dark rail, tactile stickers/paper, circular illustrated avatar chooser, pill controls, multi-color rooms, free pan/zoom and live cursors unless a documented change is approved.
- Never pre-seed a real new student's subjects. Use segregated demo fixtures only.
- Subject creation uses editable AI proposal(s); one file can span multiple subjects. User approval required for splitting/merging.
- Lesson path is a right-hand drawer, not the main canvas. Lesson opens in a complete spatial board.
- Learning objective/attempt/mastery are persistent, server-side concepts separate from widget view state.
- Never let a model write arbitrary JSX/HTML/JS from a student source. Validate schema-based specs.
- Never let the group assistant see personal sources, attempts or chats unless the student explicitly shared authorized content.
- Server-authoritative XP only. No client `giveXP(amount)` function.
- Real Meta AI calls must be demonstrated honestly; report cached/seeded fixtures transparently.

## Implementation workflow

For each ticket: inspect relevant code, write exact file-change plan, update validators/backend and frontend in small slices, add tests, run typecheck/build, verify real interaction, update docs with status and implementation paths. Do not edit `src/App.tsx`/`src/pages/LiveSpace.tsx` extensively without regression coverage. Avoid unrelated refactors while Phase 1 is at risk.

## Definition of done

- Documented behavior works in the actual deployed application, not just mock mode.
- All access checks run on backend and are adversarially tested.
- AI output is source-grounded where required and parsed through validators.
- Accessibility basics and responsive no-data/loading/error states exist.
- No new-user seed leakage or stale OurSpaces branding.
- Every milestone has a short reproducible demo and test evidence.

## Reporting format

`What changed` / `Files changed` / `Tests run (actual outcomes)` / `Known gaps` / `Next ticket` / `Spec updates`. No unverified claims of passing tests. When a spec conflicts with source, add ADR in `delivery/DECISIONS_RISKS.md` before improvising major behavior.

## Mandatory owner visual correction (2026-11-02)

Before building or reviewing **any** PearNotes frontend screen, read `design/OURSPACES_FIDELITY_CONTRACT.md`, `design/SCREEN_BY_SCREEN_REDESIGN.md`, `design/LEARNING_PATH_AND_LESSON_CANVAS.md`, `design/IDENTITY_FRIENDS_GROUPS.md` and `delivery/REDESIGN_RELEASE_GATES.md`. The owner rejected the generic separate UI produced on `develop`. New screens MUST adapt real original OurSpaces components (Rail, /knows, About, modal, lesson room/widget runtime) with screenshot/source ancestry proof; do not start a second UI kit. Native original room regression is required. The demo must have authored paths for *every displayed sample subject*; genuine new accounts begin with zero subjects/friends/awards.

**Authentication is P0:** `engineering/AUTH_AND_ACCOUNT_RELIABILITY.md` explains the reported Gmail OTP failure and diagnostic steps. Do not dismiss a valid Gmail address based on `useJoin.ts`'s generic error text. Fix the actual provider/backend problem with redacted proof of successful send, receive and verify on the isolated deployment. Keep approved Sticker P and follow `design/ASSET_AND_FLORA_BRIEF.md` for new art, with fresh spending approval where necessary.

These are owner-selected **design and QA requirements**, not implemented features. Engineering smoke/CI is not owner browser acceptance. No `main` merge or production Convex push without explicit approval.
