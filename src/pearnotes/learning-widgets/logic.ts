/**
 * Pure widget logic — spec validation, response building and the
 * deterministic FIXTURE grader. No React, no I/O: everything here is unit
 * tested in tests/learning-widgets/.
 *
 * IMPORTANT: `fixtureGrade*` functions are a development stand-in for the
 * real backend evaluator (convex attemptEvaluation). They exist so the
 * gallery can demo the submission lifecycle; they are never wired into a
 * live port and award no XP/mastery.
 */
import type {
  AttemptResponsePayload,
  AttemptResult,
  AttemptSubmission,
  ClassificationMark,
  ClassificationSpec,
  Verdict,
  WidgetActivitySpec,
} from "./types";

/* --- spec validation --------------------------------------------------------- */

export type SpecValidationError =
  | "no_items"
  | "no_buckets"
  | "duplicate_item_id"
  | "duplicate_bucket_id"
  | "empty_prompt"
  | "unknown_kind";

/** Returns null when the spec is renderable; the reason string otherwise. */
export function validateWidgetSpec(spec: WidgetActivitySpec): SpecValidationError | null {
  switch (spec.kind) {
    case "classify": {
      if (!spec.prompt.trim()) return "empty_prompt";
      if (spec.items.length < 2) return "no_items";
      if (spec.buckets.length < 2) return "no_buckets";
      if (new Set(spec.items.map((i) => i.id)).size !== spec.items.length)
        return "duplicate_item_id";
      if (new Set(spec.buckets.map((b) => b.id)).size !== spec.buckets.length)
        return "duplicate_bucket_id";
      return null;
    }
    case "lessonCard":
      return spec.heading.trim() ? null : "empty_prompt";
    case "multipleChoice":
      return spec.options.length >= 2 ? null : "no_items";
    case "shortAnswer":
    case "teachBack":
      return spec.prompt.trim() ? null : "empty_prompt";
    default:
      return "unknown_kind";
  }
}

/* --- classification interaction ---------------------------------------------- */

/** itemId → bucketId. Absent key = still in the pile. */
export type Assignments = Record<string, string>;

export function assignItem(
  assignments: Assignments,
  itemId: string,
  bucketId: string,
): Assignments {
  return { ...assignments, [itemId]: bucketId };
}

export function unassignItem(assignments: Assignments, itemId: string): Assignments {
  const next = { ...assignments };
  delete next[itemId];
  return next;
}

export function placedCount(assignments: Assignments): number {
  return Object.keys(assignments).length;
}

export function allPlaced(spec: ClassificationSpec, assignments: Assignments): boolean {
  return spec.items.every((item) => {
    const bucket = assignments[item.id];
    return bucket !== undefined && spec.buckets.some((b) => b.id === bucket);
  });
}

/** Deterministic, spec-order response — the payload sent to the backend. */
export function buildClassificationResponse(assignments: Assignments): AttemptResponsePayload {
  const entries = Object.keys(assignments)
    .sort()
    .map((itemId) => ({ itemId, bucketId: assignments[itemId] }));
  return { kind: "classification", assignments: entries };
}

/* --- deterministic fixture grading (development only) ------------------------- */

export type FixtureSolution = Record<string, string>; // itemId → bucketId

export function verdictFromScore(score: number): Verdict {
  if (score >= 1) return "correct";
  if (score >= 0.5) return "partial";
  return "incorrect";
}

/**
 * Deterministic classify grader for the fixture port. Compares the
 * learner's assignments against the fixture solution key — the same shape
 * the real backend evaluator will return in `AttemptResult.marks`.
 */
export function fixtureGradeClassification(
  spec: ClassificationSpec,
  solution: FixtureSolution,
  submission: AttemptSubmission,
  evaluatedAt: number,
): AttemptResult {
  if (submission.response.kind !== "classification") {
    throw new Error(`classify spec answered with ${submission.response.kind}`);
  }
  const byItem = new Map(submission.response.assignments.map((a) => [a.itemId, a.bucketId]));
  const marks: ClassificationMark[] = spec.items.map((item) => {
    const expected = solution[item.id];
    return {
      itemId: item.id,
      correct: byItem.get(item.id) === expected,
      expectedBucketId: expected,
    };
  });
  const correctCount = marks.filter((m) => m.correct).length;
  const score = spec.items.length ? correctCount / spec.items.length : 0;
  const verdict = verdictFromScore(score);
  const wrongLabels = spec.items
    .filter((item) => marks.find((m) => m.itemId === item.id && !m.correct))
    .map((item) => item.label);

  const feedback =
    verdict === "correct"
      ? `all ${correctCount} features sorted correctly — nice sorting eye.`
      : verdict === "partial"
        ? `${correctCount} of ${spec.items.length} landed in the right tray. look again at: ${wrongLabels.join(", ")}.`
        : `${correctCount} of ${spec.items.length} right so far — reread the page and try the trays again.`;

  return {
    attemptId: `fixture-attempt-${submission.activityId}-${evaluatedAt}`,
    verdict,
    score,
    feedback,
    marks,
    evaluatedAt,
  };
}

/**
 * Keyword-coverage rubric marker for the fixture teach-back port.
 * Deterministic (no model): a criterion counts as covered when any of its
 * keyword alternatives appears in the learner text. Clearly development-only.
 */
export function fixtureGradeTeachBack(
  keywords: string[][],
  rubricCriteria: string[],
  submission: AttemptSubmission,
  evaluatedAt: number,
): AttemptResult {
  if (submission.response.kind !== "text") {
    throw new Error(`teachBack answered with ${submission.response.kind}`);
  }
  const hay = submission.response.text.toLowerCase();
  const rubric = rubricCriteria.map((criterion, i) => ({
    criterion,
    covered: (keywords[i] ?? []).some((k) => hay.includes(k.toLowerCase())),
  }));
  const coveredCount = rubric.filter((r) => r.covered).length;
  const score = rubricCriteria.length ? coveredCount / rubricCriteria.length : 0;
  const verdict: Verdict = score >= 0.8 ? "correct" : score >= 0.4 ? "partial" : "incorrect";
  const missing = rubric.filter((r) => !r.covered).map((r) => r.criterion);
  return {
    attemptId: `fixture-attempt-${submission.activityId}-${evaluatedAt}`,
    verdict,
    score,
    rubric,
    feedback:
      missing.length === 0
        ? "you covered every rubric point."
        : `missing: ${missing.join("; ")}.`,
    evaluatedAt,
  };
}

/** Simple choice grader for the fixture port. */
export function fixtureGradeChoice(
  correctOptionId: string,
  submission: AttemptSubmission,
  evaluatedAt: number,
): AttemptResult {
  if (submission.response.kind !== "choice") {
    throw new Error(`multipleChoice answered with ${submission.response.kind}`);
  }
  const correct = submission.response.optionId === correctOptionId;
  return {
    attemptId: `fixture-attempt-${submission.activityId}-${evaluatedAt}`,
    verdict: correct ? "correct" : "incorrect",
    feedback: correct ? "that's right." : "not quite — check the page again.",
    evaluatedAt,
  };
}
