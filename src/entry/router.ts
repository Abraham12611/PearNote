/* ------------------------------------------------------------------
 * Site route resolution — Assignment E1.
 *
 * Pure: `routeFromLocation(pathname, search, hash) → SiteRoute`.
 * Hash wins only when it names a legacy `#/…` route (the legacy app
 * mount) or a `#/learn*` link (translated into `/app*`); a clean
 * pathname with no hash is always authoritative, so bare `/` shows the
 * landing and nothing else can dictate the homepage.
 * ------------------------------------------------------------------ */

import { classifyHash } from "./legacy";
import { isAppPathname, isDemoPathname } from "./paths";

export type SiteRoute =
  | { kind: "landing" }
  | { kind: "sign-in" }
  | { kind: "sign-up" }
  /** pathname prop for PearNotesAppRoutes — "/app…" incl. query. */
  | { kind: "app"; pathname: string }
  /** demo namespace — mounted as /app with fixtures + demo chrome. */
  | { kind: "demo"; demoPathname: string; search: string }
  /** a legacy `#/…` route — the inherited hash app owns the screen. */
  | { kind: "legacy" }
  | { kind: "notfound"; pathname: string };

export function routeFromLocation(loc: {
  pathname: string;
  search: string;
  hash: string;
}): SiteRoute {
  const legacy = classifyHash(loc.hash);
  if (legacy.kind === "learn") {
    return { kind: "app", pathname: legacy.appUrl };
  }
  if (legacy.kind === "legacy") return { kind: "legacy" };

  const { pathname, search } = loc;
  if (pathname === "/" || pathname === "") return { kind: "landing" };
  if (pathname === "/auth/sign-in") return { kind: "sign-in" };
  if (pathname === "/auth/sign-up") return { kind: "sign-up" };
  if (isAppPathname(pathname)) {
    return { kind: "app", pathname: pathname + search };
  }
  if (isDemoPathname(pathname)) {
    return { kind: "demo", demoPathname: pathname, search };
  }
  return { kind: "notfound", pathname: pathname + search };
}

export function siteTitleFor(route: SiteRoute): string {
  switch (route.kind) {
    case "landing":
      return "PearNotes — learn from your own sources";
    case "sign-in":
      return "PearNotes — sign in";
    case "sign-up":
      return "PearNotes — create your account";
    case "app":
      return "PearNotes";
    case "demo":
      return "PearNotes — demo";
    case "legacy":
      return "PearNotes";
    case "notfound":
      return "PearNotes — page not found";
  }
}
