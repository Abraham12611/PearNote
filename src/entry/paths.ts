/* ------------------------------------------------------------------
 * PearNotes clean pathname routes — Assignment E1.
 *
 * The public site is pathname-routed; the legacy OurSpaces experience
 * keeps its `#/…` hash namespace (src/lib/routes.ts) untouched.
 *
 *   /                 → public landing (never auto-redirects)
 *   /auth/sign-in     → sign in (email code / Google)
 *   /auth/sign-up     → create account (same join flow, new copy)
 *   /app/*            → the authenticated PearNotes desk (Engineer 2's
 *                       PearNotesAppRoutes consumes the whole subtree)
 *   /demo/*           → the same app tree mounted with `?fixtures=1`
 *                       (the labelled demo surface — see
 *                       docs/phase00/ACCOUNT_SESSION_CONTRACT.md §3)
 * ------------------------------------------------------------------ */

export const SITE_PATHS = {
  landing: "/",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  appRoot: "/app",
  demoRoot: "/demo",
} as const;

/** The labelled-fixture flag E4's contract defines as the demo surface. */
export const DEMO_FIXTURES_PARAM = "fixtures";

export function isAppPathname(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function isDemoPathname(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function isAuthPathname(pathname: string): boolean {
  return pathname === SITE_PATHS.signIn || pathname === SITE_PATHS.signUp;
}

/** `/demo/learn` → `/app/learn`; `/demo` → `/app`. Path only, no query. */
export function appPathFromDemo(demoPathname: string): string {
  return "/app" + demoPathname.slice("/demo".length);
}

/** `/app/subjects/x` → `/demo/subjects/x`. Path only, no query. */
export function demoPathFromApp(appPath: string): string {
  return "/demo" + appPath.slice("/app".length);
}

/** Every demo URL carries `?fixtures=1` — the flag is the demo's honest
 *  label and the isolation seam (client fixtures, zero learning
 *  mutations). Other params (`job`, …) are preserved. */
export function ensureDemoFixtures(search: string): string {
  const params = new URLSearchParams(search);
  params.set(DEMO_FIXTURES_PARAM, "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The app component only ever calls navigate() with absolute `/app…`
 *  paths; inside /demo each one is translated back into the demo
 *  namespace, fixtures flag re-attached. */
export function demoUrlFromAppTo(to: string): string {
  const [path, query] = to.split("?");
  return demoPathFromApp(path) + ensureDemoFixtures(query ? `?${query}` : "");
}

/** `?next=` sanitizing — same-origin path only. */
export function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
