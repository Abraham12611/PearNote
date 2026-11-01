/* ------------------------------------------------------------------
 * LegacyMount — the inherited OurSpaces app behind its `#/…` links
 * (Assignment E1).
 *
 * Everything the old entry rendered still mounts here, unchanged:
 * the silent guest bridge, the demo/tour banner, the canvas app and
 * the update nudge in live mode; the mock-mode banner+canvas; and the
 * "Convex isn't connected" screen when there's no backend at all —
 * the canvas can't run on nothing. New clean routes simply never
 * mount this tree.
 * ------------------------------------------------------------------ */

import { lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import type { ConvexReactClient } from "convex/react";
import type { DataMode } from "../live/dataMode";
import { api } from "../../convex/_generated/api";
import { AuthIdentityBridge } from "../live/useAuthIdentity";
import { DemoBanner, MAKE_SPACE_EVENT } from "../components/DemoBanner";
import { UpdateNudge } from "../components/UpdateNudge";
import { EntrySlip } from "./screens";

/* The legacy app is the heavy bundle — the public routes shouldn't pay
   for it, so it loads as its own chunk when a #/… link actually lands. */
const LegacyApp = lazy(() => import("../App"));

/** Live: the banner asks the deployment whether rooms are open (by lane,
 *  convex/spaces.ts `roomsOpen`). The dev-lane URL check mirrors the old
 *  main.tsx exactly. */
const OPEN_LANE = /dusty-condor-648/.test(
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "",
);

function LiveDemoBanner({ client }: { client: ConvexReactClient }) {
  const open = useQuery(api.spaces.roomsOpen, {}) ?? (OPEN_LANE || undefined);
  return (
    <DemoBanner
      onJoinWaitlist={(email) => client.mutation(api.waitlist.join, { email })}
      onMakeSpace={
        open ? () => window.dispatchEvent(new Event(MAKE_SPACE_EVENT)) : undefined
      }
      pending={open === undefined}
    />
  );
}

function MissingConvexConfig() {
  return (
    <main className="convex-config-missing" data-data-mode="missing">
      <div>
        <span aria-hidden="true">✦</span>
        <strong>Convex isn’t connected</strong>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, then run{" "}
          <code>npm run dev:backend</code> and <code>npm run dev</code>.
        </p>
        <small>
          Need the visual-only prototype? Add <code>?mock=1</code>.
        </small>
      </div>
    </main>
  );
}

/**
 * Mounted by the router for every `#/…` route (spaces, invites, labs).
 * The hash keeps driving App exactly as before — this is the compat
 * branch, not a rewrite.
 */
export function LegacyMount({
  mode,
  convexClient,
}: {
  mode: DataMode;
  convexClient: ConvexReactClient | null;
}) {
  const app = (
    <Suspense fallback={<EntrySlip label="opening the space" />}>
      <LegacyApp />
    </Suspense>
  );

  if (mode === "live" && convexClient) {
    return (
      <>
        {/* Guests sign in silently here — the legacy canvas works for
            everyone (§1). New public routes never mount this bridge. */}
        <AuthIdentityBridge />
        <LiveDemoBanner client={convexClient} />
        {app}
        <UpdateNudge />
      </>
    );
  }
  if (mode === "mock") {
    return (
      <>
        <DemoBanner />
        {app}
      </>
    );
  }
  return <MissingConvexConfig />;
}
