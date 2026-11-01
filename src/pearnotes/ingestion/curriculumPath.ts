import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { getPathRef, type GetPathResult } from "./api";
import type {
  LearningPath,
  PathLesson,
  PathNodeState,
  PathSection,
  PathUnit,
} from "../shell/types";
import { CONVEX_ID } from "../shell/data";

/* ------------------------------------------------------------------
 * useCurriculumPath — LIVE subject → section/unit/lesson path (Issue #46
 * final). Typed reactive query: `api.curricula.getPath` (#51) is
 * owner-scoped and reactive — the drawer re-renders the moment an
 * approved curriculum appears or changes, no refresh needed.
 *
 * `null` from the server means "subject exists but has no eligible
 * curriculum version yet" — an honest empty state, never fabricated.
 * ------------------------------------------------------------------ */

export type CurriculumPathState =
  | { status: "loading" }
  /** Subject exists but no curriculum version is eligible yet. */
  | { status: "empty" }
  /** Route carried a malformed/foreign subject id. */
  | { status: "invalid" }
  | { status: "ready"; path: LearningPath };

/* Server mastery rollup → drawer node state (Issue #53). `untracked`
 *  renders as `unknown` — progress the server itself cannot verify.
 *  Everything else is verified evidence and may be shown as-is: a
 *  server-derived "not_started" is an honest "you haven't begun", not
 *  the fabricated default it was before the read existed. */
const PROGRESS_NODE_STATE: Record<string, PathNodeState> = {
  untracked: "unknown",
  not_started: "not_started",
  learning: "in_progress",
  practicing: "practicing",
  demonstrated: "demonstrated",
};

function toPath(raw: GetPathResult): LearningPath {
  const sections: PathSection[] = raw.sections.map((sec) => ({
    id: sec._id,
    title: sec.title,
    units: sec.units.map(
      (u): PathUnit => ({
        id: u._id,
        title: u.title,
        lessons: u.lessons.map(
          (l): PathLesson => ({
            id: l._id,
            title: l.title ?? "untitled lesson",
            /* Real server-derived progress — never a client guess. */
            state: PROGRESS_NODE_STATE[l.progress.state] ?? "unknown",
            /* getPath returns objective ids, not statements — rendering
               them would show raw Convex ids as fake objective text.
               Real statements arrive via getLesson when it opens. */
            objectives: [],
            activityCount: l.activityCount,
            sourceCount: l.sourceRefs.length,
            /* 0–1 ring for in-progress nodes — the server's own fraction
               of assessed objectives, only when it actually tracks any. */
            progress:
              l.progress.tracked && l.progress.totalObjectives > 0
                ? l.progress.assessedObjectives / l.progress.totalObjectives
                : undefined,
          }),
        ),
      }),
    ),
  }));
  return { subjectId: raw.subjectId, status: "ready", sections };
}

export function useCurriculumPath(
  subjectId: string | null,
): CurriculumPathState {
  const valid = subjectId !== null && CONVEX_ID.test(subjectId);
  const raw = useQuery(
    getPathRef,
    valid ? { subjectId: subjectId as Id<"subjects"> } : "skip",
  );

  return useMemo<CurriculumPathState>(() => {
    if (subjectId === null || !valid) return { status: "invalid" };
    if (raw === undefined) return { status: "loading" };
    if (raw === null) return { status: "empty" };
    return { status: "ready", path: toPath(raw) };
  }, [raw, subjectId, valid]);
}
