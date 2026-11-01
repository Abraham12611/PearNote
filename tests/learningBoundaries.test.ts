/**
 * Assignment E4 boundary tests — attestation trust edges (Issue #45),
 * honest progress reads (Issues #50/#53) and privacy ordering.
 *
 * Covers what the earlier suites didn't: negated/contradictory passages,
 * per-lesson attestation isolation, duplicate materialization, stable
 * repeat-accept ids, post-grading marks, server-derived progress states,
 * and anonymous-guest identity semantics.
 */
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import type { Doc, Id } from "../convex/_generated/dataModel";

const api = anyApi;
const modules = import.meta.glob([
  "../convex/{learningAuth,learningRuntime,learningReview,learningImport,curricula,subjects,sources}.ts",
  "../convex/_generated/api.js",
]);

type T = ReturnType<typeof convexTest>;
type SegRef = { sourceId: Id<"sources">; segmentId: Id<"sourceSegments"> };

const CELL_ITEMS = (plant: Id<"sourceSegments">, shared: Id<"sourceSegments">) => [
  { itemId: "f-wall", bucketId: "plant", segmentIds: [plant] },
  { itemId: "f-chloroplast", bucketId: "plant", segmentIds: [plant] },
  { itemId: "f-bigvac", bucketId: "plant", segmentIds: [plant] },
  { itemId: "f-membrane", bucketId: "shared", segmentIds: [shared] },
  { itemId: "f-nucleus", bucketId: "shared", segmentIds: [shared] },
  { itemId: "f-cytoplasm", bucketId: "shared", segmentIds: [shared] },
];

/**
 * One owner, one subject with a draft path and a lesson whose approved
 * citations point at two real segments of a real source. `objectives`
 * controls how many objective rows the lesson tracks.
 */
async function seedLesson(opts: { objectives?: number; lessonRefs?: boolean } = {}) {
  const t = convexTest(schema, modules);
  const { aId, bId, lessonId, subjectId, objIds, refs } = await t.run(async (ctx) => {
    const aId = await ctx.db.insert("users", { name: "ada" });
    const bId = await ctx.db.insert("users", { name: "bea" });
    const src = await ctx.db.insert("sources", {
      ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])), title: "cells.pdf",
      mime: "application/pdf", sizeBytes: 1, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
    });
    const plant = await ctx.db.insert("sourceSegments", {
      sourceId: src, segmentNo: 1, page: 1,
      text: "plant cells have a cellulose cell wall, chloroplasts and a large vacuole", createdAt: 1,
    });
    const shared = await ctx.db.insert("sourceSegments", {
      sourceId: src, segmentNo: 2, page: 2,
      text: "both plant and animal cells have a membrane, a nucleus and cytoplasm", createdAt: 1,
    });
    const refs: SegRef[] = [
      { sourceId: src, segmentId: plant },
      { sourceId: src, segmentId: shared },
    ];
    const sub = await ctx.db.insert("subjects", { ownerId: aId, name: "Bio", status: "draft", createdAt: 1, updatedAt: 1 });
    const ver = await ctx.db.insert("curriculumVersions", { subjectId: sub, version: 1, state: "draft", createdAt: 1 });
    const sec = await ctx.db.insert("sections", { versionId: ver, order: 0, title: "S" });
    const unit = await ctx.db.insert("units", { sectionId: sec, order: 0, title: "U" });
    const objIds: Id<"objectives">[] = [];
    for (let i = 0; i < (opts.objectives ?? 1); i++) {
      objIds.push(await ctx.db.insert("objectives", {
        subjectId: sub, conceptIds: [], statement: `objective ${i + 1}`, createdAt: 1,
      }));
    }
    const lessonId = await ctx.db.insert("lessons", {
      unitId: unit, order: 0, title: "L", objectiveIds: objIds, specVersion: 1,
      sourceRefs: opts.lessonRefs === false ? undefined : refs,
    });
    return { aId, bId, lessonId, subjectId: sub, objIds, refs, plant, shared, src, unit };
  });
  return {
    t, aId, bId, lessonId, subjectId, objIds, refs,
    plant: refs[0].segmentId, shared: refs[1].segmentId,
    asA: t.withIdentity({ subject: `${aId}|s` }),
    asB: t.withIdentity({ subject: `${bId}|s` }),
  };
}

describe("attestation edges (Issue #45)", () => {
  test("negated/contradictory passage cannot be attested → materializer abstains", async () => {
    const { t, asA, lessonId } = await seedLesson();
    // Replace the plant segment's text with a passage that DENIES the facts.
    const negated = await t.run(async (ctx) =>
      ctx.db.insert("sourceSegments", {
        sourceId: (await ctx.db.get(lessonId))!.sourceRefs![0].sourceId,
        segmentNo: 3, page: 1,
        text: "plant cells do not have a cell wall, and they lack chloroplasts and a vacuole",
        createdAt: 1,
      }));
    await t.run(async (ctx) => {
      const l = (await ctx.db.get(lessonId))!;
      await ctx.db.patch(lessonId, {
        sourceRefs: [...l.sourceRefs!, { sourceId: l.sourceRefs![0].sourceId, segmentId: negated }],
      });
    });
    await expect(asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId,
      items: [{ itemId: "f-wall", bucketId: "plant", segmentIds: [negated] }],
    })).rejects.toThrow(/contradicts/);
    // And without a complete clean attestation, nothing scored is produced.
    const m = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    expect(m.activityId).toBeNull();
  });

  test("mixed passage: affirmed mention alongside a negated one is attestable", async () => {
    const { t, asA, lessonId } = await seedLesson();
    const mixed = await t.run(async (ctx) =>
      ctx.db.insert("sourceSegments", {
        sourceId: (await ctx.db.get(lessonId))!.sourceRefs![0].sourceId,
        segmentNo: 3, page: 1,
        text: "animal cells lack a cell wall, but plant cells do have a cell wall",
        createdAt: 1,
      }));
    await t.run(async (ctx) => {
      const l = (await ctx.db.get(lessonId))!;
      await ctx.db.patch(lessonId, {
        sourceRefs: [...l.sourceRefs!, { sourceId: l.sourceRefs![0].sourceId, segmentId: mixed }],
      });
    });
    const r = await asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId,
      items: [{ itemId: "f-wall", bucketId: "plant", segmentIds: [mixed] }],
    });
    expect(r.attested).toBe(1);
  });

  test("attestation is per-lesson: a sibling lesson in the same subject still abstains", async () => {
    const { t, asA, lessonId, refs, plant, shared } = await seedLesson();
    const otherLesson = await t.run(async (ctx) => {
      const l = (await ctx.db.get(lessonId))!;
      return await ctx.db.insert("lessons", {
        unitId: l.unitId, order: 1, title: "L2", objectiveIds: l.objectiveIds,
        specVersion: 1, sourceRefs: refs,
      });
    });
    await asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId, items: CELL_ITEMS(plant, shared),
    });
    expect((await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId })).activityId).not.toBeNull();
    // The unattested sibling — same subject, same approved refs — abstains.
    expect((await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId: otherLesson })).activityId).toBeNull();
  });

  test("partial attestation (5 of 6 items) → abstain; blank segmentIds and empty refs rejected", async () => {
    const { t, asA, lessonId, plant, shared } = await seedLesson();
    await asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId, items: CELL_ITEMS(plant, shared).slice(0, 5),
    });
    expect((await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId })).activityId).toBeNull();
    await expect(asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId,
      items: [{ itemId: "f-wall", bucketId: "plant", segmentIds: [] }],
    })).rejects.toThrow(/requires segmentIds/);
    // Lesson with NO approved citations cannot be attested at all.
    const bare = await seedLesson({ lessonRefs: false });
    await expect(bare.asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId: bare.lessonId,
      items: CELL_ITEMS(plant, shared),
    })).rejects.toThrow(/no approved citations/);
  });

  test("duplicate materialization is idempotent; attestation identity is server-derived", async () => {
    const { t, asA, asB, aId, lessonId, plant, shared } = await seedLesson();
    await asA.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId, items: CELL_ITEMS(plant, shared),
    });
    const m1 = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    const m2 = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    expect(m2.activityId).toBe(m1.activityId);
    const acts = await t.run(async (ctx) =>
      ctx.db.query("activities").withIndex("by_lesson", (q) => q.eq("lessonId", lessonId)).collect());
    expect(acts).toHaveLength(1);
    // attestedBy is the real caller — never a supplied string.
    const att = await t.run(async (ctx) => ctx.db.query("factAttestations").first());
    expect(att?.attestedBy).toBe(`owner:${String(aId)}`);
    // A foreign user cannot attest another learner's lesson.
    await expect(asB.mutation(api.learningRuntime.attestClassificationFacts, {
      templateId: "cells_classify_v1", lessonId, items: CELL_ITEMS(plant, shared),
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("concept-fallback removed: lesson citing concepts but no sourceRefs abstains even when attested concepts exist", async () => {
    const { t, lessonId, refs } = await seedLesson({ lessonRefs: false });
    // Wire the lesson's objective → concept → segments (the old fallback path).
    await t.run(async (ctx) => {
      const obj = (await ctx.db.query("objectives").first())!;
      await ctx.db.patch(obj._id, {
        conceptIds: [await ctx.db.insert("concepts", {
          subjectId: obj.subjectId, label: "c", provenance: "ai_proposal", sourceRefs: refs, createdAt: 1,
        })],
      });
    });
    const m = await t.mutation(api.learningRuntime.materializeScoredActivity, { lessonId });
    expect(m.activityId).toBeNull(); // no per-lesson approved refs → abstain
  });
});

describe("submitAttempt privacy ordering + marks (Issue #50 §3a)", () => {
  const classifyAct = async (t: T, lessonId: Id<"lessons">) =>
    await t.run(async (ctx) =>
      await ctx.db.insert("activities", {
        lessonId,
        spec: {
          kind: "classify" as const, prompt: "sort",
          items: [{ id: "i1", label: "wall" }, { id: "i2", label: "membrane" }],
          buckets: [{ id: "p", label: "plant" }, { id: "s", label: "shared" }],
          correctAssignments: [{ itemId: "i1", bucketId: "p" }, { itemId: "i2", bucketId: "s" }],
        },
        objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1,
      }));

  test("foreign caller with wrong revision gets UNAUTHORIZED, not CONFLICT — existence stays hidden", async () => {
    const { t, asB, lessonId } = await seedLesson();
    const activityId = await classifyAct(t, lessonId);
    // Wrong revision on a foreign activity must fail like a missing one —
    // a CONFLICT would confirm the row exists and leak its revision.
    await expect(asB.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 999, attemptKey: "probe",
      response: { kind: "classification", assignments: [{ itemId: "i1", bucketId: "p" }, { itemId: "i2", bucketId: "s" }] },
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("nonexistent and foreign activity are indistinguishable — same code, same message", async () => {
    const { t, asA, asB, lessonId } = await seedLesson();
    const foreignId = await classifyAct(t, lessonId);
    // A well-formed id whose row was deleted — exists-shaped, truly gone.
    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("activities", {
        lessonId, spec: { kind: "lessonCard" as const, heading: "h", body: "b" },
        objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1,
      });
      await ctx.db.delete(id);
      return id;
    });
    const args = (activityId: Id<"activities">) => ({
      activityId, activityRevision: 1, attemptKey: "probe",
      response: { kind: "classification" as const, assignments: [{ itemId: "i1", bucketId: "p" }, { itemId: "i2", bucketId: "s" }] },
    });
    const missing = await asA.mutation(api.learningRuntime.submitAttempt, args(deletedId)).then(
      () => ({ code: "OK" }), (e) => (e as { data?: { code?: string; message?: string } }).data ?? {},
    );
    const foreign = await asB.mutation(api.learningRuntime.submitAttempt, args(foreignId)).then(
      () => ({ code: "OK" }), (e) => (e as { data?: { code?: string; message?: string } }).data ?? {},
    );
    expect(missing).toEqual(foreign);
    expect(missing.code).toBe("UNAUTHORIZED");
    // Even the owner sees the same answer for a deleted activity.
    const ownMissing = await asA.mutation(api.learningRuntime.submitAttempt, args(deletedId)).then(
      () => ({ code: "OK" }), (e) => (e as { data?: { code?: string; message?: string } }).data ?? {},
    );
    expect(ownMissing).toEqual(foreign);
  });

  test("marks: per-item correctness after grading, no answer-key leak, none on needs_review or MCQ", async () => {
    const { t, asA, lessonId } = await seedLesson();
    const classifyId = await classifyAct(t, lessonId);
    const mcqId = await t.run(async (ctx) =>
      await ctx.db.insert("activities", {
        lessonId,
        spec: { kind: "multipleChoice" as const, prompt: "p", options: [{ id: "a", label: "x" }], correctOptionId: "a" },
        objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1,
      }));
    const r = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: classifyId, activityRevision: 1, attemptKey: "m1",
      response: { kind: "classification", assignments: [{ itemId: "i1", bucketId: "p" }, { itemId: "i2", bucketId: "p" }] },
    });
    expect(r.verdict).toBe("partial");
    expect(r.marks).toEqual([
      { itemId: "i1", correct: true },
      { itemId: "i2", correct: false }, // wrong bucket NOT disclosed
    ]);
    // Replay returns the same marks.
    const replay = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: classifyId, activityRevision: 1, attemptKey: "m1",
      response: { kind: "classification", assignments: [{ itemId: "i1", bucketId: "p" }, { itemId: "i2", bucketId: "p" }] },
    });
    expect(replay.marks).toEqual(r.marks);
    // MCQ → no per-item marks; malformed classify → needs_review → no marks.
    const mcq = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: mcqId, activityRevision: 1, attemptKey: "m2", response: { kind: "choice", optionId: "a" },
    });
    expect(mcq.marks).toBeUndefined();
    const bad = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: classifyId, activityRevision: 1, attemptKey: "m3",
      response: { kind: "classification", assignments: [{ itemId: "bogus", bucketId: "p" }] },
    });
    expect(bad.verdict).toBe("needs_review");
    expect(bad.marks).toBeUndefined();
    // Replay of the unevaluated attempt must not emit marks either — the
    // response would otherwise leak per-item correctness for an attempt
    // the server never graded.
    const badReplay = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: classifyId, activityRevision: 1, attemptKey: "m3",
      response: { kind: "classification", assignments: [{ itemId: "bogus", bucketId: "p" }] },
    });
    expect(badReplay.verdict).toBe("needs_review");
    expect(badReplay.marks).toBeUndefined();
  });
});

describe("honest progress reads (Issues #50/#53)", () => {
  test("getPath: activityCount + progress untracked → not_started → learning → demonstrated", async () => {
    const { t, asA, subjectId, lessonId, objIds } = await seedLesson({ objectives: 2 });
    // Untracked sibling lesson (no objectives) in the same unit.
    await t.run(async (ctx) => {
      const l = (await ctx.db.get(lessonId))!;
      await ctx.db.insert("lessons", {
        unitId: l.unitId, order: 1, title: "untracked", objectiveIds: [], specVersion: 1,
      });
      await ctx.db.insert("activities", {
        lessonId, spec: { kind: "multipleChoice" as const, prompt: "p", options: [{ id: "a", label: "x" }], correctOptionId: "a" },
        objectiveIds: objIds, sourceRefs: [], revision: 1, createdAt: 1,
      });
    });
    let path = await asA.query(api.curricula.getPath, { subjectId });
    const [tracked, untracked] = path!.sections[0].units[0].lessons;
    expect(tracked.activityCount).toBe(1);
    expect(tracked.progress).toMatchObject({
      tracked: true, state: "not_started", assessedObjectives: 0, totalObjectives: 2, evaluatedAttempts: 0,
    });
    expect(untracked.progress.state).toBe("untracked");
    expect(untracked.progress.tracked).toBe(false);

    // One evaluated attempt → evidence exists → "learning".
    const actId = (await asA.query(api.learningRuntime.getLesson, { lessonId }))!.activities[0]._id;
    await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: actId, activityRevision: 1, attemptKey: "p1", response: { kind: "choice", optionId: "a" },
    });
    path = await asA.query(api.curricula.getPath, { subjectId });
    const after = path!.sections[0].units[0].lessons[0].progress;
    expect(after.state).toBe("learning");
    expect(after.evaluatedAttempts).toBe(1);

    // Both objectives demonstrated → lesson "demonstrated". Patch the real
    // upserted rows (mastery is unique per user+objective — never insert
    // a second row for the same pair).
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("mastery").collect()) {
        await ctx.db.patch(row._id, { state: "demonstrated" });
      }
    });
    path = await asA.query(api.curricula.getPath, { subjectId });
    expect(path!.sections[0].units[0].lessons[0].progress.state).toBe("demonstrated");
  });

  test("getPath evidence is per-lesson scoped: >500 older attempts elsewhere cannot crowd out this lesson's proof", async () => {
    const { t, asA, aId, subjectId, lessonId, objIds } = await seedLesson({ objectives: 1 });
    const actId = await t.run(async (ctx) => {
      const l = (await ctx.db.get(lessonId))!;
      const otherLesson = await ctx.db.insert("lessons", {
        unitId: l.unitId, order: 9, title: "other", objectiveIds: [], specVersion: 1,
      });
      const filler = await ctx.db.insert("activities", {
        lessonId: otherLesson,
        spec: { kind: "multipleChoice" as const, prompt: "f", options: [{ id: "a", label: "x" }], correctOptionId: "a" },
        objectiveIds: [], sourceRefs: [], revision: 1, createdAt: 1,
      });
      // 510 evaluated attempts on a DIFFERENT lesson's activity, all older
      // than the real evidence — a first-N global window (by_user_time asc)
      // is exactly 500 rows and would evict the real lesson's attempt.
      for (let i = 0; i < 510; i++) {
        await ctx.db.insert("attempts", {
          userId: aId, activityId: filler, activityRevision: 1, state: "evaluated" as const,
          response: { kind: "choice" as const, optionId: "a" },
          evaluation: { verdict: "incorrect" as const, score: 0, evaluatedAt: i },
          attemptKey: `fill-${i}`, createdAt: i,
        });
      }
      return await ctx.db.insert("activities", {
        lessonId, spec: { kind: "multipleChoice" as const, prompt: "p", options: [{ id: "a", label: "x" }], correctOptionId: "a" },
        objectiveIds: objIds, sourceRefs: [], revision: 1, createdAt: 2,
      });
    });
    // The lesson's own evaluated attempt arrives last — outside the window.
    await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId: actId, activityRevision: 1, attemptKey: "real", response: { kind: "choice", optionId: "a" },
    });
    const path = await asA.query(api.curricula.getPath, { subjectId });
    const progress = path!.sections[0].units[0].lessons[0].progress;
    // Exactly this lesson's own attempt is counted — filler never leaks in,
    // and the real attempt isn't evicted by a global window.
    expect(progress.evaluatedAttempts).toBe(1);
    expect(progress.state).toBe("learning");
  });

  test("getPath: unauthenticated denied; B's evidence never leaks into A's path", async () => {
    const { t, asA, asB, subjectId, bId, objIds } = await seedLesson();
    await expect(t.query(api.curricula.getPath, { subjectId }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    // B has mastery on objectives of her own — must not surface in A's path.
    await t.run(async (ctx) => {
      await ctx.db.insert("mastery", {
        userId: bId, objectiveId: objIds[0], state: "demonstrated", evidence: [], updatedAt: 1,
      });
    });
    const path = await asA.query(api.curricula.getPath, { subjectId });
    expect(path!.sections[0].units[0].lessons[0].progress.state).toBe("not_started");
    await expect(asB.query(api.curricula.getPath, { subjectId }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("getLesson objectives: real statements + own mastery + evidence counts; B sees null", async () => {
    const { asA, asB, lessonId } = await seedLesson({ objectives: 2 });
    const lesson = await asA.query(api.learningRuntime.getLesson, { lessonId });
    expect(lesson!.objectives).toHaveLength(2);
    expect(lesson!.objectives.map((o) => o.statement)).toEqual(["objective 1", "objective 2"]);
    expect(lesson!.objectives.every((o) => o.mastery === "not_started" && o.evidenceCount === 0)).toBe(true);
    expect(await asB.query(api.learningRuntime.getLesson, { lessonId })).toBeNull();
  });

  test("reviewPractice repeat-accept replays the SAME activityId — never a second activity", async () => {
    const { t, asA, aId, lessonId } = await seedLesson();
    const propId = await t.run(async (ctx) =>
      ctx.db.insert("practiceProposals", {
        ownerId: aId, lessonId, triggerKey: "t1", triggerAttemptIds: [],
        rationale: "two incorrect attempts",
        spec: { kind: "shortAnswer" as const, prompt: "retry", expectedAnswer: "x" },
        objectiveIds: [], sourceRefs: [], state: "proposed" as const, createdAt: 1, updatedAt: 1,
      }));
    const first = await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: propId, action: "accept" });
    const again = await asA.mutation(api.learningRuntime.reviewPractice, { proposalId: propId, action: "accept" });
    expect(again.state).toBe("accepted");
    expect(again.activityId).toBe(first.activityId);
    const acts = await t.run(async (ctx) =>
      ctx.db.query("activities").withIndex("by_lesson", (q) => q.eq("lessonId", lessonId)).collect());
    expect(acts).toHaveLength(1);
  });
});

describe("anonymous guest = real persistent identity", () => {
  test("a guest (isAnonymous users row) owns real learning data end-to-end", async () => {
    const t = convexTest(schema, modules);
    const guestId = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "guest", isAnonymous: true }));
    const asGuest = t.withIdentity({ subject: `${guestId}|s` });
    // Guests can create subjects — their data is REAL, not a demo fixture.
    const { subjectId } = await asGuest.mutation(api.subjects.createManual, { name: "Guest Bio" });
    expect((await asGuest.query(api.subjects.get, { subjectId }))?.name).toBe("Guest Bio");
    const row = await t.run(async (ctx) => ctx.db.get(subjectId));
    expect(row?.ownerId).toBe(guestId);
    // But a guest's rows are still private — nobody else can reach them.
    const other = await t.run(async (ctx) => ctx.db.insert("users", { name: "eve" }));
    const asOther = t.withIdentity({ subject: `${other}|s` });
    expect(await asOther.query(api.subjects.get, { subjectId })).toBeNull();
  });
});
