import { useMemo } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ingestApi } from "./api";
import { createConvexWidgetPort } from "./convexWidgetPort";
import type {
  ActivityEnvelope,
  SourceRef,
  WidgetActivitySpec,
} from "../learning-widgets/types";
import {
  ChallengeCard,
  LessonCardWidget,
  TeachBackWidget,
} from "../learning-widgets";
import "./ingestion.css";

/* ------------------------------------------------------------------
 * LiveLessonScreen — real owner lesson, full-screen (Issue #46).
 *
 * `learningRuntime.getLesson({lessonId})` is owner-scoped: a guessed or
 * foreign id returns null → an honest "not found" card, never a fixture.
 * Attempts evaluate on the server only; ghost practice waits on explicit
 * learner consent via `reviewPractice`.
 * Mounted ONLY inside the Convex provider (live mode).
 * ------------------------------------------------------------------ */

type LessonId = Id<"lessons">;
type PracticeId = Id<"practiceProposals">;

function specSourceRefs(spec: unknown): SourceRef[] {
  const refs = (spec as { sourceRefs?: SourceRef[] })?.sourceRefs;
  return Array.isArray(refs) ? refs : [];
}

function ActivityView({
  lessonId,
  activity,
  objectiveIds,
}: {
  lessonId: string;
  activity: { _id: string; spec: WidgetActivitySpec; revision: number };
  objectiveIds: string[];
}) {
  const client = useConvex();
  const port = useMemo(() => createConvexWidgetPort(client), [client]);
  const envelope: ActivityEnvelope = {
    lessonId,
    activityId: activity._id,
    activityRevision: activity.revision,
    objectiveIds,
    sourceRefs: specSourceRefs(activity.spec),
  };
  const kind = activity.spec?.kind;

  if (kind === "lessonCard") {
    return <LessonCardWidget envelope={envelope} spec={activity.spec as never} port={port} />;
  }
  if (kind === "multipleChoice" || kind === "shortAnswer" || kind === "classify") {
    return <ChallengeCard envelope={envelope} spec={activity.spec as never} port={port} />;
  }
  if (kind === "teachBack") {
    return <TeachBackWidget envelope={envelope} spec={activity.spec as never} port={port} />;
  }
  return (
    <section className="pni-card">
      <p className="pni-hint">unsupported activity type: {String(kind)}</p>
    </section>
  );
}

function PracticeList({ lessonId }: { lessonId: LessonId }) {
  const proposals = useQuery(ingestApi.learningRuntime.listPractice, { lessonId });
  const review = useMutation(ingestApi.learningRuntime.reviewPractice);
  if (proposals === undefined || proposals.length === 0) return null;
  return (
    <section className="pni-card" aria-label="Ghost practice">
      <h3>suggested practice</h3>
      {proposals.map((p) => (
        <div key={p._id} className={`pni-practice is-${p.state}`}>
          <p className="pni-hint">{p.rationale}</p>
          {p.state === "proposed" ? (
            <div className="pni-actions">
              <button
                type="button"
                className="pni-mini"
                onClick={() => void review({ proposalId: p._id as PracticeId, action: "accept" })}
              >
                accept practice
              </button>
              <button
                type="button"
                className="pni-mini"
                onClick={() => void review({ proposalId: p._id as PracticeId, action: "reject" })}
              >
                dismiss
              </button>
            </div>
          ) : (
            <p className="pni-hint">{p.state === "accepted" ? "added to your lesson" : "dismissed"}</p>
          )}
        </div>
      ))}
    </section>
  );
}

export function LiveLessonScreen({
  lessonId,
  onBack,
}: {
  lessonId: string;
  onBack: () => void;
}) {
  const lesson = useQuery(ingestApi.learningRuntime.getLesson, {
    lessonId: lessonId as LessonId,
  });

  return (
    <div className="pni-lesson" role="main">
      <header className="pni-lesson-head">
        <button type="button" className="pn-icon-btn" onClick={onBack} aria-label="Back to path">
          ‹
        </button>
        <span className="pn-kicker">lesson</span>
        <h3 className="pni-title">{lesson?.title ?? "loading…"}</h3>
      </header>

      {lesson === undefined ? (
        <section className="pni-card" aria-busy="true">loading your lesson…</section>
      ) : lesson === null ? (
        <section className="pni-card" role="alert">
          <strong>lesson not found</strong>
          <p className="pni-hint">
            this lesson isn't visible to your account — it may belong to a
            different learner or not exist yet.
          </p>
        </section>
      ) : lesson.activities.length === 0 ? (
        <section className="pni-card">
          <strong>no graded activities yet</strong>
          <p className="pni-hint">
            this lesson exists but the trusted auto-materializer abstained —
            nothing is fabricated to fill it.
          </p>
        </section>
      ) : (
        <div className="pni-lesson-body">
          {lesson.activities.map((a) => (
            <ActivityView
              key={a._id}
              lessonId={lesson._id}
              activity={a as never}
              objectiveIds={lesson.objectiveIds}
            />
          ))}
        </div>
      )}

      {lesson && <PracticeList lessonId={lesson._id} />}
    </div>
  );
}
