/**
 * The PearNotes experience gate. Phase 00 keeps the legacy OurSpaces app as
 * the default; the new shell only answers at `#/learn*` when the flag is on.
 *
 * Flag sources, in the same order the rest of the app reads toggles
 * (src/live/dataMode.ts `explicitMockRequested`, App.tsx `demoModeRequested`):
 *   - `?pearnotes=1` on the query string, or `&pearnotes=1` inside the hash
 *   - `VITE_PEARNOTES=1` at build time (per-environment default)
 *
 * With the flag off, every URL — including `#/learn` — behaves exactly as it
 * did before this boundary existed.
 */
export function pearnotesEnabled(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hashSearch = new URLSearchParams(
    window.location.hash.split("?")[1] ?? "",
  );

  return (
    search.get("pearnotes") === "1" ||
    hashSearch.get("pearnotes") === "1" ||
    import.meta.env.VITE_PEARNOTES === "1"
  );
}

/**
 * True when the current hash names the PearNotes shell AND the flag is on.
 * `#/learn` maps to the legacy "space" route in `routeFromHash`, so App.tsx
 * checks this right where the space-route render begins — an early return,
 * not a reroute, so the legacy fallthrough is untouched.
 */
export function pearnotesShellRequested(): boolean {
  if (!pearnotesEnabled()) return false;
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return hash === "learn" || hash.startsWith("learn/");
}
