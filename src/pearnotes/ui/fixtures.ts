import type {
  LearningPath,
  LessonSummary,
  PearSubject,
  ResumePoint,
} from "./types";

/* ------------------------------------------------------------------
 * PROTOTYPE FIXTURES — for the isolated preview harness ONLY.
 *
 * These objects exist so reviewers can see populated states without a
 * backend. They are never imported by application code and must never
 * be handed to a real account: every consumer passes `fixtureLabel`
 * down so the UI marks them visibly. Acceptance test E01 — a fresh
 * account sees only the dashed `+` — holds because the real contract
 * is `subjects={[]}`.
 * ------------------------------------------------------------------ */

export const PROTOTYPE_FIXTURE_LABEL = "prototype fixture";

export const FIXTURE_SUBJECTS: PearSubject[] = [
  {
    id: "fixture-bio",
    name: "Cell biology",
    avatar: "biology",
    color: "var(--pn-subject-biology)",
    status: "ready",
  },
  {
    id: "fixture-alg",
    name: "Linear algebra",
    avatar: "math",
    color: "var(--pn-subject-math)",
    status: "ready",
  },
  {
    id: "fixture-org",
    name: "Organic chemistry",
    avatar: "chemistry",
    color: "var(--pn-subject-chemistry)",
    status: "generating",
  },
];

export const FIXTURE_PATH: LearningPath = {
  subjectId: "fixture-bio",
  status: "ready",
  social: {
    friendsStudied: 3,
    friendsLearning: 4,
    names: ["Maya", "Jules", "Sam"],
  },
  sections: [
    {
      id: "fixture-s1",
      title: "Cell foundations",
      theme: "how the membrane runs the show",
      units: [
        {
          id: "fixture-u1",
          title: "Membranes",
          lessons: [
            {
              id: "fixture-l1",
              title: "The lipid bilayer",
              state: "demonstrated",
              durationMin: 5,
              social: { completed: 3, friends: ["Maya", "Jules", "Sam"] },
              objectives: [
                "describe what a phospholipid bilayer is",
                "spot hydrophilic vs hydrophobic regions",
              ],
              activityCount: 4,
              sourceCount: 2,
            },
            {
              id: "fixture-l2",
              title: "Diffusion and osmosis",
              state: "in_progress",
              progress: 0.5,
              recommended: true,
              durationMin: 8,
              social: { studyingNow: 2, friends: ["Jules", "Kenji"] },
              objectives: [
                "describe how concentration gradients drive diffusion",
                "compare diffusion and osmosis across a membrane",
                "predict water movement in hypo/hypertonic cases",
              ],
              activityCount: 5,
              sourceCount: 2,
            },
            {
              id: "fixture-l3",
              title: "Active transport and ATP",
              state: "locked",
              durationMin: 7,
              objectives: [
                "explain why cells pay ATP to move molecules uphill",
                "name a transport protein and what it carries",
              ],
              activityCount: 4,
              sourceCount: 1,
            },
            {
              id: "fixture-l3b",
              title: "Practice — diffusion vs. active transport",
              kind: "practice",
              state: "locked",
              durationMin: 5,
              objectives: [
                "tell facilitated diffusion from active transport in new cases",
              ],
              activityCount: 2,
              sourceCount: 1,
            },
            {
              id: "fixture-l3c",
              title: "Unit 1 quiz",
              kind: "checkpoint",
              state: "locked",
              durationMin: 6,
              objectives: ["check what you know across membranes"],
              activityCount: 6,
              sourceCount: 0,
            },
          ],
        },
        {
          id: "fixture-u2",
          title: "Moving things across",
          lessons: [
            {
              id: "fixture-l4",
              title: "Practice — diffusion vs active transport",
              kind: "practice",
              state: "practicing",
              remedial: true,
              durationMin: 5,
              objectives: [
                "tell facilitated diffusion from active transport in new cases",
              ],
              activityCount: 2,
              sourceCount: 1,
            },
            {
              id: "fixture-l5",
              title: "Transport proteins",
              state: "needs_review",
              durationMin: 6,
              objectives: [
                "match channel, carrier and pump to their cargo",
              ],
              activityCount: 3,
              sourceCount: 2,
            },
          ],
        },
      ],
    },
    {
      id: "fixture-s2",
      title: "Energy in the cell",
      theme: "ATP, briefly",
      units: [
        {
          id: "fixture-u3",
          title: "ATP",
          lessons: [
            {
              id: "fixture-l6",
              title: "What ATP actually is",
              state: "not_started",
              objectives: ["describe the ATP/ADP cycle in one drawing"],
              activityCount: 3,
              sourceCount: 1,
            },
            {
              id: "fixture-l7",
              title: "Where respiration fits in",
              state: "not_started",
              objectives: [
                "place membrane transport inside the bigger energy story",
              ],
              activityCount: 4,
              sourceCount: 2,
            },
          ],
        },
      ],
    },
  ],
};

export const FIXTURE_LESSON: LessonSummary = {
  id: "fixture-l2",
  title: "Diffusion and osmosis",
  subjectId: "fixture-bio",
  subjectName: "Cell biology",
  stepIndex: 1,
  stepCount: 4,
  objectives: [
    {
      id: "fixture-o1",
      text: "describe how concentration gradients drive diffusion",
      state: "demonstrated",
    },
    {
      id: "fixture-o2",
      text: "compare diffusion and osmosis across a membrane",
      state: "learning",
    },
    {
      id: "fixture-o3",
      text: "predict water movement in hypo/hypertonic cases",
      state: "not_started",
    },
  ],
  objects: [
    { id: "fixture-obj-1", kind: "lesson_card", title: "Gradients in one page", state: "done" },
    { id: "fixture-obj-2", kind: "source", title: "Textbook excerpt — membrane transport", state: "done" },
    { id: "fixture-obj-3", kind: "challenge", title: "Challenge — which way does water move?", state: "active" },
    { id: "fixture-obj-4", kind: "teach_back", title: "Teach-back — explain osmosis", state: "todo" },
    { id: "fixture-obj-5", kind: "note", title: "your margin note", state: "todo" },
  ],
};

export const FIXTURE_RESUME: ResumePoint = {
  lessonId: "fixture-l2",
  lessonTitle: "Diffusion and osmosis",
  subjectName: "Cell biology",
};

/* ------------------------------------------------------------------
 * Keyed per-subject samples (Issue #61) — every fixture subject owns a
 * real path and every path node deep-links to a real lesson. The old
 * single FIXTURE_PATH/FIXTURE_LESSON pair left Algebra and Chemistry
 * staring at a blank drawer; these maps close that. Legacy exports stay
 * for the prototype preview harness.
 * ------------------------------------------------------------------ */

const ALG_PATH: LearningPath = {
  subjectId: "fixture-alg",
  status: "ready",
  social: { friendsStudied: 2, names: ["Priya", "Kenji"] },
  sections: [
    {
      id: "fixture-alg-s1",
      title: "Vectors and spaces",
      theme: "the geometry under the notation",
      units: [
        {
          id: "fixture-alg-u1",
          title: "Vector basics",
          lessons: [
            {
              id: "fixture-alg-l1",
              title: "Vectors as arrows",
              state: "demonstrated",
              durationMin: 6,
              objectives: [
                "read a vector as displacement, not a pair of numbers",
                "sketch addition and scalar multiples",
              ],
              activityCount: 4,
              sourceCount: 2,
            },
            {
              id: "fixture-alg-l2",
              title: "Spans and combinations",
              state: "in_progress",
              progress: 0.4,
              recommended: true,
              durationMin: 9,
              social: { studyingNow: 1, friends: ["Priya"] },
              objectives: [
                "build linear combinations from two vectors",
                "say when a span is a line, a plane, or everything",
              ],
              activityCount: 5,
              sourceCount: 2,
            },
            {
              id: "fixture-alg-l3",
              title: "Linear independence",
              state: "not_started",
              durationMin: 7,
              objectives: [
                "test whether a set carries redundant vectors",
                "connect independence to unique combinations",
              ],
              activityCount: 4,
              sourceCount: 2,
            },
          ],
        },
        {
          id: "fixture-alg-u2",
          title: "Matrices as maps",
          lessons: [
            {
              id: "fixture-alg-l4",
              title: "Matrix multiplication as composition",
              kind: "lesson",
              state: "not_started",
              durationMin: 8,
              objectives: [
                "read AB as 'do B, then A' on the plane",
                "predict what a 2×2 matrix does to a basis",
              ],
              activityCount: 4,
              sourceCount: 1,
            },
            {
              id: "fixture-alg-l5",
              title: "Unit 1 checkpoint",
              kind: "checkpoint",
              state: "unknown",
              durationMin: 6,
              objectives: ["check what you know across vector spaces"],
              activityCount: 5,
              sourceCount: 0,
            },
          ],
        },
      ],
    },
  ],
};

const ORG_PATH: LearningPath = {
  subjectId: "fixture-org",
  status: "generating",
  sections: [
    {
      id: "fixture-org-s1",
      title: "Structure and bonding",
      theme: "draft — proposal being refined",
      units: [
        {
          id: "fixture-org-u1",
          title: "Functional groups",
          lessons: [
            {
              id: "fixture-org-l1",
              title: "Reading skeletal structures",
              state: "unknown",
              durationMin: 7,
              objectives: [
                "decode a line-angle drawing into atoms and bonds",
                "spot the carbons hiding in plain sight",
              ],
              activityCount: 4,
              sourceCount: 2,
            },
            {
              id: "fixture-org-l2",
              title: "The usual suspects — alcohols and ketones",
              state: "unknown",
              durationMin: 8,
              objectives: [
                "name the main oxygen-bearing functional groups",
                "tell an alcohol from a ketone by position",
              ],
              activityCount: 5,
              sourceCount: 2,
            },
          ],
        },
      ],
    },
  ],
};

/** subject id → its whole path. Every FIXTURE_SUBJECTS id MUST be a key
 *  here — a missing entry is exactly the blank-drawer bug from #61. */
export const FIXTURE_PATHS: Record<string, LearningPath> = {
  "fixture-bio": FIXTURE_PATH,
  "fixture-alg": ALG_PATH,
  "fixture-org": ORG_PATH,
};

/* One honest lesson per path node — built from the node itself so the
 *  two never drift: title, subject, position and objectives all come
 *  from the path the learner just saw. `stepIndex` is the real place in
 *  the path (never null — fixtures always sit on their path). */
function lessonsFor(path: LearningPath, subjectName: string): LessonSummary[] {
  const flat = path.sections.flatMap((s) =>
    s.units.flatMap((u) => u.lessons),
  );
  return flat.map((node, i) => ({
    id: node.id,
    title: node.title,
    subjectId: path.subjectId,
    subjectName,
    stepIndex: i,
    stepCount: flat.length,
    objectives: node.objectives.map((text, o) => ({
      id: `${node.id}-o${o + 1}`,
      text,
      state:
        node.state === "demonstrated"
          ? "demonstrated"
          : node.state === "in_progress" && o === 0
            ? "learning"
            : "not_started",
    })),
    objects: [
      ...(node.sourceCount > 0
        ? [
            {
              id: `${node.id}-src`,
              kind: "source" as const,
              title: `source excerpt (${node.sourceCount} on the path)`,
              state: "done" as const,
            },
          ]
        : []),
      {
        id: `${node.id}-card`,
        kind: "lesson_card" as const,
        title: `${node.title} — in one page`,
        state: node.state === "demonstrated" ? ("done" as const) : ("todo" as const),
      },
      ...Array.from({ length: Math.max(1, node.activityCount) }, (_, a) => ({
        id: `${node.id}-a${a + 1}`,
        kind: "challenge" as const,
        title: `challenge ${a + 1} — ${node.title.toLowerCase()}`,
        state:
          node.state === "demonstrated"
            ? ("done" as const)
            : a === 0 && node.state === "in_progress"
              ? ("active" as const)
              : ("todo" as const),
      })),
    ],
  }));
}

function buildFixtureLessons() {
  const byName = new Map(FIXTURE_SUBJECTS.map((s) => [s.id, s.name]));
  const out: Record<string, LessonSummary> = {};
  for (const path of Object.values(FIXTURE_PATHS)) {
    for (const lesson of lessonsFor(path, byName.get(path.subjectId) ?? "subject")) {
      out[lesson.id] = lesson;
    }
  }
  return out;
}

/** lesson id → its lesson summary, for every node on every fixture path. */
export const FIXTURE_LESSONS: Record<string, LessonSummary> =
  buildFixtureLessons();
