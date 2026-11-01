/* ------------------------------------------------------------------
 * Access policy for the /app shell (Issue #54 review).
 *
 * Two rules the coordinator pinned, made pure and testable:
 *
 * 1. `demoMode` is an explicit prop from Engineer 1's router — NEVER
 *    inferred from `?fixtures=1` or any other URL flag. When on, every
 *    personal Convex read AND write is suppressed (no LiveDataBridge,
 *    no intake, no creation mutations); only local fixture/local
 *    interactions run.
 * 2. `?fixtures=1` alone is never authorization for fixture content on
 *    a real `/app` route. It is honored only inside the explicit demo
 *    context (`demoMode`) or a dev build — an "explicitly authorized
 *    dev/testing context", not production.
 * ------------------------------------------------------------------ */

export interface AppAccessPolicy {
  /** mount LiveDataBridge / LivePathBridge / LiveLessonBridge / live lists */
  liveReads: boolean;
  /** mount CreateSubjectSheet / IntakeReview / LiveLessonBoard mutations */
  liveMutations: boolean;
  /** `?fixtures=1` may inject labelled fixture content */
  fixturesAllowed: boolean;
  /** require the authenticated gate (off → public demo surface) */
  authGate: boolean;
}

export function appAccessPolicy({
  demoMode,
  liveBackend,
  dev,
}: {
  demoMode: boolean;
  /** Convex provider mounted + URL configured (main.tsx condition). */
  liveBackend: boolean;
  /** `import.meta.env.DEV` — explicitly authorized dev context. */
  dev: boolean;
}): AppAccessPolicy {
  return {
    authGate: !demoMode,
    liveReads: liveBackend && !demoMode,
    liveMutations: liveBackend && !demoMode,
    fixturesAllowed: demoMode || dev,
  };
}

/** React key for all private frontend state: every authenticated user id
 *  gets a distinct subtree, so sign-out/sign-in can never flash the
 *  previous account's subjects, paths or lessons. `null`/pending gets
 *  its own bucket — never a shared one. */
export function accountStateKey(userId: string | null | undefined): string {
  return userId ?? "__no_user__";
}
