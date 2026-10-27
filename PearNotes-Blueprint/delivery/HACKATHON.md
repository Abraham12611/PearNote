# Meta Global AI Developer Hackathon — submission and judging strategy

**Current planning date:** 2026-10-27. **Published submission deadline:** 2026-11-04 9:00 p.m. ET. **Application deadline:** 2026-10-25 11:59 p.m. ET (already passed). **Eligibility:** accepted applicants only, one track per participant. Confirm exact schedule and acceptance with organizers before representing this as a valid entry. Primary official source: https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver.

## Track recommendation (conditional)

**Indie Developer** for an eligible individual/team up to four. Startup if entrant qualifies as technical founder, is an active employee and authorized startup representative, and can substantiate startup status. 1st prize Indie $150,000; Startup $250,000; different competition dynamics unknown. An already-accepted entrant may need organizer permission to change selected track. Do not misrepresent team, incorporation, ownership or experience.

## We are trying to win, but success is judged externally

Engineering target: top-tier entry backed by repeatable product evidence. We cannot guarantee an award. Rubric: Impact 30%, creative use of Meta AI 25%, technical depth/execution 20%, demo 25%.

## Differentiated pitch

> **PearNotes makes your study material into a living world.** Upload a PDF or text notes. Meta AI discovers its concepts and generates an interactive path. Enter a lesson as a free-roam canvas; when you struggle, it can add the right practice object. Your progress, notes and discoveries persist; friends can study on a shared board.

## Demo narrative (aim ~2.5–3 minutes; match organizer video rules)

| Beat | Approx window | Evidence on screen |
|---|---|---|
| 1. Hook | 0:00–0:18 | Messy actual Biology PDF and empty subject picker with dashed plus |
| 2. World birth | 0:18–0:50 | Upload + Meta analysis → proposed subject; edit + approve |
| 3. Path | 0:50–1:05 | Illustrated right path drawer with real generated nodes |
| 4. Learn | 1:05–1:35 | Enter interactive canvas, open source passage, attempt challenge |
| 5. Surprise | 1:35–2:03 | Meaningful mistake → AI proposes new grounded practice card → student accepts and improves |
| 6. Reward | 2:03–2:15 | First validated trophy/XP, update path state |
| 7. Together | 2:15–2:40 | Invite/second browser, synced cursor/chat/note promotion |
| 8. Credibility | 2:40–3:00 | Meta model calls, validated pipeline, source refs, app URL/GitHub/reuse attribution |

Actual shot durations adjusted after script read-through; don't overclaim unimplemented behavior.

## Production demonstration standards

- Create **two separate real users** and a seeded demo-only dataset; never fill new real student accounts with canned subjects.
- Show at least one real model response from a fresh source; use visible deterministic cache/replay for time-consuming shots **only if honestly labeled**.
- Ground every diagram/explanation in original source page or clearly marked checked supplemental material.
- Include a controlled known misconception with proper rubric and repeat attempts—don't simulate an AI insight through frontend-only conditions.
- Judge can use public live URL with clear guest access/test account, depending on authorization and security constraints.
- Include repo MIT attribution, exact build SHA and reproducible test steps.

## Submission assets

Working demo URL, 2–3 minute video subject to official limit, concise written pitch, technical architecture, model/tool usage proof, GitHub link, attribution + LICENSE, testing/evaluation summary, track eligibility, and any other required portal fields. Submission portal: https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit.

## Demo backup

Record actual working interactions and keep locally authorized sample files. If model endpoint fails live, use a clearly labeled *previously generated and stored curriculum* with screenshot/video evidence of actual API call; never stage a fake request. Ensure production doesn't depend on unavailable private environment variables in judge's browser.

## Stop-ship checks

No model usage evidence; leaked private source; broken upload→lesson chain; demo hardcoded while claimed dynamic; invalid Open Source attribution; two-tab fake sync; no accessible exit from drawer; unsupported scientific claims; broken public deployment. These outrank decorative polish.
