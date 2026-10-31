import type { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  AttemptResult,
  AttemptSubmission,
  LearningWidgetPort,
  SegmentLoadResult,
  SourceRef,
} from "../learning-widgets/types";
import { convexErrorCode } from "./api";

/* ------------------------------------------------------------------
 * convexWidgetPort — the REAL `LearningWidgetPort` (Issue #46).
 *
 * Widgets never fetch/persist themselves; every channel runs through
 * the live Convex client here:
 *
 *   submitAttempt → learningRuntime.submitAttempt  (server-evaluated)
 *   loadSegment   → sources.getSegment             (owner-checked)
 *
 * Attempt-key semantics: the backend dedupes by (user, activity, key)
 * and rejects a key reused with a DIFFERENT response. A deterministic
 * key derived from the response bytes gives exactly the intended
 * semantics — an identical retried submission replays safely, and the
 * NEXT distinct answer produces the NEXT distinct attempt.
 * ------------------------------------------------------------------ */

async function attemptKeyFor(submission: AttemptSubmission): Promise<string> {
  const raw = JSON.stringify({
    activityId: submission.activityId,
    response: submission.response,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function toAttemptResult(res: {
  attemptId: string;
  verdict: "correct" | "partial" | "incorrect" | "needs_review";
}): AttemptResult {
  return {
    attemptId: res.attemptId,
    verdict: res.verdict,
    evaluatedAt: Date.now(),
  };
}

export function createConvexWidgetPort(
  client: ConvexReactClient,
): LearningWidgetPort {
  return {
    async submitAttempt(submission) {
      const res = await client.mutation(api.learningRuntime.submitAttempt, {
        activityId: submission.activityId as Id<"activities">,
        activityRevision: submission.activityRevision,
        attemptKey: await attemptKeyFor(submission),
        response: submission.response,
      });
      return toAttemptResult(res);
    },

    async loadSegment(ref: SourceRef): Promise<SegmentLoadResult> {
      if (!ref.segmentId) {
        return { status: "missing", segmentId: "" };
      }
      try {
        const seg = await client.query(api.sources.getSegment, {
          segmentId: ref.segmentId as Id<"sourceSegments">,
        });
        if (seg === null) {
          /* not-owner and not-found are deliberately indistinguishable. */
          return { status: "forbidden", segmentId: ref.segmentId };
        }
        return {
          status: "ready",
          segment: {
            segmentId: seg._id,
            sourceId: seg.sourceId,
            page: seg.page,
            segmentNo: seg.segmentNo,
            kind: seg.kind,
            text: seg.text,
          },
        };
      } catch (e) {
        const { code } = convexErrorCode(e);
        if (code === "UNAUTHORIZED") {
          return { status: "forbidden", segmentId: ref.segmentId };
        }
        return { status: "missing", segmentId: ref.segmentId };
      }
    },
  };
}
