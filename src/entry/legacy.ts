/* ------------------------------------------------------------------
 * Legacy `#/…` link classification — Assignment E1.
 *
 * Old PearNotes/OurSpaces links must keep working without letting the
 * hash namespace own the homepage:
 *
 *   `#/learn*`            → translated into the clean `/app*` namespace
 *                           (the old gated hash shell's routes map onto
 *                           Engineer 2's pathname route table)
 *   `#/space/:slug`,      → the legacy hash-routed app mounts and the
 *   `#/join/:slug` (invites), hash keeps driving it — invite links and
 *   and every other       every legacy fallthrough behave exactly as
 *   `#/…` route           before
 *   `#anchor` (no slash)  → an in-page anchor, NOT a route — the landing
 *                           page can use `#how-it-works` freely
 * ------------------------------------------------------------------ */

export type LegacyHash =
  /** `#/learn*` — translate into `/app*` (path + query included). */
  | { kind: "learn"; appUrl: string }
  /** Any other `#/…` — mount the legacy app; the hash drives it. */
  | { kind: "legacy" }
  /** `#foo` — a plain anchor, not a route. */
  | { kind: "anchor" }
  /** No hash (or a bare `#`). */
  | { kind: "none" };

export function classifyHash(hash: string): LegacyHash {
  if (!hash || hash === "#") return { kind: "none" };
  if (!hash.startsWith("#/")) return { kind: "anchor" };
  const appUrl = learnHashToAppUrl(hash);
  if (appUrl) return { kind: "learn", appUrl };
  return { kind: "legacy" };
}

/**
 * `#/learn*` → `/app*`. Params that mean something on both sides are
 * carried over (`job`, `fixtures`); `subject` is consumed into the
 * canonical nested lesson path; the old `pearnotes` gate flag is
 * dropped — the clean URL replaces it.
 */
export function learnHashToAppUrl(hash: string): string | null {
  const raw = hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segs = pathPart.split("/");
  if (segs[0] !== "learn") return null;

  const params = new URLSearchParams(queryPart ?? "");
  const seg = (index: number) => decodeURIComponent(segs[index] ?? "");

  const carry = new URLSearchParams();
  const job = params.get("job");
  const subject = params.get("subject");

  let pathname = "/app";

  if (segs[1] === "path" && segs[2]) {
    pathname = `/app/subjects/${encodeURIComponent(seg(2))}`;
  } else if (segs[1] === "sources" && segs[2]) {
    pathname = `/app/subjects/${encodeURIComponent(seg(2))}/sources`;
    if (job) carry.set("job", job);
  } else if (segs[1] === "lesson" && segs[2]) {
    const lessonId = encodeURIComponent(seg(2));
    pathname = subject
      ? `/app/subjects/${encodeURIComponent(subject)}/lessons/${lessonId}`
      : `/app/lessons/${lessonId}`;
  }
  /* `#/learn` itself and `#/learn/<unknown>` — the old shell fell
     through to home; the new app does the same rather than 404ing a
     shared link. */

  if (params.get("fixtures") === "1") carry.set("fixtures", "1");

  const query = carry.toString();
  return pathname + (query ? `?${query}` : "");
}
