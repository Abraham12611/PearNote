# Phase 00 — Foundation and controlled fork

**Target:** October 27, 2026 (time-box and adjust to team capacity). **Goal:** preserve the original app's magic and gain a stable ground for learning features.

## 00.1 Repository lock and provenance

- Fork `thomasnguyen/ourspaces-app` **current main**; record full SHA, date, upstream URL and MIT notice.
- Audit media/font/logo rights separately; remove sample content and original branding from PearNotes user experience, not from attribution history.
- Run baseline build, visit first-run, two-tab room sync; record defects.
- Create new deployment; remove hardcoded original Netlify site target and use isolated Convex database.

**Exit:** build passes; pinned commit recorded; upstream unaffected; license retained.

## 00.2 Architectural inventory

- Map `App.tsx`, `LiveSpace.tsx`, `Canvas.tsx`, `Rail.tsx`, `WidgetPicker`, widgets, `convex/schema.ts`, `convex/tables/rooms.ts` and installed components.
- Label each existing widget **keep/adapt/hide/review** according to [widget catalog](../learning/WIDGETS.md).
- Extract a stable `CanvasShell` wrapper or feature boundary with minimal intrusive changes; avoid giant rewrite.

**Exit:** clickable old canvas under new shell, no existing core regression.

## 00.3 Design and interaction contract

- Implement PearNotes tokens, subject avatar system prototypes, empty subject picker mock, drawer and lesson shell.
- Test popover keyboard, drawer focus, responsive behavior, route/back, authentic hover/touch parity.
- Pin original component animations and use in education widgets.

**Exit:** approved screens and navigation prototypes; no non-original default subjects.

## 00.4 Data and authorization foundations

- Introduce subjects/sources/curriculum/activities/attempts skeleton, indexes and auth helpers.
- Implement isolated upload storage and backend ownership check before processing.
- Set up a dedicated demo account and production-safe seed control.

**Exit:** user A cannot query user B's private subject/source by ID.

## 00.5 Meta API proof and evaluation fixture

- Confirm API credentials/accepted participation where relevant.
- Parse a real Cell Biology PDF into addressable page segments and call accessible Meta model to return valid typed concept+curriculum proposal.
- Test failures, invalid JSON, unsupported citation and retry under budget.

**Exit:** one authenticated real end-to-end PDF→validated structured response on preview.

## Hard stop

If current main branch is too coupled, use a feature flag and wrapper approach; do **not** migrate all components into folders during the 10-day sprint. Phase 1 should begin with usable foundations, not an endless refactor.
