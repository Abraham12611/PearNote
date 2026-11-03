# W3 — Backend: desk data systems + seeded demo persona ("Sam")

## Why

The mockup needs six data systems that don't exist yet (activity feed,
achievements/XP, streaks, study calendar, weekly focus, coming-up
events, crew/friends). And the owner wants the demo to read like a real
account — "Sam", an undergrad medical student months into using the
app — served **from the database**, not scattered `fixtures.ts` objects.

## New tables (additive, `convex/tables/learning.ts` + new `social.ts`)

| table | key fields | notes |
|---|---|---|
| `xpLedger` | userId, points, reason(objective demonstrated / lesson completed / challenge correct / teach-back evaluated / practice accepted), refId, day | server-only writes via learningRuntime; never client points |
| `achievements` | userId, key(streak_3/unit_complete/focus_sessions_5/first_teachback/…), issuedAt, evidenceRef | server-issued on verified events; Shelf/desk read |
| `activityEvents` | ownerId (subject owner) OR actorUserId+visibility(private/crew/demo), kind(upload/review/lesson/completed/challenge/teachback/streak), subjectId?, summary, happenedAt | desk "recent activity"; crew feed filters visibility |
| `studyEvents` | userId, kind(session_item/focus/quiz/group/review), title, subjectId?, startDate, minutes?, done, order | calendar dots, "coming up", today checklist |
| `weeklyFocus` | userId, text, done, weekKey, order | "this week's focus" checklist |
| `friendships` | userId, friendUserId, state(pending/accepted), shareActivity | the "crew" — real rows only; getDisplay for friends unblocks |
| `demoPersonas` | key(sam), displayName, bio, personaId, userId (internal demo account row) | marks the seeded account; public demo reads verify `isDemoPersona` server-side |

All reads owner-scoped via `learningAuth`; demo reads go through
dedicated `demo.*` queries that only resolve when the target user row is
flagged `demoPersona:true` — public, read-only, no auth, no writes.

## Seed (`convex/seedDemo.ts`, internal mutation, idempotent)

Creates a real user row `Sam — undergrad med student` (persona avatar)
plus **months** of plausible history, all internally consistent:

- Subjects: **Cell biology** (active — Unit 1 done, Unit 2 in progress),
  **Linear algebra**, **Organic chemistry** — each with an authored
  source (sample text pages stored as sourceSegments), a published
  curriculum (sections→units→lessons→activities), attempts/mastery
  spread over weeks, resume point = "Diffusion and osmosis · Unit 2".
- XP ledger + achievements (study-streak 3 days, unit-complete,
  5 focus sessions — matching the mockup's `3 new`).
- Weekly focus checklist (2 of 3 done), study calendar dots for the
  month, today session items (30/20/15 min), coming-up (Unit 2 quiz
  Tue, group study Wed, review Fri).
- Crew: Maya/Jules/Sam/Rio/Kenji as demo-only member records with a
  small activity feed ("Maya completed Cell biology — Unit 1, 2h ago").
- Seed runs on dev `keen-marten-701` via `convex run`; documented in PR.

## Reads

- `desk.get` (auth): one compound owner read → subjects, resume,
  session items, focus, events, activity, achievements+streak, crew
  summary. Powers W2 without N waterfalls.
- `demo.getDesk` / `demo.getPath` / `demo.getLesson` (no auth): same
  shapes, resolved only for `demoPersona` rows; every row stamped
  `SAMPLE` at the API boundary (fixtureLabel stays visible).
- `/demo/*` swaps `usePearNotesFixtures` → these queries; keep local
  fixtures only as offline/no-backend fallback for `?mock=1`.

## Acceptance

- Fresh clone + seed → `/demo` desk matches the mockup with real DB
  data; switching demo subjects shows distinct seeded paths.
- Anonymous visitor cannot write anything; `demo.*` returns null for
  non-demo userIds (tested).
- Real account desk queries return only own rows (authz test: user A
  can't read user B's activity/subjects/segments).
- `resume` is real: last in-progress lesson from attempts/mastery.

Owned paths: `convex/tables/learning.ts`, `convex/tables/social.ts`
(new), `convex/schema.ts`, `convex/desk.ts`, `convex/demo.ts`,
`convex/seedDemo.ts`, `convex/friends.ts`, `convex/xp.ts` helpers,
`src/pearnotes/shell/data.ts`, `src/pearnotes/shell/types.ts`,
tests under `tests/`.
