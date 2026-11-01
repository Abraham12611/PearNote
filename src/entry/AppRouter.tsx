/* ------------------------------------------------------------------
 * AppRouter — the public pathname router (Assignment E1).
 *
 * Owns: `/`, `/auth/*`, `/app/*` (mounted to Engineer 2's app shell via
 * the AppMount seam), `/demo/*` (the same shell on labelled fixtures),
 * every unknown path's recovery screen, and the hand-off that keeps
 * legacy `#/…` links working without letting them dictate `/`.
 * ------------------------------------------------------------------ */

import { useEffect } from "react";
import type { ConvexReactClient } from "convex/react";
import type { DataMode } from "../live/dataMode";
import { classifyHash } from "./legacy";
import { useLocation } from "./location";
import { ensureDemoFixtures } from "./paths";
import { routeFromLocation, siteTitleFor } from "./router";
import { AppMount, DemoMount } from "./AppMount";
import { AuthScreen } from "./AuthPages";
import { LandingPage } from "./LandingPage";
import { LegacyMount } from "./LegacyMount";
import { SiteNotFound } from "./screens";
import "./entry.css";

export function AppRouter({
  mode,
  live,
  convexClient,
}: {
  mode: DataMode;
  /** live backend + ConvexAuthProvider are mounted around us. */
  live: boolean;
  convexClient: ConvexReactClient | null;
}) {
  const loc = useLocation();
  const route = routeFromLocation(loc);

  /* Canonicalize `#/learn*` links: the route already resolved to /app,
     this rewrites the address bar to the clean form (replace — the hash
     URL should not stay in history). */
  useEffect(() => {
    const legacy = classifyHash(loc.hash);
    if (legacy.kind === "learn") {
      window.history.replaceState(window.history.state, "", legacy.appUrl);
    }
  }, [loc.hash]);

  /* `/demo` always carries `?fixtures=1` — the honest isolation flag. */
  useEffect(() => {
    if (route.kind !== "demo") return;
    const wanted = ensureDemoFixtures(loc.search);
    if (wanted !== loc.search) {
      window.history.replaceState(
        window.history.state,
        "",
        route.demoPathname + wanted,
      );
    }
  }, [route, loc.search]);

  useEffect(() => {
    document.title = siteTitleFor(route);
  }, [route]);

  switch (route.kind) {
    case "landing":
      return <LandingPage live={live} />;
    case "sign-in":
      return <AuthScreen kind="sign-in" live={live} search={loc.search} />;
    case "sign-up":
      return <AuthScreen kind="sign-up" live={live} search={loc.search} />;
    case "app":
      return <AppMount pathname={route.pathname} live={live} />;
    case "demo":
      return (
        <DemoMount
          demoPathname={route.demoPathname}
          search={loc.search}
          live={live}
        />
      );
    case "legacy":
      return <LegacyMount mode={mode} convexClient={convexClient} />;
    case "notfound":
      return <SiteNotFound pathname={route.pathname} />;
  }
}
