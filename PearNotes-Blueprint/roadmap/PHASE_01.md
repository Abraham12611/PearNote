# Phase 01 — Meta Hackathon Edition

**Target:** submit by November 4, 2026 at 9:00 p.m. ET, subject to organizer confirmation. **Strategy:** exceptional vertical slice, not broad unfinished platform. **Demo discipline:** Biology/Cell Biology. **Launch media:** PDF+text. **New widgets:** four. **Shared collaboration:** one room.

## 01.1 Home, identity and navigation (Oct 27–28)

- New-user Home and left rail; Learn modal shows dashed `+` only; account/avatar/profile essential controls.
- Subject creation wizard shell and right-hand path drawer with backdrop blur, close/back and mobile fallback.
- Readable lesson canvas shell reusing upstream pan/zoom and settings.

**Acceptance:** cold signed-in account displays zero subjects; manual creation works, path empty without inventing content.

## 01.2 Source and subject engine (Oct 28–29)

- PDF/text upload and storage; extraction with page/segment references; duplicate handling; queued progress statuses.
- Muse Spark or available Meta equivalent returns typed one/multi-subject proposals, classification evidence and uncertainty; editable review/merge/split.
- User acceptance creates persistent subjects with avatars and source associations.

**Acceptance:** mixed-subject source produces editable proposals and never auto-publishes unsolicited private subjects.

## 01.3 Path composer (Oct 29–30)

- Draft versioned sections→units→lessons with grounded objectives.
- Validate structure and source refs; materialize lesson canvas IDs; show section node path and Start/Resume.

**Acceptance:** generated curriculum for real source, all links resolve, no canned default curriculum for ordinary new accounts.

## 01.4 Interactive lesson world (Oct 30–31)

- Build four typed widgets: Lesson Card, Source Viewer, Challenge, Teach-Back.
- Place in coherent spatial layout with lesson Compass; guided/explore; read citations; submit attempts.

**Acceptance:** user can study, cite source, answer and reopen; UI responds correctly to wrong/right input.

## 01.5 Tutor and adaptation (Nov 1)

- Source-scoped Tutor in existing dock: Hint, Explain, Show source, Quiz me, Help me practice.
- Immutable attempts and simple objective state projection.
- Repeated challenge/teach-back error triggers **reviewable remedial challenge** inserted in designated zone and optionally path branch.

**Acceptance:** recorded problem produces useful targeted alternative, validated answer, retry and saved improvement evidence. No reward for clicking without learning.

## 01.6 Live study and light rewards (Nov 2)

- One group shared study room with invite, chat, notes, cursors and message→note promote; member auth and reconnection states.
- Server-authoritative XP ledger, first achievement/trophy and small reward animation.

**Acceptance:** two real sessions see edits in sync; private materials remain inaccessible; reward doesn't duplicate on retry.

## 01.7 Polish, evaluate and submit (Nov 3–4)

- Run [acceptance matrix](../delivery/ACCEPTANCE_TESTS.md); test site in incognito, two tabs and mobile.
- Verify Meta API actual calls and credited usage; source references and evaluation set.
- Prepare real demo with initial empty state, visible processing, lesson interaction, adaptive branch and shared room; label cached outputs honestly.
- Publish deployed app, project writeup, originality attribution, short video, repository/test evidence and required submission.

**Acceptance:** complete `sign in → upload → review → path → lesson → assessed practice → tutor → remediation → resume` loop in deployed production; one stable two-user collaboration demo.

## Scope cuts if deadlines slip

First cut optional trophy hunting and expanded cosmetics; next cut additional activity variations and room templates. Never cut auth, source grounding, validated lesson, saved attempts or demo reliability. Fallback from universal remediation to a narrow tested biology template is acceptable if honestly described.

## Competition evidence

Impact 30%: real student experience. Meta tooling 25%: structured reasoning + grounded learning/adaptation. Technical depth 20%: validated contracts, auth, persistence, live collaboration. Demo 25%: a coherent observable transformation, not screen montage.
