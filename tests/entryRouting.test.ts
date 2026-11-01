/**
 * Assignment E1 — the public pathname router's pure layer.
 *
 * Covers the three jobs that must not regress:
 *   - `/` never silently lands in a workspace (landing, not a redirect)
 *   - `#/learn*` and other `#/…` links keep resolving (translate or
 *     legacy mount); plain `#anchor` links are NOT routes
 *   - `/demo*` stays visibly inside the demo namespace with `?fixtures=1`
 */
import { describe, expect, test } from "vitest";
import {
  classifyHash,
  learnHashToAppUrl,
} from "../src/entry/legacy";
import {
  appPathFromDemo,
  demoUrlFromAppTo,
  ensureDemoFixtures,
  isAppPathname,
  isDemoPathname,
  safeNextPath,
} from "../src/entry/paths";
import { routeFromLocation } from "../src/entry/router";

describe("routeFromLocation — clean pathnames", () => {
  const loc = (pathname: string, search = "", hash = "") => ({
    pathname,
    search,
    hash,
  });

  test("bare / is the public landing — never a workspace redirect", () => {
    expect(routeFromLocation(loc("/"))).toEqual({ kind: "landing" });
    expect(routeFromLocation(loc("/", "?utm=x"))).toEqual({ kind: "landing" });
    /* a bare "#" fragment is not a legacy route — still the landing */
    expect(routeFromLocation(loc("/", "", "#"))).toEqual({ kind: "landing" });
  });

  test("auth routes", () => {
    expect(routeFromLocation(loc("/auth/sign-in"))).toEqual({
      kind: "sign-in",
    });
    expect(routeFromLocation(loc("/auth/sign-up"))).toEqual({
      kind: "sign-up",
    });
  });

  test("/app subtree is passed through with its query", () => {
    expect(routeFromLocation(loc("/app"))).toEqual({
      kind: "app",
      pathname: "/app",
    });
    expect(
      routeFromLocation(loc("/app/subjects/abc/sources", "?job=j9")),
    ).toEqual({ kind: "app", pathname: "/app/subjects/abc/sources?job=j9" });
  });

  test("/demo subtree keeps its own pathname + search", () => {
    expect(routeFromLocation(loc("/demo"))).toEqual({
      kind: "demo",
      demoPathname: "/demo",
      search: "",
    });
    expect(routeFromLocation(loc("/demo/learn", "?fixtures=1"))).toEqual({
      kind: "demo",
      demoPathname: "/demo/learn",
      search: "?fixtures=1",
    });
  });

  test("unknown paths get a not-found recovery", () => {
    expect(routeFromLocation(loc("/nope"))).toEqual({
      kind: "notfound",
      pathname: "/nope",
    });
    expect(routeFromLocation(loc("/application"))).toEqual({
      kind: "notfound",
      pathname: "/application",
    });
    expect(routeFromLocation(loc("/demos"))).toEqual({
      kind: "notfound",
      pathname: "/demos",
    });
  });
});

describe("legacy hash classification", () => {
  test("#/learn* translates into /app*", () => {
    expect(learnHashToAppUrl("#/learn")).toBe("/app");
    expect(learnHashToAppUrl("#/learn/path/s1")).toBe("/app/subjects/s1");
    expect(learnHashToAppUrl("#/learn/sources/s1?job=j7")).toBe(
      "/app/subjects/s1/sources?job=j7",
    );
    expect(learnHashToAppUrl("#/learn/lesson/l5")).toBe("/app/lessons/l5");
    expect(learnHashToAppUrl("#/learn/lesson/l5?subject=s1")).toBe(
      "/app/subjects/s1/lessons/l5",
    );
    expect(learnHashToAppUrl("#/learn?pearnotes=1")).toBe("/app");
    expect(learnHashToAppUrl("#/learn/anything")).toBe("/app");
    /* fixtures links stay labelled fixtures in the new namespace */
    expect(learnHashToAppUrl("#/learn?fixtures=1")).toBe("/app?fixtures=1");
  });

  test("encoded ids survive translation", () => {
    expect(learnHashToAppUrl("#/learn/path/my%20subject")).toBe(
      "/app/subjects/my%20subject",
    );
  });

  test("other #/… hashes mount the legacy app — spaces, joins, labs", () => {
    for (const hash of [
      "#/space/crew",
      "#/join/the-crew",
      "#/about",
      "#/me",
      "#/mail",
      "#/play",
      "#/cursors",
      "#/unknown-fallthrough",
    ]) {
      expect(classifyHash(hash)).toEqual({ kind: "legacy" });
    }
  });

  test("plain #anchors are not routes", () => {
    expect(classifyHash("#how-it-works")).toEqual({ kind: "anchor" });
    expect(classifyHash("#")).toEqual({ kind: "none" });
    expect(classifyHash("")).toEqual({ kind: "none" });
  });

  test("a #/… hash wins over the pathname — legacy deep links resolve", () => {
    expect(
      routeFromLocation({ pathname: "/", search: "", hash: "#/space/crew" }),
    ).toEqual({ kind: "legacy" });
    expect(
      routeFromLocation({
        pathname: "/demo",
        search: "?fixtures=1",
        hash: "#/join/crew",
      }),
    ).toEqual({ kind: "legacy" });
  });

  test("#/learn hashes become /app routes", () => {
    expect(
      routeFromLocation({
        pathname: "/",
        search: "",
        hash: "#/learn/path/s1",
      }),
    ).toEqual({ kind: "app", pathname: "/app/subjects/s1" });
  });
});

describe("demo namespace translation", () => {
  test("demo paths map onto /app for the mounted component", () => {
    expect(appPathFromDemo("/demo")).toBe("/app");
    expect(appPathFromDemo("/demo/learn")).toBe("/app/learn");
    expect(appPathFromDemo("/demo/subjects/x/lessons/y")).toBe(
      "/app/subjects/x/lessons/y",
    );
  });

  test("app navigations stay inside /demo and keep fixtures=1", () => {
    expect(demoUrlFromAppTo("/app/learn")).toBe("/demo/learn?fixtures=1");
    expect(demoUrlFromAppTo("/app/subjects/s1/sources?job=j2")).toBe(
      "/demo/subjects/s1/sources?job=j2&fixtures=1",
    );
  });

  test("ensureDemoFixtures preserves other params", () => {
    expect(ensureDemoFixtures("")).toBe("?fixtures=1");
    expect(ensureDemoFixtures("?job=j2")).toBe("?job=j2&fixtures=1");
    expect(ensureDemoFixtures("?fixtures=1&job=j2")).toBe(
      "?fixtures=1&job=j2",
    );
  });
});

describe("path guards", () => {
  test("isAppPathname / isDemoPathname match the subtree only", () => {
    expect(isAppPathname("/app")).toBe(true);
    expect(isAppPathname("/app/learn")).toBe(true);
    expect(isAppPathname("/apple")).toBe(false);
    expect(isDemoPathname("/demo")).toBe(true);
    expect(isDemoPathname("/demo/x")).toBe(true);
    expect(isDemoPathname("/democracy")).toBe(false);
  });

  test("safeNextPath only allows same-origin absolute paths", () => {
    expect(safeNextPath("/app")).toBe("/app");
    expect(safeNextPath("/demo/learn?fixtures=1")).toBe(
      "/demo/learn?fixtures=1",
    );
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
