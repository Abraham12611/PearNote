# PearNotes Product Requirements Document (PRD)

**Status:** Approved design direction based on conversation, detailed engineering proposal subject to implementation validation. **Date:** 2026-10-27. **Release tracks:** Phase 1 hackathon vertical slice; Phase 2–8 full platform.

## Executive summary

PearNotes is an AI-powered learning environment assembled from student-owned study material. It keeps OurSpaces' real-time freeform canvas, tactile scrapbook aesthetic, colorful illustrated identity, chat/presence and compact interaction controls. Unlike a standard note-taking or chatbot product, it represents a student's sources as a navigable curriculum path and as interactive lesson worlds. Learning produces durable attempts, revised concepts, user-authored artifacts and gradually evolving pathways. Students may optionally learn with others in shared rooms.

**One sentence user promise:** *Upload what you're studying. Watch it become a world you can explore, practice in, and understand together.*

## Target user and problem

- **Launch:** solo students who receive unstructured lecture notes and PDF chapters and have difficulty deciding where to start, organizing topics and testing understanding.
- **Adjacent:** pairs preparing for tests, self-learners and informal study groups.
- **Later:** teachers, student project teams, schools.
- Today they juggle folders, playlists, notes, generic chatbot answers, flashcards and Discord/WhatsApp discussions. None is a unified place where content, demonstrated understanding, exploration and collaboration persist in a meaningful spatial relationship.

## User-visible feature requirements

### FR-01 Home Space

Home is the landing desk. It has OurSpaces-style floating rail, personal avatar, contextual bottom dock, real quick-resume, study/review reminder objects, groups, Library and profile/settings. For a fresh user, it is welcoming but does not fabricate materials, subjects or earned trophies.

**Acceptance:** a newly created account sees no pre-created subject. A returning learner sees actual last lesson and saved artifacts.

### FR-02 Learn subject picker

`Learn` opens a dark modal inspired by existing OurSpaces avatar chooser. **Empty:** one dashed/broken circular `+` with `Create subject`. **Populated:** circular original subject illustrations with names/colors and the same plus tile; select one and press `Enter the space`. Subject illustrations are available icon choices, not automatically created subjects. Picker keyboard accessible and responsive.

**Acceptance:** no seeded Biology/Math for fresh accounts; names and avatar selections persist; selected identity is visually obvious.

### FR-03 New subject pipeline

User chooses manual-create or PDF/text upload. Upload processing uses queued extraction and Meta AI subject classification, including mixed-topic inputs. AI returns **proposals** listing sources/segments per subject, confidence and ambiguous cases. User can rename, merge, split, discard or move content before accepting. Manual subject has valid empty state. Accepted subjects receive a suggested prebuilt avatar/color, editable by user.

**Acceptance:** mixed-material packet offers multiple editable subject proposals; only accepted proposals become real subjects.

### FR-04 AI curriculum

Subject's approved sources are normalized into addressable segments, concepts/objectives, versioned sections, units and lessons with source coverage. Model must return typed validated spec; don't invent comprehensive material from a small excerpt. Empty subjects get a content or goal prompt, not fabricated syllabus. Later uploads create reviewable curriculum diffs.

**Acceptance:** each shown lesson has an objective and source mapping; repeated operation doesn't duplicate nodes.

### FR-05 Learning path

Subject opens a 50–55% viewport right-side desktop drawer with dimmed Home behind, a scrollable playful original illustrated path, section bands, unit nodes, lesson previews, states and Resume/Start. On mobile a full-screen sheet. Lesson node opens a full lesson canvas; returning preserves path scroll. Nodes can indicate current, demonstrated and review-needed; hidden prerequisites must not block source access.

**Acceptance:** subject identity shown correctly, lesson navigation and browser back stable, keyboard focus restored.

### FR-06 Lesson space

A full-screen persistent, pan/zoom learning world built from typed widgets. Default zones organize source orientation, explanation, interactive challenges, teach-back and student notes. `Guided` mode has Compass and next activity focus; `Explore` mode provides free navigation/arrangement. Both modes share same data and grading. Students can add their own notes, select sources, pin takeaways, return to prior sections and resume later.

**Acceptance:** not just a static dashboard; actual lesson activities submit, persist, affect learner state.

### FR-07 Four Phase 1 learning widgets

`LessonCard`: source-linked explanation and examples. `SourceViewer`: direct page/passage/citation. `Challenge`: graded exercise with hints/feedback. `TeachBack`: learner-generated explanation graded by structured rubric and uncertainty. All conform to existing widget system, but activity state is stored separately from view data. Existing frame, note, sticker, chat and media widgets usable as appropriate.

**Acceptance:** four real widgets work for same lesson, source accesses authorized, objective assessments stored.

### FR-08 Learning evidence and adaptation

Server records attempts and evaluates objectives. Wrong answer triggers explanatory feedback; repeated evidence of a particular gap can create an **optional, reviewed, source-grounded additional practice widget**. Student choice controls insertion; AI never unexpectedly moves notes or grants grades/rewards. Successful follow-up adjusts understanding record. Future versions personalize longer-term path/reviews.

**Acceptance:** a realistic repeated Biology misconception leads to a relevant, valid remedial activity and observable progress across refresh.

### FR-09 Contextual Pear Tutor

Accessible through compact bottom dock; knows authorized user, lesson, selected widget and approved sources/attempt summaries. Provides Hint, Explain, Quiz me, Show source, Help practice; can propose new typed widgets but requires approval for durable writes. Group `@Pear` is explicitly separate with only shared knowledge. Avoid ungrounded claim or reading another user's private source.

**Acceptance:** "explain this" references selected object and cited source; group cannot use private retrieval.

### FR-10 Collaboration

Phase 1 proves **one** shared study room with real two-account chat, cursor presence, editable notes and chat→note promotion. Later group General HQ and specialized Study, Brainstorm, Project and Revision spaces use the same canvas. User private curricula, tutor threads and assessments are never silently exposed.

**Acceptance:** shared edits and chat sync between two browsers; unauthorized private file request denied.

### FR-11 Gamification

In Phase 1, introduce server-authoritative XP and one achievable trophy linked to qualified objective/lesson outcomes. Later streaks, quotas, quests, trophy hunting, collectibles, optional leagues, path cosmetics and group missions. Never equate XP with knowledge or accept client-provided award amount.

**Acceptance:** one supported learning result awards XP exactly once, no duplicates from retries.

### FR-12 Profile, settings and library

Launch: basic account, display name/avatar, settings, source upload/review, personal library stub, access control. Full: source search, filters, annotation, notes, reading, privacy and export/deletion, accessibility preferences, rich profile shelf and notifications.

**Acceptance:** student can find their source, update profile, leave group, revoke private sharing where appropriate.

## Functional boundaries by phase

| Capability | Phase 1 | Later phase |
|---|---|---|
| PDF/text | Real upload+analysis | PDF enhancement + DOCX/PPTX/audio/video/web: Phase 6 |
| Subjects and paths | Create/review/generated small path | Merge/archive/versioned updates: Phase 2 |
| Widgets | Four education types + inherited basics | Full packs: Phases 2/6 |
| Learning | Simple evidence/targeted remediation | Knowledge graph calibration/revision: Phase 3 |
| Tutor | Context-scoped help and proposal | More actions, audio: Phases 3/6 |
| Group | One live study room | Complete HQ/room catalog: Phase 5 |
| Rewards | Verified XP + first trophy | Quest/league/treasure economy: Phase 4 |
| Billing and institutions | None | Phase 7/8 |

## Nonfunctional requirements

**Privacy:** backend authorization for every source, lesson, attempt, room, assistant tool and file. **Safety:** untrusted documents are data, not instructions; no executable AI-generated UI; source citations must resolve. **Reliability:** resumable jobs, durable lesson progress, clear failures. **Performance:** fast first content and no massive source context per tutor turn; cost caps. **Accessibility:** keyboard, mobile linear fallback, reduced motion. **Observability:** model/version/job status, costs, validation failures and permission tests. **Licensing:** MIT attribution retained, upstream media rights audited.

## Success measures and quality bar

Short-term: can a first-time visitor perform `upload → approve subject → open generated path → enter lesson → complete challenge/teach-back → get appropriate adaptive practice → resume`? Long-term: qualified activation/retention, delayed recall outcomes, trust in grounded answers, successful group sessions and sustainable model cost per learner. Do not claim learning efficacy before study data supports it.

## Dependencies, risks and assumption register

- Actual Meta API support/credits must be verified with official docs and credentials.
- Current OurSpaces main is feature-rich and coupled; avoid rewriting giant UI orchestrators all at once.
- Real student source extraction, especially image-only PDFs, might fail; show honest fallback and future OCR.
- AI grading can be wrong; use rubric and independently reviewed tests.
- Deadline imposes constrained scope; cut extra reward/graphics before reliable learning loop.
- Hackathon track/accepted participation must be verified; previous conversation recommends Indie, not a confirmed enrolled track.

## Signoff and change management

This PRD codifies user-specified features and implementation recommendations. New business/engineering decisions require explicit ADR entry in [decisions and risks](../delivery/DECISIONS_RISKS.md) and an update to matching acceptance tests. Phase-by-phase ownership and delivery gates live in [roadmap](../roadmap/README.md).
