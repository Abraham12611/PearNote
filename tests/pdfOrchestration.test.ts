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

  test("sibling job for same source cannot claim a second paid dispatch", async () => {
    process.env.PDF_MODEL_AUTHORIZED = "1";
    const { t, asA, jobId, sourceId } = await seedPdfJobWithSegments();
    await t.action(api.ingestMeta.runJob, { jobId });
    await asA.mutation(api.learningImport.authorizeModelCall, { jobId });
    // A SECOND job on the same source, fully authorized — still refused.
    const job2 = await t.run(async (ctx) =>
      ctx.db.insert("importJobs", {
        ownerId: (await ctx.db.get(jobId))!.ownerId, sourceId,
        idempotencyKey: "k2", state: "awaiting_model", modelAuthorized: true,
        createdAt: 1, updatedAt: 1,
      }));
    await t.action(api.ingestMeta.runJob, { jobId });
    const r = await t.action(api.ingestMeta.runJob, { jobId: job2 });
    expect(r.detail).toMatch(/^model_not_claimed|already_/);
    expect(chatSpy).toHaveBeenCalledTimes(1);
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
