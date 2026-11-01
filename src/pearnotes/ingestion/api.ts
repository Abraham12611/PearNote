import { api } from "../../../convex/_generated/api";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";

/* ------------------------------------------------------------------
 * Phase 01 ingestion contract (Issue #24) — the real authenticated
 * learner flow, mirroring the server validators in convex/sources.ts,
 * convex/learningImport.ts and convex/learningReview.ts. Everything
 * here is owner-scoped server-side; the UI only ever sees its own rows.
 * ------------------------------------------------------------------ */

export const ingestApi = api;

/* `api.curricula` isn't in the generated bindings yet (codegen is
   deployment-gated) — a typed FunctionReference keeps the reactive
   `useQuery` call honest without `anyApi`. */
export interface GetPathResult {
  subjectId: Id<"subjects">;
  versionId: Id<"curriculumVersions">;
  sections: {
    _id: Id<"sections">;
    title: string;
    units: {
      _id: Id<"units">;
      title: string;
      lessons: {
        _id: Id<"lessons">;
        title?: string;
        specVersion: number;
        objectiveIds: Id<"objectives">[];
        sourceRefs: { sourceId: Id<"sources">; segmentId?: Id<"sourceSegments"> }[];
        activityCount: number;
        /** Issue #53 — server-derived per-lesson progress. The ONLY state
         *  a client may render: `untracked` means the lesson has no
         *  objectives (progress unverifiable), the rest are verified
         *  mastery rollups from the caller's own rows. */
        progress: {
          tracked: boolean;
          state:
            | "untracked"
            | "not_started"
            | "learning"
            | "practicing"
            | "demonstrated";
          assessedObjectives: number;
          totalObjectives: number;
          evaluatedAttempts: number;
        };
      }[];
    }[];
  }[];
}

export const getPathRef = makeFunctionReference<
  "query",
  { subjectId: Id<"subjects"> },
  GetPathResult | null
>("curricula:getPath");

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
