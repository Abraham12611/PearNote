# W1 — Learn picker renders behind the desk (layering fix)

## Diagnosis (verified in code @ develop)

Clicking **Learn** navigates to `/app/learn`, which opens `SubjectPicker`
inside `<div className="pn-layer">`
(`src/pearnotes/ui/SubjectPicker.tsx:84`).

- `.pn-layer` = `position: fixed; inset: 0; z-index: 90`
  (`src/pearnotes/styles/pearnotes.css:12-18`).
- The desk wall `.room-knows` = `position: absolute; inset: 0;
  z-index: 100500` (`src/components/room-knows.css:8-17`). `HomeDesk`
  overrides `position/inset` in `home-desk.css` but **not** `z-index`,
  so the opaque paper wall still stacks at 100500 inside the `.pna-app`
  fixed stacking context.
- Result: picker layer (90) loses to desk (100500) → invisible and
  click-blocked. Keyboard/a11y tree still sees it — the exact symptom the
  owner reported.

Precedent: PR #86 (`36395ee`) already lifted `.pn-layer-drawer`,
`.pn-drawer.pnj` and `.pni-sheet` to **100600** with the comment
"above the desk wall (.room-knows sits at 100500)". The bare `.pn-layer`
— used *only* by `SubjectPicker` — was missed.

## Fix

- Add `.pn-layer-picker { z-index: 100600 }` next to `.pn-layer-drawer`
  in `pearnotes.css` and use `pn-layer pn-layer-picker` in
  `SubjectPicker.tsx` (can't reuse `pn-layer-drawer` — it re-anchors the
  dialog to the right edge).
- Same-pass audit of every fixed overlay that must paint above the desk
  inside `.pna-app`:
  - `.pns-live-note` (`app.css:192` z80; `ingestion.css` z25 duplicate)
    → lift to 100600 so "not yours"/"no curriculum" notes are visible.
  - `.pni-lesson` (`ingestion.css` z30) → 100600.
  - `.pns-notice` (`shell.css:235` z90) → 100600 (legacy hash shell only;
    harmless, keeps parity).
  - `.pns-modal-backdrop` z80 / `.pns-drawer` z70 — legacy shell only,
    no desk there; leave unless QA shows overlap.
- Keep `.knows-fly` (100600) tie-broken by DOM order — picker mounts
  later; fine.

## Acceptance

- `/app/learn` shows the picker, scrim dims the desk, clicks hit the
  dialog (not desk cards); Escape/back close; focus trap intact.
- Same for `/demo/learn`.
- No regressions on `#/…` legacy screens (`.pn-layer` there stays above
  `.pns-*` chrome ≤ z90 either way).
- `npx tsc -b`, `npm test`, `npm run build` green; manual screenshot pair.

Owned paths: `src/pearnotes/styles/pearnotes.css`,
`src/pearnotes/ui/SubjectPicker.tsx`,
`src/pearnotes/shell/app/app.css`, `src/pearnotes/shell/shell.css`,
`src/pearnotes/ingestion/ingestion.css`.
