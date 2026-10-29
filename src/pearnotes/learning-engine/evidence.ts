/**
 * Evidence intake: validate, reject untrusted shapes, dedupe attempts.
 *
 * The engine treats every record as adversarial until shaped like
 * `ObjectiveEvidence`. Unevaluated submissions are not evidence; the same
 * attemptId arriving twice is one signal; fields that only a server may
 * assert (XP, overrides, trust flags) reject the record outright.
 */
import {
  UNTRUSTED_CLAIM_KEYS,
  type ActionKind,
  type EvidenceRejection,
  type ObjectiveEvidence,
  type UserId,
  type Verdict,
} from "./types";

const ACTION_KINDS: ActionKind[] = ["classification", "choice", "text", "teachBack"];
const VERDICTS: Verdict[] = ["correct", "partial", "incorrect", "needs_review"];

export interface IntakeResult {
  accepted: ObjectiveEvidence[];
  rejected: EvidenceRejection[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Structural validation of one record. Returns the typed evidence or a
 * rejection — never throws, never coerces.
 */
export function validateEvidence(
  raw: unknown,
  forUser?: UserId,
): { evidence?: ObjectiveEvidence; rejection?: EvidenceRejection } {
  if (!isRecord(raw)) {
    return { rejection: { attemptId: undefined, reason: "malformed", detail: "evidence is not an object" } };
  }

  const suspicious = UNTRUSTED_CLAIM_KEYS.filter((k) => k in raw);
  if (suspicious.length > 0) {
    return {
      rejection: {
        attemptId: typeof raw.attemptId === "string" ? raw.attemptId : undefined,
        reason: "untrusted_claim",
        detail: `record carries client-assertable fields: ${suspicious.join(", ")}`,
      },
    };
  }

  const required: (keyof ObjectiveEvidence)[] = [
    "attemptId",
    "userId",
    "objectiveId",
    "activityId",
    "lessonId",
  ];
  for (const key of required) {
    if (!nonEmptyString(raw[key])) {
      return {
        rejection: {
          attemptId: typeof raw.attemptId === "string" ? raw.attemptId : undefined,
          reason: "malformed",
          detail: `missing or invalid required field "${key}"`,
        },
      };
    }
  }
  if (typeof raw.activityRevision !== "number" || !Number.isFinite(raw.activityRevision) || raw.activityRevision < 0) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "malformed", detail: "activityRevision must be a non-negative number" },
    };
  }
  if (!ACTION_KINDS.includes(raw.actionKind as ActionKind)) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "malformed", detail: `unknown actionKind "${String(raw.actionKind)}"` },
    };
  }
  if (raw.verdict === undefined) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "unevaluated", detail: "submission without a verdict is not evidence" },
    };
  }
  if (!VERDICTS.includes(raw.verdict as Verdict)) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "malformed", detail: `unknown verdict "${String(raw.verdict)}"` },
    };
  }
  if (typeof raw.evaluatedAt !== "number" || !Number.isFinite(raw.evaluatedAt)) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "malformed", detail: "evaluatedAt must be a finite timestamp" },
    };
  }
  if (raw.score !== undefined && (typeof raw.score !== "number" || raw.score < 0 || raw.score > 1)) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "malformed", detail: "score must be within 0..1" },
    };
  }
  if (forUser !== undefined && raw.userId !== forUser) {
    return {
      rejection: { attemptId: raw.attemptId as string, reason: "wrong_user", detail: "evidence belongs to a different learner" },
    };
  }

  return {
    evidence: {
      attemptId: raw.attemptId as string,
      userId: raw.userId as string,
      objectiveId: raw.objectiveId as string,
      activityId: raw.activityId as string,
      activityRevision: raw.activityRevision,
      actionKind: raw.actionKind as ActionKind,
      verdict: raw.verdict as Verdict,
      score: raw.score as number | undefined,
      hintsUsed: typeof raw.hintsUsed === "number" ? raw.hintsUsed : undefined,
      sourceSegmentIds: Array.isArray(raw.sourceSegmentIds)
        ? (raw.sourceSegmentIds as unknown[]).filter(nonEmptyString)
        : [],
      lessonId: raw.lessonId as string,
      evaluatedAt: raw.evaluatedAt,
    },
  };
}

/** Validate a batch; every rejected record is reported, none is dropped silently. */
export function intakeEvidence(rawList: unknown[], forUser?: UserId): IntakeResult {
  const accepted: ObjectiveEvidence[] = [];
  const rejected: EvidenceRejection[] = [];
  for (const raw of rawList) {
    const { evidence, rejection } = validateEvidence(raw, forUser);
    if (evidence) accepted.push(evidence);
    if (rejection) rejected.push(rejection);
  }
  return { accepted, rejected };
}

/**
 * Dedupe by attemptId — a double-submit of the same attempt is one signal.
 * First occurrence wins; extras are reported so callers can audit.
 */
export function dedupeAttempts(evidence: ObjectiveEvidence[]): {
  unique: ObjectiveEvidence[];
  duplicates: EvidenceRejection[];
} {
  const seen = new Set<string>();
  const unique: ObjectiveEvidence[] = [];
  const duplicates: EvidenceRejection[] = [];
  for (const e of evidence) {
    if (seen.has(e.attemptId)) {
      duplicates.push({ attemptId: e.attemptId, reason: "duplicate_attempt", detail: "attemptId already counted" });
    } else {
      seen.add(e.attemptId);
      unique.push(e);
    }
  }
  return { unique, duplicates };
}

/**
 * Evidence relevant to one (learner, objective) pair, sorted by evaluation
 * time. Mastery and remediation MUST be scoped to both — a foreign learner's
 * attempts can never move someone else's state.
 */
export function relevantEvidence(
  evidence: ObjectiveEvidence[],
  userId: string,
  objectiveId: string,
): ObjectiveEvidence[] {
  return evidence
    .filter((e) => e.objectiveId === objectiveId && e.userId === userId)
    .sort((a, b) => a.evaluatedAt - b.evaluatedAt || a.attemptId.localeCompare(b.attemptId));
}
