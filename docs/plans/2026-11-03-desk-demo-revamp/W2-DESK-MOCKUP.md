# W2 — Home desk: carbon copy of the approved mockup

## Target composition (owner screenshot, 2026-11-03)

Cream paper sheet over the teal topographic wall; left floating dock
(already native). Header row: greeting `hey <name>` / `your desk` /
sub-line "your learning space — study, track, and keep going" + pear
sticker; top-right avatar-overlap capsule `N here now` + `add` +
`invite` pills (real relationships only — hidden/honest on real empty
accounts, populated in demo).

Desk modules (all knows-grammar cards — black outline, offset ink
shadow, tape, slight rotations):

| Mockup module | Data source | Real-account empty |
|---|---|---|
| continue learning — `Diffusion and osmosis · Cell biology · Unit 2` + `resume` | resume point (W3: derived from attempts/mastery) | replaced by "start with a source" CTA |
| today "study session?" purple card — checklist `Cell biology 30m / Linear algebra 20m / Review notes 15m` + `start focus` | today's planned session items (studyEvents kind=session_item) | "plan today's session" creator |
| achievements — study streak / unit complete / focus session + `3 new` | achievements + streak projection (W3) | locked peg outlines, labelled |
| your crew — faces Maya/Jules/Sam/Rio/Kenji + one message | consented crew/friends (W3) | invite panel, hidden by default |
| recent activity — "Maya completed Cell biology Unit 1…" feed | activityEvents (W3) | "your activity will appear here" |
| coming up — Unit 2 quiz / group study / review session | studyEvents future (W3) | "nothing scheduled" + suggest |
| your subjects — discs Cell bio/Linear algebra/Organic chem + dashed `new` | `subjects.listMine` (exists) | just `+`, encouraging copy |
| this week's focus — checklist | weeklyFocus items (W3) | "add your first study goal" |
| study calendar — month grid w/ dots + `3 study days in a row` | studyEvents days + streak (W3) | plain month, no invented dots |
| sticky note "keep going!" | static authored flourish (always OK) | same |
| bottom bar — `live sync · pearnotes · … · last change 14m ago` | sync chip — real status only; demo says "sample board" | honest sync state |

## Approach

- Rebuild `HomeDesk.tsx` module composition to match the mockup's grid
  (dominant continue card + purple session card top row; achievements /
  crew / coming-up right rail; subjects row + weekly focus + calendar
  mid; recent activity feed). Keep `room-knows.css` grammar + `home-desk.css`
  for the new module styles — do not invent a second visual system.
- Data seam: extend `PearNotesData`/`LiveDataBridge` with the W3
  aggregates (`desk.get` compound query) so the desk is one read; demo
  mounts the same component fed by `demo.getDesk`.
- Mockup's "4 here now"/crew/friends on a real account: only render when
  the relationships API returns real rows (W3 ships friend/crew tables);
  otherwise show the invite/empty variant — never mock Maya for real
  users (fidelity contract, auto-reject list).
- Responsive: stack cards ≤800px, dock → bottom strip (native behavior).

## Acceptance

- Screenshot parity at 1440×900 vs the mockup (demo persona data) —
  module-for-module.
- Fresh real account: same composition, honest empty modules, zero
  invented friends/streaks/awards.
- `/demo` desk shows Sam's seeded data end-to-end from Convex reads.
- Component reuse ledger in PR body.

Owned paths: `src/pearnotes/shell/app/HomeDesk.tsx`,
`home-desk.css`, `src/pearnotes/shell/types.ts`,
`src/pearnotes/shell/data.ts`, new `src/pearnotes/shell/app/desk/*`
subcomponents, `convex/desk.ts` (aggregate query, w/ W3).
