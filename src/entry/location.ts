/* ------------------------------------------------------------------
 * The site's location store — Assignment E1.
 *
 * A tiny pathname router on the History API: pushState for in-app
 * navigation, popstate for back/forward, hashchange so a legacy `#/…`
 * assignment (e.g. Engineer 2's `onNavigateExternal`) re-enters the
 * legacy branch. `navigate()` notifies listeners manually because
 * pushState doesn't fire popstate.
 *
 * `getSnapshot` must be referentially stable — the cached `current`
 * object only changes when the location actually does (infinite-loop
 * guard, React docs on useSyncExternalStore).
 * ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

export interface LocationSnapshot {
  pathname: string;
  search: string;
  hash: string;
}

function readLocation(): LocationSnapshot {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

let current: LocationSnapshot = readLocation();
const listeners = new Set<() => void>();

function handleChange() {
  current = readLocation();
  for (const listener of listeners) listener();
}

/* One module-level pair of window listeners — the store outlives every
   component that reads it. */
if (typeof window !== "undefined") {
  window.addEventListener("popstate", handleChange);
  window.addEventListener("hashchange", handleChange);
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const SERVER_SNAPSHOT: LocationSnapshot = {
  pathname: "/",
  search: "",
  hash: "",
};

/**
 * The current location. Every subscription path that can change the
 * rendered route — popstate, hashchange, and `navigate`'s manual emit —
 * funnels through the same store.
 */
export function useLocation(): LocationSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => SERVER_SNAPSHOT,
  );
}

/**
 * The only way app code should move around the site. `to` is an absolute
 * site pathname (`/app/…`, `/demo/…`, `/auth/…`, `/`) or a legacy hash
 * href (`#/space/crew` — stored as `/#/space/crew` so back/forward and
 * refresh resolve identically).
 */
export function navigate(to: string, options?: { replace?: boolean }) {
  const url = to.startsWith("#") ? `/${to}` : to;
  if (options?.replace) {
    window.history.replaceState(window.history.state, "", url);
  } else {
    window.history.pushState(null, "", url);
  }
  handleChange();
  if (!url.includes("#")) window.scrollTo(0, 0);
}
