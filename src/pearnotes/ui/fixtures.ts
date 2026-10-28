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
              state: "available",
              objectives: [
                "explain why cells pay ATP to move molecules uphill",
                "name a transport protein and what it carries",
              ],
              activityCount: 4,
              sourceCount: 1,
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
              state: "practicing",
              remedial: true,
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
