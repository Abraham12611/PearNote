import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { getPathRef, type GetPathResult } from "./api";
import type {
  LearningPath,
  PathLesson,
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
            /* Server owns mastery — every node is honestly not_started. */
            state: "not_started",
            objectives: l.objectiveIds.map(String),
            activityCount: 0,
            sourceCount: l.sourceRefs.length,
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
