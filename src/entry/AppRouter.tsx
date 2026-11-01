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
import { demoFixturesOn, ensureDemoFixtures } from "./paths";
import { navigate, useLocation } from "./location";
import { routeFromLocation, siteTitleFor } from "./router";
import { AppMount, DemoMount } from "./AppMount";
import { AuthScreen } from "./AuthPages";
import { LandingPage } from "./LandingPage";
import { LegacyMount } from "./LegacyMount";
import { EntrySlip, SiteNotFound } from "./screens";
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
    const legacy = classifyHash(loc.hash, loc.search);
    if (legacy.kind === "learn") {
      window.history.replaceState(window.history.state, "", legacy.appUrl);
    }
  }, [loc.hash]);

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
      /* First-render protection (E1 review): the demo tree does NOT
         mount until the URL canonically carries `?fixtures=1`. The
         canonicalizer rewrites it in place and only then does the app
         seam render — no private query can run against a pre-canonical
         URL, and `demoMode` stays on for every mount after this gate. */
      if (!demoFixturesOn(loc.search)) {
        return (
          <DemoCanonicalizer
            demoPathname={route.demoPathname}
            search={loc.search}
          />
        );
      }
      return (
        <DemoMount demoPathname={route.demoPathname} search={loc.search} />
      );
    case "legacy":
      return <LegacyMount mode={mode} convexClient={convexClient} />;
    case "notfound":
      return <SiteNotFound pathname={route.pathname} />;
  }
}

/** Mounts nothing private — rewrites `/demo…` to its canonical
 *  `?fixtures=1` form in place, then the route re-resolves and the
 *  gated branch above mounts the demo. */
function DemoCanonicalizer({
  demoPathname,
  search,
}: {
  demoPathname: string;
  search: string;
}) {
  useEffect(() => {
    navigate(demoPathname + ensureDemoFixtures(search), { replace: true });
  }, [demoPathname, search]);
  return <EntrySlip label="entering the demo" />;
}
