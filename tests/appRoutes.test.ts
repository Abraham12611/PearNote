/**
 * Issue #54 — the `/app` pathname route table that feeds
 * `PearNotesAppRoutes({ pathname, navigate })`. Pure parsing: every
 * member of the sitemap, the two lesson forms, not-found and the
 * outside-the-app boundary.
 */
import { describe, expect, test } from "vitest";
import {
  appHomePath,
  appLessonPath,
  appNavKeyFor,
  appRouteFromPathname,
  appSourcesPath,
  appSubjectPath,
} from "../src/pearnotes/shell/app/routes";

describe("appRouteFromPathname", () => {
  test("non-/app paths are outside — the public root owns them", () => {
    expect(appRouteFromPathname("/")).toEqual({ kind: "outside" });
    expect(appRouteFromPathname("/signin")).toEqual({ kind: "outside" });
    expect(appRouteFromPathname("/space/crew")).toEqual({ kind: "outside" });
    expect(appRouteFromPathname("/apple")).toEqual({ kind: "outside" });
  });

  test("the rail destinations", () => {
    expect(appRouteFromPathname("/app")).toEqual({ kind: "home" });
    expect(appRouteFromPathname("/app/")).toEqual({ kind: "home" });
    expect(appRouteFromPathname("/app/home")).toEqual({ kind: "home" });
    expect(appRouteFromPathname("/app/learn")).toEqual({ kind: "learn" });
    expect(appRouteFromPathname("/app/new")).toEqual({ kind: "new" });
    expect(appRouteFromPathname("/app/library")).toEqual({ kind: "library" });
    expect(appRouteFromPathname("/app/groups")).toEqual({ kind: "groups" });
    expect(appRouteFromPathname("/app/achievements")).toEqual({
      kind: "achievements",
    });
    expect(appRouteFromPathname("/app/shelf")).toEqual({
      kind: "achievements",
    });
    expect(appRouteFromPathname("/app/profile")).toEqual({ kind: "profile" });
    expect(appRouteFromPathname("/app/settings")).toEqual({ kind: "settings" });
  });

  test("subject path drawer — bare and explicit /path", () => {
    expect(appRouteFromPathname("/app/subjects/s1")).toEqual({
      kind: "path",
      subjectId: "s1",
    });
    expect(appRouteFromPathname("/app/subjects/s1/path")).toEqual({
      kind: "path",
      subjectId: "s1",
    });
  });

  test("sources intake carries the in-flight job id", () => {
    expect(appRouteFromPathname("/app/subjects/s1/sources")).toEqual({
      kind: "sources",
      subjectId: "s1",
      jobId: undefined,
    });
    expect(
      appRouteFromPathname("/app/subjects/s1/sources?job=j9"),
    ).toEqual({ kind: "sources", subjectId: "s1", jobId: "j9" });
  });

  test("lessons — nested (keeps subject context) and bare (?subject=)", () => {
    expect(appRouteFromPathname("/app/subjects/s1/lessons/l1")).toEqual({
      kind: "lesson",
      subjectId: "s1",
      lessonId: "l1",
    });
    expect(appRouteFromPathname("/app/lessons/l1?subject=s1")).toEqual({
      kind: "lesson",
      lessonId: "l1",
      subjectId: "s1",
    });
    expect(appRouteFromPathname("/app/lessons/l1")).toEqual({
      kind: "lesson",
      lessonId: "l1",
      subjectId: undefined,
    });
  });

  test("encoded ids and unknown paths", () => {
    expect(appRouteFromPathname("/app/subjects/a%20b")).toEqual({
      kind: "path",
      subjectId: "a b",
    });
    expect(appRouteFromPathname("/app/nope")).toEqual({
      kind: "notfound",
      path: "/app/nope",
    });
    expect(appRouteFromPathname("/app/subjects")).toEqual({
      kind: "notfound",
      path: "/app/subjects",
    });
  });
});

describe("nav key + builders", () => {
  test("the whole subject/lesson flow highlights Learn", () => {
    expect(appNavKeyFor({ kind: "home" })).toBe("home");
    expect(appNavKeyFor({ kind: "new" })).toBe("home");
    expect(appNavKeyFor({ kind: "learn" })).toBe("learn");
    expect(appNavKeyFor({ kind: "path", subjectId: "s" })).toBe("learn");
    expect(appNavKeyFor({ kind: "sources", subjectId: "s" })).toBe("learn");
    expect(appNavKeyFor({ kind: "lesson", lessonId: "l" })).toBe("learn");
    expect(appNavKeyFor({ kind: "achievements" })).toBe("achievements");
  });

  test("builders produce parseable paths (round-trip)", () => {
    expect(appRouteFromPathname(appHomePath()).kind).toBe("home");
    expect(
      appRouteFromPathname(appSubjectPath("s1")),
    ).toEqual({ kind: "path", subjectId: "s1" });
    expect(
      appRouteFromPathname(appSourcesPath("s1", "j9")),
    ).toEqual({ kind: "sources", subjectId: "s1", jobId: "j9" });
    expect(
      appRouteFromPathname(appLessonPath("l1", "s1")),
    ).toEqual({ kind: "lesson", subjectId: "s1", lessonId: "l1" });
    expect(
      appRouteFromPathname(appLessonPath("l1")),
    ).toEqual({ kind: "lesson", lessonId: "l1", subjectId: undefined });
  });
});
