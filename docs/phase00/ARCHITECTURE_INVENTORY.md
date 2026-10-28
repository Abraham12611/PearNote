# Phase 00 — OurSpaces architecture inventory (Engineer 2, issue #4)

**Purpose:** a reliable file + API map of the inherited app for all Phase 00
workstreams, plus the widget keep/adapt/hide/review matrix and the feature
boundary this PR introduces. Verified against `develop` source on 2026-10-28 —
signatures here were read from code, not guessed from docs. Where this doc and
`docs/code-map.md` overlap, code-map stays the deep reference; this doc is the
PearNotes-facing contract.

## 1. Entry, data modes and auth

| Concern | Where | Notes |
|---|---|---|
| Bootstrap | `src/main.tsx` | `getDataMode()` → `live` / `mock` / `missing`. Live mounts `ConvexAuthProvider` + `ConvexQueryCacheProvider` + `AuthIdentityBridge` + `<App/>` + `UpdateNudge` + `LiveDemoBanner`. Mock mounts bare `<App/>` (no Convex client — anything that subscribes must stay behind `mockModeRequested()` or live-only paths). |
| Mode detection | `src/live/dataMode.ts` | `?mock=1` (search or hash query) or `VITE_DATA_MODE=mock` → mock; `VITE_CONVEX_URL` present → live; else `missing` → `MissingConvexConfig` screen. |
| Auth | `convex/auth.ts`, `convex/auth.config.ts`, `src/live/useAuthIdentity.ts`, `src/live/useJoin.ts`, `src/live/identity.ts` | Convex Auth `Anonymous` provider; `AuthIdentityBridge` silently signs guests in and adopts the auth identity (`adoptAuthUserId`). Join = email + 6-digit OTP (`convex/otp.ts`, `JoinForm.tsx`, `CodeSlots.tsx`). `useAccount()` distinguishes guest vs joined. Sign-out = `signOut()` + `resetIdentity()` + reload. **Preserve the guest→account fold-in (`users.mergedInto`) — do not rewire.** |
| Per-tab identity | `src/live/identity.ts` | `getPresenceId()` = per-tab sessionStorage key, deliberately NOT the auth userId — two tabs of one browser are two occupants (see §5). `PERSONAS` = the 8 fictional looks. |

## 2. Routing (all hash-based)

`src/lib/routes.ts` + inline helpers in `src/App.tsx` own every route; there is
no router library.

| Hash | Route (`routeFromHash`) | Destination |
|---|---|---|
| `#/`, `#/home`, bare | `space` | `replaceState` → `#/space/<slug>`; slug = `DEFAULT_SPACE_SLUG` (`crew`) |
| `#/space/<slug>` | `space` | live → `LiveSpacePage`; mock → inline mock canvas in `App()` |
| `#/space/<slug>/knows` | `space` | "what this space knows" page (`spacePageFromHash`) |
| `#/join/<slug>` | `join` | invite entry → `LiveSpacePage isInviteEntry` (always the door) |
| `#/mail[/slug]`, `#/play` | `space` | lab flags over the room (`mailLabRequested`/`playLabRequested`) |
| `#/about`, `#/about/*` | `about` | `About` page; `rememberSpaceSlug`/`lastSpaceSlug` preserves return room |
| `#/me` | `me` | `MePage` (settings + `spaces.listMine`) |
| `#/cursors` `#/widgets` `#/arrival` `#/color` `#/bothways` `#/outro` `#/codex` `#/firecrawl` `#/wall` | labs | `React.lazy` pages behind `DeferredRoute` |
| `#/test` | `test` | `Welcome` |
| `#/admin` | `admin` | back room, `ADMIN_KEY`-gated server-side; live only |
| `#/live*` | `live` | `LiveSpacePage` default slug |

Navigation writes `window.location.hash` directly (e.g. `selectSpace` →
`normalSpaceHash(id)`); one `hashchange` listener in `App()` re-derives
`route` + `spaceId` and normalizes legacy hashes. **PearNotes seam:** this PR
adds `#/learn*` (helpers appended to `routes.ts`) claimed by the shell only
when its flag is on — every hash above is untouched.

## 3. The two canvas hosts (size & coupling warning)

| File | Size | Role |
|---|---|---|
| `src/App.tsx` | ~2930 lines | Mock/demo canvas + ALL routing + lab routes. ~35 `useState`, ~12 refs. Owns camera/pan/zoom/focus for mock mode. |
| `src/pages/LiveSpace.tsx` | ~3600 lines | Live twin: same chrome (Rail/Canvas/docks) driven by Convex. Owns the entry door (`ClaimCard`/`GateCursor`), join flow, presence heartbeat, live gesture arbitration calls, voice build, games, mail/play labs. |

These two are deliberately parallel implementations — `docs/code-map.md` calls
App "the MOCK/demo canvas path" and LiveSpace "the LIVE twin". Any PearNotes
work must NOT fork a third copy: mount the existing pieces (see §7).

## 4. Canvas engine: pointers, drag, camera

| Layer | Where | Contract |
|---|---|---|
| Viewport | `.space-scroll` div (App ~L2460 / LiveSpace equivalent) | `overflow:auto` scroller; pointer-capture drag pans it; `onScroll` drives header fade + `canvasAwayFromHome`. |
| Stage | `.canvas-stage` > `.canvas-scale-layer` | Sized to `canvasWorldSize × canvasScale`; transform `scale()` — zoom never relayouts widgets. |
| Board | `Canvas` (`src/components/Canvas.tsx`) | One `.space-canvas` div; renders `widgetCards` (memo'd), peer cursors via `PeerCursor`+motion, `PlacementGhost`, `FirstRunSticky`, `LinkThreads`, overlay. ~70 props — the stable seam PearNotes reuses. Required props: `spaceId`, `selectedWidgetId`, `onWidgetSelect`, `managedWidgetId`, `onWidgetManage`, `onWidgetDelete`, `onWidgetEdit`, `promoted`, `onPromote`; `widgets`/`cursors` override the fixture lookup (`getSpace(slug)` falls back to crew — pass `widgets` explicitly for non-fixture spaces). |
| Camera | App `applyCanvasScale`/`animateCanvasCamera`; LiveSpace `CanvasCamera` refs | Focus system: `focusFrame`/`focusWidgetThread`/`leaveFocus` with `CAMERA_MS`/`FRAME_FIT_GUTTER`/`MIN_*_SCALE` constants; fit-on-resize + first-mount effects; `useCanvasSpacePan` = hold-Space Figma pan; `CanvasEdgePan` = edge-scroll cues; `CanvasNavigator` = minimap. |
| Widget drag | `src/components/WidgetCard.tsx` | Pointer-capture on card; `onGestureStart/Change/End` (mock: local state; live: `useLiveHandlers` → `presence.claimGesture`/`finishGesture`); `remoteGesture` locks the card for others. |
| Phones | `usePhone` + `phoneColumn`/`readingOrder` in Canvas; `phone-board.css` | <800px: cards stack full-width in reading order — mobile fallback is ordering, not a different canvas. |

## 5. Live-room systems (rooms, membership, presence, chat)

| System | Where | Key facts |
|---|---|---|
| Space data | `src/live/useSpaceData.ts` → `api.spaces.getSpaceWithWidgets` | LocalStorage snapshot (`live/snapshot.ts`) paints before the query answers; `status`: `mock`/`loading`/`cached`/`missing`/`empty`/`ready`. `live/adapt.ts` `toWidget`/`spaceFromLive` maps rows→UI shapes. |
| Tables | `convex/tables/rooms.ts` (schema assembled in `convex/schema.ts`) | `spaces` (slug, canvasW/H, `ownerId` optional+load-bearing, `door`), `members`, `widgets` (`type` open string; `data` = `widgetDataValidator`), `messages` (`widgetId` = `"global"` \| widgetId \| `::q:` sub-thread; author denormalized), `votes`, `paintMarks`, `presence`, `baselines`. |
| Cursor presence | `convex/presence.ts` + `src/live/usePresence.ts` | Hand-rolled 20Hz writes (`SEND_INTERVAL_MS=50`), TTL 30s, keyed `by_space_user` on per-tab `presenceId`. **Do not swap for `@convex-dev/presence`** — that component is used separately in `roomPresence.ts` for occupancy. |
| Gesture locks | same presence row (`gesture` field) | `claimGesture` arbitrates, `finishGesture` commits layout server-side; `GESTURE_TTL_MS=1.5s`, keepalive 500ms; peers render via `peerMotion` rAF interpolation — never through React state per frame. |
| Occupancy | `convex/roomPresence.ts`, `RoomPresenceHeartbeat`, `Rail` `OnlineCountSuffix` | "@convex-dev/presence: who has this space open" — separate from cursors on purpose. |
| Chat/threads | `convex/messages.ts`, `ThreadContent.tsx`, `WidgetThreadDock.tsx`, `GlobalChatPanel.tsx`, `src/lib/widgetThreads.ts`, `linkQuestions.ts` | Promote → `promotedWidgetId` decision widget; full-text `search_text` index. |
| Voice/AI write path | `useVoiceBuild.ts` → `convex/voiceBuild.ts` (deal/commit), `convex/rightOfWay.ts` (`aiWrites`/`leases`/`pending`/`choiceVotes`), `lib/deck/*` | Every AI write goes through the one door with a verdict; speculation renders as ghosts/slips (`VoiceBuildLayer`, `RightOfWay` components). **This is the pattern PearNotes AI proposals must inherit.** |
| Spend/limits | `convex/guard.ts`, `convex/rateLimits.ts` | Token-bucket + daily USD ceiling in front of every paid call. |

## 6. Widget system

- **Type union:** `src/data/types.ts` `WidgetType` — 37 literals. `Widget =
  { id, type, x, y, w, h, z, rotate?, data: Record<string,unknown> }`.
- **Render dispatch:** `WidgetCard.tsx` `switch (widget.type)` (~L640) →
  `widgets/core.tsx` (frame, sticker, countdown, poll, potluck, chat, note,
  media) · `widgets/extras.tsx` (wheel, dualClock, dailyQ, rsvp, decision,
  availability, photoWall, linkShelf, linkCard, playlist, jokeRegistry,
  expenseSplit, itinerary, letter, messageWall, quote, weather, sports,
  backendLive) · `widgets/challenge.tsx` (checkIn, standings) ·
  `widgets/buildroom.tsx` (linkPile, hotLinks, shipPost, roundtable) ·
  `widgets/CozyColorWidget.tsx` (cozyColor) · `components/games/*` (game,
  scoreboard, keepsake). Unknown types render `null`.
- **Picker catalog:** `src/data/templates.ts` `WIDGET_CATALOG` (33 entries;
  `pickerHidden` on 7) + `WidgetPicker.tsx` quick-picks/search/previews;
  `SPACE_TEMPLATES` seeds new rooms.
- **Defaults/factory:** `src/lib/widgetDefaults.ts` `WIDGET_SIZES`,
  `freshWidgetData`, `getWidgetBlueprint`, `createDemoWidget`.
- **Serialization:** Convex row → `toWidget` (`live/adapt.ts`, key-escapes
  reserved chars) → `Widget`. Persisted `data` validated per type by
  `convex/widgetData.ts` `widgetDataValidator` — a 35-arm discriminated union
  with a permissive `fallbackData` tail (kept for forward-compat; see its
  header note).

## 7. Integration-safe seams (where PearNotes attaches)

1. **`Canvas` props boundary** — mounting `Canvas` with explicit
   `widgets`/`cursors`/`spaceId` gives a real board without touching fixtures;
   proven live by the shell's lesson route.
2. **Route early-returns in `App()`** — labs already isolate via `React.lazy`
   + `DeferredRoute`; the shell follows this exact pattern at the
   `route === "space"` gate, after all hooks.
3. **`DeferredRoute`/lazy imports** — flag-off path never downloads shell code.
4. **Flag conventions** — `dataMode.ts`/`demoModeRequested` URL+env pattern
   reused for `pearnotesEnabled()`; no new mechanism invented.
5. **Presence identity** — PearNotes rooms get cursor/occupancy for free by
   keeping `presenceId` semantics; do not introduce per-user presence keys.
6. **Do NOT seam through:** `routeFromHash`'s Route union (kept intact —
   `#/learn` still parses as `space`, the shell intercepts downstream), the
   `spaces` table (Engineer 4 adds associations; nothing forced onto `spaces`
   per migration plan Stage C), or a second canvas/router/auth.

## 8. Widget classification matrix

Per `PearNotes-Blueprint/learning/WIDGETS.md`; verified against the actual
union + dispatch table. "Picker" = `WIDGET_CATALOG` membership today.

| Type | Renderer | In picker? | Verdict | Reason / Phase-1 note |
|---|---|---|---|---|
| `frame` | core.tsx `FrameWidget` | yes | **keep** | lesson zones/unit boards |
| `sticker` | core.tsx `StickerWidget` | (tray footer) | **keep** | identity/decoration/achievement pins |
| `note` | core.tsx `NoteWidget` | yes | **keep** | personal notes, kept explanations |
| `media` | core.tsx `MediaWidget` | hidden | **keep** | source-allowed images/video |
| `chat` | core.tsx `ChatWidget` | yes | **keep** | room conversation; personal AI separate |
| `photoWall` | extras.tsx | yes | **keep** | diagram/resource image collection |
| `linkCard` | extras.tsx | yes | **keep** | curated source cards (Firecrawl-scraped) |
| `linkShelf` | extras.tsx | yes | **keep** | source shelves |
| `messageWall` | extras.tsx | hidden | **keep** | pinned discussion/definitions |
| `quote` | extras.tsx | hidden | **keep** | pinned quotes/definitions |
| `poll` | core.tsx `PollWidget` | yes | **adapt** | simple quiz — distinguish answers vs votes |
| `dailyQ` | extras.tsx `DailyQWidget` | yes | **adapt** | recall/reflective question |
| `countdown` | core.tsx | yes | **adapt** | exam date / study timer semantics |
| `potluck` | core.tsx | yes | **adapt** | group task/commitment checklist |
| `rsvp` | extras.tsx | yes | **adapt** | study-session planning |
| `availability` | extras.tsx | yes | **adapt** | session planning |
| `decision` | extras.tsx | hidden | **adapt** | group consensus |
| `wheel` | extras.tsx | yes | **adapt** | random challenge picker |
| `itinerary` | extras.tsx | yes | **adapt** | study plan / project timeline |
| `cozyColor` | CozyColorWidget.tsx | yes | **adapt** | cooperative labeling + correctness layer |
| `linkPile` | buildroom.tsx | yes | **adapt** | research queue |
| `hotLinks` | buildroom.tsx | yes | **adapt** | key resources |
| `roundtable` | buildroom.tsx | yes | **adapt** | focused group discussion |
| `shipPost` | buildroom.tsx | yes | **adapt** | progress/evidence updates |
| `letter` | extras.tsx | hidden | **review** | Blueprint "later adapt" (future-self reflection) |
| `checkIn` | challenge.tsx | hidden | **review** | prototype — practice logs if live-ready |
| `standings` | challenge.tsx | hidden | **review** | prototype — leagues if live-ready |
| `playlist` | extras.tsx | yes | **review** | optional focus music; group rooms only |
| `dualClock` | extras.tsx | hidden | **review** | optional; international groups |
| `weather` | extras.tsx | yes | **hide** | no study function — remove from student picker |
| `sports` | extras.tsx | yes | **hide** | no study function |
| `expenseSplit` | extras.tsx | yes | **hide** | no study function |
| `jokeRegistry` | extras.tsx | yes | **hide** | unrelated social content |
| `backendLive` | extras.tsx | yes | **hide (dev)** | dev instrumentation — dev flag only |
| `game` | games/GameCard.tsx | n/a (system) | **review (dev)** | game framework — audit before exposure |
| `scoreboard` | games/Scoreboard.tsx | n/a (system) | **review (dev)** | games infra |
| `keepsake` | games/Jigsaw.tsx `Keepsake` | n/a (system) | **review (dev)** | games infra |

**Add (Phase 1, exactly four):** `lessonCard`, `sourceViewer`, `challenge`,
`teachBack` — new `WidgetType` members + dispatch arms + `widgetDataValidator`
arms (Engineer 4's schema work; this PR adds none).

## 9. What this PR adds (the seam itself)

- `src/pearnotes/shell/` — `featureFlag.ts` (`VITE_PEARNOTES` / `?pearnotes=1`),
  `navigation.ts` (`#/learn` parse), `types.ts` (Eng 3 contracts), `data.ts`
  (honest empty data hook), `slots.tsx` (glob-resolved ui/ components +
  placeholders), `placeholders.tsx`, `PearNotesCanvasShell.tsx`, `shell.css`.
- `src/lib/routes.ts` — 4 additive `#/learn*` hash builders.
- `src/App.tsx` — lazy import + one early return at the space-route gate.
- Flag off → zero behavioral change; flag on → `#/learn` renders home +
  empty picker (`+` only, per E01), `#/learn/path/:id` the right drawer,
  `#/learn/lesson/:id` the REAL `Canvas` engine under shell chrome.
