/**
 * Deterministic fixtures — the private Cambridge Biology excerpt.
 * Content alignment (issue #29): plant-vs-animal cell differences on
 * pp.1–2 and diffusion on pp.9–10; no full active-transport coverage.
 * Fixture ids are clearly labelled; nothing here is user data.
 */
import type { ActivitySpec, ObjectiveEvidence, UserId } from "./types";

export const FIX = {
  userId: "user-fixture-ada" as UserId,
  lessonId: "lesson-bio-cells-1",
  objectiveId: "obj-compare-plant-animal-cells",
  otherObjectiveId: "obj-explain-diffusion",
  segments: {
    cellsP1: "seg-cambridge-bio-p1-cells",
    cellsP2: "seg-cambridge-bio-p2-differences",
    diffusionP9: "seg-cambridge-bio-p9-diffusion",
    diffusionP10: "seg-cambridge-bio-p10-diffusion",
  },
} as const;

/** Segments the backend would authorize for the cells objective (pp.1–2). */
export const AUTHORIZED_CELLS_SEGMENTS = [FIX.segments.cellsP1, FIX.segments.cellsP2];
export const AUTHORIZED_DIFFUSION_SEGMENTS = [FIX.segments.diffusionP9, FIX.segments.diffusionP10];

export const CELLS_REMEDIATION_SPEC: ActivitySpec = {
  kind: "multipleChoice",
  prompt: "Which structure is present in a plant cell but NOT in an animal cell? (see pp.1–2)",
  options: [
    { id: "a", label: "cell membrane" },
    { id: "b", label: "cell wall" },
    { id: "c", label: "cytoplasm" },
    { id: "d", label: "nucleus" },
  ],
};

let seq = 0;
/** Fixture evidence builder — deterministic ids/timestamps. */
export function ev(partial: Partial<ObjectiveEvidence> & Pick<ObjectiveEvidence, "verdict">): ObjectiveEvidence {
  seq += 1;
  return {
    attemptId: partial.attemptId ?? `att-${seq}`,
    userId: partial.userId ?? FIX.userId,
    objectiveId: partial.objectiveId ?? FIX.objectiveId,
    activityId: partial.activityId ?? `act-${Math.ceil(seq / 2)}`,
    activityRevision: partial.activityRevision ?? 1,
    actionKind: partial.actionKind ?? "choice",
    verdict: partial.verdict,
    score: partial.score,
    hintsUsed: partial.hintsUsed,
    sourceSegmentIds: partial.sourceSegmentIds ?? AUTHORIZED_CELLS_SEGMENTS,
    lessonId: partial.lessonId ?? FIX.lessonId,
    evaluatedAt: partial.evaluatedAt ?? 1_700_000_000_000 + seq * 60_000,
  };
}

/** The core lesson path used by the demo + tests. */
export const CORE_NODES = [
  { nodeId: "node-read", title: "Read: cell structures (pp.1–2)", objectiveIds: [FIX.objectiveId], sourceSegmentIds: AUTHORIZED_CELLS_SEGMENTS, completesWith: [] as string[] },
  { nodeId: "node-compare", title: "Check: plant vs animal cells", objectiveIds: [FIX.objectiveId], sourceSegmentIds: AUTHORIZED_CELLS_SEGMENTS, completesWith: ["att-1", "att-2"] },
  { nodeId: "node-diffusion", title: "Next: diffusion (pp.9–10)", objectiveIds: [FIX.otherObjectiveId], sourceSegmentIds: AUTHORIZED_DIFFUSION_SEGMENTS, completesWith: [] as string[] },
];
