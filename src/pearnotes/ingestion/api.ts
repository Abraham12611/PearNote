import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/* ------------------------------------------------------------------
 * Phase 01 ingestion contract (Issue #24) — the real authenticated
 * learner flow, mirroring the server validators in convex/sources.ts,
 * convex/learningImport.ts and convex/learningReview.ts. Everything
 * here is owner-scoped server-side; the UI only ever sees its own rows.
 * ------------------------------------------------------------------ */

export const ingestApi = api;

export type SourceId = Id<"sources">;
export type JobId = Id<"importJobs">;
export type SegmentId = Id<"sourceSegments">;
export type SubjectId = Id<"subjects">;

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_MIME = new Set(["application/pdf", "text/plain"]);

export const IMPORT_STATE_LABEL: Record<string, string> = {
  created: "queued",
  uploaded: "uploaded",
  extracting: "reading your document",
  classifying: "sketching a proposal",
  awaiting_model: "waiting for model authorization",
  needs_review: "ready for your review",
  building: "building your draft",
  accepted: "approved",
  ready: "ready",
  failed: "something went wrong",
  cancelled: "cancelled",
};

/** Convex errors carry { code, message } in `.data` — surface the code. */
export function convexErrorCode(e: unknown): { code?: string; message: string } {
  const data = (e as { data?: { code?: string; message?: string } })?.data;
  if (data && typeof data.message === "string") {
    return { code: data.code, message: data.message };
  }
  return { message: e instanceof Error ? e.message : String(e) };
}

/** Client-side SHA-256 → 64-hex, verified server-side against the blob. */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Browser shape of `api.learningImport.getProposal`'s `proposal` field. */
export interface ProposalView {
  suggestedSubjects: {
    name: string;
    confidence: "high" | "medium" | "low";
    segmentIds: SegmentId[];
    explanation?: string;
  }[];
  concepts: {
    label: string;
    summary?: string;
    sourceSegmentIds: SegmentId[];
    evidence: { segmentId: SegmentId; quote: string; page?: number }[];
  }[];
  draftCurriculum?: {
    sections: {
      title: string;
      units: {
        title: string;
        lessons: {
          title: string;
          objectives: string[];
          sourceSegmentIds: SegmentId[];
          evidence: { segmentId: SegmentId; quote: string; page?: number }[];
        }[];
      }[];
    }[];
  };
  warnings: string[];
}
