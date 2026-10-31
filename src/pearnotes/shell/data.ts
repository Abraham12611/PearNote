import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SUBJECT_AVATAR_IDS, type SubjectStatus } from "../ui/types";
import type {
  LearningPath,
  LessonSummary,
  PearNotesData,
  PearSubject,
  ResumePoint,
} from "./types";

/**
 * The shell's data seam. Phase 00 returns the real state: a new account has
 * ZERO subjects, no resume point, and no paths or lessons to look up. There
 * is deliberately no fixture import on this path — Blueprint rule: never
 * pre-seed a real student's subjects, and Phase 00 has no Convex domain
 * tables to query yet (Engineer 4, Phase 00.4).
 *
 * Engineer 4 replaces the body of this hook with authorized Convex queries
 * (subjects → sources → curriculum → lessons) and keeps the `PearNotesData`
 * shape, so the slots never learn where the rows come from.
 */
const EMPTY_DATA: PearNotesData = {
  status: "ready",
  subjects: [],
  resume: null,
  subjectFor: () => null,
  pathFor: () => null,
  lessonFor: () => null,
};

export function usePearNotesData(): PearNotesData {
  return EMPTY_DATA;
}

/* ------------------------------------------------------------------ */
/* Phase 01 — the REAL learner data seam (Issue #24).                  */
/* Rendered only inside ConvexAuthProvider (live mode): a fresh signed- */
/* in account sees ZERO subjects; nothing here fabricates fixtures.    */
/* ------------------------------------------------------------------ */

const SUBJECT_STATUS: Record<string, SubjectStatus> = {
  manual_empty: "needs_material",
  needs_material: "needs_material",
  draft: "needs_review",
  generating: "generating",
  ready: "ready",
  failed: "failed",
};

function toPearSubject(row: {
  _id: string;
  name: string;
  avatarId?: string;
  theme?: string;
  status: string;
}): PearSubject {
  const avatar = SUBJECT_AVATAR_IDS.includes(row.avatarId as never)
    ? (row.avatarId as PearSubject["avatar"])
    : "unknown";
  return {
    id: row._id,
    name: row.name,
    avatar,
    color: row.theme?.startsWith("#") || row.theme?.startsWith("var(")
      ? row.theme
      : "var(--pn-subject-general)",
    status: SUBJECT_STATUS[row.status] ?? "needs_material",
  };
}

/** True when the app is actually inside a Convex provider (live + URL). */
export function pearnotesLiveBackend(): boolean {
  return Boolean(import.meta.env.VITE_CONVEX_URL);
}

/**
 * Real subjects for the signed-in owner as a hook. MUST only be called
 * inside a Convex provider — `LiveDataBridge` is only mounted when
 * `pearnotesLiveBackend()` is true. Paths/lessons stay null until a
 * published curriculum exists (never faked).
 */
function usePearNotesLiveData(): PearNotesData {
  const rows = useQuery(api.subjects.listMine, {});
  /* Memoized on `rows` (referentially stable from the query cache): the
     old version built a fresh object every render, and the unbounded
     reporting effect below turned that into an endless rerender loop. */
  return useMemo<PearNotesData>(() => {
    const subjects = (rows ?? []).map(toPearSubject);
    return {
      status: rows === undefined ? "loading" : "ready",
      subjects,
      resume: null,
      subjectFor: (id) => subjects.find((s) => s.id === id) ?? null,
      pathFor: () => null,
      lessonFor: () => null,
    };
  }, [rows]);
}

/** Mounts the live query (provider required) and reports data upward.
 *  The effect is dependency-bounded to the memoized data + stable setter,
 *  so it fires only when the underlying query rows actually change. */
export function LiveDataBridge({
  onData,
}: {
  onData: (data: PearNotesData) => void;
}) {
  const data = usePearNotesLiveData();
  useEffect(() => {
    onData(data);
  }, [data, onData]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Preview harness — `&fixtures=1`, labelled, never the real flow.     */
/* ------------------------------------------------------------------ */

/** Engineer 3's labelled prototype fixtures (ui/fixtures.ts), resolved the
 *  same way the components are: the module is pulled in only when the file
 *  exists AND the viewer explicitly asked for a populated prototype. Real
 *  routes never see it; every rendered surface carries `fixtureLabel`. */
const fixtureModules = import.meta.glob<Record<string, unknown>>(
  "../ui/fixtures.ts",
);

export function pearnotesFixturesRequested(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hashSearch = new URLSearchParams(
    window.location.hash.split("?")[1] ?? "",
  );
  return search.get("fixtures") === "1" || hashSearch.get("fixtures") === "1";
}

type FixtureBundle = {
  subjects: PearSubject[];
  path: LearningPath | null;
  lesson: LessonSummary | null;
  resume: ResumePoint | null;
  label: string;
};

export function usePearNotesFixtures(): PearNotesData & { label: string } | null {
  const [bundle, setBundle] = useState<FixtureBundle | null>(null);
  const wanted = pearnotesFixturesRequested();

  useEffect(() => {
    if (!wanted) return;
    const load = fixtureModules["../ui/fixtures.ts"];
    if (!load) return;
    let live = true;
    void load().then((mod) => {
      if (!live) return;
      const f = mod as {
        FIXTURE_SUBJECTS?: PearSubject[];
        FIXTURE_PATH?: LearningPath;
        FIXTURE_LESSON?: LessonSummary;
        FIXTURE_RESUME?: ResumePoint;
        PROTOTYPE_FIXTURE_LABEL?: string;
      };
      setBundle({
        subjects: f.FIXTURE_SUBJECTS ?? [],
        path: f.FIXTURE_PATH ?? null,
        lesson: f.FIXTURE_LESSON ?? null,
        resume: f.FIXTURE_RESUME ?? null,
        label: f.PROTOTYPE_FIXTURE_LABEL ?? "prototype fixture",
      });
    });
    return () => {
      live = false;
    };
  }, [wanted]);

  if (!wanted || !bundle) return null;
  return {
    status: "ready",
    subjects: bundle.subjects,
    resume: bundle.resume,
    subjectFor: (id) => bundle.subjects.find((s) => s.id === id) ?? null,
    pathFor: (id) => (bundle.path?.subjectId === id ? bundle.path : null),
    lessonFor: (id) => (bundle.lesson?.id === id ? bundle.lesson : null),
    label: bundle.label,
  };
}
