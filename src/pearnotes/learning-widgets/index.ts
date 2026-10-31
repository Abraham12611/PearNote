/**
 * Learning widgets (issue #25) — typed, spec-driven assessed widgets for
 * the lesson canvas. All data arrives via props; all attempts leave via
 * `LearningWidgetPort.submitAttempt`. No XP, no mastery, no persistence.
 */
import "../styles/learning-widgets.css";
import "../styles/learning-board.css";

export type {
  ActivityEnvelope,
  AttemptResponsePayload,
  AttemptResult,
  AttemptSubmission,
  ClassificationBucket,
  ClassificationItem,
  ClassificationMark,
  ClassificationSpec,
  LearningWidgetPort,
  LearningWidgetProps,
  RubricMark,
  SegmentLoadResult,
  SourceRef,
  SourceSegmentKind,
  SourceSegmentView,
  SubmissionPhase,
  PracticeProposal,
  PracticeReviewAction,
  PracticeReviewResult,
  TutorRequest,
  WidgetActivityKind,
  WidgetActivitySpec,
} from "./types";

export {
  allPlaced,
  assignItem,
  buildClassificationResponse,
  unassignItem,
  validateWidgetSpec,
  verdictFromScore,
  type Assignments,
  type FixtureSolution,
  type SpecValidationError,
} from "./logic";

export { LessonCardWidget, type LessonCardWidgetProps } from "./LessonCardWidget";
export { SourceViewerWidget, type SourceViewerWidgetProps } from "./SourceViewerWidget";
export { ChallengeCard, type ChallengeCardProps } from "./ChallengeCard";
export { ClassificationChallenge, type ClassificationChallengeProps } from "./ClassificationChallenge";
export { TeachBackWidget, type TeachBackWidgetProps } from "./TeachBackWidget";

export {
  createRuntimePort,
  defaultAttemptKey,
  runtimeErrorMessage,
  useLearningRuntime,
  type LessonStatus,
  type RuntimeActivity,
  type RuntimeDeps,
  type RuntimeLesson,
  type RuntimeSubmitResponse,
} from "./runtime";
export { LessonBoard, type LessonBoardProps } from "./LessonBoard";
export { LiveLessonBoard } from "./LiveLessonBoard";

export {
  createFixturePort,
  createFixtureRuntime,
  type FixtureRuntime,
  FIXTURE_CLASSIFY_SOLUTION,
  FIXTURE_CLASSIFY_SPEC,
  FIXTURE_ENVELOPES,
  FIXTURE_LESSON_CARD_SPEC,
  FIXTURE_MC_SPEC,
  FIXTURE_OBJECTIVES,
  FIXTURE_SEGMENTS,
  FIXTURE_SOURCE_REFS,
  FIXTURE_TEACHBACK_KEYWORDS,
  FIXTURE_TEACHBACK_SPEC,
  WIDGET_FIXTURE_LABEL,
} from "./fixtures";
