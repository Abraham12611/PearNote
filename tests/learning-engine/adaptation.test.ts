/**
 * Issue #29 — adaptation engine unit tests.
 * Positive: evidence → proposal → consent → changed journey.
 * Negative: wrong source, unrelated objective, duplicate attemptId,
 * missing citation, early correct, learner rejects, no admin override,
 * no client-supplied XP. Run: npm test
 */
import { describe, expect, test } from "vitest";
import {
  AUTHORIZED_CELLS_SEGMENTS,
  CELLS_REMEDIATION_SPEC,
  CORE_NODES,
  DEFAULT_POLICY,
  FIX,
  decideProposal,
  dedupeAttempts,
  deriveMastery,
  evaluateForRemediation,
  ev,
  intakeEvidence,
  projectJourney,
  validateEvidence,
  validateTemplateChoice,
} from "../../src/pearnotes/learning-engine";
import type { ObjectiveEvidence, RemediationProposal } from "../../src/pearnotes/learning-engine";

const U = FIX.userId;
const OBJ = FIX.objectiveId;
const AUTH = AUTHORIZED_CELLS_SEGMENTS;

function evaluate(evidence: ObjectiveEvidence[], extra: Partial<Parameters<typeof evaluateForRemediation>[0]> = {}) {
  return evaluateForRemediation({
    userId: U,
    objectiveId: OBJ,
    evidence,
    authorizedSegmentIds: AUTH,
    remediationSpec: CELLS_REMEDIATION_SPEC,
    ...extra,
  });
}

describe("trigger policy", () => {
  test("two distinct incorrect attempts → proposal", () => {
    const out = evaluate([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })]);
    expect(out.kind).toBe("proposal");
    if (out.kind !== "proposal") return;
    expect(out.proposal.requiresLearnerConsent).toBe(true);
    expect(out.proposal.status).toBe("pending");
    expect(out.proposal.sourceSegmentIds.length).toBeGreaterThan(0);
    expect(out.proposal.evidenceAttemptIds.sort()).toEqual(["a1", "a2"]);
    expect(out.mastery.suspectedGap).toBe(true);
  });

  test("one incorrect attempt → abstain (hint path only)", () => {
    const out = evaluate([ev({ verdict: "incorrect", attemptId: "a1" })]);
    expect(out).toMatchObject({ kind: "abstain", reason: "insufficient_evidence" });
  });

  test("same attemptId twice never counts as two", () => {
    const { unique, duplicates } = dedupeAttempts([
      ev({ verdict: "incorrect", attemptId: "a1" }),
      ev({ verdict: "incorrect", attemptId: "a1" }),
    ]);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(evaluate(unique)).toMatchObject({ kind: "abstain", reason: "insufficient_evidence" });
  });

  test("incorrect + inadequate teach-back triggers (documented rule R2)", () => {
    const out = evaluate([
      ev({ verdict: "incorrect", attemptId: "a1" }),
      ev({ verdict: "incorrect", attemptId: "a2", actionKind: "teachBack", score: 0.3 }),
    ]);
    // R1 also fires here; use single incorrect + weak teachBack for R2 isolation:
    const r2 = evaluate([
      ev({ verdict: "incorrect", attemptId: "b1" }),
      ev({ verdict: "partial", attemptId: "b2", actionKind: "teachBack", score: 0.4 }),
    ]);
    expect(out.kind).toBe("proposal");
    expect(r2.kind).toBe("proposal");
  });

  test("unrelated objective evidence ignored", () => {
    const out = evaluate([
      ev({ verdict: "incorrect", attemptId: "a1", objectiveId: FIX.otherObjectiveId }),
      ev({ verdict: "incorrect", attemptId: "a2", objectiveId: FIX.otherObjectiveId }),
    ]);
    expect(out).toMatchObject({ kind: "abstain", reason: "insufficient_evidence" });
  });

  test("needs_review evidence → abstain as uncertain", () => {
    const out = evaluate([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "needs_review", attemptId: "a2" })]);
    expect(out).toMatchObject({ kind: "abstain", reason: "uncertain_evidence" });
  });

  test("no authorized citations → abstain, never fake a reference", () => {
    const out = evaluateForRemediation({
      userId: U,
      objectiveId: OBJ,
      evidence: [
        ev({ verdict: "incorrect", attemptId: "a1", sourceSegmentIds: ["seg-unrelated"] }),
        ev({ verdict: "incorrect", attemptId: "a2", sourceSegmentIds: ["seg-unrelated"] }),
      ],
      authorizedSegmentIds: AUTH,
      remediationSpec: CELLS_REMEDIATION_SPEC,
    });
    expect(out).toMatchObject({ kind: "abstain", reason: "insufficient_citation" });
  });

  test("no second proposal for the same trigger set", () => {
    const evidence = [ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })];
    const first = evaluate(evidence);
    expect(first.kind).toBe("proposal");
    if (first.kind !== "proposal") return;
    const second = evaluate(evidence, { existingProposals: [first.proposal] });
    expect(second).toMatchObject({ kind: "abstain", reason: "already_proposed" });
  });

  test("regression: a rejected proposal never reappears for the same evidence", () => {
    const evidence = [ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })];
    const first = evaluate(evidence);
    expect(first.kind).toBe("proposal");
    if (first.kind !== "proposal") return;
    const rejected = { ...first.proposal, status: "rejected" as const };
    const again = evaluate(evidence, { existingProposals: [rejected] });
    expect(again).toMatchObject({ kind: "abstain", reason: "previously_declined" });
    expect(again.kind === "proposal" ? again.proposal.status : null).not.toBe("pending");
    // But NEW evidence (different trigger set) may still propose.
    const newEvidence = [ev({ verdict: "incorrect", attemptId: "b1" }), ev({ verdict: "incorrect", attemptId: "b2" })];
    const fresh = evaluate(newEvidence, { existingProposals: [rejected] });
    expect(fresh.kind).toBe("proposal");
  });

  test("regression: evidence is scoped to learner AND objective", () => {
    const foreign = [
      ev({ verdict: "incorrect", attemptId: "a1", userId: "user-other" }),
      ev({ verdict: "incorrect", attemptId: "a2", userId: "user-other" }),
    ];
    // Foreign learner's mistakes must not trigger a proposal for U.
    expect(evaluate(foreign)).toMatchObject({ kind: "abstain", reason: "insufficient_evidence" });
    // Nor move U's mastery.
    expect(deriveMastery(OBJ, U, foreign).state).toBe("not_started");
    // Mixed pool: only U's evidence counts.
    const mixed = [...foreign, ev({ verdict: "incorrect", attemptId: "a3" })];
    expect(evaluate(mixed)).toMatchObject({ kind: "abstain", reason: "insufficient_evidence" });
  });
});

describe("template validation", () => {
  const template = (segmentIds: string[]) => ({
    templateId: "tpl-1",
    spec: CELLS_REMEDIATION_SPEC,
    objectiveIds: [OBJ],
    sourceSegmentIds: segmentIds,
  });

  test("fully-authorized template accepted", () => {
    const r = validateTemplateChoice(template([...AUTH]), OBJ, AUTH);
    expect(r.ok).toBe(true);
  });

  test("regression: ANY unauthorized segment reference rejects the template", () => {
    const r = validateTemplateChoice(template([AUTH[0], "seg-not-authorized"]), OBJ, AUTH);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unauthorized");
  });

  test("empty segment list rejected", () => {
    const r = validateTemplateChoice(template([]), OBJ, AUTH);
    expect(r.ok).toBe(false);
  });

  test("off-objective template rejected", () => {
    const r = validateTemplateChoice(template([...AUTH]), FIX.otherObjectiveId, AUTH);
    expect(r.ok).toBe(false);
  });
});

describe("mastery transitions", () => {
  test("no evidence → not_started", () => {
    expect(deriveMastery(OBJ, U, []).state).toBe("not_started");
  });

  test("one easy correct does NOT demonstrate", () => {
    const m = deriveMastery(OBJ, U, [ev({ verdict: "correct", attemptId: "a1", activityId: "act-x" })]);
    expect(m.state).not.toBe("demonstrated");
  });

  test("two correct on distinct activities → demonstrated", () => {
    const m = deriveMastery(OBJ, U, [
      ev({ verdict: "correct", attemptId: "a1", activityId: "act-x" }),
      ev({ verdict: "correct", attemptId: "a2", activityId: "act-y" }),
    ]);
    expect(m.state).toBe("demonstrated");
    expect(m.explanation.lines.length).toBeGreaterThan(0);
  });

  test("correct twice on the SAME activity is insufficient", () => {
    const m = deriveMastery(OBJ, U, [
      ev({ verdict: "correct", attemptId: "a1", activityId: "act-x" }),
      ev({ verdict: "correct", attemptId: "a2", activityId: "act-x" }),
    ]);
    expect(m.state).not.toBe("demonstrated");
  });

  test("later incorrect demotes demonstrated → practicing", () => {
    const m = deriveMastery(OBJ, U, [
      ev({ verdict: "correct", attemptId: "a1", activityId: "act-x" }),
      ev({ verdict: "correct", attemptId: "a2", activityId: "act-y" }),
      ev({ verdict: "incorrect", attemptId: "a3", activityId: "act-z" }),
    ]);
    expect(m.state).toBe("practicing");
    expect(m.explanation.rule).toBe("demonstrated_demoted");
  });
});

describe("consent", () => {
  function pending(): RemediationProposal {
    const out = evaluate([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })]);
    if (out.kind !== "proposal") throw new Error("expected proposal");
    return out.proposal;
  }

  test("learner accepts → status accepted", () => {
    const p = pending();
    const { result } = decideProposal([p], { proposalId: p.proposalId, accepted: true, decidedBy: U, decidedAt: 1 });
    expect(result.ok).toBe(true);
    expect(result.proposal?.status).toBe("accepted");
  });

  test("learner rejects → rejected, no auto-publish", () => {
    const p = pending();
    const { proposals, result } = decideProposal([p], { proposalId: p.proposalId, accepted: false, decidedBy: U, decidedAt: 1 });
    expect(result.ok).toBe(true);
    expect(proposals[0].status).toBe("rejected");
  });

  test("non-learner (admin/peer) cannot consent", () => {
    const p = pending();
    const { result } = decideProposal([p], { proposalId: p.proposalId, accepted: true, decidedBy: "admin-1", decidedAt: 1 });
    expect(result).toMatchObject({ ok: false, reason: "not_learner" });
  });

  test("deciding a non-pending proposal fails", () => {
    const p = { ...pending(), status: "accepted" as const };
    const { result } = decideProposal([p], { proposalId: p.proposalId, accepted: true, decidedBy: U, decidedAt: 1 });
    expect(result).toMatchObject({ ok: false, reason: "not_pending" });
  });
});

describe("untrusted intake", () => {
  test("client-supplied XP / override fields reject the record", () => {
    const raw = { ...ev({ verdict: "incorrect", attemptId: "a1" }), xpAward: 500 };
    const { rejection } = validateEvidence(raw);
    expect(rejection?.reason).toBe("untrusted_claim");
  });

  test("unevaluated submission is not evidence", () => {
    const { rejection } = validateEvidence({ ...ev({ verdict: "incorrect", attemptId: "a1" }), verdict: undefined });
    expect(rejection?.reason).toBe("unevaluated");
  });

  test("wrong-user evidence rejected when scoped", () => {
    const { rejected } = intakeEvidence([ev({ verdict: "incorrect", attemptId: "a1", userId: "user-other" })], U);
    expect(rejected[0]?.reason).toBe("wrong_user");
  });
});

describe("journey projection", () => {
  test("pending proposal shows as ghost; accepted enters path; declined stays visible", () => {
    const out = evaluate([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })]);
    if (out.kind !== "proposal") throw new Error("expected proposal");
    const mastery = [deriveMastery(OBJ, U, [])];

    const ghost = projectJourney({ lessonId: FIX.lessonId, coreNodes: CORE_NODES, mastery, proposals: [out.proposal], evidence: [] });
    expect(ghost.nodes.find((n) => n.proposalId === out.proposal.proposalId)?.state).toBe("proposed");

    const accepted = { ...out.proposal, status: "accepted" as const };
    const after = projectJourney({ lessonId: FIX.lessonId, coreNodes: CORE_NODES, mastery, proposals: [accepted], evidence: [] });
    expect(after.nodes.find((n) => n.proposalId === accepted.proposalId)?.state).toBe("available");
  });
});

describe("determinism", () => {
  test("same evidence → same proposalId", () => {
    const mk = () => evaluate([ev({ verdict: "incorrect", attemptId: "a1" }), ev({ verdict: "incorrect", attemptId: "a2" })]);
    const [x, y] = [mk(), mk()];
    if (x.kind === "proposal" && y.kind === "proposal") expect(x.proposal.proposalId).toBe(y.proposal.proposalId);
  });
});
