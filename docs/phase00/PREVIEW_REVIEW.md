# Phase 00 — Owner's Vercel preview review guide

**Scope:** manual visual inspection of code merged to `develop`. **Not** a working education backend or proof of live multi-user synchronization. No PearNotes Convex project has been verified or deployed at the time this guide was written.

## Safe review boundaries

- Deploy the **`develop` commit** as a Vercel **Preview**, not production. Never merge into `main` without the owner's explicit approval.
- Build the Vite app with `npm run build`. The multi-page build now includes both `index.html` and `src/pearnotes/ui/preview/index.html`.
- Do **not** set `VITE_CONVEX_URL` to the inherited `necessary-cobra-892` or `dusty-condor-648` deployments. Without an independent PearNotes Convex deployment, use `?mock=1`. This is explicitly visual-only: uploads/auth/persistence/multiplayer are unavailable.
- This website currently retains OurSpaces-era media and branding; Engineer 1's baseline audit marks several assets `replace` or `needs_review`. Keep it a protected owner preview, not a public release.

## URLs to append to the preview hostname

```text
/?mock=1&pearnotes=1#/learn
/?mock=1&pearnotes=1&fixtures=1#/learn
/?mock=1#/space/crew
/src/pearnotes/ui/preview/index.html?scene=home-empty
/src/pearnotes/ui/preview/index.html?scene=home-populated
/src/pearnotes/ui/preview/index.html?scene=picker-empty
/src/pearnotes/ui/preview/index.html?scene=picker-populated
/src/pearnotes/ui/preview/index.html?scene=picker-loading
/src/pearnotes/ui/preview/index.html?scene=picker-error
/src/pearnotes/ui/preview/index.html?scene=drawer-ready
/src/pearnotes/ui/preview/index.html?scene=drawer-review
/src/pearnotes/ui/preview/index.html?scene=drawer-generating
/src/pearnotes/ui/preview/index.html?scene=drawer-empty
/src/pearnotes/ui/preview/index.html?scene=drawer-loading
/src/pearnotes/ui/preview/index.html?scene=drawer-error
/src/pearnotes/ui/preview/index.html?scene=lesson-guided
/src/pearnotes/ui/preview/index.html?scene=lesson-explore
```

The `fixtures=1` view and populated prototype scenes are **labelled fixture states**. They do not represent a real learner account. The standalone harness renders UI components with test props; the actual lesson data layer is not yet wired.

## Manual owner verification list

- [ ] **First-run:** `/ ?mock=1&pearnotes=1#/learn` (remove the space after `/`) shows zero subjects, no fake progress, and a meaningful `+` creation affordance.
- [ ] **Picker:** open Learn → dark modal; keyboard Tab/Shift+Tab cycles within it; Escape closes and restores focus.
- [ ] **Populated fixture:** `?fixtures=1` shows clearly marked prototype subjects; select a subject → path drawer; back, Escape and browser back work.
- [ ] **Path states:** drawer preview includes winding path, section/unit/lesson distinction, selection and a way into lesson; inspect error/loading/generating cases in the 14-scene harness.
- [ ] **Lesson:** Guided/Explore toggle, compass and list alternative; distinguish the real empty canvas in integrated shell from the *illustrative* DemoBoard in the isolated harness.
- [ ] **Mobile:** at ~390 px viewport the path drawer fills the screen and controls are accessible; compass/lesson chrome do not hide controls.
- [ ] **Legacy:** `?mock=1#/space/crew` still shows inherited canvas, rail and widgets; no backend chat/presence claim on mock.
- [ ] **Missing backend:** URL without `?mock=1` may display a 'Convex isn't connected' screen; this is expected until owner provisions independent PearNotes Convex.
- [ ] **Accessibility:** screen reader labels, focus restoration, contrast, 200% zoom and reduced-motion behavior (report browser/OS).
- [ ] **Report:** for each defect, provide preview link, page/scene, desktop/mobile size, expected vs actual, screenshot, and severity.

## Do not interpret preview as completing these gates

Convex schema changes are merged but **not codegen-pushed/deployed**. Auth, file storage, private source reads, PDF extraction, Meta AI and live shared rooms must be validated later against an isolated backend. Nothing in Phase 00's preview proves those flows.

## Engineer handoff change

The owner does the real-browser review; engineers supply technical evidence (build/typecheck/unit tests and screenshots or browser tests *if available*) and do not make claims about having access to the owner's live Vercel environment.

Engineers do not coordinate directly or share a mutable Git checkout. Coordinator publishes fixed input commit / typed interface / ownership in the issue. Each engineer works in an **independent git worktree or clone** with a single issue branch, provides PR and blockers, then coordinator reviews/merges. New conflicts are handled centrally after PRs complete.
