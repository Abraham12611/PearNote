# Canonical terminology and content hierarchy

| Term | Meaning | Stored concept |
|---|---|---|
| User | Authenticated learner or collaborator | `users` |
| Subject | Personal grouping of learning resources and curriculum | `subjects` |
| Source | Uploaded/pasted document and its metadata; may serve many subjects | `sources` |
| Source segment | Addressable extracted passage, page or timestamp | `sourceSegments` |
| Concept | Teachable idea, not necessarily a lesson | `concepts` |
| Objective | Assessable learner outcome | `objectives` |
| Curriculum | Versioned ordering/coverage plan for a subject | `curriculumVersions` |
| Section | Broad curriculum chapter | `sections` |
| Unit | A group of related lessons | `units` |
| Lesson | Unit of study experience with objectives and activities | `lessons` |
| Activity | Assessment/instruction content with a typed interactive schema | `activities` |
| Lesson Space | Canvas that visualizes a lesson's activities | `spaces` where `kind=lesson` |
| Widget | Movable rendering of an activity or freeform object | `widgets` |
| Attempt | A student's response and evaluation event | `attempts` |
| Mastery | Evidence-informed per-student, per-objective estimate/status | `mastery` |
| Remediation | Focused practice aimed at a suspected gap | `adaptationProposals` |
| Review item | Scheduled future retrieval practice | `reviewItems` |
| Group | People with membership/roles | `groups` |
| Group HQ | Shared group-level organizational canvas | `spaces` where `kind=group_hq` |
| Room | Additional group study/project/brainstorm canvas | `spaces` with group association |
| Thread | Conversation on a room or object | `messages` + thread scope |
| Tutor | AI with context-limited learning tools | `tutorThreads`, `tutorTurns` |
| XP | Server-awarded game progression credit | `xpLedger` |
| Trophy | Verifiable achievement with collectible art | `rewards` + `userRewards` |

**Rules:** the curriculum *structures* lessons; a canvas *presents* them; a mastery record *describes evidence for a person*. Don't equate the concepts. A `subject` is not automatically an `OurSpaces space`. A `unit` can host multiple lessons. A group owns rooms, not the personal subjects of its members.
