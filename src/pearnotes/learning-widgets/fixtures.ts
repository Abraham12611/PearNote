/**
 * Labelled development fixtures for the learning-widget gallery.
 *
 * Shape mirrors the real Muse-generated proposal ("Cell Biology: Plant vs
 * Animal Cell Features", physical pages 1–2, 3 objectives, 13 cited
 * segments) — but every id is a `fixture-*` string, all excerpt text is
 * original paraphrase written for this fixture (not copied from any
 * textbook), and the fixture port never persists anything.
 *
 * When the real compiled lesson arrives, these props are simply swapped
 * for validated data through the same `LearningWidgetPort` contract.
 */
import type {
  ActivityEnvelope,
  ClassificationSpec,
  LearningWidgetPort,
  PracticeProposal,
  PracticeReviewAction,
  SegmentLoadResult,
  SourceRef,
  SourceSegmentView,
  WidgetActivitySpec,
} from "./types";
import type { RuntimeLesson } from "./runtime";
import {
  fixtureGradeChoice,
  fixtureGradeClassification,
  fixtureGradeTeachBack,
  type FixtureSolution,
} from "./logic";

export const WIDGET_FIXTURE_LABEL = "prototype fixture";

/* --- grounding ---------------------------------------------------------------- */

export const FIXTURE_LESSON_ID = "fixture-lesson-cells-01";

export const FIXTURE_OBJECTIVES = {
  sharedParts: "fixture-obj-shared-parts",
  plantOnly: "fixture-obj-plant-only",
  compare: "fixture-obj-compare",
} as const;

/** Fixture refs keyed like real sourceRef rows (ids are opaque strings). */
export const FIXTURE_SOURCE_REFS: SourceRef[] = [
  { sourceId: "fixture-src-cells-excerpt", segmentId: "fixture-seg-p1-s02", page: 1 },
  { sourceId: "fixture-src-cells-excerpt", segmentId: "fixture-seg-p1-s04", page: 1 },
  { sourceId: "fixture-src-cells-excerpt", segmentId: "fixture-seg-p2-s01", page: 2 },
];

/** Literal fixture excerpt text — original paraphrase, NOT textbook copy. */
export const FIXTURE_SEGMENTS: SourceSegmentView[] = [
  {
    segmentId: "fixture-seg-p1-s01",
    sourceId: "fixture-src-cells-excerpt",
    page: 1,
    segmentNo: 1,
    kind: "heading",
    sourceTitle: "Cell biology excerpt (fixture)",
    text: "Comparing plant and animal cells",
  },
  {
    segmentId: "fixture-seg-p1-s02",
    sourceId: "fixture-src-cells-excerpt",
    page: 1,
    segmentNo: 2,
    kind: "paragraph",
    sourceTitle: "Cell biology excerpt (fixture)",
    text: "Both cell types share a nucleus for instructions, a membrane that controls what passes in and out, cytoplasm where reactions happen, and mitochondria that release energy.",
  },
  {
    segmentId: "fixture-seg-p1-s04",
    sourceId: "fixture-src-cells-excerpt",
    page: 1,
    segmentNo: 4,
    kind: "paragraph",
    sourceTitle: "Cell biology excerpt (fixture)",
    text: "Plant cells add a rigid cellulose wall around the membrane, chloroplasts packed with chlorophyll for photosynthesis, and one large permanent vacuole.",
  },
  {
    segmentId: "fixture-seg-p2-s01",
    sourceId: "fixture-src-cells-excerpt",
    page: 2,
    segmentNo: 1,
    kind: "paragraph",
    sourceTitle: "Cell biology excerpt (fixture)",
    text: "Animal cells never have a wall or chloroplasts; their vacuoles, when present, are small and temporary rather than one big central sac.",
  },
];

/* --- activity specs (validated widget input) ---------------------------------- */

export const FIXTURE_LESSON_CARD_SPEC: WidgetActivitySpec = {
  kind: "lessonCard",
  heading: "plant vs animal cells — what's shared, what's not",
  body: "Every cell runs on the same core kit: a nucleus giving instructions, a membrane acting as the gate, cytoplasm as the workshop floor, and mitochondria releasing energy. Plant cells bolt on extras — a stiff cellulose wall, chloroplasts for catching sunlight, and one big permanent vacuole. Animal cells skip all three.",
};

export const FIXTURE_CLASSIFY_SPEC: ClassificationSpec = {
  kind: "classify",
  prompt: "sort each cell feature into the tray where it belongs",
  items: [
    { id: "f-nucleus", label: "nucleus", caption: "holds the instructions" },
    { id: "f-membrane", label: "cell membrane", caption: "controls what enters" },
    { id: "f-cytoplasm", label: "cytoplasm", caption: "where reactions happen" },
    { id: "f-mitochondria", label: "mitochondria", caption: "releases energy" },
    { id: "f-wall", label: "cellulose cell wall", caption: "rigid outer layer" },
    { id: "f-chloroplast", label: "chloroplasts", caption: "catch sunlight" },
    { id: "f-bigvac", label: "large permanent vacuole", caption: "one big sac" },
    { id: "f-smallvac", label: "small temporary vacuoles", caption: "come and go" },
    { id: "f-chlorophyll", label: "chlorophyll", caption: "the green pigment" },
  ],
  buckets: [
    { id: "b-plant", label: "plant only", hint: "wall, green bits, big vacuole" },
    { id: "b-shared", label: "in both", hint: "the shared core kit" },
    { id: "b-animal", label: "animal only", hint: "things plants don't have" },
  ],
};

/** Fixture answer key — lives with the FIXTURE grader, never inside a spec. */
export const FIXTURE_CLASSIFY_SOLUTION: FixtureSolution = {
  "f-nucleus": "b-shared",
  "f-membrane": "b-shared",
  "f-cytoplasm": "b-shared",
  "f-mitochondria": "b-shared",
  "f-wall": "b-plant",
  "f-chloroplast": "b-plant",
  "f-bigvac": "b-plant",
  "f-smallvac": "b-animal",
  "f-chlorophyll": "b-plant",
};

export const FIXTURE_MC_SPEC: WidgetActivitySpec = {
  kind: "multipleChoice",
  prompt: "which feature do animal cells never have?",
  options: [
    { id: "opt-a", label: "mitochondria" },
    { id: "opt-b", label: "a cell wall" },
    { id: "opt-c", label: "a nucleus" },
    { id: "opt-d", label: "cytoplasm" },
  ],
};
const FIXTURE_MC_ANSWER = "opt-b";

export const FIXTURE_TEACHBACK_SPEC: WidgetActivitySpec = {
  kind: "teachBack",
  prompt:
    "in your own words, explain how you'd tell a plant cell from an animal cell on a microscope slide",
  rubricCriteria: [
    "name at least two plant-only features",
    "mention the cell wall or chloroplasts specifically",
    "name at least one shared feature",
  ],
};
/** Deterministic keyword alternatives per rubric criterion (fixture grader). */
export const FIXTURE_TEACHBACK_KEYWORDS: string[][] = [
  ["wall", "chloroplast", "vacuole", "chlorophyll"],
  ["wall", "chloroplast"],
  ["nucleus", "membrane", "cytoplasm", "mitochondria"],
];

/* --- envelopes ---------------------------------------------------------------- */

function envelope(activityId: string, objectiveIds: string[]): ActivityEnvelope {
  return {
    lessonId: FIXTURE_LESSON_ID,
    activityId,
    activityRevision: 1,
    objectiveIds,
    sourceRefs: FIXTURE_SOURCE_REFS,
  };
}

export const FIXTURE_ENVELOPES = {
  lessonCard: envelope("fixture-act-card", [FIXTURE_OBJECTIVES.compare]),
  classify: envelope("fixture-act-classify", [
    FIXTURE_OBJECTIVES.sharedParts,
    FIXTURE_OBJECTIVES.plantOnly,
  ]),
  multipleChoice: envelope("fixture-act-mc", [FIXTURE_OBJECTIVES.plantOnly]),
  teachBack: envelope("fixture-act-teachback", [FIXTURE_OBJECTIVES.compare]),
} as const;

/* --- the fixture port ------------------------------------------------------------ */

/**
 * Deterministic, in-memory port for the gallery. Every call is labelled
 * fixture traffic — nothing persists, nothing awards XP, evaluation shapes
 * match `AttemptResult` so swapping in the real Convex adapter is a prop
 * change, not a component change.
 */
export function createFixturePort(opts?: {
  latencyMs?: number;
  failNext?: boolean;
  /** Simulate a deleted/forbidden segment for the given segmentId. */
  segmentStatusOverrides?: Record<string, "missing" | "forbidden" | "deleted">;
}): LearningWidgetPort {
  const latency = opts?.latencyMs ?? 420;
  let failNext = opts?.failNext ?? false;
  const wait = () => new Promise((r) => setTimeout(r, latency));

  return {
    async submitAttempt(submission) {
      await wait();
      if (failNext) {
        failNext = false;
        throw new Error("fixture: network hiccup — answer kept, retry");
      }
      const evaluatedAt = Date.now();
      const spec = submission.activityId;
      if (spec === FIXTURE_ENVELOPES.classify.activityId) {
        const result = fixtureGradeClassification(
          FIXTURE_CLASSIFY_SPEC,
          FIXTURE_CLASSIFY_SOLUTION,
          submission,
          evaluatedAt,
        );
        return {
          ...result,
          explanation:
            "plant cells bolt on a cellulose wall, chloroplasts and one large vacuole; the rest is shared kit.",
          explanationSourceRefs: [
            FIXTURE_SOURCE_REFS[1],
            FIXTURE_SOURCE_REFS[2],
          ],
        };
      }
      if (spec === FIXTURE_ENVELOPES.multipleChoice.activityId) {
        return fixtureGradeChoice(FIXTURE_MC_ANSWER, submission, evaluatedAt);
      }
      return fixtureGradeTeachBack(
        FIXTURE_TEACHBACK_KEYWORDS,
        (FIXTURE_TEACHBACK_SPEC as { rubricCriteria: string[] }).rubricCriteria,
        submission,
        evaluatedAt,
      );
    },
    async loadSegment(ref): Promise<SegmentLoadResult> {
      await wait();
      const override = ref.segmentId
        ? opts?.segmentStatusOverrides?.[ref.segmentId]
        : undefined;
      if (override) return { status: override, segmentId: ref.segmentId ?? "" };
      const segment = FIXTURE_SEGMENTS.find((s) => s.segmentId === ref.segmentId);
      if (!segment) return { status: "missing", segmentId: ref.segmentId ?? "" };
      return { status: "ready", segment };
    },
    onRequestTutor(request) {
      // Harness-visible only; a live port would route to the tutor widget.
      console.info("[fixture tutor request]", request);
    },
  };
}

/* --- fixture runtime (LessonBoard preview) ------------------------------------- */

/** A remedial proposal the fixture runtime can offer after wrong sorts. */
const FIXTURE_PROPOSAL: PracticeProposal = {
  proposalId: "fixture-prop-01",
  state: "proposed",
  rationale:
    "you missed plant-only features twice in a row — here's a quick retry card grounded in the same page.",
  spec: {
    kind: "multipleChoice",
    prompt: "revisit the page, then retry: which feature do animal cells never have?",
    options: [
      { id: "opt-a", label: "mitochondria" },
      { id: "opt-b", label: "a cell wall" },
      { id: "opt-c", label: "a nucleus" },
      { id: "opt-d", label: "cytoplasm" },
    ],
  },
  createdAt: 0,
};

export interface FixtureRuntime {
  /** Mutable fixture lesson — accept appends a REAL fixture activity row,
   * mirroring reviewPractice server-side materialization via getLesson. */
  lesson: RuntimeLesson;
  port: LearningWidgetPort;
  proposals: PracticeProposal[];
  /** Bumps to force the gallery to re-render after a consent decision. */
  version: number;
}

/**
 * Fixture twin of the live runtime — `LessonBoard` renders this exactly as
 * it renders `useLearningRuntime` output. `withProposal: true` seeds the
 * ghost-practice demo; accepting materializes a real fixture activity.
 */
export function createFixtureRuntime(opts?: { withProposal?: boolean }): FixtureRuntime {
  const rt: FixtureRuntime = {
    lesson: {
      lessonId: FIXTURE_LESSON_ID,
      title: "plant vs animal cells — the shared kit",
      objectiveIds: Object.values(FIXTURE_OBJECTIVES),
      activities: [
        {
          activityId: FIXTURE_ENVELOPES.lessonCard.activityId,
          spec: FIXTURE_LESSON_CARD_SPEC,
          revision: 1,
          sourceRefs: FIXTURE_SOURCE_REFS,
        },
        {
          activityId: FIXTURE_ENVELOPES.classify.activityId,
          spec: FIXTURE_CLASSIFY_SPEC,
          revision: 1,
          sourceRefs: FIXTURE_SOURCE_REFS,
        },
        {
          activityId: FIXTURE_ENVELOPES.teachBack.activityId,
          spec: FIXTURE_TEACHBACK_SPEC,
          revision: 1,
          sourceRefs: FIXTURE_SOURCE_REFS,
        },
      ],
    },
    port: createFixturePort({ latencyMs: 350 }),
    proposals: opts?.withProposal ? [{ ...FIXTURE_PROPOSAL }] : [],
    version: 0,
  };

  rt.port.listPractice = async () => [...rt.proposals];
  rt.port.reviewPractice = async (proposalId: string, action: PracticeReviewAction) => {
    const p = rt.proposals.find((x) => x.proposalId === proposalId);
    if (!p || p.state !== "proposed") {
      throw new Error("fixture: proposal already decided");
    }
    p.state = action === "accept" ? "accepted" : "rejected";
    rt.version++;
    if (action === "accept") {
      const activityId = `fixture-act-ghost-${p.proposalId}`;
      rt.lesson.activities.push({
        activityId,
        spec: p.spec,
        revision: 1,
        sourceRefs: FIXTURE_SOURCE_REFS,
      });
      return { state: "accepted" as const, activityId };
    }
    return { state: "rejected" as const };
  };
  return rt;
}
