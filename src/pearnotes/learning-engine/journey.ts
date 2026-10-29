/**
 * Journey projection: fuse core lesson nodes, pending proposals (ghosts) and
 * accepted remediation branches into a typed JourneyState for the UI layer.
 * The engine returns state — Engineer 3 renders it, Engineer 4 persists it.
 */
import type {
  JourneyNode,
  JourneyNodeState,
  JourneyState,
  LessonId,
  ObjectiveEvidence,
  ObjectiveId,
  ObjectiveMastery,
  RemediationProposal,
} from "./types";

export interface CoreNodeInput {
  nodeId: string;
  title: string;
  objectiveIds: ObjectiveId[];
  activitySpec?: JourneyNode["activitySpec"];
  sourceSegmentIds: string[];
  /** AttemptIds that complete this node (all must have evidence). */
  completesWith?: string[];
}

/**
 * Project the journey: core nodes keep their authored order; each pending
 * proposal appears as a `proposed` ghost beside the path; an accepted one
 * becomes a `remediation` branch node; completed evidence marks nodes
 * `completed` and moves `recommendedNodeId` forward.
 */
export function projectJourney(opts: {
  lessonId: LessonId;
  coreNodes: CoreNodeInput[];
  mastery: ObjectiveMastery[];
  proposals: RemediationProposal[];
  evidence: ObjectiveEvidence[];
}): JourneyState {
  const doneAttemptIds = new Set(opts.evidence.map((e) => e.attemptId));

  const core: JourneyNode[] = opts.coreNodes.map((n, i) => {
    const completed = n.completesWith?.length
      ? n.completesWith.every((id) => doneAttemptIds.has(id))
      : false;
    const state: JourneyNodeState = completed ? "completed" : i === 0 || coreUnlocked(opts.coreNodes, doneAttemptIds, i) ? "available" : "locked";
    return {
      nodeId: n.nodeId,
      kind: "core",
      title: n.title,
      objectiveIds: n.objectiveIds,
      activitySpec: n.activitySpec,
      sourceSegmentIds: n.sourceSegmentIds,
      state,
    };
  });

  const remediation: JourneyNode[] = opts.proposals
    .filter((p) => p.status === "pending" || p.status === "accepted" || p.status === "rejected")
    .map((p) => {
      const state: JourneyNodeState =
        p.status === "pending" ? "proposed" : p.status === "rejected" ? "declined" : "available";
      return {
        nodeId: `rem-${p.proposalId}`,
        kind: "remediation",
        title: `Supplemental practice — ${p.errorCategory.replace(/_/g, " ")}`,
        objectiveIds: [p.objectiveId],
        activitySpec: p.activitySpec,
        sourceSegmentIds: p.sourceSegmentIds,
        state,
        proposalId: p.proposalId,
      };
    });

  const nodes = [...core, ...remediation];
  const mastered = new Set(
    opts.mastery.filter((m) => m.state === "demonstrated").map((m) => m.objectiveId),
  );
  // Accepted remediation for a not-yet-demonstrated objective outranks the
  // core path — it exists because evidence says the learner needs it.
  const remediationNext = remediation.find(
    (n) => n.state === "available" && n.objectiveIds.some((o) => !mastered.has(o)),
  );
  const recommended = remediationNext?.nodeId ?? nodes.find((n) => n.state === "available")?.nodeId ?? null;
  return {
    lessonId: opts.lessonId,
    nodes,
    masteryByObjective: Object.fromEntries(opts.mastery.map((m) => [m.objectiveId, m.state])),
    recommendedNodeId: recommended,
  };
}

/** A core node unlocks when every earlier core node is completed. */
function coreUnlocked(coreNodes: CoreNodeInput[], doneAttemptIds: Set<string>, index: number): boolean {
  return coreNodes.slice(0, index).every((n) => !n.completesWith?.length || n.completesWith.every((id) => doneAttemptIds.has(id)));
}
