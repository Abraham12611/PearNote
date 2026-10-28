# Phase 00 — Deployment isolation, environments and CI

**Owner:** Engineer 1 (issue #3 / P00.1B) · **Date:** 2026-10-28 ·
Companion to [BASELINE.md](BASELINE.md), which maps every inherited coupling.

## 1. What this change makes safe

| Before (hazard) | Now |
|---|---|
| `npm run deploy` → upstream prod Netlify site `3b6e9f86-…` (`--prod`) | Fails loudly with a pointer here |
| `npm run deploy:convex` → ambient `CONVEX_DEPLOYMENT` (could be upstream) | Fails loudly with a pointer here |
| `npm run dev:lane` / `deploy:dev` → `scripts/dev-lane.sh` pushed functions to upstream `dev:dusty-condor-648` + upstream Netlify | Scripts removed; `scripts/dev-lane.sh` deleted |
| `netlify.toml` → hardcoded `necessary-cobra-892` Convex URLs + `/api/*` proxy to upstream backend | File deleted — PearNotes targets Vercel, and a committed Netlify config cannot deploy anything by accident |
| `.env.local.example` deleted by the snapshot but still referenced by `MissingConvexConfig` | `.env.example` created (names only, no values) |
| `.gitignore` rewrite dropped `*.tsbuildinfo`, `.mcp.json`, `.netlify/`, `.private/`, `.context/`, `docs/local/` | Restored (`.mcp.json` can carry API keys in headers) |

**Nothing in this change deploys or contacts upstream infra.** `npm run
dev:backend` (`convex dev`) is unchanged and safe — first run interactively
provisions/selects a deployment; choose/create only a PearNotes-owned one.

## 2. Environment boundaries

| Env | Convex deployment | Frontend | Who/what touches it |
|---|---|---|---|
| dev (local + owner preview) | `dev:keen-marten-701` — **provisioned**, see [LIVE_BACKEND.md](LIVE_BACKEND.md) | `npm run dev` + `.env.local`, Vercel PR previews | all engineers |
| preview (dedicated) | optional: separate deployment or Convex preview deployments — see LIVE_BACKEND §4c | Vercel PR previews | CI on PRs to `develop` |
| prod | `wooden-rat-386` exists (auto-created by Convex) but is **empty — do not push** | — | nobody until Phase 07-style review |

Rules:
- One Convex **project**, three deployments — do not create a second project or
  an anonymous/personal backend.
- `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL` are public client config but must
  still name a PearNotes deployment — never `necessary-cobra-892` or
  `dusty-condor-648`.
- Server-side secrets (`NEBIUS_API_KEY`, `FIRECRAWL_API_KEY`,
  `AGENTMAIL_API_KEY`, `TAVILY_API_KEY`, future Meta credential) live only in
  Convex deployment env (`npx convex env set`) — never in the repo, never in
  Vercel env, never in issues/PRs.
- `/api/*`: inherited Netlify proxied it to `*.convex.site`. Vercel `rewrites`
  cannot take env vars, so **no hardcoded proxy was added**. The app derives
  the site URL client-side (`src/pages/LiveSpace.tsx:158`); Convex Auth
  discovery is served by the `authWellKnown` component, independent of the
  host. If a same-origin proxy turns out to be required, decide per deployment
  in the project settings — not in a committed file.

## 3. Owner actions required (in order)

Engineers cannot complete these — they need account/credential access.

### 3a. Convex — ✅ DONE (2026-10-28)

Project `pearnote` (team `abraham-dahunsi`), dev deployment
`keen-marten-701` provisioned and functions pushed. Full details, env
surface, and seed state: [LIVE_BACKEND.md](LIVE_BACKEND.md).
Remaining owner step: none required for local dev — `.env.local` was
written by `convex dev` and is gitignored.

### 3b. Vercel (PR previews)
1. Create a Vercel project for PearNotes under the team account; connect this
   repo; **production branch = none/disabled** (previews only — do not enable
   auto-prod deploys).
2. `vercel.json` already supplies: framework `vite`, `npm ci`, `npm run build`,
   output `dist`, SPA fallback rewrite.
3. Set project env for the **Preview** environment only:
   `VITE_CONVEX_URL` = `https://keen-marten-701.convex.cloud`,
   `VITE_CONVEX_SITE_URL` = `https://keen-marten-701.convex.site`
   (values are public client config — see LIVE_BACKEND §2).
4. Verify one PR preview URL serves the app and does NOT call upstream Convex
   (check the browser's network panel for `necessary-cobra-892`/`dusty-condor-648`),
   then run the smoke checklist in LIVE_BACKEND §4b.

### 3c. GitHub branch protection — currently **none** on `main` or `develop`
(verified 2026-10-28: `GET /repos/Abraham12611/PearNote/branches/{main,develop}/protection` → 404)

Settings → Branches → Add ruleset, **once per branch**:

**`main`** — Require a pull request before merging (≥1 approval), require
status checks `typecheck + build` (job name from `ci.yml`), block force pushes,
restrict deletions, require linear history, include administrators.

**`develop`** — Require a pull request before merging, require status checks
`typecheck + build`, block force pushes, restrict deletions.

> Status: **pending owner action**. These were NOT enabled by an engineer; the
> repo connector has no admin rights. Do not treat merges as protected yet.

## 4. CI

`.github/workflows/ci.yml` — triggers on PRs to `develop`/`main` and pushes to
`develop`. Steps, all real: `npm ci` (lockfile) → `npx tsc -b --pretty false` →
`npx oxlint .` (committed devDependency; warns, doesn't gate) → `npm test`
(**runs only if a `test` script exists**; prints a skip notice otherwise — not
a hidden pass) → `npm run build`. Minimal `contents: read` permission.

## 5. Operational smoke + rollback

After preview env is provisioned, the manual smoke run (extends BASELINE §7):

1. Open the Vercel preview URL in two tabs; confirm no `*.convex.cloud` request
   to upstream deployment names.
2. Sign in as two test identities; open the same space both tabs.
3. Vote/edit in tab A → appears in tab B (reactive sync).
4. Drag a card in tab A while tab B requests an AI change → change waits
   (Right of Way).
5. Reload → room state and identity persist.

**Rollback:** every change here is repo content — `git revert` the merge commit
restores prior state. Nothing was deployed, no external resource exists to
tear down. If `convex dev` was pointed at the wrong deployment, delete
`.env.local` and re-run to reselect.

## 6. Remaining upstream references (deliberately left, non-deploy)

Feature gates/comments that name upstream deployment slugs but can only
**deactivate** features on our deployments: `convex/spaces.ts:167`
`OPEN_ROOM_DEPLOYMENTS`, `convex/tavily.ts:44` `LANES`, `convex/digest.ts:30`
`SITE`, `src/main.tsx:46` `OPEN_LANE`, `src/components/VoiceBuildLayer.tsx:19`.
Re-keying these is Phase 00.5 territory — they are feature gates, not deploy
targets, and editing `convex/` is out of P00.1B scope. `index.html` og meta and
`public/storyboard.html` still reference `ourspaces.io` — rebrand workstream.
