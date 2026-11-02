# OurSpaces-fidelity redesign — implementation plan, QA matrix and release gates

**Owner feedback date:** 2026-11-02. **Status:** design rejection of integrated UI, NOT user acceptance. **Rule:** documentation and green CI alone do not resolve findings; prove native UI adaptation through owner-confirmed browser use. No merge to `main` or production release without explicit owner authorization.

## 1. Problem and goal

The integrated `develop` baseline has a working initial router/app shell/branding but the owner rejects its visual composition. The revised target is an OurSpaces-native experience with education data. Separately, a real Gmail sign-up attempt fails; secondary demo subjects open unreadable blank paths. These are not polish suggestions: they are design and functionality release blockers.

**Success means:** at a glance Home resembles an adapted `/#/space/crew/knows`, public landing looks as carefully designed as `/#/about`, dock is an adaptation of original `Rail`, dialogs use the original split welcome shell, lessons feel like `/#/space/crew`, all selectable demo subjects work and a real Gmail user can register. No loss of account boundaries, source provenance or native room gestures.

## 2. Baseline and branch policy

At this document's creation, previous PRs #55–#58 merged to `develop` HEAD `2f6dc9744e310d2af7814387ca857886eb7a3fb6`. This is a **historical baseline**, not a moving current-head claim. Work in feature branches based on latest develop, review PRs and CI, integrate reviewed changes into `develop` only. No feature PR should edit `main`, production Convex or purchase model credits without approval.

**Prevent simultaneous giant rewrites:** base UI extraction before page reskins, backend auth investigated separately from visual auth, persona state before friend feed, fixture path data independently of production logic, lesson inheritance behind tests.

## 3. Proposed four-engineer ownership and dependency order

| Engineer | Primary ownership | Ancestor to study | Required outcome |
|---|---|---|---|
| E1 — public + auth UI | LandingPage, GetStartedModal, AuthPages, entry CSS; no backend email secrets | About editorial page and original welcome modal | Native visual landing, split modal, responsive auth screens, safe routing |
| E2 — shell + personal UI | AppRail, Home, Library, Shelf, Groups entry, Profile/Settings shell, path presentation | original Rail, /knows cards, MemberFace and native settings | actual reuse/extraction, responsive original-feeling personal app |
| E3 — visual assets + design QA | Flora art brief, illustration assets, Sticker P integrity, avatar pack concept and responsive art | original About collage, 8 avatar chooser, sticker library | approved original visual family, files/provenance/licensing; no independent page rewrite |
| E4 — auth, identity, contracts | Gmail/OTP send, provider logs, Google OAuth, persistent profile, owner-scope, friend permission schemas | existing Convex Auth/AgentMail, identity/presence | real verified sign-up, consistent 1x persona assignment, secure activity and session boundary |

**Joint interfaces:** E1/E3 collaborate on landing art slots; E2/E3 on native avatar/subject/achievement art and CSS; E2/E4 on account profile and friend feed contracts; E2/E4 plus existing learning engine owners on per-subject path and lesson grounding. Each engineer commits only owned files or coordinates explicit shared extraction.

### Dependency sequence (suggested)

0. **Freeze acceptance baseline:** owner screenshots, route/action traces and source reuse map; log failures without calling them "accepted".
1. **P0 reliability in parallel:** E4 diagnose and fix real Gmail OTP under isolated deployment, redact logs; E2 fix unreadable/empty per-subject demo path and safe state labels. These block any release.
2. **Native component extraction:** E2 derives generic dock, card board, people capsule, popup and setting face controls from originals while keeping existing OurSpaces routes regression-safe. Build a side-by-side component gallery. Do not immediately rebuild every page.
3. **Visual asset kit:** E3 owner-approved Flora generation budget and source art; deliver hero collage, eight+ persona candidates if required, subject pack, trophies and source illustrations with provenance. E1/E2 use assets within shared primitives. No new logo selection.
4. **Landing/auth adaptation:** E1 builds owner-approved original About-style layout and split dialog; E4 wires correct error categories; test entire account flow, not email form skin alone.
5. **Home and secondary pages:** E2 builds material board from original /knows then Library, Groups, Shelf, Profile, Settings; E4 powers real profile/presence only where secure. Each screen retains native dock.
6. **Lesson integration:** refactor existing PearNotes lesson canvas into inherited OurSpaces room runtime, preserving breadcrumb/activities pill, original widgets, source-grounded challenges and privacy; full path from every demo subject.
7. **Cross-device/responsive/real-data QA:** screenshot, automated behavior, account leakage, Gmail delivery, group room two browsers, owner test and revisions.
8. **Only after sign-off:** consider an explicit owner-approved release/`main` decision. Real Biology PDF evidence gate #31/#45 remains separate and required for any complete learning-demo claim.

## 4. Cross-screen fidelity acceptance matrix

| ID | Route/surface | Owner acceptance requirement | Must not happen |
|---|---|---|---|
| R01 | `/` desktop/mobile | About-inspired illustrated collage, meaningful narrative sections, Sticker P and working links | text-only black void, 4 generic equal tiles |
| R02 | Get Started | original split editorial modal, art/cream, concise choices, keyboard focus | 900px giant lime block, forced shortlist |
| R03 | `/auth/sign-up` | valid Gmail OTP send/receive/verify and on-brand form | misleading address-blaming generic catch |
| R04 | `/auth/sign-in` | existing account returns same identity and private data | new user row/data duplication |
| R05 | Google | visible only if configured, successful allowed callback | fake button or unsafe redirect |
| R06 | `/app` first run | /knows-native paper desk and **zero** subjects/friends/awards | demo Biology or sample activities |
| R07 | `/app` returning | actual Resume, learning calendar/events, evidence states | fake progress, unsupported "live" |
| R08 | left dock | inherited Rail silhouette/behavior, 7 custom icon destinations, user face | detached second UI kit, lost active semantics |
| R09 | Learn picker | native subject discs, broken-ring +, clear create/enter action | pre-seeded subjects for fresh user |
| R10 | Demo Biology | authored path with functioning nodes/lesson | real account mutations, false social status |
| R11 | Demo Algebra | separate real fixture path and openable sample lesson | blank white/cream path |
| R12 | Demo Chemistry | separate real fixture path and openable sample lesson | stale Biology node/progress |
| R13 | Real subject no source | readable paper "not ready" with upload CTA and transparent status | blank screen, low-contrast text |
| R14 | Lesson | original room canvas, upper-left breadcrumb, lower-left activities list, widget drag/focus, sources | static empty 1600×1200 board |
| R15 | Library | original paper gallery, upload/review/error flow, source citation | plain disconnected list, foreign file leak |
| R16 | Groups | original room gallery/space and authorized presence | default fake friends, implicit source sharing |
| R17 | Shelf | authored award shelf with verified server grants | unearned trophies/XP |
| R18 | Profile | eight+ illustrations, assigned stable username/look, avatar and cursor change | generic letter avatar only, reset on login |
| R19 | Settings | original face/settings panel, real controls, privacy | unrelated new modal or dead switches |
| R20 | Friends capsule | real accepted friends with permitted summary and invite | guessed activity/grades/sources |
| R21 | Legacy `/#/space/crew` and `/#/space/crew/knows` | no regression in original room interactions and fidelity | native original app breakage |
| R22 | Demo while signed into real account | sample persona and fixture only; no private read/write, no auto guest mint | exposing real profile, API mutation |
| R23 | Responsive 390px | readable, tab/keyboard, focused controls, native compact dock/sheet | scroll clipping or dark-on-dark |
| R24 | Test proof | video/screenshot pairs, real backend traces, Git SHA and owner result | "DevTools smoke passed" claimed as owner acceptance |

## 5. Behavior trace scripts

### Script A: Landing → Get Started → Gmail account
1. Open fresh browser to `/` at 1440×900. Verify original-style visual hero and account not auto-created.
2. Get Started; screenshot split modal; tab through choices; Escape closes and focus returns.
3. Open Sign Up via modal; enter valid owned Gmail, observe sending status and safe result.
4. Record actual email receipt (no screenshot exposing OTP publicly), enter digits, verify.
5. Account owner ID initialized; illustrated default persona appears, can select or keep; Home has **no real subjects**.
6. Reload, open second device/browser, sign in using same Gmail; same profile and own data; sign out and confirm no cached private content. Repeat negative bad/expired OTP and rate-limited cooldown.

### Script B: Demo composition and subjects
1. `/demo` canonicalizes to `?fixtures=1` before any private live UI mounts; visually matches Home design; unmistakable DEMO labeling.
2. Check Home art, original dock tooltips, seven destinations, circle profile fixed "demo learner".
3. Learn → Biology right drawer: authored path, click valid lesson, original breadcrumb and activities pill; back restores drawer.
4. Learn → Algebra → lesson; Chemistry → lesson; switch rapidly and refresh deep link. Distinct topic data and no blank/light unreadable panel.
5. Try Add source/create subject/attempt: no authenticated mutation; disabled/local-only demo feedback. No real account name appears even if another tab is signed in.

### Script C: Personal curriculum flow
1. In genuine account with no source, Learn shows only plus; create subject manually, see path-empty designed paper state.
2. Upload a small owned PDF/text source using existing intake route; confirm extraction, grouping/proposal and explicit approval. No source-free fake lesson.
3. Open approved curriculum, see real content version, source count, objective and path nodes; start lesson, see source citation and original camera gesture.
4. Submit genuine test challenge; attempt ack, follow-up progress, no false XP; leave and resume preserving viewport.
5. Test source removed/revised or unauthorized id, observe safe source-unavailable/denied surfaces.

### Script D: Original space regression and group permissions
1. Open `/#/space/crew` and `/#/space/crew/knows`, compare dock, modal, cursor, widget drag and about page with archived screenshots.
2. Create/enter authorized group room on two *different* learner accounts; note/presence updates truly live.
3. Open Friends capsule, see only accepted and permitted friend activity.
4. Attempt to fetch another learner's personal PDF/attempt, expect server deny; revoke room source access, confirm it disappears.

### Script E: Accessibility and device variation
1. At 390×844, 768×1024, 1440×900 and 1728×1117, inspect typography, card hierarchy, dock placement, modal fit and drawer.
2. Tab through all nav, modal and widget actions. Escape/Back returns focus and context, touch/pointer doesn't accidentally drag a form.
3. Text zoom 200%, prefers-reduced-motion, keyboard-only activity mode and high contrast. Lesson objects must remain readable without pan when linear alternative selected.
4. Slow 3G/failed PDF/network reconnect shows native recovery slips, not a fake "live" spinner; no lost unsubmitted drafts.

## 6. Automated test suites that must accompany feature PRs

- **Visual regression:** Playwright screenshot comparison at same viewports; baseline approved original OurSpaces view + adapted component, image difference reviewed intentionally (not a false exact pixel comparison of different information).
- **Route:** root never hijacked, browser back/forward, deep-link subject/lesson, demo isolation, legacy hash routes, no query-flag privilege escalation.
- **State:** current account id remount, subject-scoped path cache, React effect cleanup, fixture vs real data, selected node and drawer scroll, personally persisted card layout.
- **Accessibility:** axe, keyboard focus, role/name, focus trap/restore, contrast on cream, no invisible controls/closed modal click-through.
- **Backend:** actual email OTP function error handling, provider delivery smoke, rate limit, resend expiry, authenticated user/profile, Google OAuth (if enabled), private queries, attested source/challenge.
- **Data honesty:** never show fake friends, dates, streaks, completed badges or mastery on actual accounts; positive demo markings on every sample screen.
- **Native room regression:** original widget library still supports gesture lease, selection, drag, resize, pin, thread, cursor and Sync; new education widgets use same shell.
- **Performance:** old widgets still responsive; new page art loads lazily, 1st viewport image prioritized, no large unoptimized hero, route code splitting retained.

## 7. Required PR review format

Each PR description must include:
1. **What page/problem** and owner review screenshot #; reproduction before and after.
2. **Exact OurSpaces ancestor** file and CSS selectors, what is reused and what is adapted.
3. **Code changes and backend** including origin scope/account checks.
4. **Before/after screenshots at desktop + mobile**, link to comparison capture; if a comparison is intentionally impossible, explain.
5. **Automated verification actually executed** with results and names, not only "green".
6. **Manual engineer smoke** with actions/results; owner acceptance explicitly still pending.
7. **Potential regressions** to legacy original room, existing sources, login and demo.
8. **Licensing/provenance/Flora actual spend** for new images, no assumed permissions.
9. **Current SHA, Vercel preview link, deployment mode**, no prod claims.
10. **Unresolved issues and follow-up** with truthful priority.

If a screen is only a functional shell and has not inherited the original style, it is **NOT DONE** regardless of passing typecheck.

## 8. P0 defects to log and prioritize

**P0-OTP:** owner's valid Gmail code request fails with generic message; root cause unknown until backend/provider logs inspected and real Gmail receipt confirmed. See `../engineering/AUTH_AND_ACCOUNT_RELIABILITY.md`.

**P0-PATH:** algebra/chemistry demo paths blank while Biology populated and unreadable low-contrast text. Correct fixture shape and empty-state contrast; ensure real new accounts remain empty and private. See `../design/LEARNING_PATH_AND_LESSON_CANVAS.md`.

**P1-DESIGN-PARITY:** landing, Get Started, Home/dock and lesson diverge from OurSpaces. Owner specifically rejects these in screenshot review. Visual code ancestors required. See `../design/OURSPACES_FIDELITY_CONTRACT.md`.

**P1-PERSONA:** account default avatar is not yet shown as original eight-chooser profile, no durable cursor binding evidenced. Must implement and accept. See `../design/IDENTITY_FRIENDS_GROUPS.md`.

**P1-SECONDARY:** Library, Groups, Shelf, Profile, Settings must use native material, not plain placeholder pages. They can state backend pending honestly while being visually intentional.

**P1-E2E:** genuine Biology PDF → source validation/attestation → approved path → lesson → two evidenced wrong attempts → opt-in practice → persistence remains a separate release gate (issues #31 and #45); don't use fixtures as evidence.

## 9. Gate sign-off register (fill only after real tests)

| Gate | Required evidence | Status at creation |
|---|---|---|
| G0 Owner approved new specifications | PR reviewed and owner accepted detailed written rules | **PENDING** |
| G1 visual lineage source mapping | ancestor and proposed adapted screenshots for all pages | **PENDING** |
| G2 first-run private account | true zero-source Home and stable default avatar | **PENDING** |
| G3 Gmail OTP | real send+receive+verify on designated isolated deployment | **FAILED / BLOCKED** |
| G4 Google when configured | verified OAuth flow and safe redirect test | **UNVERIFIED** |
| G5 demo all subjects | all path/lesson fixtures and mode isolation | **FAILED / BLOCKED** |
| G6 native lesson gestures | original breadcrumb/activity list/widget pan/zoom | **PENDING** |
| G7 learning evidence | real Biology source-based adaptive loop | **PENDING** |
| G8 privacy/regression/a11y | two-user adversarial tests and desktop/mobile native UI | **PENDING** |
| G9 owner browser acceptance | owner recorded PASS for every required screen | **PENDING** |
| G10 main/release decision | owner's separate explicit authorization | **NOT AUTHORIZED** |

**Owner acceptance is not delegated to an engineer or screenshot tool.** A PR can merge to develop with clear pending gates; it must not be presented as complete product acceptance or production readiness.
