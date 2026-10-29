/**
 * Issue #29 — deterministic demo scenario test.
 * Two wrong trials → proposed practice → consent → changed journey.
 */
import { describe, expect, test } from "vitest";
import { runBiologyDemo } from "../../src/pearnotes/learning-engine";

describe("biology demo transcript", () => {
  const steps = runBiologyDemo();

  test("produces the full 5-step transcript", () => {
    expect(steps.map((s) => s.step)).toEqual([
      "1_source_bound_goal",
      "2_two_wrong_trials",
      "3_ghost_proposal",
      "4_learner_accepts",
      "5_practice_complete",
    ]);
  });

  test("two wrong trials produce a consented-source proposal", () => {
    const p = steps[2].proposal;
    expect(p).toBeDefined();
    expect(p!.requiresLearnerConsent).toBe(true);
    expect(p!.sourceSegmentIds.length).toBeGreaterThan(0);
    expect(p!.reason.length).toBeGreaterThan(0);
  });

  test("recommendation changes after practice completes", () => {
    const before = steps[3].journey!;
    const after = steps[4].journey!;
    expect(after.masteryByObjective).toBeDefined();
    // after 2 correct on distinct activities → demonstrated
    const obj = steps[2].proposal!.objectiveId;
    expect(after.masteryByObjective[obj]).toBe("demonstrated");
    expect(after.recommendedNodeId).not.toBe(before.recommendedNodeId ?? "__none__");
  });
});
