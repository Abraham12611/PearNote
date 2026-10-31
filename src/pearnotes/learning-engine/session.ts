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
  EvidenceRejection,
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

  /**
   * Restore from a persisted snapshot (E4 round-trip). Every record is
   * validated against THIS session's learner, lesson and objectives —
   * a snapshot for a different learner/lesson restores nothing and
   * reports each dropped record.
   */
  static restore(
    init: SessionInit,
    snapshot: Pick<SessionSnapshot, "userId" | "lessonId" | "evidence" | "proposals">,
  ): { session: AssessmentSession; rejected: EvidenceRejection[] } {
    const s = new AssessmentSession(init);
    const rejected: EvidenceRejection[] = [];
    const objectiveIds = new Set(init.objectives.map((o) => o.objectiveId));
    const identityOk = snapshot.userId === init.userId && snapshot.lessonId === init.lessonId;
    for (const e of snapshot.evidence) {
      if (!identityOk || e.userId !== init.userId) {
        rejected.push({ attemptId: e.attemptId, reason: "wrong_user", detail: "snapshot record belongs to a different learner" });
      } else if (e.lessonId !== init.lessonId) {
        rejected.push({ attemptId: e.attemptId, reason: "wrong_lesson", detail: "snapshot record belongs to a different lesson" });
      } else if (!objectiveIds.has(e.objectiveId)) {
        rejected.push({ attemptId: e.attemptId, reason: "unknown_objective", detail: "snapshot record names an objective outside this lesson" });
      } else {
        s.evidence.push(e);
      }
    }
    for (const p of snapshot.proposals) {
      if (!identityOk || p.userId !== init.userId || p.lessonId !== init.lessonId || !objectiveIds.has(p.objectiveId)) {
        rejected.push({ attemptId: p.proposalId, reason: "malformed", detail: "snapshot proposal does not match this session's learner/lesson/objectives" });
      } else {
        s.proposals.push({ ...p });
      }
    }
    return { session: s, rejected };
  }

  /**
   * Ingest newly evaluated attempts (backend-supplied). Validates,
   * dedupes, scopes to this session's learner AND lesson/objectives,
   * recomputes mastery, and evaluates each objective for remediation.
   * Out-of-scope attempts and duplicates are reported, never silently
   * dropped.
   */
  applyAttempts(rawAttempts: unknown[]): AttemptOutcome {
    const { accepted, rejected } = intakeEvidence(rawAttempts, this.init.userId);
    const objectiveIds = new Set(this.init.objectives.map((o) => o.objectiveId));
    const inScope: ObjectiveEvidence[] = [];
    for (const e of accepted) {
      if (e.lessonId !== this.init.lessonId) {
        rejected.push({ attemptId: e.attemptId, reason: "wrong_lesson", detail: "attempt belongs to a different lesson" });
      } else if (!objectiveIds.has(e.objectiveId)) {
        rejected.push({ attemptId: e.attemptId, reason: "unknown_objective", detail: "objective not part of this lesson's objectives" });
      } else {
        inScope.push(e);
      }
    }
    const { unique, duplicates } = dedupeAttempts(inScope);
    rejected.push(...duplicates);
    // Never double-count an attempt already in the pool — reported, not dropped.
    const known = new Set(this.evidence.map((e) => e.attemptId));
    const fresh: ObjectiveEvidence[] = [];
    for (const e of unique) {
      if (known.has(e.attemptId)) {
        rejected.push({ attemptId: e.attemptId, reason: "duplicate_attempt", detail: "attempt already recorded in this session" });
      } else {
        fresh.push(e);
      }
    }
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
