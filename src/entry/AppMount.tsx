/* ------------------------------------------------------------------
 * AppMount / DemoMount — where Engineer 2's app shell meets the router
 * (Assignment E1).
 *
 * The seam resolves `PearNotesAppRoutes` by dynamic import and falls
 * back to an honest hold screen when it isn't on this branch — so this
 * builds standalone on `develop` AND mounts the real component the
 * moment PR #56 lands, with no further edits.
 *
 * Contract (from `src/pearnotes/shell/app/PearNotesAppRoutes.tsx`):
 *
 *   <PearNotesAppRoutes
 *     pathname="/app/…"                // + optional query string
 *     navigate={(to) => …}             // only absolute /app… paths
 *     onNavigateExternal?={(href) => …} // legacy "#/space/<slug>" hrefs
 *   />
 *
 * Demo: the same component mounted under `/demo/*` with its pathname
 * translated back to `/app/*`, `?fixtures=1` enforced in the URL (the
 * labelled-fixture demo surface per ACCOUNT_SESSION_CONTRACT.md §3),
 * a visible demo ribbon, and an anonymous guest session so live
 * queries stay in scope.
 *
 * `demoMode` contract (E1 review on #57 — REQUIRED of the mounted
 * component, Engineer 2 implements it on their side):
 *
 *   - `demoMode === true` ⇒ NO live bridges, queries or mutations may
 *     mount/run — a registered user in the demo must never expose or
 *     mutate their real subjects, sources or progress.
 *   - Data comes from the labelled fixture seam only.
 *   - Subject creation, intake, attempts and every other write are
 *     disabled (or visibly no-op) while demoMode is on.
 *
 * Until their component reads the prop it is ignored — the `?fixtures=1`
 * gate remains as the minimum bar, and the hold screen covers the case
 * where the component isn't on the branch at all.
 * ------------------------------------------------------------------ */

import {
  lazy,
  Suspense,
  useCallback,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { AuthIdentityBridge } from "../live/useAuthIdentity";
import { navigate } from "./location";
import {
  appPathFromDemo,
  demoUrlFromAppTo,
  isDemoPathname,
  SITE_PATHS,
} from "./paths";
import {
  AccountRequired,
  AppShellPending,
  EntrySlip,
} from "./screens";

/* The props Engineer 2's component was delivered against — declared
   structurally so this file compiles whether or not their module is
   on the branch yet. */
type AppRoutesComponent = ComponentType<{
  pathname: string;
  navigate: (to: string) => void;
  onNavigateExternal?: (href: string) => void;
  /** When true the component renders ONLY the labelled demo surface —
   *  no live subject/source/progress reads and no mutations, whatever
   *  session the visitor carries (E1 review, #57). */
  demoMode?: boolean;
}>;

const LazyAppRoutes = lazy(async (): Promise<{
  default: AppRoutesComponent;
}> => {
  try {
    const mod = (await import("../pearnotes/shell")) as unknown as {
      PearNotesAppRoutes?: AppRoutesComponent;
    };
    if (mod.PearNotesAppRoutes) return { default: mod.PearNotesAppRoutes };
  } catch {
    /* the shell module isn't on this branch yet — hold honestly */
  }
  return { default: AppShellPending };
});

/** `onNavigateExternal` hrefs are legacy `#/…` links — `navigate` stores
 *  them as `/#/…` so the URL, refresh and back/forward all agree. */
function useExternalNavigate() {
  return useCallback((href: string) => navigate(href), []);
}

/**
 * `/app*` — the authenticated desk. Live mounts run the identity bridge
 * with mirroring only (`silentGuest={false}`): nobody is turned into a
 * guest just for opening the URL — a signed-out visitor gets the
 * recovery screen instead.
 */
export function AppMount({
  pathname,
  live,
}: {
  pathname: string;
  live: boolean;
}) {
  const onExternal = useExternalNavigate();
  const routes = (
    <Suspense fallback={<EntrySlip label="opening your desk" />}>
      <LazyAppRoutes
        pathname={pathname}
        navigate={navigate}
        onNavigateExternal={onExternal}
      />
    </Suspense>
  );
  return (
    <>
      {live ? <AuthIdentityBridge silentGuest={false} /> : null}
      {live ? <AppAuthGate>{routes}</AppAuthGate> : routes}
    </>
  );
}

/** Signed out on `/app` → a door with real choices, not a silent drop
 *  into a workspace. Anonymous accounts still count as signed in —
 *  guests are a deliberate account kind, distinguishable via
 *  `isAnonymous` (ACCOUNT_SESSION_CONTRACT.md §1). */
function AppAuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [guestBusy, setGuestBusy] = useState(false);

  if (isLoading) return <EntrySlip label="checking your session" />;
  if (!isAuthenticated) {
    return (
      <AccountRequired
        guestBusy={guestBusy}
        onGuest={() => {
          if (guestBusy) return;
          setGuestBusy(true);
          void signIn("anonymous").catch(() => setGuestBusy(false));
        }}
      />
    );
  }
  return <>{children}</>;
}

/**
 * `/demo*` — the deliberate demo door. The URL stays inside `/demo`
 * (visible labelling), `?fixtures=1` keeps the labelled fixture seam on,
 * and an anonymous guest session (the bridge's default) gives live
 * queries an isolated, clearly-guest identity — distinguishable from
 * registered accounts via `isAnonymous`, and never touching another
 * account's data.
 */
export function DemoMount({
  demoPathname,
  search,
  live,
}: {
  demoPathname: string;
  search: string;
  live: boolean;
}) {
  const onExternal = useExternalNavigate();
  const demoNavigate = useCallback(
    (to: string) => {
      /* the app component only sends /app… paths; a stray external
         path stays external rather than breaking the demo frame */
      navigate(isDemoPathname(to) ? to : demoUrlFromAppTo(to));
    },
    [],
  );
  const appPathname = appPathFromDemo(demoPathname) + search;

  return (
    <div className="entry-demo" data-demo-surface="true">
      {live ? <AuthIdentityBridge /> : null}
      <Suspense fallback={<EntrySlip label="opening the demo" />}>
        <LazyAppRoutes
          pathname={appPathname}
          navigate={demoNavigate}
          onNavigateExternal={onExternal}
          demoMode={true}
        />
      </Suspense>
      <DemoRibbon />
    </div>
  );
}

/** The always-visible demo label — no demo screen may look like a real
 *  account. Exit goes home; create-account is the conversion path. */
function DemoRibbon() {
  return (
    <aside className="entry-demo-ribbon" data-testid="demo-ribbon">
      <span className="entry-demo-badge">DEMO</span>
      <span className="entry-demo-note">
        labelled sample data — nothing here touches a real account
      </span>
      <button
        type="button"
        className="entry-demo-cta"
        onClick={() => navigate(SITE_PATHS.signUp)}
      >
        create an account →
      </button>
      <button
        type="button"
        className="entry-demo-exit"
        onClick={() => navigate(SITE_PATHS.landing)}
        aria-label="leave the demo"
      >
        ✕
      </button>
    </aside>
  );
}
