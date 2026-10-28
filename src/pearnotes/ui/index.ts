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
import "../styles/journey-assets.css";

export type * from "./types";
export { SubjectAvatar, normalizeAvatar } from "./SubjectAvatar";
export { JourneyNode } from "./JourneyNode";
export type { JourneyNodeProps, JourneyNodeKind } from "./JourneyNode";
export { JourneySticker, JourneyDoodle, JourneyNote } from "./JourneySticker";
export type { JourneyStickerProps } from "./JourneySticker";
export {
  JOURNEY_STICKERS,
  pickSticker,
  stickerUrl,
} from "./journeyAssets";
export type { JourneyStickerAsset, JourneyStickerTheme } from "./journeyAssets";
export { PearNotesHome } from "./HomeShell";
export type { PearNotesHomeProps } from "./HomeShell";
export { SubjectPicker } from "./SubjectPicker";
export type { SubjectPickerProps } from "./SubjectPicker";
export { LearningPathDrawer } from "./LearningPathDrawer";
export type { LearningPathDrawerProps } from "./LearningPathDrawer";
export { LessonShell } from "./LessonShell";
export type { LessonShellProps } from "./LessonShell";
export { useDialogA11y, usePrefersReducedMotion } from "./a11y";
