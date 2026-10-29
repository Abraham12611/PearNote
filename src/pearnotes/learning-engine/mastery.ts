/**
 * Mastery projection: derived state per objective with transition guards and
 * an auditable explanation. Assessed evidence only — clicks, time-on-page and
 * XP never enter. One easy correct answer never demonstrates mastery; a later
 * incorrect verdict can demote `demonstrated` (no permanent immunity).
 */
import {
  DEFAULT_POLICY,
  type EnginePolicy,
  type MasteryExplanation,
  type MasteryState,
  type ObjectiveEvidence,
  type ObjectiveMastery,
} from "./types";
import { relevantEvidence } from "./evidence";

function explain(evidence: ObjectiveEvidence[], rule: string, lines: string[]): MasteryExplanation {
  return { lines, evidenceAttemptIds: evidence.map((e) => e.attemptId), rule };
}

/**
 * Derive the mastery state for one objective from evaluated evidence.
 * Deterministic: same inputs → same state + explanation.
 */
export function deriveMastery(
  objectiveId: string,
  userId: string,
  allEvidence: ObjectiveEvidence[],
  policy: EnginePolicy = DEFAULT_POLICY,
): ObjectiveMastery {
  const evidence = relevantEvidence(allEvidence, objectiveId);
  const incorrectCount = evidence.filter((e) => e.verdict === "incorrect").length;
  const partialCount = evidence.filter((e) => e.verdict === "partial").length;
  const correctActivities = new Set(
    evidence.filter((e) => e.verdict === "correct").map((e) => e.activityId),
  );
  const hinted = evidence.some((e) => (e.hintsUsed ?? 0) > 0 && e.verdict !== "incorrect");
  const lastVerdict = evidence.length ? evidence[evidence.length - 1].verdict : undefined;
  const needsReview = evidence.some((e) => e.verdict === "needs_review");

  const suspectedGap =
    incorrectCount >= policy.incorrectAttemptsToTrigger ||
    (incorrectCount >= 1 &&
      evidence.some(
        (e) =>
          e.actionKind === "teachBack" &&
          e.verdict !== "correct" &&
          (e.score ?? 0) < policy.teachBackInadequateBelow,
      ));

  let state: MasteryState;
  let rule: string;
  const lines: string[] = [];

  if (evidence.length === 0) {
    state = "not_started";
    rule = "no_evidence";
    lines.push("no evaluated attempts for this objective");
  } else if (
    correctActivities.size >= policy.distinctCorrectActivitiesToDemonstrate &&
    !(policy.demonstratedDemotesOnIncorrect && lastVerdict === "incorrect")
  ) {
    state = "demonstrated";
    rule = "distinct_correct_threshold";
    lines.push(
      `${correctActivities.size} distinct activities answered correctly (threshold ${policy.distinctCorrectActivitiesToDemonstrate})`,
    );
  } else if (policy.demonstratedDemotesOnIncorrect && lastVerdict === "incorrect" && correctActivities.size >= policy.distinctCorrectActivitiesToDemonstrate) {
    state = "practicing";
    rule = "demonstrated_demoted";
    lines.push("latest verdict is incorrect after demonstrating — re-evaluating, no permanent immunity");
  } else if (partialCount > 0 || hinted || (correctActivities.size > 0 && incorrectCount > 0) || incorrectCount >= policy.incorrectAttemptsToTrigger) {
    state = "practicing";
    rule = "partial_or_mixed";
    if (partialCount > 0) lines.push(`${partialCount} partial verdict(s)`);
    if (hinted) lines.push("correct answers arrived only with hints");
    if (correctActivities.size > 0 && incorrectCount > 0) lines.push("mixed correct/incorrect outcomes");
    if (incorrectCount >= policy.incorrectAttemptsToTrigger) lines.push(`${incorrectCount} distinct incorrect attempts (suspected gap)`);
  } else {
    state = "learning";
    rule = "insufficient_independent_evidence";
    lines.push(`${evidence.length} evaluated attempt(s), insufficient independent evidence`);
    if (needsReview) lines.push("some evidence awaiting review — abstaining from stronger claims");
  }

  return {
    objectiveId,
    userId,
    state,
    suspectedGap,
    explanation: explain(evidence, rule, lines),
  };
}
