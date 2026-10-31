import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

const api = anyApi;
const modules = import.meta.glob(["../convex/{learningAuth,learningRuntime}.ts", "../convex/_generated/api.js"]);

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
        activityId, activityRevision: 1, response: { kind: "choice", optionId: "b" },
      });
      expect(r.verdict).toBe("incorrect");
    }
    const m = await t.run(async (ctx) => ctx.db.query("mastery").collect());
    expect(m).toHaveLength(1);
    expect(m[0].state).toBe("learning");
    expect(m[0].evidence).toHaveLength(2);
    const correct = await asA.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, response: { kind: "choice", optionId: "a" },
    });
    expect(correct.verdict).toBe("correct");
  });
  test("B cannot read A's lesson or submit on A's activity (guessed ids)", async () => {
    const { asB, activityId, lessonId } = await seed();
    expect(await asB.query(api.learningRuntime.getLesson, { lessonId })).toBeNull();
    await expect(asB.mutation(api.learningRuntime.submitAttempt, {
      activityId, activityRevision: 1, response: { kind: "choice", optionId: "a" },
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
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
