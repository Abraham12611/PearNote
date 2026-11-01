import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
// the family board's layout; not imported from src/data/family.ts, which the Convex seed bundles
import "./data/family.css";
import { getDataMode } from "./live/dataMode.ts";
import { watchStandalone } from "./lib/standalone.ts";
import { AppRouter } from "./entry/AppRouter.tsx";
import "./index.css";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
const mode = getDataMode();

const convexClient = url ? new ConvexReactClient(url) : null!;
// the installed app (kitchen iPad): stay awake, reconnect after sleep (features/ipad.md)
if (mode === "live" && url) watchStandalone(convexClient);

const live = mode === "live" && Boolean(convexClient);

/* The whole site runs through AppRouter: `/` is the public landing,
   `/app` and `/demo` mount the PearNotes shell, and legacy `#/…` links
   still reach the inherited canvas (src/entry/). The auth provider
   wraps everything in live mode — but the silent guest sign-in now
   lives INSIDE the routes that want it (legacy canvas, demo), never
   on the landing or auth pages. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {live ? (
      <ConvexAuthProvider client={convexClient}>
        <ConvexQueryCacheProvider expiration={600_000}>
          <AppRouter mode={mode} live convexClient={convexClient} />
        </ConvexQueryCacheProvider>
      </ConvexAuthProvider>
    ) : (
      <AppRouter mode={mode} live={false} convexClient={convexClient} />
    )}
  </StrictMode>,
);
