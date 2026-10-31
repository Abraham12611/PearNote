/**
 * Live runtime adapter (issue #46) — binds the widget contract to the real
 * backend: `learningRuntime.getLesson / submitAttempt / listPractice /
 * reviewPractice` and `sources.getSegment`.
 *
 * Split in two so the policy is unit-testable without React:
 *   - `createRuntimePort(deps)` — pure port factory (attemptKey stability,
 *     error mapping, shape mapping)
 *   - `useLearningRuntime(lessonId)` — the thin convex/react binding
 */
import { useConvex, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import type {
  AttemptResult,
  AttemptSubmission,
  LearningWidgetPort,
  PracticeProposal,
  PracticeReviewAction,
  PracticeReviewResult,
  SegmentLoadResult,
  SourceRef,
  WidgetActivitySpec,
} from "./types";

/* ==== dependency-injected seam (tests drive this, not React) ================= */

export interface RuntimeSubmitResponse {
  attemptId: string;
  verdict: "correct" | "partial" | "incorrect" | "needs_review";
  masteryUpdated: number;
}

export interface RuntimeDeps {
  submitAttempt(args: {
    activityId: string;
    activityRevision: number;
    attemptKey: string;
    response: AttemptSubmission["response"];
  }): Promise<RuntimeSubmitResponse>;
  /** `sources.getSegment` — null for missing/forbidden/deleted. */
  loadSegment(segmentId: string): Promise<{
    _id: string;
    sourceId: string;
    segmentNo?: number;
    page?: number;
    text: string;
    kind?: string;
  } | null>;
  listPractice(lessonId: string): Promise<
    {
      _id: string;
      state: "proposed" | "accepted" | "rejected";
      rationale: string;
      spec: WidgetActivitySpec;
      createdAt: number;
    }[]
  >;
  reviewPractice(
    proposalId: string,
    action: PracticeReviewAction,
  ): Promise<PracticeReviewResult>;
  /** Fresh id for a NEW distinct learner attempt (crypto.randomUUID). */
  newAttemptKey(): string;
}

export function defaultAttemptKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Convex errors carry {code,message} in `.data` — surface an honest message. */
export function runtimeErrorMessage(e: unknown): string {
  const data = (e as { data?: { code?: string; message?: string } })?.data;
  if (data?.code === "CONFLICT")
    return data.message === "attemptKey reused with a different response"
      ? "that retry raced itself — reload and submit once."
      : "this activity was updated — reload to continue.";
  if (data?.code === "UNAUTHORIZED") return "this activity isn't yours to answer.";
  if (data?.code === "INVALID_INPUT") return "the activity couldn't be found.";
  return "the connection dropped mid-submit — your answer is kept.";
}

/**
 * Port with stable attemptKeys: the SAME learner response retries under the
 * SAME key (server dedupe returns the original attempt); a CHANGED response
 * mints a NEW key — the two are never conflated.
 */
export function createRuntimePort(deps: RuntimeDeps): LearningWidgetPort {
  const keys = new Map<string, { key: string; responseJson: string }>();
  return {
    async submitAttempt(submission) {
      const responseJson = JSON.stringify(submission.response);
      const prev = keys.get(submission.activityId);
      const attemptKey =
        prev && prev.responseJson === responseJson ? prev.key : deps.newAttemptKey();
      keys.set(submission.activityId, { key: attemptKey, responseJson });
      const res = await deps.submitAttempt({
        activityId: submission.activityId,
        activityRevision: submission.activityRevision,
        attemptKey,
        response: submission.response,
      });
      const result: AttemptResult = {
        attemptId: res.attemptId,
        verdict: res.verdict,
        masteryUpdated: res.masteryUpdated,
        evaluatedAt: Date.now(),
      };
      return result;
    },
    async loadSegment(ref: SourceRef): Promise<SegmentLoadResult> {
      if (!ref.segmentId) return { status: "missing", segmentId: "" };
      const seg = await deps.loadSegment(ref.segmentId);
      if (seg === null) return { status: "missing", segmentId: ref.segmentId };
      return {
        status: "ready",
        segment: {
          segmentId: seg._id,
          sourceId: seg.sourceId,
          segmentNo: seg.segmentNo,
          page: seg.page ?? ref.page,
          kind: seg.kind as "paragraph" | "heading" | "caption" | "formula" | undefined,
          text: seg.text,
        },
      };
    },
    listPractice: async (lessonId) => {
      const rows = await deps.listPractice(lessonId);
      return rows.map(
        (r): PracticeProposal => ({
          proposalId: r._id,
          state: r.state,
          rationale: r.rationale,
          spec: r.spec,
          createdAt: r.createdAt,
        }),
      );
    },
    reviewPractice: (proposalId, action) => deps.reviewPractice(proposalId, action),
  };
}

/* ==== convex/react binding =================================================== */

export interface RuntimeActivity {
  activityId: string;
  spec: WidgetActivitySpec;
  revision: number;
  /**
   * Activity-level grounding — populated only once `getLesson` returns it
   * (backend extension requested; see docs/phase00/WIDGET_RUNTIME.md).
   */
  objectiveIds?: string[];
  sourceRefs?: SourceRef[];
}

export interface RuntimeLesson {
  lessonId: string;
  title?: string;
  objectiveIds: string[];
  activities: RuntimeActivity[];
}

export type LessonStatus =
  | "loading" // first read in flight
  | "ready" // lesson resolved (may have zero activities — honest pending)
  | "unavailable"; // null: not yours, deleted, or never existed

export interface LearningRuntime {
  status: LessonStatus;
  lesson: RuntimeLesson | null;
  port: LearningWidgetPort | null;
  /** Live proposals — reactive; submit triggers re-render when one lands. */
  practice: PracticeProposal[] | undefined;
  reviewPractice(proposalId: string, action: PracticeReviewAction): Promise<PracticeReviewResult>;
}

/**
 * `useLearningRuntime(lessonId)` — everything a mounted lesson board needs.
 * `null` lessonId renders nothing (caller gates mounting on a real id).
 */
export function useLearningRuntime(lessonId: string | null): LearningRuntime {
  const client = useConvex();
  const lesson = useQuery(
    api.learningRuntime.getLesson,
    lessonId ? { lessonId: lessonId as never } : "skip",
  );
  const practice = useQuery(
    api.learningRuntime.listPractice,
    lessonId ? { lessonId: lessonId as never } : "skip",
  );
  const submit = useMutation(api.learningRuntime.submitAttempt);
  const review = useMutation(api.learningRuntime.reviewPractice);
  const portRef = useRef<LearningWidgetPort | null>(null);

  const port = useMemo(() => {
    const p = createRuntimePort({
      submitAttempt: (args) =>
        submit({
          activityId: args.activityId as never,
          activityRevision: args.activityRevision,
          attemptKey: args.attemptKey,
          response: args.response as never,
        }) as Promise<RuntimeSubmitResponse>,
      loadSegment: (segmentId) =>
        client.query(api.sources.getSegment, { segmentId: segmentId as never }) as Promise<never>,
      listPractice: (id) =>
        client.query(api.learningRuntime.listPractice, { lessonId: id as never }) as Promise<never>,
      reviewPractice: (proposalId, action) =>
        review({ proposalId: proposalId as never, action }) as Promise<PracticeReviewResult>,
      newAttemptKey: defaultAttemptKey,
    });
    portRef.current = p;
    return p;
  }, [client, submit, review]);

  const reviewPractice = useCallback(
    (proposalId: string, action: PracticeReviewAction) =>
      review({ proposalId: proposalId as never, action }) as Promise<PracticeReviewResult>,
    [review],
  );

  const proposals = practice?.map(
    (r): PracticeProposal => ({
      proposalId: r._id as string,
      state: r.state,
      rationale: r.rationale,
      spec: r.spec as WidgetActivitySpec,
      createdAt: r.createdAt,
    }),
  );

  if (!lessonId) return { status: "loading", lesson: null, port: null, practice: proposals, reviewPractice };
  if (lesson === undefined) return { status: "loading", lesson: null, port: null, practice: proposals, reviewPractice };
  if (lesson === null) return { status: "unavailable", lesson: null, port: null, practice: proposals, reviewPractice };
  return {
    status: "ready",
    lesson: {
      lessonId: lesson._id as string,
      title: lesson.title,
      objectiveIds: lesson.objectiveIds.map(String),
      activities: lesson.activities.map((a) => ({
        activityId: a._id as string,
        spec: a.spec as WidgetActivitySpec,
        revision: a.revision,
        objectiveIds: (a as { objectiveIds?: unknown[] }).objectiveIds?.map(String),
        sourceRefs: (a as { sourceRefs?: SourceRef[] }).sourceRefs,
      })),
    },
    port,
    practice: proposals,
    reviewPractice,
  };
}
