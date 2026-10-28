# PearNotes — Agent Context

## Project

PearNotes is a source-grounded, AI-assisted **spatial learning environment** built by evolving the MIT-licensed OurSpaces codebase. Learners upload PDF/text sources, review editable subject proposals, follow versioned learning paths, study in persistent canvas-based lessons, demonstrate understanding through challenges and teach-back, and later collaborate in shared rooms. **Do not confuse the long-term Blueprint with implemented functionality.** Phase 00 is foundations; Phase 01 is the hackathon learning slice.

Canonical source of product truth: `PearNotes-Blueprint/` (start with its `README.md`, `product/DECISIONS_AND_SCOPE.md`, `roadmap/PHASE_00.md`, and `engineering/CODEBASE_MIGRATION.md`). Also read `PearNotes-Blueprint/AGENTS.md`. Where a Blueprint example conflicts with actual signatures, check code, report the conflict, and propose an ADR rather than silently redesigning the product.

## Stack (CURRENT repository; do not replace it with the example project's stack)

- **Client:** React 19, TypeScript, Vite 8, Tailwind CSS v4, illustrated CSS/SVG spatial UI
- **Backend:** Convex (database, Convex Auth, file storage, reactive queries/mutations/actions, HTTP, components)
- **Existing components:** Convex Agent, workflow, RAG, presence, rate limiter and other integrations already configured; preserve dependencies until audited
- **AI direction:** server-side Meta-model provider adapter with typed validation and source grounding; availability/credentials must be verified, not assumed
- **Package manager:** npm; `package-lock.json` is committed
- **Build:** TypeScript project references plus Vite (`npm run build`)
- **Deployment:** Vercel is the PearNotes target to validate; the inherited Netlify config and hardcoded deployment target are **unsafe to reuse** until isolated
- **Tests / CI:** do not claim Vitest, a test script, or a working GitHub Actions pipeline exists unless one has actually been added and verified

## Repository layout

```text
PearNote/
├── AGENTS.md                         # this repository-wide operating contract
├── PearNotes-Blueprint/             # canonical product/design/learning/engineering/roadmap specs
├── src/
│   ├── App.tsx                      # inherited app/router, large and coupled
│   ├── main.tsx                     # runtime mode + Convex Auth provider
│   ├── pages/LiveSpace.tsx          # inherited live-room orchestration; regression-sensitive
│   ├── components/                 # Canvas, Rail, WidgetPicker, docks, etc.
│   ├── widgets/                    # inherited renderer families
│   ├── data/                       # widget types, spaces, templates
│   └── lib/                        # routing and canvas/widget helpers
├── convex/
│   ├── schema.ts                   # reexports tables from convex/tables/*
│   ├── tables/                     # existing persistent schema modules
│   ├── auth.ts                     # guest-to-account flow: preserve identity continuity
│   ├── auth.config.ts              # JWT issuer configuration; do not remove
│   └── convex.config.ts            # component registration
├── docs/                            # inherited implementation documentation
├── public/                          # inherited assets: audit before reuse
├── scripts/                         # inherited tooling
├── netlify.toml                     # inherited deployment wiring — isolate/replace safely
├── package.json
└── package-lock.json
```

## Actual commands (from repository scripts)

```bash
npm ci                  # use lockfile for repeatable installs
npm run dev             # Vite client
npm run dev:backend     # convex dev; requires a correctly isolated deployment
npm run build           # tsc -b && vite build
npm run preview         # preview compiled dist
npx tsc -b --pretty false   # TypeScript project checks
```

There is currently no guaranteed `npm run lint`, `npm run typecheck`, `npm test` or `npm run format` script. Inspect `package.json` before choosing checks; add CI/tests through an approved issue instead of reporting nonexistent passes. **Never run the inherited `npm run deploy`**: its script points to a fixed, upstream-era Netlify site. Likewise, do not run Convex pushes or migrations against unidentified upstream/shared deployments.

## Branching, coordination and review

- `main`: production/reference branch. **Never push or merge to main without the user's explicit approval for that merge.** A blanket approval is not implied.
- `develop`: integration branch. The coordinator can merge **reviewed, passing** PRs here.
- `feature/<issue>-*`, `fix/<issue>-*`, `chore/<issue>-*`: one engineer/issue/isolated branch. Branch from current `develop` and open PR **into `develop`**, not `main`.
- Before starting, announce issue, branch, owned paths, dependencies and any overlap. Never force-push shared refs or silently rebase another engineer's work.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.). Reference the issue in PR body; show test logs/evidence; flag blockers and decisions.
- Review gates: accurate scope, diff review, security/privacy, regression/manual QA, available automated checks, docs updates. Owner must enable GitHub branch rules/checks where supported; do not claim protections are configured unless verified.
- No engineer may deploy to production, configure live billing, alter real users' data, or merge to `main` by themselves.

## Code and safety conventions

1. TypeScript strongly typed: do not introduce implicit `any`; use current local patterns. Favor additive, narrowly scoped changes over renaming/reformatting large files.
2. Preserve pan/zoom, drag, cursors, room chat, widget gestures, and the tactile OurSpaces design grammar. Refactor large `src/App.tsx` and `src/pages/LiveSpace.tsx` only behind tests/feature boundaries.
3. In `convex/`, inspect `schema.ts`, `tables/rooms.ts`, auth and existing components first. Use `v.*` argument/return validators, explicit indexes, bounded indexed queries, internal functions for internal workflows, and checked ownership/role authorization. Avoid introducing a second database/auth/queue.
4. Never trust a browser-provided owner ID or a model-generated permission decision. Isolate private sources/segments, attempts, mastery and tutor history; group AI only sees explicitly shared, authorized material.
5. File storage uses backend-owned Convex storage IDs and authorized short-lived retrieval links. No public uploads, exposed provider keys, unchecked input documents, or unreviewed ingestion.
6. AI outputs **validated typed proposals**, not executable JSX/HTML/JS. Include citation/source-segment provenance, uncertainty/abstention, rate and cost limits, safe retries, idempotency and malicious-document prompt-injection defenses.
7. The student's subjects are initially **empty**; never silently seed Biology or pretend imported content is real. Separate labeled demo fixtures from real accounts.
8. An educational activity is separate from its rendered widget and canvas coordinates; immutable attempts/mastery belong server-side. Progress and XP must follow verified evidence, not client clicks.
9. Preserve OurSpaces LICENSE/copyright and original attribution; audit media/fonts/branding separately before new PearNotes user-facing release.
10. For security-sensitive tests, verify user A cannot read user B's private subject, source or segment even with a guessed valid ID.

## Phase 00 working boundaries

- **00.1:** baseline SHA/provenance, rights audit, safe builds, isolated deployment and checks (no upstream endpoints).
- **00.2:** architecture/widget inventory and minimal feature-gated CanvasShell; avoid a rewrite.
- **00.3:** PearNotes visual tokens, genuine first-run empty subject picker, path drawer / lesson shell prototypes; do not invent working backend states.
- **00.4:** additive Convex domain foundations, indexes, auth checks, storage handling; do not rewire existing guest login.
- **00.5:** real Meta + real PDF/text end-to-end validation on isolated preview, with budget and failure cases, **after** prerequisites and credentials are verified.

The coordinator allocates file ownership to avoid overlapping PRs. When a blocker crosses workstreams, stop at the interface, report it with exact paths, and wait for an integration decision rather than editing another engineer's assigned files.

## Environment & deployment

- `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL`: **public** client endpoint configuration, but values still must point at the authorized PearNotes deployment, not inherited upstream values.
- `CONVEX_DEPLOYMENT`, Convex Auth/JWT setup, and server-side Meta credentials: supplied **privately per environment** by the owner/authorized provisioning flow. Never commit values or paste secrets into issues, comments or logs.
- Do not copy `netlify.toml`'s inherited Convex URLs or `package.json`'s fixed site ID. Verify dev/preview/prod separation before first backend push or deployment.
- Add a sanitized `.env.example` when a scoped issue requires it. Do not invent an API key name or a model ID as if already configured.

## Documentation, acceptance and reporting

Read the precise spec relevant to your issue plus `PearNotes-Blueprint/delivery/ACCEPTANCE_TESTS.md`, `delivery/SECURITY_PRIVACY.md` and `engineering/API_CONTRACTS.md` when applicable. Follow the current roadmap; do not pull Phase 02–08 features into Phase 00. Document deviations in `PearNotes-Blueprint/delivery/DECISIONS_RISKS.md` through a proposed ADR, not an unapproved new policy.

For every PR report: **Issue / Summary / Changed paths / Tests actually run with results / Screenshots or short reproduction steps / Security checks / Known gaps and blockers / Required decisions / Follow-up**. Report failed or unrun checks plainly. Work is complete only when acceptance criteria are demonstrably satisfied on the correct branch and environment.

## Asynchronous multi-agent handoffs (mandatory)

Engineers are independent AI workers; they **cannot coordinate in real time**. The **owner relays** their reports to the coordinator, who resolves interfaces, dependencies, priorities, code reviews and integration. Do not tell another engineer to "coordinate with Engineer N" and assume that conversation will occur.

1. Before assignment the coordinator publishes a self-contained GitHub issue with: exact pinned `develop` SHA, owned paths, expected imported/exported types, API contract, dependencies, acceptance criteria, fixtures and testing responsibilities. If any interface is missing, report the blocker in your next message to the owner rather than making speculative cross-workstream changes.
2. Work in an **independent clone or isolated git worktree per engineer**, never the shared root checkout. A shared directory's `HEAD` is unsafe under parallel agents. If using worktrees, give each a unique directory and branch; always run `git status --short --branch` and `git branch --show-current` before staging/committing/pushing. Stage only your issue paths; no `git add -A` in a shared tree.
3. Send a structured checkpoint via the owner: `issue, source/develop SHA, branch/HEAD SHA, changed paths, contract exported, tests executed with results, blockers, PR URL`. The coordinator can publish your interface to dependent engineers on their *next* instruction cycle.
4. Parallel work is allowed only for disjoint owned paths or frozen contracts. For shared integration files, implementers deliver exported functions/components and the coordinator integrates them in a separate PR after both feature PRs are reviewed.
5. The **owner is responsible for manual browser visual/interaction/UX testing on the live Vercel preview**. Engineers should provide build and automated-test evidence and reproducible URLs/scenes, but must not claim the owner has approved a UI or that they have tested the owner's logged-in live browser. If an engineer independently ran a local headless check, label it as local automated evidence, not owner acceptance.
6. Do not start additional engineers merely to occupy all four slots. When env/permissions/accepted contracts block the next useful task, explicitly mark the engineer idle and await a coordinator assignment.
