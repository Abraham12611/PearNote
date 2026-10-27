# Product acceptance, integration and end-to-end testing matrix

Run against **preview and deployed production** as appropriate. Test data should use licensed sample sources and at least two distinct accounts. Automate with Playwright and Convex backend tests where possible.

| Test ID | Setup / action | Required result |
|---|---|---|
| E01 | Fresh account opens Learn | Only dashed `+`, no Biology or other default |
| E02 | Select plus→manual create without source | Subject saved, path requests material/objectives; no made-up curriculum |
| E03 | Upload real Biology PDF | Job stages visible, source refs/page markers valid |
| E04 | Upload genuinely mixed-subject material | AI suggests editable distinct subjects with segment evidence |
| E05 | Rename/split/merge classification proposal | Accepted data follows student correction |
| E06 | Reupload identical file | Proper duplicate warning/link, no corrupt duplicates |
| E07 | Upload scanned/empty/invalid file | Explicit extract fail/retry, no invented content |
| E08 | Generate and publish curriculum | Ordered sections/units/lessons, valid IDs/source coverage |
| E09 | Enter path from picker | Right-hand drawer with correct subject; close/back/focus correct |
| E10 | Select lesson and start | Full canvas with four functioning widgets and Compass |
| E11 | Source Viewer cite click | Correct uploaded page/segment, not a fabricated reference |
| E12 | Wrong then corrected answer | Attempts persist with matching feedback, progress updated appropriately |
| E13 | Submit incomplete teach-back | AI marks specific missing criteria/uncertainty; no unsupported pass |
| E14 | Two related mistakes | Targeted practice proposal appears without moving human objects |
| E15 | Accept proposed practice | Valid widget created and tied to objective, retries safe |
| E16 | Reload mid lesson | Reopen same saved state, notes and attempts intact |
| E17 | Contextual AI source search | Only current authorized source citations, correct selected widget |
| E18 | Two accounts same shared room | Cursor, chat and note placement synced, reconnect indicator truthful |
| E19 | Promote chat reply | Shared note with author/thread link appears in both clients |
| E20 | Access unshared private PDF via group | Denied, including through group Tutor and storage URL |
| E21 | Repeat XP-triggering mutation | Exactly one idempotent XP entry and trophy event |
| E22 | Open subject picker using keyboard | Can select subject, activate plus, escape, focus restored |
| E23 | Mobile viewport | Full-screen path sheet, readable lesson activity navigation |
| E24 | Offline/network interruption | No false completion; recoverable drafts/errors; meaningful reconnect state |
| E25 | Unsupported Meta API/retry | Error visible, source/job remains intact; no fabricated answer |
| E26 | AI-generated content with malicious instruction | Parsed as data, never escalates tools/permissions |
| E27 | Return to old OurSpaces canvas route on fork | Intended compatibility preserved or explicit redirect; no crashing legacy imports |
| E28 | Public deployed link/incognito | App loads, demo access as designed, no secret leaks |

## Test strata

**Unit:** schema validators, API shape, subject split edits, curriculum ordering, grade boundaries, idempotent reward calculator.

**Integration:** document parser→source segments→model proposal→review→publish; auth wrappers for all queries and uploads; tutor→source retrieval; attempts→mastery→XP.

**End-to-end:** full new user chain, second user group room, multi-device back/refresh, demo script.

**Visual:** pinned baseline screenshot comparisons for rail, modal, canvas, widget tray and chat; inspect animated state and layout at 1440px desktop, 1024px tablet, 390px mobile.

## Severity / stop ship

P0: auth leak, invalid factual citation, uncaught data loss, broken upload→lesson, rewards duplicate, claimed live features that don't work. P1: inaccessible critical action, mobile unusable, severe sync lag, unsupported model error not recoverable. P2: decorative and minor motion polish.

## Release evidence

Attach screenshots/video or test logs to each critical ticket; record test seed ID, build SHA, environment, results and date. Never write `passed` without having run the test.
