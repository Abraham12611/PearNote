/**
 * Issue #54 coordinator review — regression tests for the two pinned
 * rules of the /app shell:
 *
 *   1. `demoMode` (explicit prop, never URL-inferred) fails closed:
 *      zero personal Convex reads AND zero mutations mount.
 *   2. `?fixtures=1` alone is never demo authorization on a real /app
 *      route — fixtures only run under the explicit demo context or a
 *      dev build.
 *   3. Account transitions: every authenticated user id keys a distinct
 *      private-state subtree — no cross-account flash, ever.
 */
import { describe, expect, test } from "vitest";
import {
  accountStateKey,
  appAccessPolicy,
} from "../src/pearnotes/shell/app/policy";

describe("demo access — appAccessPolicy", () => {
  test("demoMode suppresses every live read AND write, even with a live backend", () => {
    const p = appAccessPolicy({ demoMode: true, liveBackend: true, dev: false });
    expect(p.liveReads).toBe(false);
    expect(p.liveMutations).toBe(false);
    expect(p.authGate).toBe(false);
    /* Local fixtures are the demo's only data source. */
    expect(p.fixturesAllowed).toBe(true);
  });

  test("demoMode suppresses live surfaces with no backend too", () => {
    const p = appAccessPolicy({ demoMode: true, liveBackend: false, dev: false });
    expect(p.liveReads).toBe(false);
    expect(p.liveMutations).toBe(false);
  });

  test("production /app never treats ?fixtures=1 alone as demo authorization", () => {
    /* No demoMode prop, production build — the URL flag can't inject
       fixture content into a real account. */
    const p = appAccessPolicy({ demoMode: false, liveBackend: true, dev: false });
    expect(p.fixturesAllowed).toBe(false);
    /* …while real personal reads/writes stay fully on. */
    expect(p.liveReads).toBe(true);
    expect(p.liveMutations).toBe(true);
    expect(p.authGate).toBe(true);
  });

  test("dev builds are the explicitly authorized fixture context", () => {
    const p = appAccessPolicy({ demoMode: false, liveBackend: true, dev: true });
    expect(p.fixturesAllowed).toBe(true);
    expect(p.liveReads).toBe(true);
  });

  test("live surfaces need both: backend present AND not demo", () => {
    const p = appAccessPolicy({ demoMode: false, liveBackend: false, dev: false });
    expect(p.liveReads).toBe(false);
    expect(p.liveMutations).toBe(false);
    expect(p.fixturesAllowed).toBe(false);
  });
});

describe("account transitions — accountStateKey", () => {
  test("distinct users get distinct private-state keys", () => {
    expect(accountStateKey("user-a")).not.toBe(accountStateKey("user-b"));
  });

  test("the same user keeps the same key (no needless remount)", () => {
    expect(accountStateKey("user-a")).toBe(accountStateKey("user-a"));
  });

  test("unresolved/null identity never shares a user's key", () => {
    expect(accountStateKey(null)).not.toBe(accountStateKey("user-a"));
    expect(accountStateKey(undefined)).not.toBe(accountStateKey("user-a"));
    /* …and null itself has one fixed bucket, not a random one. */
    expect(accountStateKey(null)).toBe(accountStateKey(undefined));
  });
});
