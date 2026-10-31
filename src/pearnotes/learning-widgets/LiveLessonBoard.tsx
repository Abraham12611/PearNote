/**
 * LiveLessonBoard — the mounted twin of LessonBoard. Engineer 2 drops this
 * inside the lesson canvas children slot:
 *
 *   <LessonShell …>{canvas}
 *     <LiveLessonBoard lessonId={route.lessonId} />
 *   </LessonShell>
 *
 * It owns all live reads (`getLesson`, `listPractice`) and supplies the
 * Convex-backed `LearningWidgetPort` — the board itself stays pure props.
 */
import { useLearningRuntime } from "./runtime";
import { LessonBoard } from "./LessonBoard";

export function LiveLessonBoard({ lessonId }: { lessonId: string }) {
  const rt = useLearningRuntime(lessonId);

  if (rt.status === "loading") {
    return (
      <div className="pnlw pnlw-pending" role="status" aria-label="loading lesson">
        <span className="pn-kicker">lesson · loading</span>
        <div className="pnlw-source-loading">
          <span className="pnlw-sketch" />
          <span className="pnlw-sketch pnlw-sketch-short" />
        </div>
      </div>
    );
  }

  if (rt.status === "unavailable" || rt.lesson === null || rt.port === null) {
    return (
      <div className="pnlw pnlw-pending" role="status">
        <span className="pn-kicker">lesson · unavailable</span>
        <strong>this lesson isn't on your shelf</strong>
        <p>
          it may belong to another learner, have been removed, or never existed.
          no lesson content is shown rather than a guessed one.
        </p>
      </div>
    );
  }

  return (
    <LessonBoard
      lesson={rt.lesson}
      port={rt.port}
      practice={rt.practice}
      onReviewPractice={rt.reviewPractice}
    />
  );
}
