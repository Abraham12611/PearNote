/**
 * Issue #36 — ingestion orchestration tests with a MOCKED model provider
 * (no real Muse calls). Proves the PDF cost gate cannot be bypassed by
 * stored segments, per-job authorization is required, and concurrent/
 * repeated runs cannot double-dispatch a paid call.
 */
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";
import { _deps } from "../convex/ingestMeta";

const api = anyApi;
const modules = import.meta.glob([
  "../convex/{learningAuth,learningImport,learningReview,ingestMeta,sources,subjects}.ts",
  "../convex/_generated/api.js",
]);

type T = ReturnType<typeof convexTest>;



async function seed(mime: string) {
  const t = convexTest(schema, modules);
  const [aId, bId] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { name: "ada" }),
    await ctx.db.insert("users", { name: "bea" }),
  ]);
  const asA = t.withIdentity({ subject: `${aId}|s` });
  const asB = t.withIdentity({ subject: `${bId}|s` });
  const { jobId, sourceId } = await t.run(async (ctx) => {
    const sourceId = await ctx.db.insert("sources", {
      ownerId: aId, storageId: await ctx.storage.store(new Blob(["x"])),
      title: "doc.pdf", mime, sizeBytes: 5, sha256: "0".repeat(64),
      status: "indexed", createdAt: 1, updatedAt: 1,
    });
    const jobId = await ctx.db.insert("importJobs", {
      ownerId: aId, sourceId, idempotencyKey: "k", state: "extracting", createdAt: 1, updatedAt: 1,
    });
    return { jobId, sourceId };
  });
  return { t, aId, bId, asA, asB, jobId, sourceId };
}

async function seedPdfJobWithSegments() {
  const base = await seed("application/pdf");
  await base.t.mutation(api.learningImport.recordSegments, {
    sourceId: base.sourceId,
    segments: [{ segmentNo: 1, page: 1, text: "the membrane surrounds every cell" }],
  });
  return base;
}

let chatSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  chatSpy = vi.fn(async (opts: { user: string }) => {
    // Cite the REAL segment ids handed to the model — a canned "s1" would
    // correctly fail checkCitations.
    const segs = JSON.parse(opts.user.split("SEGMENTS (JSON):")[1]) as { id: string }[];
    const id = segs[0].id;
    const text = JSON.stringify({
      suggestedSubjects: [{ name: "Bio", confidence: "high", segmentIds: [id] }],
      concepts: [{ label: "Membrane", sourceSegmentIds: [id],
        evidence: [{ segmentId: id, quote: "the membrane surrounds every cell" }] }],
      warnings: [],
    });
    return { ok: true as const, text, usage: null, ms: 42, model: "mock", provider: "mock" };
  });
  _deps.chat = chatSpy as unknown as typeof _deps.chat;
  delete process.env.PDF_MODEL_AUTHORIZED;
});
afterEach(() => { vi.restoreAllMocks(); delete process.env.PDF_MODEL_AUTHORIZED; });

describe("PDF cost gate — cannot be bypassed", () => {
  test("pdf job WITH stored segments still parks when flag+consent missing", async () => {
    const { t, jobId } = await seedPdfJobWithSegments();
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toBe("awaiting_model");
    expect(chatSpy).not.toHaveBeenCalled();           // NO paid call
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.state).toBe("awaiting_model");
  });

  test("deployment flag alone is insufficient — per-job consent required", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, jobId } = await seedPdfJobWithSegments();
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toBe("awaiting_model");
    expect(chatSpy).not.toHaveBeenCalled();
  });

  test("flag + per-job authorizeModelCall → exactly one model dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.ok).toBe(true);
    expect(chatSpy).toHaveBeenCalledTimes(1);
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.state).toBe("needs_review");
  });

  test("retry of a completed job never re-dispatches", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    await t.action(api.ingestMeta.runJob, { jobId });
    const r2 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r2.detail).toMatch(/^already_/);
    expect(chatSpy).toHaveBeenCalledTimes(1);         // still exactly once
  });

  test("authorizeModelCall is owner-scoped — B cannot enable A's job", async () => {
    const { asB, jobId } = await seedPdfJobWithSegments();
    await expect(asB.mutation(api.learningImport.authorizeModelCall, { jobId }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
});

describe("orchestration integrity", () => {
  test("recordSegments is idempotent — second call inserts nothing", async () => {
    const { t, sourceId } = await seedPdfJobWithSegments();
    const ids = await t.mutation(api.learningImport.recordSegments, {
      sourceId, segments: [{ segmentNo: 9, text: "duplicate attempt" }],
    });
    expect(ids).toEqual([]);
    const rows = await t.run(async (ctx) =>
      ctx.db.query("sourceSegments").withIndex("by_source_number", (q) => q.eq("sourceId", sourceId)).collect());
    expect(rows).toHaveLength(1);
  });

  test("text/plain path unaffected — non-PDF jobs are not gated", async () => {
    const { t, sourceId, jobId } = await seed("text/plain");
    await t.mutation(api.learningImport.recordSegments, {
      sourceId, segments: [{ segmentNo: 1, text: "the membrane surrounds every cell" }],
    });
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.ok).toBe(true);
    expect(chatSpy).toHaveBeenCalledTimes(1);         // no gate for text/plain
  });

  test("classifying state blocks concurrent double-dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    await t.run(async (ctx) => ctx.db.patch(jobId, { state: "classifying" }));
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toBe("already_classifying");
    expect(chatSpy).not.toHaveBeenCalled();
  });
});
