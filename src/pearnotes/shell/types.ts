/**
 * Shell ↔ UI contract — Phase 00.
 *
 * The canonical model is Engineer 3's `src/pearnotes/ui/types.ts` plus the
 * prop interfaces exported beside each component. This file is a STRUCTURAL
 * MIRROR of that contract: the shell must compile and run on branches where
 * `src/pearnotes/ui/` hasn't landed yet, so it cannot `import type` from
 * there. Keep the two in sync — drift is reported in the issue thread, not
 * silently absorbed.
 *
 * Slots (`slots.tsx`) hand these props straight through, so when the real
 * components merge they receive exactly the shapes they declared.
 */
import type { ComponentType, ReactNode } from "react";

/* ---- domain view-models (mirror ui/types.ts) ---- */

export type SubjectStatus =
  | "needs_material"
  | "generating"
  | "needs_review"
  | "ready"
  | "failed";

export type PearSubject = {
  id: string;
  name: string;
  /** Avatar pack id (ui: `SubjectAvatarId`); a plain string here so the
   *  shell compiles without the ui package. */
  avatar: string;
  color: string;
  status: SubjectStatus;
};

export type ResumePoint = {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
};

export type PathNodeState =
  | "not_started"
  | "available"
  | "in_progress"
  | "practicing"
  | "demonstrated"
  | "needs_review"
  | "locked";

export type PathLesson = {
  id: string;
  title: string;
  state: PathNodeState;
  objectives: string[];
  activityCount: number;
  sourceCount: number;
  progress?: number;
  recommended?: boolean;
  remedial?: boolean;
};

export type PathUnit = { id: string; title: string; lessons: PathLesson[] };
export type PathSection = {
  id: string;
  title: string;
  theme?: string;
  units: PathUnit[];
};

export type LearningPathStatus =
  | "loading"
  | "generating"
  | "needs_material"
  | "needs_review"
  | "ready"
  | "error";

export type LearningPath = {
  subjectId: string;
  status: LearningPathStatus;
  sections: PathSection[];
  error?: { message: string; retryable: boolean };
};

export type LessonMode = "guided" | "explore";
export type LessonSyncState = "saved" | "saving" | "offline" | "error";

export type ObjectiveState =
  | "not_started"
  | "learning"
  | "practicing"
  | "demonstrated";

export type LessonObjective = { id: string; text: string; state: ObjectiveState };

export type LessonObjectRef = {
  id: string;
  kind: "lesson_card" | "source" | "challenge" | "teach_back" | "note" | "practice";
  title: string;
  state: "todo" | "active" | "done" | "review";
};

export type LessonSummary = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  stepIndex: number;
  stepCount: number;
  objectives: LessonObjective[];
  objects: LessonObjectRef[];
};

/* ---- the shell's data seam ---- */

/** What the shell can honestly answer today. Engineer 4's Convex domain
 *  (Phase 00.4) fills `subjectFor`/`pathFor`/`lessonFor`; until then they
 *  return null — never a fabricated subject, path or lesson. */
export type PearNotesData = {
  status: "ready" | "loading" | "error";
  subjects: PearSubject[];
  /** Last real study location (F06); null for every new account. */
  resume: ResumePoint | null;
  subjectFor: (subjectId: string) => PearSubject | null;
  pathFor: (subjectId: string) => LearningPath | null;
  lessonFor: (lessonId: string) => LessonSummary | null;
};

/* ---- slot props (mirror each component's declared Props interface) ---- */

export type PearNotesHomeProps = {
  learnerName?: string;
  subjects: PearSubject[];
  resume?: ResumePoint | null;
  fixtureLabel?: string;
  onLearn?: () => void;
  onCreateSubject?: () => void;
  onOpenSubject?: (subjectId: string) => void;
  onResume?: (lessonId: string) => void;
  onOpenLibrary?: () => void;
  onOpenGroups?: () => void;
  onOpenShelf?: () => void;
  onOpenProfile?: () => void;
};

export type SubjectPickerProps = {
  open: boolean;
  subjects: PearSubject[];
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
  selectedId?: string | null;
  onSelect?: (subjectId: string) => void;
  /** "enter the space" — the shell opens the learning-path drawer. */
  onEnter?: (subjectId: string) => void;
  onCreate?: () => void;
  onClose: () => void;
  onRetry?: () => void;
  fixtureLabel?: string;
};

export type LearningPathDrawerProps = {
  open: boolean;
  subject: PearSubject | null;
  path: LearningPath | null;
  selectedLessonId?: string | null;
  initialScrollTop?: number;
  fixtureLabel?: string;
  onSelectLesson?: (lessonId: string | null) => void;
  onStartLesson?: (lessonId: string) => void;
  onBack?: () => void;
  onClose: () => void;
  onAddMaterials?: () => void;
  onBrowseSources?: () => void;
  onRetry?: () => void;
  onScroll?: (scrollTop: number) => void;
};

/** `lesson` is nullable ONLY at the shell boundary: `null` means "no lesson
 *  data exists yet", and the shell renders its own placeholder canvas. The
 *  real LessonShell is invoked exclusively with a non-null lesson. */
export type LessonShellProps = {
  lesson: LessonSummary | null;
  mode: LessonMode;
  onModeChange?: (mode: LessonMode) => void;
  onExit: () => void;
  onReturnToNext?: () => void;
  onOpenObject?: (objectId: string) => void;
  syncState?: LessonSyncState;
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
  fixtureLabel?: string;
  /** The lesson canvas — the shell mounts the existing Canvas engine here. */
  children?: ReactNode;
  chrome?: ReactNode;
};

export type PearNotesSlots = {
  Home: ComponentType<PearNotesHomeProps>;
  SubjectPicker: ComponentType<SubjectPickerProps>;
  LearningPathDrawer: ComponentType<LearningPathDrawerProps>;
  LessonShell: ComponentType<LessonShellProps>;
};
