/**
 * Unit tests for the deterministic widget logic — spec validation,
 * response building and the fixture graders. These are the pieces that
 * must stay correct when the real backend adapter replaces the fixture.
 */
import { describe, expect, it } from "vitest";
import {
  allPlaced,
  assignItem,
  buildClassificationResponse,
  fixtureGradeClassification,
  fixtureGradeChoice,
  fixtureGradeTeachBack,
  unassignItem,
  validateWidgetSpec,
  verdictFromScore,
} from "../../src/pearnotes/learning-widgets/logic";
import {
  FIXTURE_CLASSIFY_SOLUTION,
  FIXTURE_CLASSIFY_SPEC,
  FIXTURE_ENVELOPES,
} from "../../src/pearnotes/learning-widgets/fixtures";
import type { AttemptSubmission } from "../../src/pearnotes/learning-widgets/types";

const ENV = FIXTURE_ENVELOPES.classify;

function submission(assignments: Record<string, string>): AttemptSubmission {
  return { ...ENV, response: buildClassificationResponse(assignments) };
}

describe("validateWidgetSpec", () => {
  it("accepts the fixture classify spec", () => {
    expect(validateWidgetSpec(FIXTURE_CLASSIFY_SPEC)).toBeNull();
  });
  it("rejects a classify spec with <2 buckets", () => {
    expect(
      validateWidgetSpec({
        ...FIXTURE_CLASSIFY_SPEC,
        buckets: [FIXTURE_CLASSIFY_SPEC.buckets[0]],
      }),
    ).toBe("no_buckets");
  });
  it("rejects duplicate item ids", () => {
    expect(
      validateWidgetSpec({
        ...FIXTURE_CLASSIFY_SPEC,
        items: [FIXTURE_CLASSIFY_SPEC.items[0], FIXTURE_CLASSIFY_SPEC.items[0]],
      }),
    ).toBe("duplicate_item_id");
  });
});

describe("assignment helpers", () => {
  it("allPlaced is false until every item has a valid bucket", () => {
    const a = assignItem({}, "f-nucleus", "b-shared");
    expect(allPlaced(FIXTURE_CLASSIFY_SPEC, a)).toBe(false);
    // a valid bucket id is required, not just any key
    const bad = Object.fromEntries(
      FIXTURE_CLASSIFY_SPEC.items.map((i) => [i.id, "b-nope"]),
    );
    expect(allPlaced(FIXTURE_CLASSIFY_SPEC, bad)).toBe(false);
    expect(allPlaced(FIXTURE_CLASSIFY_SPEC, FIXTURE_CLASSIFY_SOLUTION)).toBe(true);
  });
  it("unassignItem returns a chip to the pile", () => {
    const a = assignItem({ "f-nucleus": "b-shared" }, "f-wall", "b-plant");
    expect(unassignItem(a, "f-nucleus")).toEqual({ "f-wall": "b-plant" });
  });
});

describe("buildClassificationResponse", () => {
  it("emits a typed classification response in deterministic item order", () => {
    const res = buildClassificationResponse({ "f-wall": "b-plant", "f-nucleus": "b-shared" });
    expect(res.kind).toBe("classification");
    if (res.kind !== "classification") throw new Error("unreachable");
    expect(res.assignments).toEqual([
      { itemId: "f-nucleus", bucketId: "b-shared" },
      { itemId: "f-wall", bucketId: "b-plant" },
    ]);
  });
});

describe("fixtureGradeClassification", () => {
  it("marks a perfect sort correct", () => {
    const r = fixtureGradeClassification(
      FIXTURE_CLASSIFY_SPEC,
      FIXTURE_CLASSIFY_SOLUTION,
      submission(FIXTURE_CLASSIFY_SOLUTION),
      1000,
    );
    expect(r.verdict).toBe("correct");
    expect(r.score).toBe(1);
    expect(r.marks?.every((m) => m.correct)).toBe(true);
  });
  it("marks a half-right sort partial and names the wrong items", () => {
    const mixed = { ...FIXTURE_CLASSIFY_SOLUTION, "f-wall": "b-animal", "f-chloroplast": "b-shared" };
    const r = fixtureGradeClassification(FIXTURE_CLASSIFY_SPEC, FIXTURE_CLASSIFY_SOLUTION, submission(mixed), 2000);
    expect(r.verdict).toBe("partial");
    expect(r.marks?.find((m) => m.itemId === "f-wall")?.expectedBucketId).toBe("b-plant");
    expect(r.feedback).toContain("cellulose cell wall");
  });
  it("marks an all-wrong sort incorrect", () => {
    const wrong = Object.fromEntries(
      FIXTURE_CLASSIFY_SPEC.items.map((i) => [i.id, "b-animal"]),
    );
    // shared items in animal bucket, plant items also animal → all wrong except
    // the genuinely-animal one
    wrong["f-smallvac"] = "b-plant";
    const r = fixtureGradeClassification(FIXTURE_CLASSIFY_SPEC, FIXTURE_CLASSIFY_SOLUTION, submission(wrong), 3000);
    expect(r.verdict).toBe("incorrect");
    expect(r.score).toBe(0);
  });
  it("rejects a non-classification response", () => {
    const bad: AttemptSubmission = { ...ENV, response: { kind: "text", text: "x" } };
    expect(() =>
      fixtureGradeClassification(FIXTURE_CLASSIFY_SPEC, FIXTURE_CLASSIFY_SOLUTION, bad, 0),
    ).toThrow();
  });
});

describe("fixtureGradeTeachBack", () => {
  const rubric = ["mentions wall", "mentions nucleus"];
  const keywords = [["wall", "chloroplast"], ["nucleus"]];
  const env = FIXTURE_ENVELOPES.teachBack;
  const sub = (text: string): AttemptSubmission => ({
    ...env,
    response: { kind: "text", text },
  });

  it("covers criteria by keyword and reports missing pieces", () => {
    const r = fixtureGradeTeachBack(keywords, rubric, sub("it has a cell wall"), 0);
    expect(r.rubric).toEqual([
      { criterion: "mentions wall", covered: true },
      { criterion: "mentions nucleus", covered: false },
    ]);
    expect(r.verdict).toBe("partial");
    expect(r.feedback).toContain("mentions nucleus");
  });
  it("full coverage is correct", () => {
    const r = fixtureGradeTeachBack(keywords, rubric, sub("cell wall and nucleus"), 0);
    expect(r.verdict).toBe("correct");
  });
});

describe("fixtureGradeChoice + verdictFromScore", () => {
  it("grades the choice response", () => {
    const ok: AttemptSubmission = { ...FIXTURE_ENVELOPES.multipleChoice, response: { kind: "choice", optionId: "opt-b" } };
    expect(fixtureGradeChoice("opt-b", ok, 0).verdict).toBe("correct");
    const no: AttemptSubmission = { ...FIXTURE_ENVELOPES.multipleChoice, response: { kind: "choice", optionId: "opt-a" } };
    expect(fixtureGradeChoice("opt-b", no, 0).verdict).toBe("incorrect");
  });
  it("maps scores to verdicts", () => {
    expect(verdictFromScore(1)).toBe("correct");
    expect(verdictFromScore(0.5)).toBe("partial");
    expect(verdictFromScore(0.49)).toBe("incorrect");
  });
});
