# Information architecture and sitemap

## Navigation tree

```text
PearNotes
├── Authentication / onboarding
│   ├── Sign in / create account
│   ├── Choose personal avatar and name
│   ├── New-user welcome (NO subjects seeded)
│   └── Permissions / provider information
├── Home (personal desk / landing canvas)
│   ├── Resume learning shortcut
│   ├── Learn → Subject Picker modal
│   │   ├── Dashed + tile → Subject Creator wizard
│   │   │   ├── Upload PDF / paste text / manual create
│   │   │   ├── Processing statuses
│   │   │   ├── Review one or more suggested subjects
│   │   │   ├── Rename, split, merge, move source segments
│   │   │   └── Choose illustrated avatar / accept
│   │   └── Select subject → enter space → Learning Path drawer
│   │       ├── Subject header / manage subject
│   │       ├── Sections → Units → Lessons
│   │       ├── Lesson preview / start or resume
│   │       └── Lesson Space (full-screen canvas)
│   │           ├── Guided/Explore modes, Lesson Compass
│   │           ├── Lesson Card / Source / Challenge / Teach-Back
│   │           ├── Notes, frames, stickers, chat-linked objects
│   │           ├── Contextual Pear Tutor drawer/dock
│   │           └── Completion, XP, feedback, next unit
│   ├── Library
│   │   ├── All sources; filters; upload; source viewer
│   │   └── Source details / related concepts and lessons
│   ├── Groups
│   │   ├── Group picker / create or accept invite
│   │   └── Group HQ canvas
│   │       ├── Members / calendar / tasks / general chat
│   │       └── Specialized rooms (Study, Brainstorm, Project, Revision)
│   ├── Achievements / trophy shelf / quests
│   ├── Profile
│   └── Settings (account, access, privacy, preferences, help)
└── Direct links to authorized subjects, lessons and group rooms
```

## Route proposal

| Path | Screen | Auth / rights |
|---|---|---|
| `/` | Home | Signed in; demo guest special mode |
| `/library` | Library | User |
| `/subjects/:subjectId/path` | Subject drawer route/state | Subject owner |
| `/subjects/:subjectId/lessons/:lessonId` | Lesson Space | Subject owner or approved share |
| `/groups` | Groups list | User |
| `/groups/:groupId` | General HQ | Group member |
| `/groups/:groupId/rooms/:roomId` | Group room | Group member/guest permission |
| `/achievements` | Trophy shelf | User |
| `/profile` | User profile | User/public subset |
| `/settings` | Settings | User |
| `/join/:inviteToken` | Invite acceptance | Token-validated |

Existing OurSpaces uses hash routes, including `src/lib/routes.ts`; route migration must preserve intentional compatibility where needed. Path shape is a **proposal**, not implemented. Deep links should restore underlying context and never bypass permission checks.

## Navigation behavior rules

- The subject picker is **a modal over Home**, not its own noisy dashboard.
- `Enter the space` from the selected subject opens a **50–55% right drawer** on desktop; home dims/blurs but stays legible. Mobile uses a full-screen sheet.
- A lesson selection **navigates to a full lesson canvas**; browser back returns to the subject drawer at same scroll position and selection.
- The left rail remains globally accessible where space allows; full-screen lesson presentation may collapse it, but preserves an obvious exit and subject breadcrumb.
- Show `Resume` on Home after at least one real attempt; do not force subject-picker navigation every session.
- Group rooms use consistent rails and canvas chrome but maintain their own context and breadcrumbs.
- Subject picker may show `+` even after many subjects; no invisible upper limit or arbitrary seeded icons.

## Data navigation boundary

`/subject/:id` route identity does not imply a reusable public `space` ID. Always verify ownership on backend; personal curriculum nodes map to lesson canvas spaces by explicit association.
