/**
 * AssessmentSession — the assessment→adaptation integration seam (issue #31).
 *
 * A deterministic, serializable state machine that connects:
 *   lesson objectives → server-evaluated attempts → objective evidence +
 *   mastery → consented remedial practice → recalculation on new attempts.
 *
 * It composes the merged engine primitives (evidence intake, mastery
 * projection, remediation policy, journey projection) — no persistence, no
 * Convex, no model, no wall clock. Every input produces a typed output for
 * Engineer 4 to persist and Engineer 2/3 to render.
 */
import {
  dedupeAttempts,
  intakeEvidence,
  relevantEvidence,
} from "./evidence";
import { projectJourney, type CoreNodeInput } from "./journey";
import { deriveMastery } from "./mastery";
import { decideProposal, evaluateForRemediation } from "./remediation";
import type {
  ActivitySpec,
  ConsentDecision,
  ConsentResult,
  EvaluationOutcome,
  JourneyState,
  ObjectiveEvidence,
  ObjectiveMastery,
  RemediationProposal,
  UserId,
} from "./types";
import { DEFAULT_POLICY, type EnginePolicy } from "./types";

/** One objective the lesson assesses (backend-supplied). */
export interface LessonObjectiveRef {
  objectiveId: string;
  /** Segments the backend authorizes proposals for this objective to cite. */
  authorizedSegmentIds: string[];
}

export interface SessionInit {
  userId: UserId;
  lessonId: string;
  objectives: LessonObjectiveRef[];
  coreNodes: CoreNodeInput[];
  /** Pick the practice spec offered per objective — caller-allowlisted only. */
  remediationSpecFor: (objectiveId: string) => ActivitySpec;
  policy?: EnginePolicy;
}

/** Serializable snapshot — E4 can persist/restore this verbatim. */
export interface SessionSnapshot {
  userId: UserId;
  lessonId: string;
  evidence: ObjectiveEvidence[];
  mastery: ObjectiveMastery[];
  proposals: RemediationProposal[];
  journey: JourneyState;
}

export interface AttemptOutcome {
  /** Evidence accepted (may be empty if all input was rejected). */
  accepted: ObjectiveEvidence[];
  rejected: ReturnType<typeof intakeEvidence>["rejected"];
  /** New proposals emitted by this batch (may be empty). */
  proposals: RemediationProposal[];
  /** Per-objective evaluation outcomes, for audit/debug. */
  evaluations: Record<string, EvaluationOutcome>;
}

export class AssessmentSession {
  private readonly init: SessionInit;
  private evidence: ObjectiveEvidence[] = [];
  private proposals: RemediationProposal[] = [];
  private readonly policy: EnginePolicy;

  constructor(init: SessionInit) {
    this.init = init;
    this.policy = init.policy ?? DEFAULT_POLICY;
  }

  /** Restore from a persisted snapshot (E4 round-trip). */
  static restore(init: SessionInit, snapshot: Pick<SessionSnapshot, "evidence" | "proposals">): AssessmentSession {
    const s = new AssessmentSession(init);
    s.evidence = [...snapshot.evidence];
    s.proposals = snapshot.proposals.map((p) => ({ ...p }));
    return s;
  }

  /**
   * Ingest newly evaluated attempts (backend-supplied). Validates,
   * dedupes, scopes to this session's learner, recomputes mastery, and
   * evaluates each objective for remediation.
   */
  applyAttempts(rawAttempts: unknown[]): AttemptOutcome {
    const { accepted, rejected } = intakeEvidence(rawAttempts, this.init.userId);
    const { unique } = dedupeAttempts(accepted);
    // Never double-count an attempt already in the pool.
    const known = new Set(this.evidence.map((e) => e.attemptId));
    const fresh = unique.filter((e) => !known.has(e.attemptId));
    this.evidence = [...this.evidence, ...fresh];

    const evaluations: Record<string, EvaluationOutcome> = {};
    const newProposals: RemediationProposal[] = [];
    for (const obj of this.init.objectives) {
      if (!fresh.some((e) => e.objectiveId === obj.objectiveId)) continue;
      const outcome = evaluateForRemediation({
        userId: this.init.userId,
        objectiveId: obj.objectiveId,
        evidence: this.evidence,
        authorizedSegmentIds: obj.authorizedSegmentIds,
        remediationSpec: this.init.remediationSpecFor(obj.objectiveId),
        existingProposals: this.proposals,
        policy: this.policy,
      });
      evaluations[obj.objectiveId] = outcome;
      if (outcome.kind === "proposal") {
        this.proposals.push(outcome.proposal);
        newProposals.push(outcome.proposal);
      }
    }
    return { accepted: fresh, rejected, proposals: newProposals, evaluations };
  }

  /** Learner consent — only the session's own learner may decide. */
  applyConsent(decision: ConsentDecision): ConsentResult {
    const { proposals, result } = decideProposal(this.proposals, decision);
    this.proposals = proposals;
    return result;
  }

  masteryFor(objectiveId: string): ObjectiveMastery {
    return deriveMastery(objectiveId, this.init.userId, this.evidence, this.policy);
  }

  journey(): JourneyState {
    return projectJourney({
      lessonId: this.init.lessonId,
      coreNodes: this.init.coreNodes,
      mastery: this.init.objectives.map((o) => this.masteryFor(o.objectiveId)),
      proposals: this.proposals,
      evidence: this.evidence,
    });
  }

  /** Full serializable state for persistence + audit. */
  snapshot(): SessionSnapshot {
    return {
      userId: this.init.userId,
      lessonId: this.init.lessonId,
      evidence: [...this.evidence],
      mastery: this.init.objectives.map((o) => this.masteryFor(o.objectiveId)),
      proposals: this.proposals.map((p) => ({ ...p })),
      journey: this.journey(),
    };
  }

  /** Read-only views for adapters/UIs. */
  get pendingProposals(): RemediationProposal[] {
    return this.proposals.filter((p) => p.status === "pending");
  }
  evidenceFor(objectiveId: string): ObjectiveEvidence[] {
    return relevantEvidence(this.evidence, this.init.userId, objectiveId);
  }
}
