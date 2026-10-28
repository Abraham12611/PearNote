/* ------------------------------------------------------------------
 * PearNotes UI contract types — Phase 00 prototypes.
 *
 * These are the prop shapes the feature-gated shell (Engineer 2,
 * src/pearnotes/shell) feeds the components in this folder. They mirror
 * the Blueprint's logical model (engineering/DATA_MODEL.md,
 * learning/CURRICULUM.md, learning/LESSON_RUNTIME.md) but stay plain
 * client-side types: no Convex imports, no persistence, no fake state
 * written anywhere.
 * ------------------------------------------------------------------ */

/** Lifecycle of a learner-owned subject (CURRICULUM.md + FLOWS.md). */
export type SubjectStatus =
  | "needs_material" /** manual subject created without sources yet */
  | "generating" /** an import/curriculum job is running */
  | "needs_review" /** a proposal waits on the learner's decision */
  | "ready" /** has a published learning path */
  | "failed"; /** the last job failed — the path reports the error */

/** Original avatar pack ids (design/ASSETS_BRANDING.md). `unknown` is the
 *  fallback for anything unclassified; `general` is the generic catch-all.
 *  These are *choices offered at creation time*, never seeded subjects. */
export type SubjectAvatarId =
  | "science"
  | "math"
  | "biology"
  | "physics"
  | "chemistry"
  | "medicine"
  | "pharmacy"
  | "computer-science"
  | "history"
  | "literature"
  | "languages"
  | "economics"
  | "art"
  | "engineering"
  | "general"
  | "unknown";

export const SUBJECT_AVATAR_IDS: readonly SubjectAvatarId[] = [
  "science",
  "math",
  "biology",
  "physics",
  "chemistry",
  "medicine",
  "pharmacy",
  "computer-science",
  "history",
  "literature",
  "languages",
  "economics",
  "art",
  "engineering",
  "general",
  "unknown",
] as const;

/** A learner's subject as the UI needs it. `id` is opaque — real records
 *  get Convex ids; fixtures use `fixture-*` names and must be rendered
 *  with a `fixtureLabel` visible. */
export interface PearSubject {
  id: string;
  name: string;
  avatar: SubjectAvatarId;
  /** signature hue — any CSS color. Worn by the disc, drawer header and
   *  path accents. Defaults live in tokens.css (`--pn-subject-*`). */
  color: string;
  status: SubjectStatus;
}

/** Per-lesson path node state (CURRICULUM.md §path drawer). `locked` is
 *  reserved — current product guidance favours open exploration; it
 *  renders distinctly if a future path ever emits it. */
export type PathNodeState =
  | "not_started"
  | "available"
  | "in_progress"
  | "practicing"
  | "demonstrated"
  | "needs_review"
  | "locked";

/** Structural node type on the path (JOURNEY_REDESIGN §state model).
 *  `lesson` is the default; `practice` is a skill-check drill; `checkpoint`
 *  is a unit milestone (quiz / wrap-up). */
export type PathNodeKind = "lesson" | "practice" | "checkpoint";

/** Friend activity attached to a single path node. All fields optional —
 *  a node with no social data renders nothing. Names are display labels
 *  used for the face pile initials in Phase 00 prototypes. */
export interface PathLessonSocial {
  /** "N studying now with you" */
  studyingNow?: number;
  /** "N friends completed this" */
  completed?: number;
  /** up-to-3 display names for the face pile */
  friends?: string[];
}

export interface PathLesson {
  id: string;
  title: string;
  state: PathNodeState;
  /** short objective statements, shown in the node preview */
  objectives: string[];
  activityCount: number;
  /** distinct sources backing this lesson — shown as a chip */
  sourceCount: number;
  /** structural kind — `lesson` when omitted */
  kind?: PathNodeKind;
  /** estimated minutes, shown as "· 5 min" metadata when present */
  durationMin?: number;
  /** friend activity for this node (JOURNEY_REDESIGN §social rules) */
  social?: PathLessonSocial;
  /** 0–1, only meaningful while `state === "in_progress"` */
  progress?: number;
  /** the path's recommended next node gets the lime "next" tag */
  recommended?: boolean;
  /** adaptive practice branch node (LESSON_RUNTIME §adaptive loop) */
  remedial?: boolean;
}

export interface PathUnit {
  id: string;
  title: string;
  lessons: PathLesson[];
}

export interface PathSection {
  id: string;
  title: string;
  /** optional band subtitle, e.g. "foundations" */
  theme?: string;
  units: PathUnit[];
}

/** Drawer-level states (SCREEN_SPECS S04 + FLOWS empty/error rules). */
export type LearningPathStatus =
  | "loading"
  | "generating"
  | "needs_material"
  | "needs_review"
  | "ready"
  | "error";

export interface LearningPath {
  subjectId: string;
  status: LearningPathStatus;
  sections: PathSection[];
  /** subject-level friend activity for the drawer header/footer */
  social?: {
    /** "N friends studied this" (header strip) */
    friendsStudied?: number;
    /** "N friends are learning {subject}" (expanded footer) */
    friendsLearning?: number;
    /** up-to-3 display names for the face pile */
    names?: string[];
  };
  /** operator-safe message when `status === "error"` */
  error?: { message: string; retryable: boolean };
}

export type LessonMode = "guided" | "explore";
export type LessonSyncState = "saved" | "saving" | "offline" | "error";

export type ObjectiveState =
  | "not_started"
  | "learning"
  | "practicing"
  | "demonstrated";

export interface LessonObjective {
  id: string;
  text: string;
  state: ObjectiveState;
}

/** One addressable thing on the lesson board — the non-spatial list view
 *  and the canvas render the same objects (RESPONSIVE_ACCESSIBILITY). */
export interface LessonObjectRef {
  id: string;
  kind:
    | "lesson_card"
    | "source"
    | "challenge"
    | "teach_back"
    | "note"
    | "practice";
  title: string;
  state: "todo" | "active" | "done" | "review";
}

export interface LessonSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  /** 0-based index of the recommended step the Compass points at */
  stepIndex: number;
  stepCount: number;
  objectives: LessonObjective[];
  objects: LessonObjectRef[];
}

/** Resume data for the Home "continue studying" print — only ever real
 *  session data (F06). Absent entirely for a new account. */
export interface ResumePoint {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
}
