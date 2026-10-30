"use node";
/**
 * Node-runtime PDF extraction action (Issue #36). Exports ONLY internal
 * actions — Convex Node-runtime modules may not host queries/mutations.
 *
 * Flow: jobDoc → private storage bytes (capped) → extractPdfSegments
 * (Engineer 1's frozen parser) → recordSegments (trusted internal mutation
 * in the default-runtime module). quoteStart/quoteEnd are deliberately NOT
 * persisted: they reference the parser's normalized pageText, which we do
 * not store — contract option (B), per PDF_EXTRACTION_CONTRACT.md.
 */
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
const internal = anyApi;
import { extractPdfSegments, PdfExtractionError } from "../src/pearnotes/pdf-extraction/index";
import type { Id } from "./_generated/dataModel";

const LIMITS = {
  maxBytes: 20 * 1024 * 1024, // generous over the ~3.7MB reference doc
  maxPages: 50,               // MVP cap per contract
  maxSegments: 200,           // Convex batch-write bound
  maxTextChars: 120_000,
};

export const extractAndStore = internalAction({
  args: { jobId: v.id("importJobs") },
  returns: v.object({
    ok: v.boolean(),
    detail: v.string(),
    segments: v.number(),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.runQuery(internal.ingestMeta.jobDoc, { jobId });
    if (job === null) return { ok: false, detail: "job not found", segments: 0, warnings: [] };
    if (job.mime !== "application/pdf") return { ok: false, detail: `not a pdf: ${job.mime}`, segments: 0, warnings: [] };

    const blob = await ctx.storage.get(job.storageId as Id<"_storage">);
    if (blob === null) return { ok: false, detail: "source blob missing", segments: 0, warnings: [] };
    const bytes = new Uint8Array(await blob.arrayBuffer());

    try {
      const res = await extractPdfSegments(bytes, LIMITS);
      if (res.segments.length === 0) {
        return { ok: false, detail: "no extractable text — likely scanned/image-only (no OCR)", segments: 0, warnings: res.warnings.map((w) => w.message) };
      }
      await ctx.runMutation(internal.learningImport.recordSegments, {
        sourceId: job.sourceId,
        segments: res.segments.map((s) => ({
          segmentNo: s.segmentNo,
          page: s.page,
          text: s.text,
          kind: s.kind,
        })),
      });
      const warningMsgs = res.warnings.map((w) => w.message).slice(0, 50);
      await ctx.runMutation(internal.learningImport.setJobState, {
        jobId, state: "extracting", extractionWarnings: warningMsgs,
      });
      return { ok: true, detail: res.truncated ? "extracted_truncated" : "extracted", segments: res.segments.length, warnings: warningMsgs };
    } catch (e) {
      if (e instanceof PdfExtractionError) {
        return { ok: false, detail: `PDF_EXTRACTION_${e.code.toUpperCase()}: ${e.message.slice(0, 200)}`, segments: 0, warnings: [] };
      }
      return { ok: false, detail: `PDF_EXTRACTION_UNKNOWN: ${String(e).slice(0, 200)}`, segments: 0, warnings: [] };
    }
  },
});
