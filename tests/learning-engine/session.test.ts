/**
 * Issue #31 — assessment→adaptation session integration tests.
 * Biology acceptance path: two genuinely incorrect evaluated attempts →
 * source-grounded proposal → explicit consent → changed mastery/evidence
 * after practice. Plus the required negatives.
 */
import { describe, expect, test } from "vitest";
import {
  AssessmentSession,
  AUTHORIZED_CELLS_SEGMENTS,
  CELLS_REMEDIATION_SPEC,
  CORE_NODES,
  FIX,
  ev,
} from "../../src/pearnotes/learning-engine";

const U = FIX.userId;

function session() {
  return new AssessmentSession({
    userId: U,
    lessonId: FIX.lessonId,
    objectives: [
      { objectiveId: FIX.objectiveId, authorizedSegmentIds: AUTHORIZED_CELLS_SEGMENTS },
      { objectiveId: FIX.otherObjectiveId, authorizedSegmentIds: [] },
    ],
    coreNodes: CORE_NODES,
    remediationSpecFor: () => CELLS_REMEDIATION_SPEC,
  });
}

describe("assessment session (issue #31 acceptance path)", () => {
  test("two incorrect attempts → consented source-grounded proposal → changed mastery", () => {
    const s = session();
    expect(s.journey().masteryByObjective[FIX.objectiveId]).toBe("not_started");

    const out = s.applyAttempts([
      ev({ verdict: "incorrect", attemptId: "a1", activityId: "act-x" }),
      ev({ verdict: "incorrect", attemptId: "a2", activityId: "act-y" }),
    ]);
    expect(out.accepted).toHaveLength(2);
    expect(out.proposals).toHaveLength(1);
    const p = out.proposals[0];
    expect(p.requiresLearnerConsent).toBe(true);
    expect(p.status).toBe("pending");
    expect(p.sourceSegmentIds.length).toBeGreaterThan(0);
    expect(p.reason.length).toBeGreaterThan(0);
    // Ghost is visible in the journey but not yet part of the path.
    expect(s.journey().nodes.find((n) => n.proposalId === p.proposalId)?.state).toBe("proposed");

    const consent = s.applyConsent({ proposalId: p.proposalId, accepted: true, decidedBy: U, decidedAt: 1 });
    expect(consent.ok).toBe(true);
    expect(s.journey().nodes.find((n) => n.proposalId === p.proposalId)?.state).toBe("available");

    // New evaluated evidence after practice → mastery + recommendation change.
    const rec1 = s.journey().recommendedNodeId;
    s.applyAttempts([
      ev({ verdict: "correct", attemptId: "a3", activityId: "act-rem-1" }),
      ev({ verdict: "correct", attemptId: "a4", activityId: "act-rem-2" }),
    ]);
    const snap = s.snapshot();
    expect(snap.mastery.find((m) => m.objectiveId === FIX.objectiveId)?.state).toBe("demonstrated");
    expect(s.journey().recommendedNodeId).not.toBe(rec1);
    expect(snap.evidence).toHaveLength(4);
  });

  test("rejected proposal does not silently re-propose the same trigger set", () => {
    const s = session();
    const out = s.applyAttempts([
      ev({ verdict: "incorrect", attemptId: "a1" }),
      ev({ verdict: "incorrect", attemptId: "a2" }),
    ]);
    const p = out.proposals[0];
    s.applyConsent({ proposalId: p.proposalId, accepted: false, decidedBy: U, decidedAt: 1 });
    // Re-evaluating the same evidence produces nothing new.
    const again = s.applyAttempts([ev({ verdict: "incorrect", attemptId: "a3", objectiveId: FIX.otherObjectiveId })]);
    expect(again.proposals).toHaveLength(0);
    expect(s.pendingProposals).toHaveLength(0);
  });

  test("duplicate attemptId ingested once only", () => {
    const s = session();
    s.applyAttempts([ev({ verdict: "incorrect", attemptId: "a1" })]);
    const out = s.applyAttempts([ev({ verdict: "incorrect", attemptId: "a1" })]);
    expect(out.accepted).toHaveLength(0);
    expect(s.evidenceFor(FIX.objectiveId)).toHaveLength(1);
  });

  test("foreign-learner evidence rejected at session scope", () => {
    const s = session();
    const out = s.applyAttempts([
      ev({ verdict: "incorrect", attemptId: "a1", userId: "user-other" }),
      ev({ verdict: "incorrect", attemptId: "a2", userId: "user-other" }),
    ]);
    expect(out.accepted).toHaveLength(0);
    expect(out.rejected.some((r) => r.reason === "wrong_user")).toBe(true);
    expect(s.masteryFor(FIX.objectiveId).state).toBe("not_started");
  });

  test("snapshot → restore round-trips identically", () => {
    const s = session();
    s.applyAttempts([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })]);
    const snap = s.snapshot();
    const restored = AssessmentSession.restore(
      {
        userId: U,
        lessonId: FIX.lessonId,
        objectives: [
          { objectiveId: FIX.objectiveId, authorizedSegmentIds: AUTHORIZED_CELLS_SEGMENTS },
          { objectiveId: FIX.otherObjectiveId, authorizedSegmentIds: [] },
        ],
        coreNodes: CORE_NODES,
        remediationSpecFor: () => CELLS_REMEDIATION_SPEC,
      },
      { evidence: snap.evidence, proposals: snap.proposals },
    );
    expect(restored.snapshot().proposals[0].proposalId).toBe(snap.proposals[0].proposalId);
    expect(restored.journey()).toEqual(s.journey());
  });
});
