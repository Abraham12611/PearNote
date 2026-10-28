# P00.3 — PearNotes UI tokens + accessible prototypes

**Issue:** [#5](https://github.com/Abraham12611/PearNote/issues/5) ·
**Owner:** Engineer 3 ·
**Branch:** `feature/5-pearnotes-ui-tokens` → `develop` ·
**Owned paths:** `src/pearnotes/ui/**`, `src/pearnotes/styles/**`,
`docs/phase00/UI_PROTOTYPES.md`, `docs/phase00/screenshots/issue-5/**`

Phase 00 delivery: additive design tokens plus renderable, keyboard-
accessible prototypes for **Home**, **Subject Picker**, **Learning Path
Drawer** and **Lesson Shell/Compass**, plus an isolated preview harness.
Nothing here touches `src/App.tsx`, routing, `src/pearnotes/shell/**`,
`convex/**` or deployment files.

---

## 1. Files

| Path | Contents |
| --- | --- |
| `src/pearnotes/styles/tokens.css` | `--pn-*` design tokens (color, type, spacing, radii, elevation, motion, subject hues). Additive — no inherited `--color-*` values overwritten. |
| `src/pearnotes/styles/pearnotes.css` | All `pn-*` component styles, breakpoints, focus, reduced-motion. |
| `src/pearnotes/ui/types.ts` | Shared contract types (`PearSubject`, `LearningPath`, `LessonSummary`, …). Plain client types — zero Convex imports. |
| `src/pearnotes/ui/a11y.ts` | `useDialogA11y` (focus trap, autofocus, Escape, focus restore) + `usePrefersReducedMotion`. |
| `src/pearnotes/ui/SubjectAvatar.tsx` | `SubjectAvatar` + `SubjectAvatarId` + `normalizeAvatar` — original flat SVG disc illustrations. |
| `src/pearnotes/ui/SubjectPicker.tsx` | `SubjectPicker` modal. |
| `src/pearnotes/ui/HomeShell.tsx` | `PearNotesHome` first-run desk. |
| `src/pearnotes/ui/LearningPathDrawer.tsx` | `LearningPathDrawer` right-hand path drawer. |
| `src/pearnotes/ui/LessonShell.tsx` | `LessonShell` + Compass. |
| `src/pearnotes/ui/fixtures.ts` | `FIXTURE_*` demo data, visibly labelled. |
| `src/pearnotes/ui/index.ts` | Barrel exports. |
| `src/pearnotes/ui/preview/` | Isolated harness (`index.html`, `main.tsx`, `PrototypeApp.tsx`, `preview.css`). Dev-server only; the app build never imports it. |

## 2. Preview harness

```bash
npm run dev
# open:
http://localhost:5173/src/pearnotes/ui/preview/index.html?scene=<id>
```

(Vite serves any HTML under `src/` in dev. No routing changes were made.)

Scenes: `home-empty`, `home-populated`, `picker-empty`,
`picker-populated`, `picker-loading`, `picker-error`, `drawer-ready`,
`drawer-review`, `drawer-generating`, `drawer-empty`, `drawer-loading`,
`drawer-error`, `lesson-guided`, `lesson-explore`.

Extra params: `&sel=<lesson-or-subject-id>` preselects a node/subject,
`&mode=explore` sets the lesson mode, `&list=open` opens the linear
activities list.

## 3. Integration contract (Engineer 2)

`src/pearnotes/shell/slots.tsx` resolves components by filename via
`import.meta.glob("../ui/*.tsx")` and injects `styles/*.css` through
`loadPearNotesUiStyles()`. Filenames/exports consumed:

```ts
import { PearNotesHome }        from "../ui/HomeShell";        // slot: Home
import { SubjectPicker }        from "../ui/SubjectPicker";    // slot: SubjectPicker
import { LearningPathDrawer }   from "../ui/LearningPathDrawer";
import { LessonShell }          from "../ui/LessonShell";
import { normalizeAvatar }      from "../ui/SubjectAvatar";   // string → SubjectAvatarId
import type * as UI from "../ui/types";
```

Prop shapes are mirrored in `src/pearnotes/shell/types.ts`; the only
intentional asymmetry is `PearSubject.avatar`, which is `string` on the
shell side and `SubjectAvatarId` here — `normalizeAvatar()` bridges it at
render time. Highlights of the contract:

- **`PearNotesHome`**: `subjects` (real list — `[]` for a new account),
  `resume?: ResumePoint | null`, callbacks `onLearn / onCreateSubject /
  onOpenSubject / onResume / onOpenLibrary / onOpenGroups / onOpenShelf /
  onOpenProfile`, `fixtureLabel?`.
- **`SubjectPicker`**: `open`, `subjects`, `status?: ready|loading|error`,
  `errorMessage?`, `selectedId?`, `onSelect?`, `onEnter?` ("enter the
  space" → open the drawer), `onCreate?`, `onClose`, `onRetry?`,
  `fixtureLabel?`.
- **`LearningPathDrawer`**: `open`, `subject`, `path` (`null` → skeleton;
  statuses `loading | generating | needs_material | needs_review | ready
  | error`), `selectedLessonId?` (controlled; uncontrolled fallback
  inside), `initialScrollTop?`/`onScroll?` for scroll preservation,
  `onSelectLesson?`, `onStartLesson?`, `onBack?`, `onClose`,
  `onAddMaterials?`, `onBrowseSources?`, `onRetry?`, `fixtureLabel?`.
- **`LessonShell`**: `lesson: LessonSummary | null` (`null` → "pinning
  up…" slip), `mode` + `onModeChange?`, `onExit`, `onReturnToNext?`,
  `onOpenObject?`, `syncState?`, `status?`, `errorMessage?`,
  `fixtureLabel?`, `children` = the real canvas slot, `chrome?` = extra
  fixed chrome (e.g. tutor dock).

## 4. Behavior guarantees

- **Honest empty states.** `subjects={[]}` renders the real first-run
  desk: dashed `+` disc, "start learning" CTA, empty continue-slip,
  empty trophy pegs. Nothing fabricates subjects, progress, friends or
  mastery. The picker empty state is a `+` tile + create CTA only.
- **Fixture labelling.** Every populated prototype scene renders a taped
  `prototype fixture` tag (`fixtureLabel` prop). Fixture ids are
  `fixture-*`. Demo content never ships into a real account path.
- **Dialogs.** Picker + drawer are `role="dialog" aria-modal="true"`
  with accessible names. Focus moves in on open, Tab/Shift+Tab cycle
  inside, Escape closes (drawer: first Escape clears a node preview,
  second closes), focus restores to the pre-open element.
- **Path drawer.** ≈52vw right sheet (66vw tablet, full-screen <768px)
  over a dimmed/blurred Home. Winding SVG trail, unit/section
  hierarchy, node states (demonstrated ✓, in-progress ring %, next tag,
  review !, locked 🔒, practice ↻), pinned preview card with
  objectives/activity+source counts and a state-aware CTA.
- **Lesson shell.** Full-screen board (`children` = canvas slot), crumb
  row, `role="status"` sync pill, Compass (progress, guided/explore
  toggle, next-objective stepper or "return to next activity"), Escape →
  exit. `aria-expanded` "activities list" gives the required non-spatial
  linear alternative. Chrome renders **only** in `ready` state — no
  focusable children sit under `aria-hidden`.
- **Responsive.** 1440/1024/390 verified. Mobile: drawer full-screen
  native-scroll, compass folds to a bottom bar, crumb collapses to
  current lesson, ≥44px touch targets.
- **Motion.** All animation through `--pn-dur-*`/`--pn-ease-*` tokens;
  `prefers-reduced-motion: reduce` collapses transitions/animations to
  1ms globally for `pn-*`. Meaning never rides on motion (state is also
  glyph/label/color-independent).
- **Typography/contrast.** Bricolage Grotesque display + IBM Plex Sans
  reading (already loaded by `src/index.css`). Body text meets AA on
  both ink and paper surfaces.

## 5. Validation actually run

- `npx tsc -b` — clean (strict, noUnusedLocals/Parameters).
- `npm run build` — clean; `vite build` 320 modules (pre-existing
  >500 kB chunk warning on the inherited bundle is unchanged).
- Chrome DevTools against the live harness:
  - Focus lands inside dialogs on open; real Tab presses cycle through
    all enabled controls and wrap (`close ↔ create` boundary); the
    disabled "enter" CTA is skipped until a selection exists.
  - Escape verified on picker (close + focus restore) and drawer
    (preview → close staging).
  - `take_snapshot` a11y trees: named `dialog "Cell biology learning
    path" modal`, `button "Title — state"` on every node, `status`
    live-region for sync, `pressed` mode toggle, `expandable` list.
  - Screenshots `docs/phase00/screenshots/issue-5/` — desktop 1440×900
    (13 states incl. reduced-motion) and true 390×844 mobile via CDP
    device-metrics (headless `--window-size` clamps to ≥500px).
- Not run: automated a11y tooling (none configured in repo), unit tests
  (no test runner in Phase 00 scope).

## 6. Known gaps / hand-off notes

- Background app content isn't `inert` behind dialogs — `aria-modal`
  handles AT scoping; add `inert` when the shell mounts these on real
  routes if desired.
- The lesson **board** is a labelled harness placeholder; Engineer 2
  mounts the real Canvas into `children`. Canvas pan/zoom on mobile is
  the canvas engine's job.
- `avatar` string → `SubjectAvatarId` degradation is runtime-safe via
  `normalizeAvatar`; if Engineer 2 wants compile-time narrowing, map in
  their data layer.
- No `public/pearnotes/` assets were needed — all artwork is inline
  SVG/CSS (original, MIT-clean).
