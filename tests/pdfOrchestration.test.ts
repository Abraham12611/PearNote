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
import { makePdf } from "./helpers/pdf";

const api = anyApi;
const modules = import.meta.glob([
  "../convex/{learningAuth,learningImport,learningReview,ingestMeta,pdfExtractionNode,sources,subjects}.ts",
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
    await t.action(api.ingestMeta.runJob, { jobId }); // parks: awaiting_model
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
    await t.action(api.ingestMeta.runJob, { jobId });
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

  test("authorizeModelCall constrained to eligible awaiting_model PDF jobs", async () => {
    // text/plain job → not eligible
    const { asA, jobId: txtJob } = await seed("text/plain");
    await expect(asA.mutation(api.learningImport.authorizeModelCall, { jobId: txtJob }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // PDF job still extracting (not parked) → not eligible
    const { asA: asA2, jobId: pdfJob } = await seedPdfJobWithSegments();
    await expect(asA2.mutation(api.learningImport.authorizeModelCall, { jobId: pdfJob }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });

  test("sibling job with its own consent shares the bounded source budget", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId, sourceId } = await seedPdfJobWithSegments();
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const job2 = await t.run(async (ctx) =>
      ctx.db.insert("importJobs", {
        ownerId: (await ctx.db.get(jobId))!.ownerId, sourceId,
        idempotencyKey: "k2", state: "awaiting_model", modelAuthorized: true,
        createdAt: 1, updatedAt: 1,
      }));
    await t.action(api.ingestMeta.runJob, { jobId });
    const r = await t.action(api.ingestMeta.runJob, { jobId: job2 });
    expect(r.ok).toBe(true);                          // bounded: within cap
    expect(chatSpy).toHaveBeenCalledTimes(2);
    const j2 = await t.run(async (ctx) => ctx.db.get(job2));
    expect(j2?.paidCalls).toBe(1);
  });

  test("source cap: a 4th dispatch is refused even with consent", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId, sourceId } = await seedPdfJobWithSegments();
    // Simulate a source that already spent its 3-dispatch budget.
    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("importJobs", {
          ownerId: (await ctx.db.get(jobId))!.ownerId, sourceId,
          idempotencyKey: `spent-${i}`, state: "failed",
          modelAuthorized: true, modelClaimed: true, paidCalls: 1, consentCount: 1,
          createdAt: 1, updatedAt: 1,
        });
      }
    });
    await t.action(api.ingestMeta.runJob, { jobId }); // parks: awaiting_model
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toBe("model_not_claimed:source_cap");
    const j = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(j?.state).toBe("awaiting_model"); // denied run restores waiting state
    expect(chatSpy).not.toHaveBeenCalled();
  });

  test("failed job + fresh owner consent → one bounded retry dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    chatSpy.mockResolvedValueOnce({ ok: false, error: { kind: "invalid_json" }, diag: {
      topLevelKeys: ["choices"], choices: 1, finishReason: "stop", contentType: "chatcmpl",
      refusal: false, usage: null } } as never);
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r1 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r1.ok).toBe(false);                        // provider failed, paidCalls=1
    const failed = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(failed?.state).toBe("failed");
    // No new consent → refused cheaply, never reaches the provider.
    const r2 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r2.detail).toBe("already_failed");
    expect(chatSpy).toHaveBeenCalledTimes(1);
    // Explicit second consent → exactly one more bounded dispatch.
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r3 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r3.ok).toBe(true);
    expect(chatSpy).toHaveBeenCalledTimes(2);
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.paidCalls).toBe(2);
    expect(job?.consentCount).toBe(2);
    expect(job?.modelClaimed).toBe(true);             // never cleared
    expect(job?.state).toBe("needs_review");
  });

  test("malformed proposal records sanitized parse diagnostics, never raw text", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    chatSpy.mockResolvedValueOnce({ ok: true, text: "the cells have walls", usage: null, ms: 5,
      model: "mock", provider: "mock",
      diag: { topLevelKeys: [], choices: 1, finishReason: "stop", contentType: "chatcmpl",
        refusal: false, usage: { prompt_tokens: 11, completion_tokens: 7, reasoning_tokens: 0 } } } as never);
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toMatch(/INVALID_MODEL_OUTPUT/);
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.error).toMatch(/stage=json/);
    expect(job?.error).toMatch(/len=\d+/);
    expect(job?.error).toMatch(/finish=stop/);
    expect(job?.error).not.toContain("the cells have walls"); // no raw output
  });

  test("parallel runJob calls → exactly one paid dispatch (atomic claim)", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const results = await Promise.all([
      t.action(api.ingestMeta.runJob, { jobId }),
      t.action(api.ingestMeta.runJob, { jobId }),
    ]);
    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.ok).length).toBeGreaterThanOrEqual(1);
  });

  test("real Node-action orchestration: pdf bytes → segments → gate → dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const t = convexTest(schema, modules);
    const aId = await t.run(async (ctx) => ctx.db.insert("users", { name: "ada" }));
    const asA = t.withIdentity({ subject: `${aId}|s` });
    const pdfBytes = makePdf([["the membrane surrounds every cell."]]);
    const { jobId, sourceId } = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob([pdfBytes]));
      const sourceId = await ctx.db.insert("sources", {
        ownerId: aId, storageId, title: "cells.pdf", mime: "application/pdf",
        sizeBytes: pdfBytes.length, sha256: "0".repeat(64), status: "indexed", createdAt: 1, updatedAt: 1,
      });
      const jobId = await ctx.db.insert("importJobs", {
        ownerId: aId, sourceId, idempotencyKey: "k", state: "extracting", createdAt: 1, updatedAt: 1,
      });
      return { jobId, sourceId };
    });
    // Real Node action: no pre-seeded segments — extraction must run.
    const r1 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r1.detail).toBe("awaiting_model");
    const segs = await t.run(async (ctx) =>
      ctx.db.query("sourceSegments").withIndex("by_source_number", (q) => q.eq("sourceId", sourceId)).collect());
    expect(segs.length).toBeGreaterThan(0);
    expect(segs[0].page).toBe(1);
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    const r2 = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r2.ok).toBe(true);
    expect(chatSpy).toHaveBeenCalledTimes(1);
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.state).toBe("needs_review");
  });

  test("model-facing payload is valid JSON within bounds; losing claim preserves state", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    await t.action(api.ingestMeta.runJob, { jobId });
    const call = chatSpy.mock.calls[0][0] as { user: string };
    const segsJson = call.user.split("SEGMENTS (JSON):")[1];
    const parsed = JSON.parse(segsJson);        // MUST parse — never truncated
    expect(Array.isArray(parsed)).toBe(true);
    expect(segsJson.length).toBeLessThanOrEqual(100_000);
    // Losing claimer does not clobber winner's lifecycle state.
    await t.run(async (ctx) => ctx.db.patch(jobId, { state: "classifying", modelClaimed: true }));
    await t.action(api.ingestMeta.runJob, { jobId });
    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.state).toBe("classifying"); // unchanged, not reset to awaiting_model
  });

  test("classifying state blocks concurrent double-dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId } = await seedPdfJobWithSegments();
    await t.action(api.ingestMeta.runJob, { jobId }); // parks: awaiting_model
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    await t.run(async (ctx) => ctx.db.patch(jobId, { state: "classifying" }));
    const r = await t.action(api.ingestMeta.runJob, { jobId });
    expect(r.detail).toBe("already_classifying");
    expect(chatSpy).not.toHaveBeenCalled();
  });
});
