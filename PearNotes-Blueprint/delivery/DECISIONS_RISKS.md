# Decision log, unresolved questions and risk register

## Adopted decisions (2026-10-27)

- Choose **current OurSpaces main** and pin commit (requested explicitly).
- PDF + text first; no default subjects; editable multi-subject classification.
- Four education widget MVP types; one shared study room; Biology demo.
- Preserve existing tactile, playful OurSpaces UI and pan/zoom/real-time.
- Path in side drawer, lesson on full canvas; fixed Home shell.
- Nine phases with 0/1 hacked into deadline and 2–8 post-hackathon.

## Proposals pending confirmation

| ID | Proposal | Why it matters |
|---|---|---|
| A01 | Enter Indie track, **if accepted and eligible** | Startup track has different qualification requirements |
| A02 | Skip rigid lockout of unstudied lessons; gate rewards only | Freedom/exploration vs guided progression |
| A03 | One original illustrated subject-avatar family | Brand consistency, licensing, responsive size |
| A04 | Fixed guided practice area for AI ghost objects | Prevent disruptive spatial re-layout |
| A05 | Conservative XP event amounts and one first trophy | Test learning benefit before full economy |
| A06 | Tolerate `needs_review` rather than guess classifications | Source correctness and trust |

## Risk register

| Risk | Impact | Likelihood (estimate) | Mitigation / trigger |
|---|---|---|---|
| Main branch imports too entangled | High | High | Feature flag/wrapper; no big-bang rewrite |
| Model output invalid/unfounded | High | High | schema gate, citation check, human review |
| PDF parsing misses diagrams | Medium | High | text-only warning; vetted demo source; later OCR |
| Hackathon API credits exhausted | High | Medium | per-job limits, cache, token monitoring |
| Scope explosion | Very high | High | P0 critical loop, explicit cut list |
| Private group data leak | Critical | Medium | centralized backend auth and adversarial tests |
| Poor desktop→mobile transition | High | Medium | linear mobile layout, device QA |
| XP farming/false mastery | Medium | High | immutable attempts, ledger idempotency, grading criteria |
| Visual similarities raise brand questions | Medium | Medium | original PearNotes art and upstream attribution |
| Track acceptance/entry issue | Critical | Unknown | verify acceptance and already-selected track now |
| Demo relies on seeded fake activity | High | Medium | real verified interactions, labeled cache |
| Instructor-incorrect educational content | High | Medium | evaluation corpus, citations, calibrated uncertainty |

## Decision record template

```markdown
### ADR-YYYY-NNN — Decision title
- Date / owner:
- Status: proposed | accepted | superseded
- Context:
- Alternatives:
- Decision and rationale:
- Affected specs, code and tests:
- Migration / rollback:
```

## Update protocol

New architecture change requires update to at least this log, relevant spec, matching test cases, and roadmap epic. Accepted decisions should not silently change because a coding agent chose an easier implementation.
