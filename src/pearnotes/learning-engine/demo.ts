/**
 * Deterministic in-memory demonstration (issue #29 acceptance):
 * source-bound objective → two wrong trials → proposed practice node →
 * learner consent → practice complete → changed Journey recommendation.
 * No persistence, no AI — pure typed data throughout.
 */
import { intakeEvidence, dedupeAttempts } from "./evidence";
import { projectJourney, type CoreNodeInput } from "./journey";
import { deriveMastery } from "./mastery";
import { decideProposal, evaluateForRemediation } from "./remediation";
import { AUTHORIZED_CELLS_SEGMENTS, CELLS_REMEDIATION_SPEC, CORE_NODES, FIX, ev } from "./fixtures";
import type { EvaluationOutcome, JourneyState, ObjectiveEvidence, RemediationProposal } from "./types";

export interface DemoStep {
  step: string;
  journey?: JourneyState;
  proposal?: RemediationProposal;
  outcome?: EvaluationOutcome;
  detail?: string;
}

export function runBiologyDemo(): DemoStep[] {
  const steps: DemoStep[] = [];
  const evidence: ObjectiveEvidence[] = [];
  const proposals: RemediationProposal[] = [];
  const coreNodes: CoreNodeInput[] = CORE_NODES;

  const journey = () =>
    projectJourney({
      lessonId: FIX.lessonId,
      coreNodes,
      mastery: [deriveMastery(FIX.objectiveId, FIX.userId, evidence)],
      proposals,
      evidence,
    });

  steps.push({ step: "1_source_bound_goal", journey: journey(), detail: "objective grounded in Cambridge pp.1–2 segments" });

  // Two wrong trials — distinct attempts, same objective, cited segments.
  evidence.push(ev({ verdict: "incorrect", attemptId: "att-1", activityId: "act-compare-1" }));
  evidence.push(ev({ verdict: "incorrect", attemptId: "att-2", activityId: "act-compare-2" }));
  intakeEvidence(evidence); // shape check exercised in tests
  dedupeAttempts(evidence);

  const outcome = evaluateForRemediation({
    userId: FIX.userId,
    objectiveId: FIX.objectiveId,
    evidence,
    authorizedSegmentIds: AUTHORIZED_CELLS_SEGMENTS,
    remediationSpec: CELLS_REMEDIATION_SPEC,
  });
  steps.push({ step: "2_two_wrong_trials", outcome, journey: journey() });

  if (outcome.kind !== "proposal") return steps;
  proposals.push(outcome.proposal);
  steps.push({ step: "3_ghost_proposal", proposal: outcome.proposal, journey: journey(), detail: "pending consent — not part of the path" });

  const { proposals: decided } = decideProposal(proposals, {
    proposalId: outcome.proposal.proposalId,
    accepted: true,
    decidedBy: FIX.userId,
    decidedAt: evidence[1].evaluatedAt + 60_000,
  });
  proposals.splice(0, proposals.length, ...decided);
  steps.push({ step: "4_learner_accepts", journey: journey(), detail: "remediation node enters the path as a side branch" });

  // Practice complete: distinct correct activities reach the demonstrated threshold.
  evidence.push(ev({ verdict: "correct", attemptId: "att-3", activityId: "act-rem-practice" }));
  evidence.push(ev({ verdict: "correct", attemptId: "att-4", activityId: "act-rem-practice-2" }));
  steps.push({ step: "5_practice_complete", journey: journey(), detail: "recommendation moved; mastery re-derived from new evidence" });

  return steps;
}
