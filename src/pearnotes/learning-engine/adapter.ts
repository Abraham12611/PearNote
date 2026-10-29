/**
 * Adapter boundary — the typed seams where other engineers plug in.
 *
 * Engineer 4 implements `LearningEnginePort` against Convex (attempts,
 * mastery, proposals persistence) and may supply `RemediationTemplateSource`
 * that lets Muse Spark choose ONLY among validated templates — the engine
 * still validates the choice and its citations before proposing.
 *
 * Engineer 2/3 consume `JourneyState` + `RemediationProposal` for UI.
 */
import type {
  ActivitySpec,
  EvaluationOutcome,
  ObjectiveEvidence,
  ObjectiveMastery,
  RemediationProposal,
} from "./types";

/** A pre-validated remediation activity template (model may pick ONE, never author). */
export interface ValidatedActivityTemplate {
  templateId: string;
  spec: ActivitySpec;
  /** Which objectives this template is allowed to remediate. */
  objectiveIds: string[];
  /** Segments the template is grounded in — subset of authorized. */
  sourceSegmentIds: string[];
}

/** What Engineer 4 supplies; the engine stays pure. */
export interface LearningEnginePort {
  /** Load evaluated attempts for (userId, objectiveIds) — backend-trusted only. */
  loadEvidence(userId: string, objectiveIds: string[]): Promise<unknown[]>;
  /** Segments the backend authorizes a proposal for this objective to cite. */
  loadAuthorizedSegments(objectiveId: string): Promise<string[]>;
  /** Persist attempts (idempotent by attemptId). */
  persistAttempt(evidence: ObjectiveEvidence): Promise<void>;
  /** Persist the derived mastery projection (upsert by user+objective). */
  persistMastery(mastery: ObjectiveMastery): Promise<void>;
  /** Persist or update a proposal (idempotent by proposalId). */
  persistProposal(proposal: RemediationProposal): Promise<void>;
  /** Fetch live proposals for dedupe (pending/accepted). */
  loadProposals(userId: string, objectiveId: string): Promise<RemediationProposal[]>;
  /** Optional: model-chosen template — MUST be one of the allowlist. */
  selectRemediationTemplate?(context: {
    objectiveId: string;
    errorCategory: string;
    candidates: ValidatedActivityTemplate[];
  }): Promise<ValidatedActivityTemplate | null>;
}

/**
 * Validate a template selection before it reaches a proposal. Rejects
 * off-objective templates and — hard rule — ANY template citing even one
 * unauthorized segment. Unauthorized references are never silently dropped.
 */
export function validateTemplateChoice(
  template: ValidatedActivityTemplate,
  objectiveId: string,
  authorizedSegmentIds: string[],
): { ok: true; spec: ActivitySpec; sourceSegmentIds: string[] } | { ok: false; reason: string } {
  if (!template.objectiveIds.includes(objectiveId)) {
    return { ok: false, reason: `template ${template.templateId} is not allowlisted for objective ${objectiveId}` };
  }
  const unauthorized = template.sourceSegmentIds.filter((s) => !authorizedSegmentIds.includes(s));
  if (unauthorized.length > 0) {
    return {
      ok: false,
      reason: `template ${template.templateId} cites unauthorized segments: ${unauthorized.join(", ")}`,
    };
  }
  if (template.sourceSegmentIds.length === 0) {
    return { ok: false, reason: `template ${template.templateId} cites no authorized segments` };
  }
  return { ok: true, spec: template.spec, sourceSegmentIds: [...template.sourceSegmentIds] };
}

/** Convenience: run evaluation across a port (E4 calls this from a mutation/action). */
export async function evaluateObjectives(
  port: LearningEnginePort,
  userId: string,
  objectiveIds: string[],
  evaluate: (o: {
    userId: string;
    objectiveId: string;
    evidence: ObjectiveEvidence[];
    authorizedSegmentIds: string[];
    existingProposals: RemediationProposal[];
    remediationSpec: ActivitySpec;
  }) => EvaluationOutcome,
  remediationSpecFor: (objectiveId: string) => ActivitySpec,
): Promise<Record<string, EvaluationOutcome>> {
  const raw = await port.loadEvidence(userId, objectiveIds);
  const { intakeEvidence } = await import("./evidence");
  const { accepted } = intakeEvidence(raw, userId);
  const out: Record<string, EvaluationOutcome> = {};
  for (const objectiveId of objectiveIds) {
    out[objectiveId] = evaluate({
      userId,
      objectiveId,
      evidence: accepted,
      authorizedSegmentIds: await port.loadAuthorizedSegments(objectiveId),
      existingProposals: await port.loadProposals(userId, objectiveId),
      remediationSpec: remediationSpecFor(objectiveId),
    });
  }
  return out;
}
