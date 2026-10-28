# Phase 00 — Verified baseline, upstream provenance and environment hazards

**Owner:** Engineer 1 (issue #2 / P00.1A) · **Audit date:** 2026-10-28 ·
**Method:** full upstream clone + per-file object-hash comparison. No upstream
service was contacted except the public GitHub repo (read-only clone).

## 1. Pinned commits

| Ref | SHA | Date | Notes |
|---|---|---|---|
| Upstream `main` HEAD | `45bebcbeb7474e3e30f403b2f8e466e7bdc07304` | 2026-10-13T00:50:14-07:00 | `thomasnguyen/ourspaces-app`, 536 commits, last pushed 2026-10-13T07:50:15Z |
| PearNote baseline (`main`) | `6b3f75ec67b552a756972c01f1e36eee206ab1ab` | 2026-10-27T21:05:30+01:00 | "Initial commit" — **squash import, no shared git history with upstream** |
| PearNote `develop` at audit | `f67aa9d7583ee58ee723c44f8a6dc43e24642037` | 2026-10-27T22:57:18+01:00 | baseline + root `AGENTS.md` (PR #1) |

**Upstream:** https://github.com/thomasnguyen/ourspaces-app (`main`) ·
author of pinned commit: Thomas Nguyen <imtoshiru@gmail.com> · MIT License.

## 2. Ancestry: what the snapshot actually is

The PearNote "Initial commit" is a **content copy** of upstream `45bebcb`, not a
git fork — `git rev-list` shares no objects with upstream.

Verified by hashing every tracked file (`git rev-parse HEAD:<path>` vs
`git hash-object`):

- **531 shared files: all byte-identical to upstream `45bebcb`** except
  `.gitignore` (rewritten, see §5.3).
- **Removed by the snapshot** (upstream files not carried over):
  - `.agents/skills/` (Convex agent skills, ~47 files)
  - `.claude/skills/` (incl. `run-ourspaces` browser driver + feature docs, ~41 files)
  - `.github/` (all `readme/` and `devpost/` images referenced by README)
  - `.env.local.example`
- **Added by the snapshot:** root `AGENTS.md`, `PearNotes-Blueprint/` (48 spec docs).

**Consequence:** the Blueprint's claim "current OurSpaces main may drift" is
resolved — the snapshot matches upstream main exactly as of 2026-10-13. Any
upstream fixes after `45bebcb` are NOT in this repo and must be cherry-picked by
hand (no merge ancestry exists).

## 3. License and attribution chain

- `LICENSE` is **byte-identical** to upstream: MIT, `Copyright (c) 2026 Thomas
  Nguyen`. Retained. Do not remove.
- `README.md` (still the upstream README) credits Thomas Nguyen (build) and
  Holly Tran (design), links the upstream repo and `ourspaces.io`.
- Per hackathon/open-source rules and the Blueprint: keep the MIT notice, keep
  upstream attribution in whatever README replaces the current one, disclose the
  fork relationship in the submission.

## 4. Environment hazards — inherited deployment coupling

**Do not run any of these until P00.1B lands.** They mutate or send data to the
original authors' infrastructure.

| Location | Hazard | Effect if run |
|---|---|---|
| `package.json` `deploy` | `netlify-cli deploy --site 3b6e9f86-2714-4074-b65e-704346455bbf --prod` | Pushes `dist/` to upstream's **production** Netlify site |
| `package.json` `dev:lane` / `deploy:dev` | `scripts/dev-lane.sh` | `CONVEX_DEPLOYMENT=dev:dusty-condor-648 npx convex dev --once` **pushes our functions to upstream's dev deployment**; `deploy` also pushes to the same upstream Netlify site |
| `package.json` `deploy:convex` | `npx @convex-dev/static-hosting deploy` | Pushes site + functions to whatever `CONVEX_DEPLOYMENT` resolves to — upstream's, if ambient env points there |
| `package.json` `sync:storyboard` | `scripts/sync-storyboard.sh` | Local-only (rewrites `public/`); safe but references upstream host in comments |
| `netlify.toml` | `VITE_CONVEX_URL/SITE_URL = necessary-cobra-892.*`, `/api/* → necessary-cobra-892.convex.site` | Any Netlify build of this repo talks to upstream's prod Convex backend |
| `convex/spaces.ts:167` | `OPEN_ROOM_DEPLOYMENTS = ["dusty-condor-648","necessary-cobra-892"]` | Feature gate keyed to upstream deployment names (dead on our deployments; re-key in Phase 00.5) |
| `convex/tavily.ts:44` | `LANES = ["dusty-condor-648","necessary-cobra-892"]` | Same — Tavily lookups silently disabled elsewhere |
| `convex/digest.ts:30` | `SITE = "https://necessary-cobra-892.convex.site"` | Digest emails would link upstream's site |
| `src/main.tsx:46` | `OPEN_LANE` regex `dusty-condor-648` | Harmless gate; re-key later |
| `src/components/VoiceBuildLayer.tsx:19` | `/dusty-condor/` env test | Same |
| `index.html` | `og:url`/`og:image` → `ourspaces.io` | SEO/social meta points at upstream product — replace on rebrand |
| `public/storyboard.html`, `docs/ourspaces-product.html` | `ourspaces.io` refs | Docs/media only; not runtime config |

Two upstream Convex deployments exist: `necessary-cobra-892` (prod) and
`dusty-condor-648` (dev lane). Neither belongs to PearNotes.

## 5. Build verification (executed 2026-10-28)

Environment: macOS 27.0.1 (26A434) arm64 · Node `v24.22.0` · npm `11.19.1`.

| Command | Result | Evidence |
|---|---|---|
| `npm ci` | **PASS** | 128 packages added, audited 129 in ~8s |
| `npm run build` (`tsc -b && vite build`) | **PASS** | 328 modules, built in ~2.1s |
| `npx tsc -b --pretty false` | **PASS, 0 errors** | exit 0 (also ran as stage 1 of `npm run build`) |

Warnings (pre-existing, non-blocking):

- `npm audit`: **4 high-severity advisories** — `source-map-js`
  (GHSA-68fv-2mgg-jv7q), `undici` 7.0.0–7.30.0 (16 advisories), `vite`
  8.2.0–8.2.2 (6 advisories). All in dev/build-time deps; `npm audit fix` exists
  but changes the lockfile — **deferred pending coordinator sign-off**, tracked
  as a known risk, not fixed silently.
- Deprecated transitive deps: `lucia@3.2.2`, `@oslojs/{asn1,binary,crypto}`.
- npm 11 blocked `esbuild@0.27.0` and `fsevents@2.3.3` install scripts
  (`allowScripts`). **Build unaffected** — Vite 8 uses rolldown, not esbuild.
- Vite chunk-size warning: `index` chunk 1,245.86 kB (>500 kB). Pre-existing.

## 6. Asset / rights inventory

Statuses: `ok` (rights clear), `needs_review` (unverified — per issue spec, NOT
assumed MIT by association), `replace` (upstream branding/personal content that
must go before a PearNotes public release).

| Asset | Path | Status | Notes |
|---|---|---|---|
| npm dependencies | `package.json`, `package-lock.json` | ok | OSS via pinned lockfile; audit findings in §5 |
| Fonts | Google Fonts CDN: Bricolage Grotesque, IBM Plex Sans (`src/index.css:1`) | ok | Both SIL OFL; note runtime CDN dependency — consider self-hosting later for offline/privacy |
| UI sounds ×3 | `public/sounds/*.mp3` | needs_review | Mixkit SFX Free License, IDs documented in `public/sounds/README.md`. License allows use in projects; redistributing raw MP3s inside an OSS repo is a gray area — low risk, keep with flag |
| Illustrated avatars ×28 | `public/avatars/*.png` | needs_review | Presumed original art (Holly Tran, design credit in README); no per-asset license grant. Keep for dev; verify before marketing use |
| Stickers ×18, posters, textures, link-card art, space covers | `public/assets/**` | needs_review | Same presumption of original artwork |
| OurSpaces brand mark + icons | `public/assets/ourspace-mark.png`, `public/icons/*`, `public/favicon.png`, `public/apple-touch-icon.png` | replace | Upstream product identity — swap during PearNotes rebrand (Phase 00.3) |
| Third-party marks | `public/assets/firecrawl-{mark,wordmark}.svg` | needs_review | Firecrawl trademark; shown as partner badge upstream. Remove or re-permission for PearNotes |
| Personal photos of named individuals | `public/photos/**`, `public/demo-video-assets/**` (incl. `myspace/assets/*-2006.jpg` portraits, `thomas-desk.jpg`, `holly-desk.jpg`), `public/assets/the-crew-snapshot.*`, `public/assets/space-covers/*` | replace | Real people from the upstream authors' household/hackathon; not stock art. Remove from user-facing PearNotes before release; keep out of any demo |
| Internal demo deck | `public/storyboard.html`, `public/demo-video-assets/**` | replace | Upstream submission planning deck; references `ourspaces.io` and personal photos |
| Seeded personas/spaces | `src/data/spaces.ts` (1,474 lines), `src/data/family.ts`, `src/data/templates.ts`, `public/manifest.webmanifest` | replace-in-UI | Mock personas (Maya, Jules, Sam, Rio, Kenji, Ash; family members) + photos. Blueprint: demo fixtures only, never on real accounts (P00.3+) |
| Eval corpus | `eval/right-of-way/**` | ok | Upstream-authored test data (no third-party content detected) |
| Agent skills lockfile | `skills-lock.json` | ok | Metadata only; skill payloads were removed by the snapshot |

## 7. Smoke-test matrix

Executed tests are marked **DONE**; everything else is a plan, not a result.

| # | Test | Status | Evidence / blocker |
|---|---|---|---|
| S1 | Cold boot, no env | **DONE — PASS** | `npm run dev` → `/` renders `MissingConvexConfig` ("Convex isn't connected"), 0 console errors |
| S2 | Mock mode board | **DONE — PASS** | `?mock=1` auto-routes to `#/space/crew`; 228 widget elements + canvas render; **0 console errors/warnings**; demo banner + rail + 4 seeded spaces visible |
| S3 | Pan/zoom + drag | BLOCKED | needs isolated Convex dev deployment (live mode); mock renders but persistence-level checks need backend |
| S4 | Two tabs, two identities, chat/presence | BLOCKED | requires isolated deployment + provisioned auth |
| S5 | Back/reload resume | PARTIAL | hash routing + mock state verified; live session persistence blocked with S4 |
| S6 | `/api/*` HTTP routes | BLOCKED | requires deployed `convex/http.ts`; deliberately not pointed at upstream |

**Blocker for S3–S6:** a PearNotes-owned Convex dev deployment + env vars.
Owner action required — see P00.1B (`DEPLOYMENT.md`) for the provisioning
request. Until then no engineer can produce live-sync evidence; nobody should
point `VITE_CONVEX_URL` at `necessary-cobra-892` or `dusty-condor-648`.

## 8. Known defects found during baseline

| # | Defect | Severity | Fix owner |
|---|---|---|---|
| D1 | `README.md` references `.github/readme/*` images that the snapshot did not carry over → broken images on GitHub | Low | Rebrand (Phase 00.3) or restore from upstream |
| D2 | `MissingConvexConfig` (`src/main.tsx:32`) tells users to copy `.env.local.example`, which the snapshot deleted | Low | P00.1B ships `.env.example` |
| D3 | `.gitignore` rewrite dropped upstream's `*.tsbuildinfo`, `.netlify/`, `.mcp.json`, `.private/`, `.context/` ignores. `tsconfig.app.tsbuildinfo` is now generated unignored (confirmed in `git status`); `.mcp.json` carries API keys upstream and would be committable here | Medium | P00.1B (`.gitignore` hygiene) |
| D4 | `deploy`/`dev:lane`/`deploy:convex`/`netlify.toml` target upstream infra | High | P00.1B |
| D5 | `index.html` og meta + `storyboard.html` still brand OurSpaces/`ourspaces.io` | Low | Phase 00.3 rebrand |
| D6 | `npm ci` reported "added 128 packages" against 217 lockfile entries — the remainder are platform-optional packages skipped on darwin-arm64 plus deduped installs; build passes, so nothing material is missing. Confirm install parity on Linux CI | Watch | CI (P00.1B) |

## 9. Risks and rollback for Phase 00.2/00.3

- **Shared working tree:** multiple engineers' uncommitted files currently
  coexist in this checkout (`src/pearnotes/`, `convex/tables/learning.ts`,
  `tests/`, modified `src/App.tsx`, `src/lib/routes.ts`, `convex/schema.ts`,
  `package*.json`). Each engineer must stage **only their owned paths** — never
  `git add -A`. Reported to coordinator.
- **Upstream drift:** snapshot pinned at `45bebcb`; later upstream fixes are
  not automatically available. If a sync is ever needed, add upstream as a
  remote and cherry-pick — no merge ancestry exists.
- **This doc is docs-only.** Rollback = `git revert` of the docs commit; no
  runtime, schema or config was changed by P00.1A.
- **`npm ci` caveat:** `package-lock.json` is the upstream one; first CI run on
  Linux should confirm install parity (esbuild/fsevents script blocking is
  npm-version-dependent).
