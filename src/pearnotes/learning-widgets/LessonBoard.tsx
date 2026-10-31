/**
 * LessonBoard — the presentational lesson-canvas board. Renders every
 * activity a lesson carries through the right widget, plus consented
 * ghost-practice proposals. Pure props in — Engineer 2 mounts
 * `LiveLessonBoard` (the hooked twin) inside the lesson canvas.
 *
 * Honesty rules baked in:
 *   - zero activities → "the lesson's practice is still being built"
 *     (the materializer abstained — not a crash, not fake content)
 *   - proposed practice → ghost card with explicit Accept / Not now
 *   - accepted practice → materializes as another challenge card
 *   - rejected → stays rejected, terminal
 */
import { useState } from "react";
import type {
  LearningWidgetPort,
  PracticeProposal,
  SourceRef,
  WidgetActivitySpec,
} from "./types";
import type { RuntimeLesson } from "./runtime";
import { ChallengeCard } from "./ChallengeCard";
import { LessonCardWidget } from "./LessonCardWidget";
import { SourceViewerWidget } from "./SourceViewerWidget";
import { TeachBackWidget } from "./TeachBackWidget";

export interface LessonBoardProps {
  lesson: RuntimeLesson;
  port: LearningWidgetPort;
  practice?: PracticeProposal[];
  fixtureLabel?: string;
  onReviewPractice?(proposalId: string, action: "accept" | "reject"): Promise<unknown>;
}

function ActivityWidget({
  lesson,
  activityId,
  spec,
  revision,
  activityObjectiveIds,
  sourceRefs,
  port,
  fixtureLabel,
  onOpenSource,
}: {
  lesson: RuntimeLesson;
  activityId: string;
  spec: WidgetActivitySpec;
  revision: number;
  activityObjectiveIds?: string[];
  sourceRefs?: SourceRef[];
  port: LearningWidgetPort;
  fixtureLabel?: string;
  onOpenSource?(ref: SourceRef): void;
}) {
  const envelope = {
    lessonId: lesson.lessonId,
    activityId,
    activityRevision: revision,
    objectiveIds: activityObjectiveIds ?? lesson.objectiveIds,
    sourceRefs: sourceRefs ?? [],
  };
  switch (spec.kind) {
    case "lessonCard":
      return (
        <LessonCardWidget
          envelope={envelope}
          spec={spec}
          port={port}
          fixtureLabel={fixtureLabel}
          onOpenSource={onOpenSource}
        />
      );
    case "teachBack":
      return (
        <TeachBackWidget
          envelope={envelope}
          spec={spec}
          port={port}
          fixtureLabel={fixtureLabel}
          onOpenSource={onOpenSource}
        />
      );
    case "classify":
    case "multipleChoice":
    case "shortAnswer":
      return (
        <ChallengeCard
          envelope={envelope}
          spec={spec}
          port={port}
          fixtureLabel={fixtureLabel}
          onOpenSource={onOpenSource}
        />
      );
    default:
      return null;
  }
}

function PracticeGhostCard({
  proposal,
  busy,
  onReview,
}: {
  proposal: PracticeProposal;
  busy: boolean;
  onReview(action: "accept" | "reject"): void;
}) {
  if (proposal.state === "rejected") {
    return (
      <div className="pnlw pnlw-ghost pnlw-ghost-rejected" role="status">
        <span className="pn-kicker">practice ghost · declined</span>
        <p className="pnlw-ghost-rationale">{proposal.rationale}</p>
        <p className="pnlw-ghost-note">staying declined — it won't re-ask.</p>
      </div>
    );
  }
  if (proposal.state === "accepted") {
    return (
      <div className="pnlw pnlw-ghost pnlw-ghost-accepted" role="status">
        <span className="pn-kicker">practice ghost · accepted</span>
        <p className="pnlw-ghost-rationale">{proposal.rationale}</p>
        <p className="pnlw-ghost-note">the new practice card is on the board.</p>
      </div>
    );
  }
  return (
    <div className="pnlw pnlw-ghost" role="group" aria-label="suggested extra practice">
      <span className="pnlw-tape">practice ghost</span>
      <span className="pn-kicker">suggested practice · optional</span>
      <p className="pnlw-ghost-rationale">{proposal.rationale}</p>
      <div className="pnlw-ghost-actions">
        <button
          type="button"
          className="pnlw-btn pnlw-btn-go"
          disabled={busy}
          onClick={() => onReview("accept")}
        >
          yes, add it
        </button>
        <button
          type="button"
          className="pnlw-btn pnlw-btn-quiet"
          disabled={busy}
          onClick={() => onReview("reject")}
        >
          not now
        </button>
      </div>
    </div>
  );
}

export function LessonBoard({
  lesson,
  port,
  practice,
  fixtureLabel,
  onReviewPractice,
}: LessonBoardProps) {
  const [openRef, setOpenRef] = useState<SourceRef | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const review = async (proposalId: string, action: "accept" | "reject") => {
    if (!onReviewPractice) return;
    setReviewing(proposalId);
    try {
      await onReviewPractice(proposalId, action);
    } finally {
      setReviewing(null);
    }
  };

  const proposed = (practice ?? []).filter((p) => p.state === "proposed");
  const decided = (practice ?? []).filter((p) => p.state !== "proposed");
  // NOTE: accepted proposals materialize as REAL activity rows — in live
  // mode they arrive through the reactive getLesson read, in fixture mode
  // the port appends them to its own lesson copy. Never render the ghost
  // spec directly: submissions need a real activityId.

  return (
    <div className="pnlwb">
      {lesson.title && <h2 className="pnlwb-title">{lesson.title}</h2>}

      {lesson.activities.length === 0 ? (
        <div className="pnlw pnlw-pending" role="status">
          <span className="pn-kicker">lesson · building</span>
          <strong>practice is still being sketched for this lesson</strong>
          <p>
            the backend couldn't yet verify enough source material to score an
            activity — nothing is invented in the meantime.
          </p>
        </div>
      ) : (
        <div className="pnlwb-grid">
          {lesson.activities.map((a) => (
            <ActivityWidget
              key={a.activityId}
              lesson={lesson}
              activityId={a.activityId}
              spec={a.spec}
              revision={a.revision}
              activityObjectiveIds={a.objectiveIds}
              sourceRefs={a.sourceRefs}
              port={port}
              fixtureLabel={fixtureLabel}
              onOpenSource={setOpenRef}
            />
          ))}
        </div>
      )}

      {(proposed.length > 0 || decided.length > 0) && (
        <div className="pnlwb-ghosts">
          {decided.map((p) => (
            <PracticeGhostCard key={p.proposalId} proposal={p} busy={false} onReview={() => {}} />
          ))}
          {proposed.map((p) => (
            <PracticeGhostCard
              key={p.proposalId}
              proposal={p}
              busy={reviewing === p.proposalId}
              onReview={(action) => void review(p.proposalId, action)}
            />
          ))}
        </div>
      )}

      {openRef && (
        <div className="pnlwb-source">
          <SourceViewerWidget
            sourceRef={openRef}
            port={port}
            fixtureLabel={fixtureLabel}
            onBack={() => setOpenRef(null)}
          />
        </div>
      )}
    </div>
  );
}
