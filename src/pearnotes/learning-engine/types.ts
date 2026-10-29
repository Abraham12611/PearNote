/**
 * PearNotes learning engine — shared types (issue #29).
 *
 * Pure domain types mirroring `convex/tables/learning.ts` as *strings* at the
 * boundary. This module never imports Convex — persistence is supplied
 * through the adapter contract (adapter.ts). All engine output is
 * deterministic: given the same evidence inputs it produces the same state,
 * proposals and explanations.
 */

// --- Ids (backend-supplied; opaque to the engine) --------------------------------

export type UserId = string;
export type ObjectiveId = string;
export type ActivityId = string;
export type AttemptId = string;
export type LessonId = string;
export type SourceId = string;
export type SourceSegmentId = string;

// --- Activity specs (mirrors convex activitySpec union — closed, typed) ----------

export type ActivitySpec =
  | { kind: "lessonCard"; heading: string; body: string }
  | { kind: "multipleChoice"; prompt: string; options: { id: string; label: string }[] }
  | { kind: "shortAnswer"; prompt: string }
  | { kind: "teachBack"; prompt: string; rubricCriteria: string[] };

export const ACTIVITY_SPEC_KINDS = [
  "lessonCard",
  "multipleChoice",
  "shortAnswer",
  "teachBack",
] as const;
export type ActivitySpecKind = (typeof ACTIVITY_SPEC_KINDS)[number];

// --- Evidence -------------------------------------------------------------------

/** How the learner answered — aligns to attemptResponse kinds + widget types. */
export type ActionKind = "classification" | "choice" | "text" | "teachBack";

/** Mirrors convex attemptEvaluation.verdict. */
export type Verdict = "correct" | "partial" | "incorrect" | "needs_review";

/**
 * One evaluated attempt, supplied by the trusted backend. The engine only
 * accepts evidence that arrives in this shape — claims the client could
 * fabricate (XP awards, admin overrides, "trust me" flags) are rejected by
 * `validateEvidence`, never silently consumed.
 */
export interface ObjectiveEvidence {
  attemptId: AttemptId;
  userId: UserId;
  objectiveId: ObjectiveId;
  activityId: ActivityId;
  /** Pinned activity revision the learner actually saw (convex `activityRevision`). */
  activityRevision: number;
  actionKind: ActionKind;
  verdict: Verdict;
  /** Rubric score 0..1 when the grader supplied one (teachBack/shortAnswer). */
  score?: number;
  hintsUsed?: number;
  /**
   * Source segments this activity is grounded in — supplied by the backend
   * from the activity's own sourceRefs. Used to carry citations into a
   * proposal; the engine never invents them.
   */
  sourceSegmentIds: SourceSegmentId[];
  lessonId: LessonId;
  /** Server evaluation timestamp (ms). The engine never calls Date.now(). */
  evaluatedAt: number;
}

export type EvidenceRejectionReason =
  | "malformed" // missing/invalid required fields
  | "unevaluated" // no verdict yet — submission, not evidence
  | "duplicate_attempt" // same attemptId already counted
  | "untrusted_claim" // carries fields only a server may assert (xp, overrides)
  | "wrong_user"; // evidence for a different learner than requested

export interface EvidenceRejection {
  attemptId: AttemptId | undefined;
  reason: EvidenceRejectionReason;
  detail: string;
}

/** Keys a client could attach to smuggle authority. Their presence rejects. */
export const UNTRUSTED_CLAIM_KEYS = [
  "xp",
  "xpAward",
  "awardXp",
  "adminOverride",
  "override",
  "forceMastery",
  "trust",
  "trusted",
  "clientComputed",
  "masteryOverride",
] as const;

// --- Mastery ---------------------------------------------------------------------

export type MasteryState = "not_started" | "learning" | "practicing" | "demonstrated";

export interface MasteryExplanation {
  /** Ordered, human-readable reasons for the state (auditable trail). */
  lines: string[];
  /** Distinct attemptIds that informed the decision. */
  evidenceAttemptIds: AttemptId[];
  /** The policy rule that decided the state. */
  rule: string;
}

export interface ObjectiveMastery {
  objectiveId: ObjectiveId;
  userId: UserId;
  state: MasteryState;
  /** Present when the remediation policy suspects a gap (blueprint `suspected_gap`). */
  suspectedGap: boolean;
  explanation: MasteryExplanation;
}

// --- Remediation proposals --------------------------------------------------------

/**
 * Structural error categories — derived only from what evidence can support.
 * Semantic misconception labels ("confuses osmosis with diffusion") require a
 * model or rubric annotation and are NOT emitted by the deterministic engine;
 * unknown is honest.
 */
export type ErrorCategory =
  | "repeated_incorrect" // ≥2 distinct incorrect attempts
  | "specific_distractor" // same wrong option chosen in ≥2 attempts
  | "partial_understanding" // partial verdicts / inadequate teach-back score
  | "hint_dependent" // correct only with hints
  | "unclassified";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "superseded";

export interface RemediationProposal {
  proposalId: string; // deterministic from objective+triggering evidence
  userId: UserId;
  objectiveId: ObjectiveId;
  lessonId: LessonId;
  errorCategory: ErrorCategory;
  /** The attemptIds whose evidence produced this proposal. */
  evidenceAttemptIds: AttemptId[];
  /** One validated activity — allowlisted spec kinds only. */
  activitySpec: ActivitySpec;
  /** Citations carried from the activity's own sourceRefs (may be subset). */
  sourceSegmentIds: SourceSegmentId[];
  /** Human-readable why, written for the learner to review. */
  reason: string;
  priority: "high" | "normal";
  /** Contract invariant: always true. Remediation is never auto-published. */
  requiresLearnerConsent: true;
  status: ProposalStatus;
  createdAt: number; // from triggering evidence, not wall clock
}

export interface ConsentDecision {
  proposalId: string;
  accepted: boolean;
  /** Must equal the learner the proposal belongs to. */
  decidedBy: UserId;
  decidedAt: number;
}

export type ConsentRejectionReason =
  | "not_found"
  | "not_pending"
  | "not_learner"; // decidedBy ≠ proposal.userId — admin/peer cannot consent

export interface ConsentResult {
  ok: boolean;
  proposal?: RemediationProposal;
  reason?: ConsentRejectionReason;
}

// --- Abstention (engine declines to propose) ---------------------------------------

export type AbstentionKind =
  | "insufficient_evidence" // policy threshold not met
  | "uncertain_evidence" // needs_review verdicts — do not infer from ambiguity
  | "insufficient_citation" // no authorized source segments to ground a proposal
  | "already_proposed" // same trigger set already has a live proposal
  | "previously_declined" // learner rejected this proposal; never re-emit it
  | "already_demonstrated"; // no gap: threshold already met

export interface Abstention {
  kind: "abstain";
  reason: AbstentionKind;
  detail: string;
}

export interface Proposal {
  kind: "proposal";
  proposal: RemediationProposal;
  /** Mastery view of the objective at evaluation time. */
  mastery: ObjectiveMastery;
}

export type EvaluationOutcome = Proposal | Abstention;

// --- Journey / lesson projection ----------------------------------------------------

export type JourneyNodeState =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "proposed" // ghost — pending consent, not part of the path
  | "declined"; // rejected proposal, kept for audit display

export interface JourneyNode {
  nodeId: string;
  kind: "core" | "remediation";
  title: string;
  objectiveIds: ObjectiveId[];
  activitySpec?: ActivitySpec;
  sourceSegmentIds: SourceSegmentId[];
  state: JourneyNodeState;
  /** For remediation nodes: the proposal that spawned them. */
  proposalId?: string;
}

export interface JourneyState {
  lessonId: LessonId;
  nodes: JourneyNode[];
  /** ObjectiveId → state, derived (never client-claimed). */
  masteryByObjective: Record<ObjectiveId, MasteryState>;
  /** The node the engine suggests next — changes after accepted practice completes. */
  recommendedNodeId: string | null;
}

// --- Engine policy (documented, tunable, default conservative) ----------------------

export interface EnginePolicy {
  /**
   * Rule R1 (default trigger): this many DISTINCT evaluated attempts with
   * `incorrect` verdict on one objective marks a suspected gap and proposes
   * one supplemental practice activity. Same attemptId double-submit never
   * counts twice.
   */
  incorrectAttemptsToTrigger: number;
  /**
   * Rule R2 (documented secondary trigger): one `incorrect` verdict plus one
   * `teachBack` scored below this threshold on the same objective also marks
   * a suspected gap (blueprint: failed challenge + inadequate teach-back).
   */
  teachBackInadequateBelow: number;
  /**
   * Demonstrated threshold: this many `correct` verdicts on DISTINCT
   * activities. One correct answer on one activity can never demonstrate
   * mastery (blueprint: single easy question ≠ understanding).
   */
  distinctCorrectActivitiesToDemonstrate: number;
  /**
   * Re-evaluation: an `incorrect` verdict arriving after `demonstrated`
   * demotes to `practicing` — demonstrated is not permanent immunity.
   */
  demonstratedDemotesOnIncorrect: boolean;
}

export const DEFAULT_POLICY: EnginePolicy = {
  incorrectAttemptsToTrigger: 2,
  teachBackInadequateBelow: 0.5,
  distinctCorrectActivitiesToDemonstrate: 2,
  demonstratedDemotesOnIncorrect: true,
};
