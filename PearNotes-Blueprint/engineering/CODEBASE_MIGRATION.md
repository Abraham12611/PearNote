# OurSpaces → PearNotes migration plan

**Source:** https://github.com/thomasnguyen/ourspaces-app · **Chosen baseline:** `main` as user selected, pin full commit SHA before coding. **Status:** File mapping based on public source inspected 2026-10-27; verify all paths at pinned commit.

## Source of existing strengths

- React 19, TypeScript, Vite 8, Convex database/auth/realtime/storage/HTTP; Convex components for presence, workflow, rate limiting, persistent streaming and RAG.
- `src/components/Canvas.tsx` / `src/components/CanvasRoom.tsx`: space canvas and focused contexts.
- `src/pages/LiveSpace.tsx`: large live-room orchestrator (~151 KB at inspected revision), with current drag/chat/AI systems.
- `src/App.tsx`: large app and mock/demo route orchestrator (~105 KB).
- `src/components/Rail.tsx`, `ActionDock.tsx`, `WidgetPicker.tsx`, `WidgetThreadDock.tsx`, `GlobalChatPanel.tsx`: key navigation/interactions.
- `src/widgets/core.tsx`, `extras.tsx`, `buildroom.tsx`, `CozyColorWidget.tsx`: widget renderer families.
- `src/data/types.ts`, `src/lib/widgetDefaults.ts`, `src/data/templates.ts`: widget type/catalog defaults.
- `convex/schema.ts`, `convex/tables/rooms.ts`, `convex/widgetData.ts`: persistent rooms/widgets/messages/presence and validators.
- `convex/convex.config.ts`: many components, including custom AgentMail; don't delete component configuration before checking dependencies.
- `src/lib/routes.ts`: old hash-based navigation and default space `crew`; change intentionally rather than blind search/replace.

## Migration strategy

**Stage A — pin and protect:** fork current main; record SHA, original MIT LICENSE, upstream URL, asset inventory, tree snapshot, package lock, environment variable map; create new Convex project and preview deployment. Do not point at original production; remove hardcoded upstream Netlify site ID in deployment script. Validate baseline `npm install`, `npm run build`, auth and two-tab room test.

**Stage B — shell:** introduce new app router/root layout and a feature flag selecting PearNotes experience. Keep old demo routes in dev-only namespace until parity tests pass. Replace user-facing OurSpaces name, OG metadata and sample content. Implement empty first-run home with no auto-seeded subjects.

**Stage C — domain:** implement new curriculum/source/attempt tables and backend services separately; `spaces` remain canvas containers. Add explicit `spaceKind`, `scopeOwnerId`, `groupId`, `lessonId` associations and auth guards. Avoid forcing a `subject` into `spaces` directly.

**Stage D — components:** wrap existing Canvas and picker with a typed role-aware registry. Introduce four education widgets and use inherited note/frame/media/chat components in lesson canvas. Relabel/hide old social quick picks by allowed space kinds. Refactor giant LiveSpace into shared hooks gradually, behind tests.

**Stage E — AI:** preserve relevant auth, workflow, RAG, streaming and editing/gesture arbitration infrastructure. Introduce Meta model adapter, structured validators, source filtering and audit records. Optional AgentMail/Firecrawl can be disabled in Phase 1 after ensuring dependencies don't break; do not market them as needed for PDF/text intake.

**Stage F — testing/cleanup:** remove unused demo imports and mock personas from production routes; then incrementally delete stale content, never indiscriminately remove unknown validators or migrations.

## Features mapped to actions

| Keep | Adapt | Hide initially | Add |
|---|---|---|---|
| Canvas / drag / zoom | Space creation→private/group | social seed rooms | Subjects, curricula |
| Presence, cursors, gesture locks | Widget catalog by room kind | expense split, weather, sports | Lesson path drawer |
| Chat and contextual threads | DailyQ→recall, Poll→challenge | jokes and unrelated games | Four educational widgets |
| Notes, frames, stickers, media | Potluck→group tasks, RSVP→session | party-specific seeded data | Tutor / learning engine |
| Auth / storage / workflow | `ask`→scope-aware tutor | unused email workflows at launch | XP ledger/rewards |

## Risks unique to current main

Post-submission voice/game/AI-write arbitration components may import each other. `src/App.tsx` and `LiveSpace.tsx` are coupled with demo fixtures, identity simulation and hash routing. We should avoid rewriting those two huge components in one PR. Preserve tests and take one vertical slice at a time.

## Acceptance

- Source attribution and separate deployment verified.
- Existing two-tab shared canvas still syncs after new shell introduction.
- New personal account displays no seeded subjects or mock friend identities.
- Tutor never reads another user's source in backend tests.
- No production secrets or static upstream deployment identifiers remain.
- Existing root-level script builds with newly declared dependencies and env.
