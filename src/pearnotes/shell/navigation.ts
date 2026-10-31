import { useSyncExternalStore } from "react";

/** The shell's sub-routes under `#/learn`. */
export type PearNotesRoute =
  | { kind: "home" }
  | { kind: "path"; subjectId: string }
  | { kind: "sources"; subjectId: string }
  | { kind: "lesson"; lessonId: string };

/**
 * Hash parsing/building for the shell's `#/learn*` namespace. Hash-based like
 * the rest of the app (src/lib/routes.ts), so browser back/forward works
 * through the same `hashchange` listener App already owns.
 *
 *   #/learn                    → home (picker is a modal, not a route)
 *   #/learn/path/<subjectId>   → learning-path drawer over home
 *   #/learn/lesson/<lessonId>  → full lesson canvas
 */
export function pearnotesRouteFromHash(): PearNotesRoute {
  const hash = window.location.hash
    .replace(/^#\/?/, "")
    .split("?")[0]
    .split("/");

  if (hash[0] !== "learn") return { kind: "home" };

  if (hash[1] === "path" && hash[2]) {
    return { kind: "path", subjectId: decodeURIComponent(hash[2]) };
  }
  if (hash[1] === "sources" && hash[2]) {
    return { kind: "sources", subjectId: decodeURIComponent(hash[2]) };
  }
  if (hash[1] === "lesson" && hash[2]) {
    return { kind: "lesson", lessonId: decodeURIComponent(hash[2]) };
  }
  return { kind: "home" };
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/**
 * The shell's current route. Subscribed directly to `hashchange` — App's own
 * `setRoute`/`setSpaceId` bail out on unchanged values, so moving between
 * `#/learn` sub-routes does NOT re-render the tree; this hook has to.
 */
export function usePearNotesRoute(): PearNotesRoute {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "#/learn",
  );
  const parts = hash.replace(/^#\/?/, "").split("?")[0].split("/");
  if (parts[0] === "learn" && parts[1] === "path" && parts[2]) {
    return { kind: "path", subjectId: decodeURIComponent(parts[2]) };
  }
  if (parts[0] === "learn" && parts[1] === "sources" && parts[2]) {
    return { kind: "sources", subjectId: decodeURIComponent(parts[2]) };
  }
  if (parts[0] === "learn" && parts[1] === "lesson" && parts[2]) {
    return { kind: "lesson", lessonId: decodeURIComponent(parts[2]) };
  }
  return { kind: "home" };
}
