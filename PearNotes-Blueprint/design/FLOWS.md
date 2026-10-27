# End-to-end user flows and state transitions

## F01 — New-user subject creation (critical)

**Entry:** Home → Learn. **Initial display:** modal titled `pick a subject`; only a dotted/broken-circle plus tile and create CTA.

1. User selects `+`; wizard opens with `Upload materials` and `Create manually` choices.
2. Upload route accepts PDF/text; reject unsupported types with clear formats message; allow a text paste.
3. Show queued → extracting → analyzing → grouping statuses, scoped to an import job ID. User may navigate away and return.
4. Return proposed subjects and lists of linked passages/files; never silently create several subjects without review.
5. Allow rename, group/split/merge, reassignment and remove; an ambiguous document shows `Needs your decision` rather than hallucinated certainty.
6. Offer suggested original subject-avatar art (science, maths, physics, pharmacy, medicine, etc.), with `choose another` and a fallback generic icon.
7. User accepts; backend atomically records subjects and source links, queues curriculum generation.
8. The picker updates reactively with selected subjects; user clicks one and `Enter the space`.
9. If a path is not ready, drawer shows progress and an option to browse source material. If ready, show sections/units/lesson nodes.

**Edge cases:** duplicate upload (hash/dedupe), oversized file, password-protected PDF, extraction failure, source with zero readable content, canceled wizard, network reconnect, multiple concurrent imports. Preserve draft and display actionable retry.

## F02 — Manually created subject without sources

`+` → Create manually → name + avatar + optional goals → save subject with status `needs_material` → path shows welcoming empty state with `add resources` / `define objectives`. Do not invent claims from nonexistent notes.

## F03 — Pick a subject, open path drawer, enter lesson

Home → Learn → select subject avatar (lime ring, label) → `Enter the space` → right drawer opens → scroll/path chapter/section banners → select lesson node → preview (objectives, source coverage, progress) → `Start/Resume` → full lesson canvas. Browser back reverses predictably.

## F04 — First lesson session

On entry, retrieve lesson version, activities, persisted personal widget positions, prior attempts and knowledge state. In Guided mode, pan to an opening lesson card and show Compass `Step 1 of N`. Student explores, selects a source citation, opens relevant page, returns, submits challenge, receives feedback, does teach-back; capture attempts; update objective state; show completion summary and return path option.

## F05 — Adaptive learning (signature demo)

1. Learner incorrectly answers an active/passive transport challenge.
2. System records structured mistake evidence; don't infer durable misconception from one slip.
3. A later incorrect explanation or second relevant mistake crosses a defined test threshold.
4. Planner proposes an authorized `Practice: Diffusion vs active transport` object with source-linked content.
5. Canvas places a **ghost/proposal** in a designated practice area, never moving human-created content.
6. Student accepts; new challenge appears. New attempt is evaluated.
7. Demonstrated improvement produces a mastery-state transition and optional XP; previous errors remain in history.
8. Subject path can show a resolved practice branch; no fraudulent guarantee of long-term mastery.

## F06 — Return after interruption

Return via Home `Resume`: load last authorized lesson and viewport, active activity focus, saved notes, unsubmitted local draft (if safe to store) and current review status. Partial activity should never register as completed. Reconnecting state explicit. New lesson version triggers comparison and choice, not silent reset.

## F07 — New upload to existing subject

Library/subject→Upload→extract→classify relative to existing graph→produce update proposal (`expand lesson`, `new unit`, `new subject`, `duplicate`, `conflict`)→user review→apply versioned curriculum changes→preserve prior attempts and point old citations to saved source revisions.

## F08 — Invite a friend and study together

Group picker→create group or accept invitation→General HQ→Study Room. Participant A pins a shared note, participant B sees cursor/note in real time. They converse in room chat, select a useful message and `Keep as note`. Preserve authorship/source thread link. Each person's assessment answer is private even if the challenge object is shared.

## F09 — AI Tutor ask and action

User focuses a lesson object → Tutor action (`Explain`, `Hint`, `Quiz me`, `Show source`, `Create practice`) → API builds authorized context scoped to user+subject+lesson+object → grounded model response → if a data-modifying action is proposed, show diff/ghost+confirm; validate and write only on approval → append AI action/audit metadata.

## F10 — Gamification event

Eligible activity transition → backend verifies attempt/objective uniqueness, anti-farming cap and achievement criteria → append idempotent XP ledger entry → update balance/trophy ownership → tiny on-canvas animation → optional trophy shelf placement; server retry must not duplicate.

## Empty/loading/error conventions

Every AI-generated phase has `not_started`, `queued`, `running`, `needs_review`, `ready`, `failed`, `canceled`; UI must not imply readiness if only metadata exists. Provide retry and view-source where appropriate. Full-screen error must preserve route back to Home.
