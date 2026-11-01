/* ------------------------------------------------------------------
 * /app route table — the authenticated PearNotes namespace (Issue #54).
 *
 * Pathname-based, matching Engineer 1's top-level router contract:
 * `PearNotesAppRoutes({ pathname, navigate })`. The legacy hash shell
 * (`#/learn*`, navigation.ts) is untouched — both renderers share the
 * same data seam and component slots.
 *
 *   /app                                  → home (the personal desk)
 *   /app/learn                            → home + subject picker modal
 *   /app/new                              → home + create-subject sheet
 *   /app/library                          → real sources library
 *   /app/groups                           → groups (deferred → spaces)
 *   /app/achievements                     → trophy shelf (honest empty)
 *   /app/profile                          → profile
 *   /app/settings                         → settings
 *   /app/subjects/<subjectId>             → learning-path drawer over home
 *   /app/subjects/<subjectId>/sources     → real intake/review (?job=<id>)
 *   /app/subjects/<subjectId>/lessons/<l> → full lesson canvas
 *   /app/lessons/<l>[?subject=<sid>]      → lesson, subject via query
 *   /app/<anything else>                  → honest not-found
 *   <non-/app path>                       → "outside" — renders null;
 *                                         the public root owns it
 * ------------------------------------------------------------------ */

export type AppNavKey =
  | "home"
  | "learn"
  | "library"
  | "groups"
  | "achievements"
  | "profile"
  | "settings";

export type AppRoute =
  /** pathname is not under /app — the public root owns it. */
  | { kind: "outside" }
  | { kind: "home" }
  | { kind: "learn" }
  | { kind: "new" }
  | { kind: "library" }
  | { kind: "groups" }
  | { kind: "achievements" }
  | { kind: "profile" }
  | { kind: "settings" }
  | { kind: "path"; subjectId: string }
  | { kind: "sources"; subjectId: string; jobId?: string }
  | { kind: "lesson"; lessonId: string; subjectId?: string }
  | { kind: "notfound"; path: string };

const NAV_SEGMENTS = new Set([
  "home",
  "learn",
  "new",
  "library",
  "groups",
  "achievements",
  "shelf",
  "profile",
  "settings",
]);

export function appRouteFromPathname(pathname: string): AppRoute {
  const [rawPath, rawQuery] = pathname.split("?");
  const params = new URLSearchParams(rawQuery ?? "");
  const segs = rawPath.split("/").filter(Boolean).map(decodeURIComponent);

  if (segs[0] !== "app") return { kind: "outside" };
  if (segs.length === 1) return { kind: "home" };

  const [, top, a, b] = segs;

  if (top === "subjects" && a) {
    if (!b || b === "path") return { kind: "path", subjectId: a };
    if (b === "sources") {
      return {
        kind: "sources",
        subjectId: a,
        jobId: params.get("job") ?? undefined,
      };
    }
    if (b === "lessons" && segs[4]) {
      return { kind: "lesson", subjectId: a, lessonId: segs[4] };
    }
    return { kind: "notfound", path: pathname };
  }

  if (top === "lessons" && a) {
    return {
      kind: "lesson",
      lessonId: a,
      subjectId: params.get("subject") ?? undefined,
    };
  }

  if (NAV_SEGMENTS.has(top)) {
    if (top === "home") return { kind: "home" };
    if (top === "shelf") return { kind: "achievements" };
    return { kind: top } as AppRoute;
  }

  return { kind: "notfound", path: pathname };
}

/** Which rail item a route highlights — the whole subject/lesson flow
 *  lives under Learn. */
export function appNavKeyFor(route: AppRoute): AppNavKey {
  switch (route.kind) {
    case "home":
    case "new":
      return "home";
    case "learn":
    case "path":
    case "sources":
    case "lesson":
      return "learn";
    case "library":
    case "groups":
    case "achievements":
    case "profile":
    case "settings":
      return route.kind;
    default:
      return "home";
  }
}

/* ---- path builders (the only strings `navigate` is ever called with) -- */

export const appHomePath = () => "/app";
export const appLearnPath = () => "/app/learn";
export const appNewPath = () => "/app/new";
export const appLibraryPath = () => "/app/library";
export const appGroupsPath = () => "/app/groups";
export const appAchievementsPath = () => "/app/achievements";
export const appProfilePath = () => "/app/profile";
export const appSettingsPath = () => "/app/settings";

export function appSubjectPath(subjectId: string) {
  return `/app/subjects/${encodeURIComponent(subjectId)}`;
}

export function appSourcesPath(subjectId: string, jobId?: string) {
  const base = `/app/subjects/${encodeURIComponent(subjectId)}/sources`;
  return jobId ? `${base}?job=${encodeURIComponent(jobId)}` : base;
}

/** `/app/subjects/<sid>/lessons/<lid>` keeps the drawer's back path alive
 *  across refresh; `/app/lessons/<lid>?subject=<sid>` is the bare form. */
export function appLessonPath(lessonId: string, subjectId?: string) {
  return subjectId
    ? `/app/subjects/${encodeURIComponent(subjectId)}/lessons/${encodeURIComponent(lessonId)}`
    : `/app/lessons/${encodeURIComponent(lessonId)}`;
}
