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

const SERVER_SNAPSHOT: LocationSnapshot = {
  pathname: "/",
  search: "",
  hash: "",
};

let current: LocationSnapshot =
  typeof window === "undefined" ? SERVER_SNAPSHOT : readLocation();
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
 * Mode params that must survive in-app navigation (E1 review): dropping
 * `mock`/`demo`/`take` mid-flow flips a dev or labelled surface back to
 * live behavior silently. Params already present in the target URL win;
 * these only fill in what's missing. `fixtures` is deliberately absent —
 * it's a per-namespace flag owned by the demo normalizer, never a global.
 */
export const MODE_PARAMS = ["mock", "demo", "take", "pearnotes"] as const;

export function mergeModeParams(to: string, currentSearch: string): string {
  const [path, query] = to.split("?");
  const merged = new URLSearchParams(query ?? "");
  const current = new URLSearchParams(currentSearch);
  for (const key of MODE_PARAMS) {
    const value = current.get(key);
    if (value !== null && !merged.has(key)) merged.set(key, value);
  }
  const params = merged.toString();
  return path + (params ? `?${params}` : "");
}

/**
 * The only way app code should move around the site. `to` is an absolute
 * site pathname (`/app/…`, `/demo/…`, `/auth/…`, `/`) or a legacy hash
 * href (`#/space/crew` — stored as `/<current-search>#/space/crew` so
 * back/forward, refresh and the dev-mode flags all resolve identically).
 */
export function navigate(to: string, options?: { replace?: boolean }) {
  const url = to.startsWith("#")
    ? `/${window.location.search}${to}`
    : mergeModeParams(to, window.location.search);
  if (options?.replace) {
    window.history.replaceState(window.history.state, "", url);
  } else {
    window.history.pushState(null, "", url);
  }
  handleChange();
  if (!url.includes("#")) window.scrollTo(0, 0);
}
