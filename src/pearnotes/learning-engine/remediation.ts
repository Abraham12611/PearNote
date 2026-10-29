/**
 * Remediation policy + proposal lifecycle.
 *
 * Conservative explicit triggers only (DEFAULT_POLICY): ≥2 distinct incorrect
 * attempts, or incorrect + inadequate teach-back. Proposals are typed,
 * source-grounded, one per trigger set, and always require learner consent —
 * the engine emits reviewable data, never publishes or mutates the path.
 */
import {
  type ActivitySpec,
  type ConsentDecision,
  type ConsentResult,
  type ErrorCategory,
  type EvaluationOutcome,
  type ObjectiveEvidence,
  type RemediationProposal,
} from "./types";
import { DEFAULT_POLICY, type EnginePolicy } from "./types";
import { dedupeAttempts, relevantEvidence } from "./evidence";
import { deriveMastery } from "./mastery";

/** Deterministic id: same trigger set → same proposalId (no wall clock). */
function proposalIdFor(objectiveId: string, attemptIds: string[]): string {
  const key = `${objectiveId}|${[...attemptIds].sort().join("|")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `rp-${(h >>> 0).toString(36)}`;
}

function errorCategoryOf(trigger: ObjectiveEvidence[]): ErrorCategory {
  const incorrect = trigger.filter((e) => e.verdict === "incorrect");
  const wrongOptionIds = incorrect
    .map((e) => (e as unknown as Record<string, unknown>).wrongOptionId)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (wrongOptionIds.length >= 2 && new Set(wrongOptionIds).size === 1) return "specific_distractor";
  if (incorrect.length >= 2) return "repeated_incorrect";
  if (trigger.some((e) => e.verdict === "partial" || ((e.score ?? 1) < 1 && e.actionKind === "teachBack"))) {
    return "partial_understanding";
  }
  if (trigger.some((e) => (e.hintsUsed ?? 0) > 0)) return "hint_dependent";
  return "unclassified";
}

/**
 * Evaluate evidence for one objective. Returns a proposal or a typed
 * abstention — never emits a proposal without authorized citations, and
 * never emits the same proposal twice for the same trigger set.
 */
export function evaluateForRemediation(opts: {
  userId: string;
  objectiveId: string;
  evidence: ObjectiveEvidence[];
  /** Segments the backend authorizes this objective to cite (intersection is taken). */
  authorizedSegmentIds: string[];
  /** The single remediation activity to offer — validated spec chosen by caller. */
  remediationSpec: ActivitySpec;
  remediationTitle?: string;
  existingProposals?: RemediationProposal[];
  policy?: EnginePolicy;
}): EvaluationOutcome {
  const policy = opts.policy ?? DEFAULT_POLICY;
  const { unique } = dedupeAttempts(opts.evidence);
  const evidence = relevantEvidence(unique, opts.userId, opts.objectiveId);
  const mastery = deriveMastery(opts.objectiveId, opts.userId, unique, policy);

  if (mastery.state === "demonstrated") {
    return { kind: "abstain", reason: "already_demonstrated", detail: "objective already demonstrated" };
  }
  if (evidence.some((e) => e.verdict === "needs_review")) {
    return {
      kind: "abstain",
      reason: "uncertain_evidence",
      detail: "evidence awaiting review — do not infer a gap from ambiguous outcomes",
    };
  }

  const incorrect = evidence.filter((e) => e.verdict === "incorrect");
  const inadequateTeachBack = evidence.some(
    (e) => e.actionKind === "teachBack" && e.verdict !== "correct" && (e.score ?? 0) < policy.teachBackInadequateBelow,
  );
  const r1 = incorrect.length >= policy.incorrectAttemptsToTrigger;
  const r2 = incorrect.length >= 1 && inadequateTeachBack;
  if (!r1 && !r2) {
    return {
      kind: "abstain",
      reason: "insufficient_evidence",
      detail: `policy not met (need ≥${policy.incorrectAttemptsToTrigger} distinct incorrect, or incorrect + teach-back < ${policy.teachBackInadequateBelow})`,
    };
  }

  const trigger = r1 ? incorrect.slice(0, policy.incorrectAttemptsToTrigger) : [incorrect[0], ...evidence.filter((e) => e.actionKind === "teachBack" && e.verdict !== "correct")];
  const proposalId = proposalIdFor(opts.objectiveId, trigger.map((e) => e.attemptId));

  const prior = (opts.existingProposals ?? []).find((p) => p.proposalId === proposalId);
  if (prior && (prior.status === "rejected" || prior.status === "superseded")) {
    return {
      kind: "abstain",
      reason: "previously_declined",
      detail: `proposal ${proposalId} was ${prior.status} by the learner — it is never re-emitted for the same evidence`,
    };
  }
  if (prior && (prior.status === "pending" || prior.status === "accepted")) {
    return { kind: "abstain", reason: "already_proposed", detail: `proposal ${proposalId} is already ${prior.status}` };
  }

  // Citations: only segments both authorized and present in the activity's
  // own grounding. No citations → abstain, never a fake reference.
  const cited = trigger.flatMap((e) => e.sourceSegmentIds);
  const grounded = [...new Set(cited)].filter((s) => opts.authorizedSegmentIds.includes(s));
  if (grounded.length === 0) {
    return {
      kind: "abstain",
      reason: "insufficient_citation",
      detail: "no authorized source segments to ground a proposal — flag the gap instead of inventing a citation",
    };
  }

  const proposal: RemediationProposal = {
    proposalId,
    userId: opts.userId,
    objectiveId: opts.objectiveId,
    lessonId: trigger[0].lessonId,
    errorCategory: errorCategoryOf(trigger),
    evidenceAttemptIds: trigger.map((e) => e.attemptId),
    activitySpec: opts.remediationSpec,
    sourceSegmentIds: grounded,
    reason:
      `You missed this objective in ${trigger.length} separate attempts. ` +
      `A short practice activity on the same source pages may help — accept it only if you want it.`,
    priority: r1 ? "high" : "normal",
    requiresLearnerConsent: true,
    status: "pending",
    createdAt: Math.max(...trigger.map((e) => e.evaluatedAt)),
  };
  return { kind: "proposal", proposal, mastery };
}

/**
 * Record a consent decision. Only the learner the proposal belongs to may
 * decide; pending → accepted | rejected. Rejections are terminal for that
 * proposal (the engine will not re-emit it for the same trigger set).
 */
export function decideProposal(
  proposals: RemediationProposal[],
  decision: ConsentDecision,
): { proposals: RemediationProposal[]; result: ConsentResult } {
  const idx = proposals.findIndex((p) => p.proposalId === decision.proposalId);
  if (idx === -1) {
    return { proposals, result: { ok: false, reason: "not_found" } };
  }
  const p = proposals[idx];
  if (p.status !== "pending") {
    return { proposals, result: { ok: false, reason: "not_pending", proposal: p } };
  }
  if (decision.decidedBy !== p.userId) {
    return { proposals, result: { ok: false, reason: "not_learner", proposal: p } };
  }
  const next: RemediationProposal = {
    ...p,
    status: decision.accepted ? "accepted" : "rejected",
  };
  const updated = [...proposals];
  updated[idx] = next;
  return { proposals: updated, result: { ok: true, proposal: next } };
}
