/* ------------------------------------------------------------------
 * PearNotes UI package — Phase 00 prototypes.
 *
 * Import surface for Engineer 2's feature-gated shell
 * (src/pearnotes/shell). Pulling from this module also pulls the
 * stylesheet so components never render unstyled:
 *
 *   import { PearNotesHome, SubjectPicker } from "../ui";
 *   import type { PearSubject, LearningPath } from "../ui";
 *
 * Components are controlled/pure: state in via props, intent out via
 * callbacks. Nothing here touches Convex, routing or storage, and
 * nothing renders fake data — populated looks require passing real
 * `PearSubject`s (or labelled fixtures in the preview harness).
 * ------------------------------------------------------------------ */

import "../styles/pearnotes.css";

export type * from "./types";
export { SubjectAvatar, normalizeAvatar } from "./SubjectAvatar";
export { PearNotesHome } from "./HomeShell";
export type { PearNotesHomeProps } from "./HomeShell";
export { SubjectPicker } from "./SubjectPicker";
export type { SubjectPickerProps } from "./SubjectPicker";
export { LearningPathDrawer } from "./LearningPathDrawer";
export type { LearningPathDrawerProps } from "./LearningPathDrawer";
export { JourneyDrawer } from "./JourneyDrawer";
export type { JourneyDrawerProps, JourneyMode } from "./JourneyDrawer";
export { LessonShell } from "./LessonShell";
export type { LessonShellProps } from "./LessonShell";
export { useDialogA11y, usePrefersReducedMotion } from "./a11y";
