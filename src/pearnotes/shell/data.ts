import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SUBJECT_AVATAR_IDS, type SubjectStatus } from "../ui/types";
import { toPath, useCurriculumPath } from "../ingestion/curriculumPath";
import { getPathRef } from "../ingestion/api";
import type {
  DeskData,
  LearningPath,
  LessonObjectRef,
  LessonSummary,
  PearNotesData,
  PearSubject,
  ResumePoint,
} from "./types";
import type { Id } from "../../../convex/_generated/dataModel";

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

/** Live subject→path resolution (Issue #46): calls the documented
 *  `curricula.getPath` read when the backend exposes it; reports
 *  {subjectId, path} or null for the honest pending state. */
export function LivePathBridge({
  subjectId,
  onPath,
}: {
  subjectId: string;
  onPath: (resolved: { subjectId: string; path: LearningPath } | null) => void;
}) {
  const state = useCurriculumPath(subjectId);
  useEffect(() => {
    onPath(state.status === "ready" ? { subjectId, path: state.path } : null);
  }, [state, subjectId, onPath]);
  return null;
}

/* ---- real lesson chrome (Issue #46 rev3) ---- */

export type LiveLessonState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; lesson: LessonSummary };

const LESSON_OBJECT_KIND: Record<string, LessonObjectRef["kind"]> = {
  lessonCard: "lesson_card",
  multipleChoice: "challenge",
  shortAnswer: "challenge",
  classify: "challenge",
  teachBack: "teach_back",
};

/** Convex ids are 16+ char base32-ish strings — a malformed route id would
 *  fail validator args before the query runs, so gate on shape first. */
export const CONVEX_ID = /^[a-z0-9]{16,}$/i;

/**
 * LiveLessonBridge — builds the REAL `LessonSummary` the `LessonShell` slot
 * guard requires, from owner-scoped `learningRuntime.getLesson` + the real
 * subject row. Objective statements and mastery come verbatim from the
 * server (Issue #53); `stepIndex` is only set when `curricula.getPath`
 * verifiably places the lesson inside its unit — `null` is an honest
 * "untracked position", never a fabricated step.
 */
export function LiveLessonBridge({
  lessonId,
  subjectId,
  onLesson,
}: {
  lessonId: string;
  subjectId?: string;
  onLesson: (state: LiveLessonState) => void;
}) {
  const valid = CONVEX_ID.test(lessonId);
  const subjectValid = subjectId !== undefined && CONVEX_ID.test(subjectId);
  const lesson = useQuery(
    api.learningRuntime.getLesson,
    valid ? { lessonId: lessonId as Id<"lessons"> } : "skip",
  );
  const subjects = useQuery(api.subjects.listMine, {});
  /* Real position inside the approved path — never a hardcoded 1-of-1. */
  const path = useQuery(
    getPathRef,
    subjectValid ? { subjectId: subjectId as Id<"subjects"> } : "skip",
  );

  useEffect(() => {
    if (!valid || lesson === null) {
      onLesson({ status: "notfound" });
      return;
    }
    if (lesson === undefined || subjects === undefined) {
      onLesson({ status: "loading" });
      return;
    }
    const subject = subjects.find((s) => String(s._id) === subjectId);
    const objects: LessonObjectRef[] = lesson.activities.map((a, i) => ({
      id: String(a._id),
      kind: LESSON_OBJECT_KIND[(a.spec as { kind?: string })?.kind ?? ""] ?? "challenge",
      title:
        (a.spec as { title?: string; prompt?: string })?.title ??
        (a.spec as { prompt?: string })?.prompt ??
        `activity ${i + 1}`,
      state: "todo",
    }));
    /* Position within the real approved path only (Issue #53): when the
       lesson can't be verified inside a path, `stepIndex` is null — the
       Compass reports "untracked" rather than a fabricated position. */
    const flat = (path?.sections ?? []).flatMap((s) =>
      s.units.flatMap((u) => u.lessons),
    );
    const idx = flat.findIndex((l) => String(l._id) === lessonId);
    const stepIndex = idx >= 0 ? idx : null;
    onLesson({
      status: "ready",
      lesson: {
        id: String(lesson._id),
        title: lesson.title ?? "lesson",
        subjectId: subjectId ?? "",
        subjectName: subject?.name ?? "",
        stepIndex,
        stepCount: flat.length,
        /* Issue #53: real statements + the caller's own server mastery —
           verbatim, never fabricated. Empty array = untracked lesson. */
        objectives: lesson.objectives.map((o) => ({
          id: String(o._id),
          text: o.statement,
          state: o.mastery,
        })),
        objects,
      },
    });
  }, [valid, lesson, subjects, subjectId, lessonId, path, onLesson]);
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
  /** Issue #61 — keyed per subject/lesson; never one shared sample. */
  paths: Record<string, LearningPath>;
  lessons: Record<string, LessonSummary>;
  resume: ResumePoint | null;
  label: string;
};

export function usePearNotesFixtures(
  /** Issue #54 review — `?fixtures=1` is honored only when the caller's
   *  context allows it (explicit `demoMode` prop or a dev build). A real
   *  `/app` route passes `false` and the flag alone can never inject
   *  sample content into a production account. Defaults on so the
   *  legacy `#/learn` prototype harness is unchanged. */
  enabled: boolean = true,
): PearNotesData & { label: string } | null {
  const [bundle, setBundle] = useState<FixtureBundle | null>(null);
  const wanted = pearnotesFixturesRequested();

  useEffect(() => {
    if (!enabled || !wanted) return;
    const load = fixtureModules["../ui/fixtures.ts"];
    if (!load) return;
    let live = true;
    void load().then((mod) => {
      if (!live) return;
      const f = mod as {
        FIXTURE_SUBJECTS?: PearSubject[];
        FIXTURE_PATHS?: Record<string, LearningPath>;
        FIXTURE_LESSONS?: Record<string, LessonSummary>;
        /* legacy single-sample exports — kept only as a fallback for
           older fixture modules */
        FIXTURE_PATH?: LearningPath;
        FIXTURE_LESSON?: LessonSummary;
        FIXTURE_RESUME?: ResumePoint;
        PROTOTYPE_FIXTURE_LABEL?: string;
      };
      setBundle({
        subjects: f.FIXTURE_SUBJECTS ?? [],
        paths:
          f.FIXTURE_PATHS ??
          (f.FIXTURE_PATH ? { [f.FIXTURE_PATH.subjectId]: f.FIXTURE_PATH } : {}),
        lessons:
          f.FIXTURE_LESSONS ??
          (f.FIXTURE_LESSON ? { [f.FIXTURE_LESSON.id]: f.FIXTURE_LESSON } : {}),
        resume: f.FIXTURE_RESUME ?? null,
        label: f.PROTOTYPE_FIXTURE_LABEL ?? "prototype fixture",
      });
    });
    return () => {
      live = false;
    };
  }, [enabled, wanted]);

  if (!enabled || !wanted || !bundle) return null;
  return {
    status: "ready",
    subjects: bundle.subjects,
    resume: bundle.resume,
    subjectFor: (id) => bundle.subjects.find((s) => s.id === id) ?? null,
    pathFor: (id) => bundle.paths[id] ?? null,
    lessonFor: (id) => bundle.lessons[id] ?? null,
    label: bundle.label,
  };
}

/* ------------------------------------------------------------------ */
/* W3 — desk aggregate + the seeded demo persona ("sam").              */
/* `desk.get` = the signed-in owner's desk; `demo.getDesk` = the same   */
/* systems resolved for the flagged demo account — public, read-only.  */
/* ------------------------------------------------------------------ */

type RawDesk = {
  learner: { name: string; image?: string; color?: string; personaId?: string };
  subjects: Parameters<typeof toPearSubject>[0][];
  resume: { lessonId: string; lessonTitle: string; subjectName: string; unitTitle: string } | null;
  today: { _id: string; title: string; subjectName?: string; minutes?: number; done: boolean; color?: string }[];
  focus: { _id: string; text: string; done: boolean }[];
  studiedDays: string[];
  streakDays: number;
  upcoming: { _id: string; kind: DeskData["upcoming"][number]["kind"]; title: string; subjectName?: string; startTs: number; color?: string }[];
  achievements: { _id: string; key: string; title: string; detail: string; icon: DeskData["achievements"][number]["icon"]; tint?: string; seen: boolean }[];
  unseenAchievements: number;
  activity: { _id: string; actorName: string; kind: string; text: string; subjectName?: string; happenedAt: number }[];
  crew: { userId: string; name: string; image?: string; color?: string; personaId?: string }[];
  crewNote: { authorName: string; text: string; happenedAt: number } | null;
  xpTotal: number;
  sourceCount: number;
};

function toDeskData(raw: RawDesk): DeskData {
  return {
    learner: raw.learner,
    today: raw.today.map((e) => ({ id: e._id, title: e.title, subjectName: e.subjectName, minutes: e.minutes, done: e.done, color: e.color })),
    focus: raw.focus.map((f) => ({ id: f._id, text: f.text, done: f.done })),
    studiedDays: raw.studiedDays,
    streakDays: raw.streakDays,
    upcoming: raw.upcoming.map((e) => ({ id: e._id, kind: e.kind, title: e.title, subjectName: e.subjectName, startTs: e.startTs, color: e.color })),
    achievements: raw.achievements.map((a) => ({ id: a._id, key: a.key, title: a.title, detail: a.detail, icon: a.icon, tint: a.tint, unseen: !a.seen })),
    unseenAchievements: raw.unseenAchievements,
    activity: raw.activity.map((e) => ({ id: e._id, actorName: e.actorName, kind: e.kind, text: e.text, subjectName: e.subjectName, happenedAt: e.happenedAt })),
    crew: raw.crew,
    crewNote: raw.crewNote,
    xpTotal: raw.xpTotal,
    sourceCount: raw.sourceCount,
  };
}

/** The signed-in learner's desk — mounted only when liveReads allowed. */
export function usePearNotesLiveDesk(): DeskData | null | "loading" {
  const raw = useQuery(api.desk.get, {});
  return useMemo(() => (raw === undefined ? "loading" : raw === null ? null : toDeskData(raw as RawDesk)), [raw]);
}

export function LiveDeskBridge({ onDesk }: { onDesk: (d: DeskData | null | "loading") => void }) {
  const desk = usePearNotesLiveDesk();
  useEffect(() => { onDesk(desk); }, [desk, onDesk]);
  return null;
}

/* ---- the demo persona ------------------------------------------------ */

export type DemoData = PearNotesData & {
  desk: DeskData;
  persona: { name: string; bio: string; image?: string; color?: string };
  label: string;
};

type RawDemo = {
  persona: { name: string; bio: string; image?: string; color?: string };
  desk: RawDesk;
  paths: { subjectId: string; tree: Parameters<typeof toPath>[0] }[];
  lessons: {
    _id: string; title?: string; subjectId: string; subjectName: string;
    objectives: { _id: string; statement: string; mastery: LessonSummary["objectives"][number]["state"]; evidenceCount: number }[];
    activities: { _id: string; spec: { kind?: string; title?: string; prompt?: string }; revision: number }[];
  }[];
};

/** The seeded "sam" account — a real backend user, read-only for the
 *  public demo. `null` when the deployment isn't seeded. */
export function usePearNotesDemoData(): DemoData | null | "loading" {
  const raw = useQuery(api.demo.getDesk, {});
  return useMemo<DemoData | null | "loading">(() => {
    if (raw === undefined) return "loading";
    if (raw === null) return null;
    const d = raw as RawDemo;
    const subjects = d.desk.subjects.map(toPearSubject);
    const paths: Record<string, LearningPath> = {};
    for (const p of d.paths) paths[p.subjectId] = toPath(p.tree);
    const lessons: Record<string, LessonSummary> = {};
    for (const l of d.lessons) {
      lessons[l._id] = {
        id: l._id,
        title: l.title ?? "untitled lesson",
        subjectId: l.subjectId,
        subjectName: l.subjectName,
        stepIndex: null,
        stepCount: 0,
        objectives: l.objectives.map((o) => ({ id: o._id, text: o.statement, state: o.mastery })),
        objects: l.activities.map((a, i) => ({
          id: a._id,
          kind: LESSON_OBJECT_KIND[(a.spec as { kind?: string }).kind ?? ""] ?? "challenge",
          title: a.spec.title ?? a.spec.prompt ?? `activity ${i + 1}`,
          state: "todo" as const,
        })),
      };
    }
    const desk = toDeskData(d.desk);
    return {
      status: "ready",
      subjects,
      resume: d.desk.resume
        ? { lessonId: d.desk.resume.lessonId, lessonTitle: d.desk.resume.lessonTitle, subjectName: d.desk.resume.subjectName }
        : null,
      subjectFor: (id) => subjects.find((s) => s.id === id) ?? null,
      pathFor: (id) => paths[id] ?? null,
      lessonFor: (id) => lessons[id] ?? null,
      desk,
      persona: d.persona,
      label: "sample account",
    };
  }, [raw]);
}

export function DemoDataBridge({ onData }: { onData: (d: DemoData | null | "loading") => void }) {
  const data = usePearNotesDemoData();
  useEffect(() => { onData(data); }, [data, onData]);
  return null;
}

/** Self-checklist toggles — the only desk write a client may do (own
 *  rows only, enforced server-side in desk.toggleChecklistItem). */
export function DeskActionBridge({
  onToggle,
}: {
  onToggle: (fn: (table: "weeklyFocus" | "studyEvents", id: string) => void) => void;
}) {
  const toggle = useMutation(api.desk.toggleChecklistItem);
  useEffect(() => {
    onToggle((table, id) => {
      void toggle({ table, id: id as never });
    });
  }, [toggle, onToggle]);
  return null;
}
