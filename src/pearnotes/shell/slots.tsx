/**
 * Component slots — the seam between this shell (Engineer 2) and the visual
 * prototypes (Engineer 3, `src/pearnotes/ui/`).
 *
 * Resolution is by file-name convention via `import.meta.glob`, checked in
 * order per slot:
 *
 *   Home               → ui/HomeShell.tsx   ("PearNotesHome"), ui/Home.tsx
 *   SubjectPicker      → ui/SubjectPicker.tsx
 *   LearningPathDrawer → ui/LearningPathDrawer.tsx
 *   LessonShell        → ui/LessonShell.tsx
 *
 * A module default export wins over the named one. With no ui/ files the
 * map is empty and every slot renders its placeholder; merged files are
 * picked up at build time — ZERO edits to App.tsx or this shell needed for
 * the integration PR. Each real component loads lazily behind Suspense.
 *
 * `when` guards let a slot decline a resolved component whose required data
 * doesn't exist yet (e.g. LessonShell needs a real `lesson`) and fall back
 * to the placeholder instead of rendering a perpetual loading state.
 */
import { createElement, lazy, Suspense, type ComponentType } from "react";
import {
  HomePlaceholder,
  LearningPathDrawerPlaceholder,
  LessonShellPlaceholder,
  SubjectPickerPlaceholder,
} from "./placeholders";
import type {
  LearningPathDrawerProps,
  LessonShellProps,
  PearNotesHomeProps,
  PearNotesSlots,
  SubjectPickerProps,
} from "./types";

const uiComponents = import.meta.glob<Record<string, unknown>>("../ui/*.tsx");

/** Engineer 3's stylesheet, whatever its filename — injected once so real
 *  components render styled without the shell hardcoding `pearnotes.css`. */
const uiStyles = import.meta.glob("../styles/*.css");

let stylesRequested = false;
export function loadPearNotesUiStyles() {
  if (stylesRequested) return;
  stylesRequested = true;
  for (const load of Object.values(uiStyles)) void load();
}

type SlotSource = { file: string; exportName: string };

function slot<P extends object>(
  sources: SlotSource[],
  fallback: ComponentType<P>,
  when?: (props: P) => boolean,
): ComponentType<P> {
  const source = sources.find((s) => uiComponents[`../ui/${s.file}`]);
  if (!source) return fallback;
  const loader = uiComponents[`../ui/${source.file}`];
  const Resolved = lazy(async () => {
    const mod = await loader();
    const Component = (mod.default ?? mod[source.exportName]) as
      | ComponentType<P>
      | undefined;
    return { default: Component ?? fallback };
  });
  return function Slotted(props: P) {
    if (when && !when(props)) return createElement(fallback, props);
    return (
      <Suspense fallback={createElement(fallback, props)}>
        <Resolved {...props} />
      </Suspense>
    );
  };
}

export const pearnotesSlots: PearNotesSlots = {
  Home: slot<PearNotesHomeProps>(
    [
      { file: "HomeShell.tsx", exportName: "PearNotesHome" },
      { file: "Home.tsx", exportName: "Home" },
    ],
    HomePlaceholder,
  ),
  SubjectPicker: slot<SubjectPickerProps>(
    [{ file: "SubjectPicker.tsx", exportName: "SubjectPicker" }],
    SubjectPickerPlaceholder,
  ),
  LearningPathDrawer: slot<LearningPathDrawerProps>(
    [{ file: "LearningPathDrawer.tsx", exportName: "LearningPathDrawer" }],
    LearningPathDrawerPlaceholder,
    /* A null path = no data yet: the placeholder's honest "nothing here"
       beats a perpetual skeleton on the real drawer. */
    (props) => props.path != null,
  ),
  LessonShell: slot<LessonShellProps>(
    [{ file: "LessonShell.tsx", exportName: "LessonShell" }],
    LessonShellPlaceholder,
    /* The real shell requires a non-null LessonSummary; until lesson data
       exists the placeholder still mounts the real Canvas engine. */
    (props) => props.lesson != null,
  ),
};
