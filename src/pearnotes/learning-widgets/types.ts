/**
 * Learning widgets — typed prop/adapter contracts (issue #25).
 *
 * Widgets render *validated* activity data passed in as props. They never
 * fetch learner data, never own permissions, never award XP and never claim
 * mastery — attempts are emitted as typed submissions through
 * `LearningWidgetPort.submitAttempt`, and only the backend may evaluate
 * them into `AttemptResult`s.
 *
 * Two contract extensions are PROPOSED here pending Engineer 4's
 * `convex/tables/learning.ts` adoption (documented in
 * docs/phase00/LEARNING_WIDGETS.md):
 *   1. `ClassificationSpec` — a `kind:"classify"` member of the activitySpec
 *      union. The engine's `ActionKind` already includes "classification".
 *   2. `{ kind:"classification", assignments }` — a member of the
 *      attemptResponse union for sort/classify submissions.
 * Until adopted, these kinds only ever appear in fixture data.
 */
import type {
  ActivitySpec,
  SourceSegmentId,
  Verdict,
} from "../learning-engine/types";

export type { Verdict };

/* --- proposed spec extension (fixture-only until backend adopts) ---------- */

export interface ClassificationBucket {
  id: string;
  label: string;
  /** Optional subtitle shown under the label ("walls + green bits"). */
  hint?: string;
}

export interface ClassificationItem {
  id: string;
  label: string;
  /** Small supporting line — e.g. "makes sugar in sunlight". */
  caption?: string;
}

/**
 * `kind:"classify"` — learner sorts every item into exactly one bucket.
 * The correct assignment is NEVER part of the spec the client receives;
 * evaluation is server-side (the fixture adapter keeps its own labelled key).
 */
export interface ClassificationSpec {
  kind: "classify";
  prompt: string;
  items: ClassificationItem[];
  buckets: ClassificationBucket[];
}

/** Full spec union the widgets accept: engine kinds + proposed classify. */
export type WidgetActivitySpec = ActivitySpec | ClassificationSpec;
export type WidgetActivityKind = WidgetActivitySpec["kind"];

/* --- shared widget envelope ------------------------------------------------ */

/** Mirrors convex `sourceRef` with plain-string ids at the UI boundary. */
export interface SourceRef {
  sourceId: string;
  segmentId?: SourceSegmentId;
  page?: number;
}

/** Identity + grounding data every assessed widget needs. */
export interface ActivityEnvelope {
  lessonId: string;
  activityId: string;
  /** Pinned revision the learner sees — submissions echo it back. */
  activityRevision: number;
  objectiveIds: string[];
  sourceRefs: SourceRef[];
}

/* --- attempt lifecycle ------------------------------------------------------ */

/**
 * Mirrors convex `attemptResponse` + the proposed classification member.
 * Widgets build these; they contain nothing a server should trust beyond
 * "what the learner did".
 */
export type AttemptResponsePayload =
  | { kind: "choice"; optionId: string }
  | { kind: "text"; text: string }
  | {
      kind: "classification";
      assignments: { itemId: string; bucketId: string }[];
    };

export interface AttemptSubmission extends ActivityEnvelope {
  response: AttemptResponsePayload;
}

/** One per-item mark — lets wrong-answer feedback point at the exact chip. */
export interface ClassificationMark {
  itemId: string;
  correct: boolean;
  /** Where it belonged, revealed only after evaluation. */
  expectedBucketId?: string;
}

/** Rubric coverage for teach-back (proposed optional evaluation field). */
export interface RubricMark {
  criterion: string;
  covered: boolean;
}

/**
 * What the backend hands back after evaluation. Optional fields stay
 * optional — graders that can't supply them simply omit them.
 */
export interface AttemptResult {
  attemptId: string;
  verdict: Verdict;
  score?: number;
  feedback?: string;
  /** Source-grounded explanation text + citations (after evaluation). */
  explanation?: string;
  explanationSourceRefs?: SourceRef[];
  marks?: ClassificationMark[];
  rubric?: RubricMark[];
  evaluatedAt: number;
}

export type SubmissionPhase =
  | "idle" // composing / editable
  | "submitting" // awaiting port
  | "evaluated" // result shown
  | "error"; // submission failed — retry keeps the answer

/* --- source segments --------------------------------------------------------- */

export type SourceSegmentKind = "paragraph" | "heading" | "caption" | "formula";

/** A literal excerpt the learner is authorized to read. Never invented. */
export interface SourceSegmentView {
  segmentId: SourceSegmentId;
  sourceId: string;
  page?: number;
  segmentNo?: number;
  kind?: SourceSegmentKind;
  text: string;
  sourceTitle?: string;
}

export type SegmentLoadResult =
  | { status: "ready"; segment: SourceSegmentView }
  | { status: "missing"; segmentId: SourceSegmentId }
  | { status: "forbidden"; segmentId: SourceSegmentId }
  | { status: "deleted"; segmentId: SourceSegmentId };

/* --- the port (adapter seam) -------------------------------------------------- */

export interface TutorRequest {
  activityId: string;
  lessonId: string;
  /** Verbatim text the learner highlighted, if any. */
  selectedText?: string;
  objectiveIds: string[];
}

/**
 * The ONLY channel between widgets and the outside world. The real adapter
 * (Engineer 2/4 integration PR) maps these onto Convex queries/mutations;
 * fixtures supply `createFixturePort` — clearly labelled, deterministic,
 * and never persisting anything.
 */
export interface LearningWidgetPort {
  /** Submit one attempt; resolves with the backend's evaluation. */
  submitAttempt(submission: AttemptSubmission): Promise<AttemptResult>;
  /** Fetch one authorized segment's literal text. */
  loadSegment(ref: SourceRef): Promise<SegmentLoadResult>;
  /** Optional tutor hand-off (highlight → ask). */
  onRequestTutor?(request: TutorRequest): void;
}

/** Common widget props. */
export interface LearningWidgetProps {
  envelope: ActivityEnvelope;
  port: LearningWidgetPort;
  /** Shown as a taped ribbon — required in the gallery, omitted in live. */
  fixtureLabel?: string;
  onOpenSource?(ref: SourceRef): void;
}
