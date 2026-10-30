/**
 * Issue #33 — review/approval security tests. Approval is the ONLY path to
 * materialization; it must verify ownership, segment refs and revision, be
 * idempotent on retry, and never auto-publish (everything stays draft).
 */
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import type { Doc, Id } from "../convex/_generated/dataModel";

const api = anyApi;
const modules = import.meta.glob([
  "../convex/{learningAuth,learningImport,learningReview,subjects,sources}.ts",
  "../convex/_generated/api.js",
]);

type T = ReturnType<typeof convexTest>;
type Segs = { s1: Id<"sourceSegments">; s2: Id<"sourceSegments"> };

async function seed(opts: { withBoundary?: boolean } = {}) {
  const t = convexTest(schema, modules);
  const [aId, bId] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { name: "ada" }),
    await ctx.db.insert("users", { name: "bea" }),
  ]);
  const asA = t.withIdentity({ subject: `${aId}|s` });
  const asB = t.withIdentity({ subject: `${bId}|s` });
  const { jobId, segs } = await t.run(async (ctx) => {
    const sourceId = await ctx.db.insert("sources", {
      ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])), title: "notes.txt",
      mime: "text/plain", sizeBytes: 5, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
    });
    const s1 = await ctx.db.insert("sourceSegments", { sourceId, segmentNo: 1, page: 1, text: "cells are the unit of life", createdAt: 1 });
    const s2 = await ctx.db.insert("sourceSegments", { sourceId, segmentNo: 2, page: 10, text: "diffusion moves molecules", createdAt: 1 });
    const jobId = await ctx.db.insert("importJobs", {
      ownerId: aId, sourceId, idempotencyKey: "k", state: "needs_review", createdAt: 1, updatedAt: 1,
    });
    await ctx.db.insert("importProposals", {
      jobId, state: "pending",
      proposal: {
        suggestedSubjects: [
          { name: "Cell Biology", confidence: "high", segmentIds: [s1], explanation: "core topic" },
          { name: "Transport", confidence: "low", segmentIds: [s2] },
        ],
        concepts: [
          { label: "Diffusion", summary: "net movement down gradient", sourceSegmentIds: [s2],
            evidence: [{ segmentId: s2, quote: "diffusion moves molecules" }] },
          ...(opts.withBoundary ? [{
            label: "BoundaryConcept", summary: "spans both", sourceSegmentIds: [s1, s2],
            evidence: [{ segmentId: s1, quote: "cells are the unit of life" }, { segmentId: s2, quote: "diffusion moves molecules" }],
          }] : []),
        ],
        draftCurriculum: { sections: [{ title: "Cells", units: [{ title: "Structure", lessons: [
          { title: "Membranes", objectives: ["describe diffusion"], sourceSegmentIds: [s2],
            evidence: [{ segmentId: s2, quote: "diffusion moves molecules" }] },
          ...(opts.withBoundary ? [{
            title: "CrossSubject", objectives: ["cross ref"], sourceSegmentIds: [s1, s2],
            evidence: [{ segmentId: s1, quote: "cells are the unit of life" }],
          }] : [])] }] }] },
        warnings: [],
      },
      revision: 0, createdAt: 1, updatedAt: 1,
    });
    return { jobId, segs: { s1, s2 } };
  });
  return { t, aId, bId, asA, asB, jobId, segs };
}

describe("learningReview.review", () => {
  test("approve materializes subjects + draft curriculum, all private & draft", async () => {
    const { t, asA, jobId } = await seed();
    const r = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" });
    expect(r.subjectIds).toHaveLength(2);
    expect(r.curriculumVersionIds).toHaveLength(2);
    const [sub, ver, lessons] = await t.run(async (ctx) => [
      await ctx.db.get(r.subjectIds[0]) as Doc<"subjects"> | null,
      await ctx.db.get(r.curriculumVersionIds[0]) as Doc<"curriculumVersions"> | null,
      await ctx.db.query("lessons").collect() as Doc<"lessons">[],
    ]);
    expect(sub?.status).toBe("draft");           // never auto-published
    expect(ver?.state).toBe("draft");            // draft curriculum only
    expect(ver?.generatedFromJobId).toBe(String(jobId));
    expect(lessons.every((l) => l.canvasSpaceId === undefined)).toBe(true); // no fake canvas
    // Job + proposal terminal states
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.state).toBe("accepted");
  });

  test("repeat approve is idempotent — identical ids, no duplicates", async () => {
    const { t, asA, jobId } = await seed();
    const r1 = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" });
    const r2 = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" });
    expect(r2).toEqual(r1);
    const subs = await t.run(async (ctx) => ctx.db.query("subjects").collect());
    expect(subs).toHaveLength(2); // not 4
  });

  test("B cannot review A's job (guessed id → UNAUTHORIZED, not null leak)", async () => {
    const { asB, jobId } = await seed();
    await expect(asB.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    await expect(asB.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "reject" }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("anonymous review denied", async () => {
    const { t, jobId } = await seed();
    await expect(t.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  test("missing revision on non-terminal action → INVALID_INPUT", async () => {
    const { asA, jobId } = await seed();
    await expect(asA.mutation(api.learningReview.review, { jobId, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.learningReview.review, { jobId, action: "reject" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });
  test("discard-first + rename-second keeps original indices", async () => {
    const { t, asA, jobId } = await seed();
    const r = await asA.mutation(api.learningReview.review, {
      jobId, expectedProposalRevision: 0, action: "approve",
      edits: { discardSubjects: [0], renameSubjects: [{ index: 1, name: "Renamed Transport" }] },
    });
    const s0 = await t.run(async (ctx) => ctx.db.get(r.subjectIds[0]));
    expect(s0?.name).toBe("Renamed Transport");
  });
  test("ambiguous cross-subject items → NEEDS_REVIEW without consent; skipped with consent", async () => {
    const { t, asA, jobId } = await seed({ withBoundary: true });
    await expect(asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "NEEDS_REVIEW" } });
    const r = await asA.mutation(api.learningReview.review, {
      jobId, expectedProposalRevision: 0, action: "approve", edits: { acceptOmissions: true },
    });
    const [concepts, v0, v1] = await t.run(async (ctx) => [
      await ctx.db.query("concepts").collect() as Doc<"concepts">[],
      await ctx.db.get(r.curriculumVersionIds[0]) as Doc<"curriculumVersions"> | null,
      await ctx.db.get(r.curriculumVersionIds[1]) as Doc<"curriculumVersions"> | null,
    ]);
    // Diffusion concept cites s2 → must attach to the s2 subject, not both
    expect(concepts).toHaveLength(1); // BoundaryConcept skipped — no silent re-home
    expect(concepts[0].subjectId).toBe(r.subjectIds[1]);
    // Sections only under the version whose subject cites the lesson segments
    const secsUnder = async (v: Doc<"curriculumVersions"> | null) =>
      v === null ? 0 : (await t.run(async (ctx) =>
        ctx.db.query("sections").withIndex("by_version_order", (q) => q.eq("versionId", v._id)).collect())).length;
    expect(await secsUnder(v0)).toBe(0);  // s1 subject: no lesson fully cites s1
    expect(await secsUnder(v1)).toBe(1);  // s2 subject owns the strict-subset lesson
    const lessons = await t.run(async (ctx) => ctx.db.query("lessons").collect() as Doc<"lessons">[]);
    expect(lessons).toHaveLength(1);      // CrossSubject lesson dropped from BOTH
    expect(lessons[0].title).toBe("Membranes");
  });
  test("getProposal exposes revision; re-store bumps it and stale review conflicts", async () => {
    const { t, asA, jobId } = await seed();
    const row = await asA.query(api.learningImport.getProposal, { jobId });
    expect(row?.revision).toBe(0);
    // Real storage path: a second storeProposal on the pending row bumps revision.
    await t.mutation(api.learningImport.storeProposal, { jobId, proposal: row!.proposal });
    const row2 = await asA.query(api.learningImport.getProposal, { jobId });
    expect(row2?.revision).toBe(1);
    await expect(asA.mutation(api.learningReview.review, { jobId, action: "approve", expectedProposalRevision: 0 }))
      .rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await asA.mutation(api.learningReview.review, { jobId, action: "approve", expectedProposalRevision: 1 });
  });
  test("stale revision → CONFLICT", async () => {
    const { asA, jobId } = await seed();
    await expect(asA.mutation(api.learningReview.review, { jobId, action: "approve", expectedProposalRevision: 7 }))
      .rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await asA.mutation(api.learningReview.review, { jobId, action: "approve", expectedProposalRevision: 0 });
  });

  test("reject is terminal; approve-after-reject → CONFLICT; re-reject idempotent", async () => {
    const { asA, jobId } = await seed();
    const r = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "reject" });
    expect(r.state).toBe("rejected");
    await expect(asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "CONFLICT" } });
    const r2 = await asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "reject" });
    expect(r2.state).toBe("rejected");
  });

  test("edits whitelist: discard-all → INVALID; rename applies; attach to foreign subject → UNAUTHORIZED", async () => {
    const { t, aId, bId, asA, jobId } = await seed();
    await expect(asA.mutation(api.learningReview.review, {
      jobId, expectedProposalRevision: 0, action: "approve", edits: { discardSubjects: [0, 1] },
    })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // Attach to B's subject — ownership re-checked
    const bSub = await t.run(async (ctx) =>
      ctx.db.insert("subjects", { ownerId: bId, name: "b's", status: "manual_empty", createdAt: 1, updatedAt: 1 }));
    await expect(asA.mutation(api.learningReview.review, {
      jobId, expectedProposalRevision: 0, action: "approve", edits: { attachToSubjectId: bSub },
    })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    // Rename works
    const r = await asA.mutation(api.learningReview.review, {
      jobId, expectedProposalRevision: 0, action: "approve", edits: { renameSubjects: [{ index: 0, name: "My Bio" }], discardSubjects: [1], acceptOmissions: true },
    });
    const s0 = await t.run(async (ctx) => ctx.db.get(r.subjectIds[0]));
    expect(s0?.name).toBe("My Bio");
    void aId;
  });

  test("corrupted proposal segment ref is caught at approval", async () => {
    const { t, asA, jobId } = await seed();
    // Corrupt the stored proposal: swap a segment id for one from ANOTHER source.
    await t.run(async (ctx) => {
      const otherOwner = await ctx.db.insert("users", { name: "eve" });
      const otherSrc = await ctx.db.insert("sources", {
        ownerId: otherOwner, storageId: await ctx.storage.store(new Blob(["y"])),
        title: "x", mime: "text/plain", sizeBytes: 1, sha256: "1".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const evil = await ctx.db.insert("sourceSegments", { sourceId: otherSrc, segmentNo: 1, text: "foreign", createdAt: 1 });
      const prop = await ctx.db.query("importProposals").withIndex("by_job", (q) => q.eq("jobId", jobId)).first();
      const p = structuredClone(prop!.proposal);
      p.suggestedSubjects[0].segmentIds = [evil];
      await ctx.db.patch(prop!._id, { proposal: p });
    });
    await expect(asA.mutation(api.learningReview.review, { jobId, expectedProposalRevision: 0, action: "approve" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });
});
