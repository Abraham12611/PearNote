export { PearNotesCanvasShell } from "./PearNotesCanvasShell";
/* Issue #54 — the production `/app` shell for Engineer 1's pathname
   router: `PearNotesAppRoutes({ pathname, navigate })`. The hash shell
   above stays live until the public root switches over. */
export { PearNotesAppRoutes } from "./app/PearNotesAppRoutes";
export type { PearNotesAppRoutesProps } from "./app/PearNotesAppRoutes";
export type { AppRoute, AppNavKey } from "./app/routes";
export { pearnotesEnabled, pearnotesShellRequested } from "./featureFlag";
export type {
  LearningPath,
  LearningPathDrawerProps,
  LessonShellProps,
  LessonSummary,
  PearNotesData,
  PearNotesHomeProps,
  PearNotesSlots,
  PearSubject,
  SubjectPickerProps,
} from "./types";
export type { PearNotesRoute } from "./navigation";
