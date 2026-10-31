/**
 * Runtime adapter tests — the policy half of runtime.ts, driven through
 * dependency injection (no React, no Convex). Covers attemptKey
 * stability/reuse, response-shape mapping, error mapping and practice
 * proposal mapping — the contract issue #46 pins.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createRuntimePort,
  runtimeErrorMessage,
  type RuntimeDeps,
} from "../../src/pearnotes/learning-widgets/runtime";
import type { AttemptSubmission } from "../../src/pearnotes/learning-widgets/types";

const submission = (bucketId: string): AttemptSubmission => ({
  lessonId: "les-1",
  activityId: "act-1",
  activityRevision: 3,
  objectiveIds: ["obj-1"],
  sourceRefs: [],
  response: { kind: "choice", optionId: bucketId },
});

function deps(overrides?: Partial<RuntimeDeps>): RuntimeDeps {
  let keyN = 0;
  return {
    submitAttempt: vi.fn(async (args) => ({
      attemptId: "att-1",
      verdict: "incorrect" as const,
      masteryUpdated: 1,
      _args: args,
    })),
    loadSegment: vi.fn(async () => null),
    listPractice: vi.fn(async () => []),
    reviewPractice: vi.fn(async () => ({ state: "accepted" as const, activityId: "act-new" })),
    newAttemptKey: () => `key-${++keyN}`,
    ...overrides,
  };
}

const argsOf = (mock: unknown) =>
  (mock as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as { attemptKey: string });

describe("createRuntimePort — attemptKey stability", () => {
  it("two deliberate submissions of the SAME answer mint DISTINCT keys (wrong sorts must each count)", async () => {
    const d = deps();
    const port = createRuntimePort(d);
    await port.submitAttempt(submission("opt-a"));
    await port.submitAttempt(submission("opt-a")); // try-again with identical answer
    const keys = argsOf(d.submitAttempt).map((a) => a.attemptKey);
    expect(keys).toEqual(["key-1", "key-2"]);
  });

  it("a network retry of the SAME in-flight submission reuses the original key", async () => {
    let calls = 0;
    const d = deps({
      submitAttempt: vi.fn(async (args) => {
        calls++;
        if (calls === 1) throw new Error("network drop");
        return { attemptId: "att-1", verdict: "incorrect" as const, masteryUpdated: 0, _args: args };
      }),
    });
    const port = createRuntimePort(d);
    await expect(port.submitAttempt(submission("opt-a"))).rejects.toThrow("network drop");
    await port.submitAttempt(submission("opt-a")); // retry of the dropped submit
    const keys = argsOf(d.submitAttempt).map((a) => a.attemptKey);
    expect(keys).toEqual(["key-1", "key-1"]);
  });

  it("a changed response after a failed submit also mints a NEW key", async () => {
    const d = deps({
      submitAttempt: vi
        .fn()
        .mockRejectedValueOnce(new Error("drop"))
        .mockResolvedValue({ attemptId: "a", verdict: "incorrect", masteryUpdated: 0 }),
    });
    const port = createRuntimePort(d);
    await expect(port.submitAttempt(submission("opt-a"))).rejects.toThrow();
    await port.submitAttempt(submission("opt-b")); // different answer = different attempt
    const keys = argsOf(d.submitAttempt).map((a) => a.attemptKey);
    expect(keys).toEqual(["key-1", "key-2"]);
  });

  it("a CHANGED response mints a NEW attemptKey", async () => {
    const d = deps();
    const port = createRuntimePort(d);
    await port.submitAttempt(submission("opt-a"));
    await port.submitAttempt(submission("opt-b")); // genuinely new answer
    const keys = argsOf(d.submitAttempt).map((a) => a.attemptKey);
    expect(keys).toEqual(["key-1", "key-2"]);
  });

  it("passes revision + classification assignments through verbatim", async () => {
    const d = deps();
    const port = createRuntimePort(d);
    const classify: AttemptSubmission = {
      ...submission("x"),
      response: {
        kind: "classification",
        assignments: [
          { itemId: "f-wall", bucketId: "plant" },
          { itemId: "f-nucleus", bucketId: "shared" },
        ],
      },
    };
    await port.submitAttempt(classify);
    const arg = (d.submitAttempt as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      activityRevision: number;
      response: { kind: string; assignments?: { itemId: string }[] };
    };
    expect(arg.activityRevision).toBe(3);
    expect(arg.response.kind).toBe("classification");
    expect(arg.response.assignments).toHaveLength(2);
  });

  it("maps the server verdict into AttemptResult without inventing fields", async () => {
    const d = deps();
    const port = createRuntimePort(d);
    const res = await port.submitAttempt(submission("opt-a"));
    expect(res.attemptId).toBe("att-1");
    expect(res.verdict).toBe("incorrect");
    expect(res.masteryUpdated).toBe(1);
    expect(res.feedback).toBeUndefined(); // server didn't send one — no fake text
    expect(res.marks).toBeUndefined();
  });
});

describe("createRuntimePort — segments + practice", () => {
  it("null segment → honest 'missing', never invented text", async () => {
    const port = createRuntimePort(deps());
    const res = await port.loadSegment({ sourceId: "s", segmentId: "seg-x" });
    expect(res).toEqual({ status: "missing", segmentId: "seg-x" });
  });
  it("ready segment maps the server shape", async () => {
    const d = deps({
      loadSegment: async () => ({
        _id: "seg-x",
        sourceId: "s",
        segmentNo: 4,
        page: 2,
        text: "real excerpt",
        kind: "paragraph",
      }),
    });
    const port = createRuntimePort(d);
    const res = await port.loadSegment({ sourceId: "s", segmentId: "seg-x" });
    expect(res.status).toBe("ready");
    if (res.status === "ready") {
      expect(res.segment.text).toBe("real excerpt");
      expect(res.segment.page).toBe(2);
    }
  });
  it("listPractice maps _id → proposalId and reviewPractice passes through", async () => {
    const d = deps({
      listPractice: async () => [
        {
          _id: "prop-1",
          state: "proposed",
          rationale: "r",
          spec: { kind: "shortAnswer", prompt: "p" },
          createdAt: 5,
        },
      ],
    });
    const port = createRuntimePort(d);
    const props = (await port.listPractice?.("les-1")) ?? [];
    expect(props[0].proposalId).toBe("prop-1");
    expect(props[0].state).toBe("proposed");
    const r = await port.reviewPractice?.("prop-1", "accept");
    expect(r?.state).toBe("accepted");
    expect((d.reviewPractice as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["prop-1", "accept"]);
  });
});

describe("runtimeErrorMessage", () => {
  const e = (code: string, message: string) => ({ data: { code, message } });
  it("CONFLICT revision → reload copy", () => {
    expect(runtimeErrorMessage(e("CONFLICT", "activity revised; reload before answering"))).toContain("updated");
  });
  it("CONFLICT key-reuse → retry-race copy", () => {
    expect(runtimeErrorMessage(e("CONFLICT", "attemptKey reused with a different response"))).toContain("raced");
  });
  it("UNAUTHORIZED / INVALID_INPUT / generic", () => {
    expect(runtimeErrorMessage(e("UNAUTHORIZED", "x"))).toContain("isn't yours");
    expect(runtimeErrorMessage(e("INVALID_INPUT", "x"))).toContain("couldn't be found");
    expect(runtimeErrorMessage(new Error("boom"))).toContain("connection");
  });
});
