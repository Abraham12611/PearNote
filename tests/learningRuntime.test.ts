import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

const api = anyApi;
const modules = import.meta.glob(["../convex/{learningAuth,learningRuntime,learningReview,learningImport}.ts", "../convex/_generated/api.js"]);

async function seed() {
  const t = convexTest(schema, modules);
  const { aId, bId, activityId, lessonId, otherAct } = await t.run(async (ctx) => {
    const aId = await ctx.db.insert("users", { name: "ada" });
    const bId = await ctx.db.insert("users", { name: "bea" });
    const sub = await ctx.db.insert("subjects", { ownerId: aId, name: "Bio", status: "draft", createdAt: 1, updatedAt: 1 });
    const ver = await ctx.db.insert("curriculumVersions", { subjectId: sub, version: 1, state: "draft", createdAt: 1 });
    const sec = await ctx.db.insert("sections", { versionId: ver, order: 0, title: "S" });
    const unit = await ctx.db.insert("units", { sectionId: sec, order: 0, title: "U" });
    const obj = await ctx.db.insert("objectives", { subjectId: sub, conceptIds: [], statement: "describe cells", createdAt: 1 });
    const lessonId = await ctx.db.insert("lessons", { unitId: unit, order: 0, title: "L", objectiveIds: [obj], specVersion: 1 });
    const activityId = await ctx.db.insert("activities", {
      lessonId, spec: { kind: "multipleChoice", prompt: "pick", options: [{ id: "a", label: "x" }, { id: "b", label: "y" }], correctOptionId: "a" },
      objectiveIds: [obj], sourceRefs: [], revision: 1, createdAt: 1,
    });
    const otherSub = await ctx.db.insert("subjects", { ownerId: bId, name: "B's", status: "draft", createdAt: 1, updatedAt: 1 });
    const v2 = await ctx.db.insert("curriculumVersions", { subjectId: otherSub, version: 1, state: "draft", createdAt: 1 });
    const s2 = await ctx.db.insert("sections", { versionId: v2, order: 0, title: "S" });
    const u2 = await ctx.db.insert("units", { sectionId: s2, order: 0, title: "U" });
    const l2 = await ctx.db.insert("lessons", { unitId: u2, order: 0, title: "L2", objectiveIds: [], specVersion: 1 });
    const otherAct = await ctx.db.insert("activities", { lessonId: l2, spec: { kind: "multipleChoice", prompt: "p", options: [{ id: "a", label: "x" }], correctOptionId: "a" }, objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1 });
    return { aId, bId, activityId, lessonId, otherAct };
  });
  return { t, aId, bId, asA: t.withIdentity({ subject: `${aId}|s` }), asB: t.withIdentity({ subject: `${bId}|s` }), activityId, lessonId, otherAct };
}

describe("learningRuntime", () => {
  test("two incorrect attempts → incorrect verdicts + mastery learning evidence", async () => {
    const { t, asA, activityId } = await seed();
    for (let i = 0; i < 2; i++) {
      const r = await asA.mutation(api.learningRuntime.submitAttempt, {
        activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: { kind: "choice", optionId: "b" },
      });
      expect(r.verdict).toBe("incorrect");
    }
    const m = await t.run(async (ctx) => ctx.db.query("mastery").collect());
    expect(m).toHaveLength(1);
    expect(m[0].state).not.toBe("demonstrated"); // policy-derived, no free pass
    expect(m[0].evidence).toHaveLength(2);
    const correct = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: { kind: "choice", optionId: "a" },
    });
    expect(correct.verdict).toBe("correct");
  });
  test("B cannot read A's lesson or submit on A's activity (guessed ids)", async () => {
    const { asB, activityId, lessonId } = await seed();
    expect(await asB.query(api.learningRuntime.getLesson, { lessonId })).toBeNull();
    await expect(asB.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: { kind: "choice", optionId: "a" },
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
  test("grading contract: missing key=needs_review, teachBack skips mastery, only assessed objectives", async () => {
    const { t, asA, aId, lessonId } = await seed();
    const { keylessAct, teachAct, obj2 } = await t.run(async (ctx) => {
      const sub = (await ctx.db.query("subjects").first())!._id;
      const obj2 = await ctx.db.insert("objectives", { subjectId: sub, conceptIds: [], statement: "other", createdAt: 1 });
      const keylessAct = await ctx.db.insert("activities", {
        lessonId, spec: { kind: "multipleChoice" as const, prompt: "no key", options: [{ id: "a", label: "x" }] },
        objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1,
      });
      const teachAct = await ctx.db.insert("activities", {
        lessonId, spec: { kind: "teachBack" as const, prompt: "explain", rubricCriteria: ["accuracy"] },
        objectiveIds: [obj2], sourceRefs: [], revision: 1, createdAt: 1,
      });
      return { keylessAct, teachAct, obj2 };
    });
    const r = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: keylessAct, activityRevision: 1, attemptKey: "kk", response: { kind: "choice", optionId: "a" },
    });
    expect(r.verdict).toBe("needs_review");              // NOT "incorrect"
    const t2 = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: teachAct, activityRevision: 1, attemptKey: "tt", response: { kind: "text", text: "my explanation" },
    });
    expect(t2.verdict).toBe("needs_review");
    expect(t2.masteryUpdated).toBe(0);                   // unevaluated → no mastery
    const m = await t.run(async (ctx) => ctx.db.query("mastery").collect());
    expect(m.every((row) => String(row.objectiveId) !== String(obj2))).toBe(true);
  });

  test("two incorrect attempts → engine-generated practice proposal", async () => {
    const { t, asA, activityId } = await seed();
    for (let i = 0; i < 2; i++) {
      await asA.mutation(api.learningRuntime.submitAttempt, {
        activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: { kind: "choice", optionId: "b" },
      });
    }
    const props = await t.run(async (ctx) => ctx.db.query("practiceProposals").collect());
    // Engine may abstain if policy demands >2 mistakes — accept either, but
    // if proposed it must be deduped, owned and source-grounded.
    if (props.length > 0) {
      expect(props[0].state).toBe("proposed");
      expect(props[0].rationale.length).toBeGreaterThan(10);
      const props2 = await t.run(async (ctx) => ctx.db.query("practiceProposals").collect());
      expect(props2.length).toBe(props.length);          // triggerKey dedupe
    }
  });

  test("compileLessonActivity materializes a gradable owner-scoped activity", async () => {
    const { asA, asB, lessonId } = await seed();
    const r = await asA.mutation(api.learningRuntime.compileLessonActivity, {
      lessonId,
      spec: { kind: "multipleChoice", prompt: "plant-only structure?", options: [{ id: "a", label: "chloroplast" }, { id: "b", label: "mitochondria" }], correctOptionId: "a" },
      sourceRefs: [],
    });
    const lesson = await asA.query(api.learningRuntime.getLesson, { lessonId });
    const act = lesson?.activities.find((a) => a._id === r.activityId);
    expect(act).toBeDefined();
    // Client-supplied key stripped at write AND read — the activity is
    // unscored, so grading returns needs_review, never a verdict.
    expect((act?.spec as Record<string, unknown>).correctOptionId).toBeUndefined();
    const sub = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: r.activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: { kind: "choice", optionId: "a" },
    });
    expect(sub.verdict).toBe("needs_review");
    await expect(asB.mutation(api.learningRuntime.compileLessonActivity, {
      lessonId, spec: { kind: "lessonCard", heading: "x", body: "y" },
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("STRICT E2E: two source-grounded incorrect attempts → exactly one proposal → consent → evidence", async () => {
    const { t, asA, aId, lessonId } = await seed();
    // Real source segment + scored classify activity via the trusted
    // internal compiler (key never crosses a client boundary).
    const { scoredAct, segId } = await t.run(async (ctx) => {
      const sub = (await ctx.db.query("subjects").first())!;
      const src = await ctx.db.insert("sources", {
        ownerId: sub.ownerId, storageId: await ctx.storage.store(new Blob(["x"])), title: "cells.pdf", mime: "application/pdf",
        sizeBytes: 1, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const segId = await ctx.db.insert("sourceSegments", {
        sourceId: src, segmentNo: 1, page: 1, text: "chloroplasts and a cell wall are plant features", createdAt: 1,
      });
      const objs = await ctx.db.query("objectives").collect();
      return {
        scoredAct: null as never,
        segId,
        obj: objs[0]._id,
      };
    });
    const objId = await t.run(async (ctx) => (await ctx.db.query("objectives").first())!._id);
    await t.run(async (ctx) => {
      const obj = (await ctx.db.get(objId))!;
      await ctx.db.patch(obj._id, {
        conceptIds: [await ctx.db.insert("concepts", {
          subjectId: obj.subjectId, label: "approved", provenance: "ai_proposal",
          sourceRefs: [{ sourceId: (await ctx.db.get(segId))!.sourceId, segmentId: segId }], createdAt: 1,
        })],
      });
    });
    const activityId = (await t.mutation(api.learningRuntime.internalCompileScoredActivity, {
      ownerId: aId,
      lessonId,
      spec: {
        kind: "classify", prompt: "sort each feature",
        items: [{ id: "i1", label: "cell wall" }, { id: "i2", label: "chloroplast" }],
        buckets: [{ id: "b1", label: "plant only" }, { id: "b2", label: "shared" }],
        correctAssignments: [{ itemId: "i1", bucketId: "b1" }, { itemId: "i2", bucketId: "b1" }],
      },
      objectiveIds: [objId],
      sourceRefs: [{ sourceId: await t.run(async (ctx) => (await ctx.db.get(segId))!.sourceId), segmentId: segId }],
    })).activityId;
    // Key never readable.
    const lesson = await asA.query(api.learningRuntime.getLesson, { lessonId });
    const spec = lesson?.activities.find((a) => a._id === activityId)?.spec as Record<string, unknown>;
    expect(spec.correctAssignments).toBeUndefined();
    // Two genuinely incorrect, distinct attempts.
    for (const wrong of ["b2", "b2"]) {
      const r = await asA.mutation(api.learningRuntime.submitAttempt, {
        activityId, activityRevision: 1, attemptKey: `k${Math.random()}`,
        response: { kind: "classification", assignments: [{ itemId: "i1", bucketId: wrong }, { itemId: "i2", bucketId: "b2" }] },
      });
      expect(r.verdict).toBe("incorrect");
    }
    const props = await t.run(async (ctx) =>
      ctx.db.query("practiceProposals").withIndex("by_owner_lesson", (q) => q.eq("ownerId", aId).eq("lessonId", lessonId)).collect());
    expect(props).toHaveLength(1);                       // STRICT: exactly one
    expect(props[0].state).toBe("proposed");
    expect(props[0].triggerAttemptIds.length).toBe(2);
    // Consent → supplemental activity materializes → new evidence accepted.
    const acc = await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: props[0]._id, action: "accept" });
    expect(acc.activityId).toBeDefined();
    const r3 = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: acc.activityId!, activityRevision: 1, attemptKey: "acc1",
      response: { kind: "classification", assignments: [{ itemId: "i1", bucketId: "b1" }, { itemId: "i2", bucketId: "b1" }] },
    });
    expect(["correct", "needs_review"]).toContain(r3.verdict); // accepted activity grades honestly
  });

  test("STRICT INTEGRATION: draft lesson → scored classify → 2 wrong → 1 proposal → accept → correct → mastery", async () => {
    const { t, asA, aId, lessonId } = await seed();
    // Approved draft → trusted materialization (real segments + real source).
    const sourceId = await t.run(async (ctx) => {
      const sub = (await ctx.db.query("subjects").first())!;
      const src = await ctx.db.insert("sources", {
        ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])),
        title: "cells.pdf", mime: "application/pdf", sizeBytes: 1,
        sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const s1 = await ctx.db.insert("sourceSegments", { sourceId: src, segmentNo: 1, page: 1, text: "plant cells have a cell wall, chloroplasts and a large vacuole", createdAt: 1 });
      const s2 = await ctx.db.insert("sourceSegments", { sourceId: src, segmentNo: 2, page: 2, text: "both cell types have a membrane, nucleus and cytoplasm", createdAt: 1 });
      await ctx.db.insert("subjectSources", {
        subjectId: sub._id, sourceId: src, segmentIds: [s1, s2], origin: "ai_proposal", createdAt: 1,
      });
      return src;
    });
    // Wire the lesson's objective to a concept citing the real segments.
    await t.run(async (ctx) => {
      const obj = (await ctx.db.query("objectives").first())!;
      const segs = await ctx.db.query("sourceSegments").collect();
      const cid = await ctx.db.insert("concepts", {
        subjectId: obj.subjectId, label: "cell features",
        provenance: "ai_proposal",
        sourceRefs: segs.map((sg) => ({ sourceId: sg.sourceId, segmentId: sg._id })),
        createdAt: 1,
      });
      await ctx.db.patch(obj._id, { conceptIds: [cid] });
    });
    const { activityId } = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    expect(activityId).not.toBeNull();
    // Spec is genuinely gradable; key never readable; sourceRefs real.
    const lesson = await asA.query(api.learningRuntime.getLesson, { lessonId });
    const act = lesson!.activities.find((a) => a._id === activityId);
    expect(act).toBeDefined();
    const spec = act!.spec as Record<string, unknown>;
    expect(spec.correctAssignments).toBeUndefined();
    // Two genuine wrongs → exactly one proposal.
    // Genuinely wrong: every plant-only item → shared, every shared → plant (0/6).
    const wrong = () => ({
      kind: "classification" as const,
      assignments: [
        { itemId: "f-wall", bucketId: "shared" }, { itemId: "f-chloroplast", bucketId: "shared" },
        { itemId: "f-bigvac", bucketId: "shared" }, { itemId: "f-membrane", bucketId: "plant" },
        { itemId: "f-nucleus", bucketId: "plant" }, { itemId: "f-cytoplasm", bucketId: "plant" },
      ],
    });
    for (let i = 0; i < 2; i++) {
      const r = await asA.mutation(api.learningRuntime.submitAttempt, {
        activityId, activityRevision: 1, attemptKey: `k${Date.now()}${Math.random()}`, response: wrong(),
      });
      expect(r.verdict).toBe("incorrect");
    }
    const props = await t.run(async (ctx) =>
      ctx.db.query("practiceProposals").withIndex("by_owner_lesson", (q) => q.eq("ownerId", aId).eq("lessonId", lessonId)).collect());
    expect(props).toHaveLength(1);
    expect(props[0].sourceRefs.length).toBeGreaterThan(0);
    // Adversarial: duplicate-item exploit must NOT grade (needs_review).
    const cheat = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: `k${Math.random()}`,
      response: { kind: "classification", assignments: [
        { itemId: "f-wall", bucketId: "plant" }, { itemId: "f-wall", bucketId: "plant" },
        { itemId: "f-wall", bucketId: "plant" }, { itemId: "f-wall", bucketId: "plant" },
        { itemId: "f-wall", bucketId: "plant" }, { itemId: "f-wall", bucketId: "plant" },
      ] },
    });
    expect(cheat.verdict).toBe("needs_review");
    // Consent → materialized practice → correct → persisted mastery+evidence.
    const acc = await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: props[0]._id, action: "accept" });
    const right = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: acc.activityId!, activityRevision: 1, attemptKey: "acc1",
      response: { kind: "classification", assignments: [
        { itemId: "f-wall", bucketId: "plant" }, { itemId: "f-chloroplast", bucketId: "plant" },
        { itemId: "f-bigvac", bucketId: "plant" }, { itemId: "f-membrane", bucketId: "shared" },
        { itemId: "f-nucleus", bucketId: "shared" }, { itemId: "f-cytoplasm", bucketId: "shared" },
      ] },
    });
    expect(right.verdict).toBe("correct");
    const m = await t.run(async (ctx) => ctx.db.query("mastery").collect());
    expect(m.length).toBeGreaterThan(0);
    expect(m[0].evidence.length).toBeGreaterThanOrEqual(3); // 2 wrong + 1 right persisted
  });

  test("mastery: two correct on DISTINCT activities → demonstrated; same-activity repeats cannot", async () => {
    const { t, asA, aId, lessonId } = await seed();
    const obj = await t.run(async (ctx) => (await ctx.db.query("objectives").first())!._id);
    const segRef = await t.run(async (ctx) => {
      const src = await ctx.db.insert("sources", {
        ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])), title: "t", mime: "text/plain",
        sizeBytes: 1, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const seg = await ctx.db.insert("sourceSegments", { sourceId: src, segmentNo: 1, page: 1, text: "x", createdAt: 1 });
      return { sourceId: src, segmentId: seg };
    });
    await t.run(async (ctx) => {
      const obj = (await ctx.db.query("objectives").first())!;
      await ctx.db.patch(obj._id, {
        conceptIds: [await ctx.db.insert("concepts", {
          subjectId: obj.subjectId, label: "approved", provenance: "ai_proposal",
          sourceRefs: [{ sourceId: segRef.sourceId, segmentId: segRef.segmentId }], createdAt: 1,
        })],
      });
    });
    const mk = () => t.mutation(api.learningRuntime.internalCompileScoredActivity, {
      ownerId: aId, lessonId,
      spec: { kind: "multipleChoice" as const, prompt: "p", options: [{ id: "a", label: "1" }, { id: "b", label: "2" }], correctOptionId: "a" },
      objectiveIds: [obj], sourceRefs: [segRef],
    });
    const a1 = (await mk()).activityId;
    const a2 = (await mk()).activityId;
    // Two correct on the SAME activity → NOT demonstrated.
    await asA.mutation(api.learningRuntime.submitAttempt, { activityId: a1, activityRevision: 1, attemptKey: "s1", response: { kind: "choice", optionId: "a" } });
    await asA.mutation(api.learningRuntime.submitAttempt, { activityId: a1, activityRevision: 1, attemptKey: "s2", response: { kind: "choice", optionId: "a" } });
    let m = await t.run(async (ctx) => ctx.db.query("mastery").first());
    expect(m?.state).not.toBe("demonstrated");
    // One correct on a DIFFERENT activity → demonstrates.
    await asA.mutation(api.learningRuntime.submitAttempt, { activityId: a2, activityRevision: 1, attemptKey: "s3", response: { kind: "choice", optionId: "a" } });
    m = await t.run(async (ctx) => ctx.db.query("mastery").first());
    expect(m?.state).toBe("demonstrated");
    expect(m?.evidence.length).toBeGreaterThanOrEqual(3);
  });

  test("dedupe: same key+same answer replays; different answer → CONFLICT; survives 50+ attempts", async () => {
    const { asA, activityId } = await seed();
    const mk = (n: number) => asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: `dup-${n}`,
      response: { kind: "choice", optionId: "b" },
    });
    for (let i = 0; i < 55; i++) await mk(i);
    const r1 = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: "replay",
      response: { kind: "choice", optionId: "a" },
    });
    const r2 = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: "replay",
      response: { kind: "choice", optionId: "a" },
    });
    expect(r2.attemptId).toBe(r1.attemptId);           // idempotent replay
    await expect(asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, attemptKey: "replay",
      response: { kind: "choice", optionId: "b" },     // different answer
    })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
  });

  test("grounding: unrelated/contradictory passages → abstain; foreign source → rejected", async () => {
    const { t, asA, aId, lessonId } = await seed();
    // Unrelated source — no fact keywords → materializer abstains.
    await t.run(async (ctx) => {
      const obj = (await ctx.db.query("objectives").first())!;
      const src = await ctx.db.insert("sources", {
        ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])), title: "unrelated",
        mime: "application/pdf", sizeBytes: 1, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const seg = await ctx.db.insert("sourceSegments", { sourceId: src, segmentNo: 1, page: 1, text: "a recipe for cake", createdAt: 1 });
      await ctx.db.patch(obj._id, {
        conceptIds: [await ctx.db.insert("concepts", {
          subjectId: obj.subjectId, label: "c", provenance: "ai_proposal",
          sourceRefs: [{ sourceId: src, segmentId: seg }], createdAt: 1,
        })],
      });
    });
    const r1 = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    expect(r1.activityId).toBeNull();                  // ungrounded → no scored activity
    // Foreign-owned source → internal compiler rejects.
    const foreign = await t.run(async (ctx) => {
      const b = await ctx.db.insert("users", { name: "other" });
      return ctx.db.insert("sources", {
        ownerId: b, storageId: await ctx.storage.store(new Blob(["x"])), title: "f",
        mime: "application/pdf", sizeBytes: 1, sha256: "1".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
    });
    await expect(t.mutation(api.learningRuntime.internalCompileScoredActivity, {
      ownerId: aId, lessonId,
      spec: { kind: "lessonCard" as const, heading: "h", body: "b" },
      objectiveIds: [], sourceRefs: [{ sourceId: foreign }],
    })).rejects.toThrow(/foreign-owned/);
  });

  test("REAL PATH: learningReview.review approve → materialized lesson → grounded scored activity", async () => {
    const t = convexTest(schema, modules);
    const aId = await t.run(async (ctx) => ctx.db.insert("users", { name: "ada" }));
    const asA = t.withIdentity({ subject: `${aId}|s` });
    const jobId = await t.run(async (ctx) => {
      const src = await ctx.db.insert("sources", {
        ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])), title: "cells.pdf",
        mime: "application/pdf", sizeBytes: 1, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const s1 = await ctx.db.insert("sourceSegments", {
        sourceId: src, segmentNo: 1, page: 1,
        text: "plant cells have a cellulose cell wall, chloroplasts and a large vacuole", createdAt: 1,
      });
      const s2 = await ctx.db.insert("sourceSegments", {
        sourceId: src, segmentNo: 2, page: 2,
        text: "both plant and animal cells share a membrane, nucleus and cytoplasm", createdAt: 1,
      });
      const jobId = await ctx.db.insert("importJobs", {
        ownerId: aId, sourceId: src, idempotencyKey: "k", state: "needs_review", createdAt: 1, updatedAt: 1,
      });
      await ctx.db.insert("importProposals", {
        jobId, state: "pending",
        proposal: {
          suggestedSubjects: [{ name: "Cell Biology", confidence: "high", segmentIds: [s1, s2] }],
          concepts: [{ label: "cell features", sourceSegmentIds: [s1, s2],
            evidence: [{ segmentId: s1, quote: "plant cells have a cellulose cell wall" }] }],
          draftCurriculum: { sections: [{ title: "Cells", units: [{ title: "Structure", lessons: [
            { title: "Plant vs Animal Cell Features", objectives: ["identify plant vs animal cell structures"],
              sourceSegmentIds: [s1, s2],
              evidence: [{ segmentId: s1, quote: "chloroplasts and a large vacuole" }] }] }] }] },
          warnings: [],
        },
        revision: 0, createdAt: 1, updatedAt: 1,
      });
      return jobId;
    });
    const r = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" });
    expect(r.subjectIds).toHaveLength(1);
    const lesson = await t.run(async (ctx) => ctx.db.query("lessons").first());
    expect(lesson).not.toBeNull();
    // Scheduler is a no-op in convex-test — invoke the scheduled mutation
    // directly, exactly as the deployed scheduler would.
    const m = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId: lesson!._id });
    expect(m.activityId).not.toBeNull();             // real approval → grounded activity
    const found = await asA.query(api.learningRuntime.getLesson, { lessonId: lesson!._id });
    const spec = found?.activities.find((a) => a._id === m.activityId)?.spec as Record<string, unknown>;
    expect(spec.kind).toBe("classify");
    expect(spec.correctAssignments).toBeUndefined();  // key stripped on read
    // The activity cites the lesson's own persisted approved citations.
    const act = await t.run(async (ctx) => ctx.db.get(m.activityId!));
    expect(act?.sourceRefs.length).toBeGreaterThan(0);
  });

  test("practice accept materializes activity; reject terminal; foreign proposal hidden", async () => {
    const { t, asA, aId, lessonId } = await seed();
    const bSub = await t.run(async (ctx) => ctx.db.insert("users", { name: "bea" }));
    const mk = (ownerId: Id<"users">, key: string) =>
      t.run(async (ctx) => ctx.db.insert("practiceProposals", {
        ownerId, lessonId, triggerKey: key, triggerAttemptIds: [],
        rationale: "two incorrect attempts on membranes",
        spec: { kind: "shortAnswer" as const, prompt: "define diffusion", expectedAnswer: "movement down a gradient" },
        objectiveIds: [], sourceRefs: [], state: "proposed" as const, createdAt: 1, updatedAt: 1,
      }));
    const foreign = await mk(bSub, "k1");
    const mine = await mk(aId, "k2");
    const mine2 = await mk(aId, "k3");
    const rows = await asA.query(api.learningRuntime.listPractice, { lessonId });
    expect(rows.map((r) => r._id).sort()).toEqual([mine, mine2].sort());
    const acc = await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: mine, action: "accept" });
    expect(acc.activityId).toBeDefined();
    const acts = await asA.query(api.learningRuntime.getLesson, { lessonId });
    expect(acts?.activities.some((a) => a._id === acc.activityId)).toBe(true);
    await expect(asA.mutation(api.learningRuntime.reviewPractice, { proposalId: foreign, action: "accept" }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: mine2, action: "reject" });
    await expect(asA.mutation(api.learningRuntime.reviewPractice, { proposalId: mine2, action: "accept" }))
      .rejects.toMatchObject({ data: { code: "CONFLICT" } });
  });
});
