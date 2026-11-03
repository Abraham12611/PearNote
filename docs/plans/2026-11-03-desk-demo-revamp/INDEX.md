# Desk · Demo · Backend revamp — execution tracker (2026-11-03)

**Owner direction (this session):**

1. Home must be a **carbon copy** of the approved "your desk" mockup (owner
   screenshot, session 2026-11-03) — every module, in the OurSpaces paper
   grammar.
2. The **Learn** subject picker renders *behind* the desk — fix layering.
3. The **demo** must not be scattered client fixtures: it is a real seeded
   backend persona ("Sam", an undergrad medical student) whose desk, paths,
   history and crew are read **from the database** through the public
   `/demo/*` surface — labelled, read-only, zero writes.
4. Design + build the real system for **subject creation → source upload →
   AI-generated journey path / lessons / practice**, as stipulated in the
   Blueprint (much already exists; finish and wire it end-to-end).
5. The **lesson** must be the inherited OurSpaces room experience
   (`/#/space/crew` conventions) — not a new canvas.
6. Rebuild the **landing** with Flora-generated visuals in the OurSpaces
   collage language; copy centers the product tenet.
7. Product tenet (drives copy + systems): students use AI to cram and pass
   without understanding. PearNotes flips this — AI structures the path,
   but progress is *earned evidence*: teach-back, challenges, mastery
   states, Duolingo-style path/streaks/trophies that only unlock on
   demonstrated understanding.

**Working agreements (from AGENTS.md + Blueprint):**

- Branch per workstream from `origin/develop`, PR **into `develop`**, never
  `main`. Work happens in the isolated worktree `/Users/Apple/Workstation/pearsnote-devin`.
- Verification per PR: `npx tsc -b --pretty false`, `npm test` (vitest),
  `npm run build`; report actual output.
- Vercel preview: Git integration builds each PR; env `VITE_CONVEX_URL` /
  `VITE_CONVEX_SITE_URL` already set for preview → `keen-marten-701` dev.
- Convex pushes only to dev `keen-marten-701` (`CONVEX_DEPLOYMENT=dev:keen-…`).
  `MODEL_API_KEY` + `PDF_MODEL_AUTHORIZED` already set there. Never prod.
- Every UI PR supplies the reuse ledger (native ancestor, preserved traits,
  adaptation) + before/after screenshots for owner review.
- Data honesty: real accounts start empty; everything seeded lives behind
  demo labels. "live sync"/streaks/friends are never decorative text.

## Workstreams and order

| # | Workstream | Branch | PR | Status | Preview |
|---|------------|--------|----|--------|---------|
| W0 | This plan | `docs/20261103-execution-plan` | #90 | done | — |
| W1 | Learn overlay + desk-coverage layer audit | `fix/learn-overlay-layers` | #91 | done — PR open | pearnote-git-fix-learn-overlay-layers |
| W2 | Home desk — mockup carbon copy | `feat/demo-persona-backend` | #92 | done — PR open (merged with W3) | pearnote-git-feat-demo-persona-backend |
| W3 | Demo persona backend ("Sam") + desk data APIs | `feat/demo-persona-backend` | #92 | done — PR open; seed live on dev | same |
| W4 | Subject → upload → AI path/lesson/practice flow | `feat/intake-curriculum-flow` | #93 | done — PR open (stacked on #92) | pearnote-git-feat-intake-curriculum-flow |
| W5 | Lesson space = inherited OurSpaces room | `feat/lesson-space-room` | #94 | done — PR open (room provisioned + mounted) | pearnote-git-feat-lesson-space-room |
| W6 | Landing rebuild + Flora assets | `feat/landing-flora` | #95 | done — PR open; $0.156 Flora spend | pearnote-git-feat-landing-flora |

Sequencing: W1 lands first (standalone). W3 supplies the data W2's carbon
copy needs, so W3 schema/seed lands before or alongside W2's UI; they may
merge as one PR if the combined diff stays reviewable. W4 and W5 are the
deep builds. W6 depends on Flora spend approval per batch (owner gave
general approval to use the Flora MCP; each batch still quotes USD first).

Specs: `W1-LEARN-OVERLAY.md` `W2-DESK-MOCKUP.md` `W3-DEMO-PERSONA-BACKEND.md`
`W4-INTAKE-CURRICULUM-FLOW.md` `W5-LESSON-SPACE.md` `W6-LANDING-FLORA.md`

## Session log

Post-plan stacked PRs: **#96** widget synthesis · **#97** teach-back grading · **#98** cold-start review · **#99** achievement awards (chain 92→93→94→96→97→98→99).


- 2026-11-03 — Plan authored from `origin/develop @ 08ddd19`. Diagnosis of
  the Learn bug verified in code (see W1). Backend gaps for the mockup
  confirmed: no XP/achievements/activity-feed/calendar/friends tables;
  `resume` always null; curricula never publish (only `draft`).
