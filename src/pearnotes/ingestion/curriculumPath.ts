import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { anyApi } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  LearningPath,
  PathLesson,
  PathSection,
  PathUnit,
} from "../shell/types";

/* ------------------------------------------------------------------
 * useCurriculumPath — live subject → section/unit/lesson path (Issue #46).
 *
 * The documented read contract is `curricula.getPath` (DATA_AUTH.md
 * Phase 01 surface). The query is polled imperatively because it may not
 * exist yet in the deployed backend — Engineer 4 owns all Convex writes.
 * Until it lands we degrade HONESTLY: status "pending_backend", never a
 * fabricated path. The moment the function exists, the same route begins
 * returning real owner-scoped rows with no UI change.
 * ------------------------------------------------------------------ */

export type CurriculumPathState =
  | { status: "loading" }
  | { status: "pending_backend" }
  | { status: "error"; message: string }
  | { status: "ready"; path: LearningPath };

/* Server rows: draft curriculum → real lessons. Draft lessons are openable
   once shipped; nothing is marked complete — mastery is server-owned. */
type Row = {
  _id: string;
  title?: string;
  order?: number;
  objectiveIds?: string[];
  sourceRefs?: unknown[];
  activityCount?: number;
};

function toPath(subjectId: string, raw: unknown): LearningPath | null {
  /* Accept the documented shape { sections: [{units: [{lessons: []}]}] }
     or a bare { versions: [{sections: …}] } head — either maps to the
     drawer model; anything else stays honest-pending. */
  const root = raw as {
    sections?: Row[] & { units?: Row[] }[];
    versions?: { sections?: Row[] & { units?: Row[] }[] }[];
  } | null;
  const sections = root?.sections ?? root?.versions?.[0]?.sections;
  if (!Array.isArray(sections)) return null;
  const mapped: PathSection[] = sections.map((s, i) => ({
    id: s._id ?? `sec-${i}`,
    title: s.title ?? `Section ${i + 1}`,
    units: ((s as { units?: Row[] }).units ?? []).map(
      (u, j): PathUnit => ({
        id: u._id ?? `unit-${i}-${j}`,
        title: u.title ?? `Unit ${j + 1}`,
        lessons: ((u as { lessons?: Row[] }).lessons ?? []).map(
          (l, k): PathLesson => ({
            id: l._id,
            title: l.title ?? `Lesson ${k + 1}`,
            state: "not_started",
            objectives: (l.objectiveIds ?? []).map(String),
            activityCount: l.activityCount ?? 0,
            sourceCount: Array.isArray(l.sourceRefs) ? l.sourceRefs.length : 0,
          }),
        ),
      }),
    ),
  }));
  return { subjectId, status: "ready", sections: mapped };
}

export function useCurriculumPath(subjectId: string | null): CurriculumPathState {
  const client = useConvex();
  const [state, setState] = useState<CurriculumPathState>({ status: "loading" });

  useEffect(() => {
    if (!subjectId) {
      setState({ status: "pending_backend" });
      return;
    }
    let live = true;
    setState({ status: "loading" });
    (client as { query: (f: never, a: object) => Promise<unknown> })
      .query(anyApi.curricula.getPath as never, {
        subjectId: subjectId as Id<"subjects">,
      })
      .then((raw) => {
        if (!live) return;
        const path = raw ? toPath(subjectId, raw) : null;
        setState(
          path ? { status: "ready", path } : { status: "pending_backend" },
        );
      })
      .catch((e: unknown) => {
        if (!live) return;
        /* "Could not find public function" = contract not landed yet —
           an honest pending state, not an error. */
        const msg = e instanceof Error ? e.message : String(e);
        setState(
          /find.*function|not.*found/i.test(msg)
            ? { status: "pending_backend" }
            : { status: "error", message: msg },
        );
      });
    return () => {
      live = false;
    };
  }, [client, subjectId]);

  return state;
}
