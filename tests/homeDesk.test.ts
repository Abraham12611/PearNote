/**
 * Issue #64b — the Home desk adapts `/#/space/crew/knows` components
 * (.room-knows, .knows-sheets, .knows-people, .knows-empty) rather than
 * inventing a dashboard system, and every empty state stays honest.
 * These tests pin the structural contract on the rendered markup.
 */
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HomeDesk } from "../src/pearnotes/shell/app/HomeDesk";
import type { PearNotesData } from "../src/pearnotes/shell/types";

const EMPTY: PearNotesData = {
  status: "ready",
  subjects: [],
  resume: null,
  subjectFor: () => null,
  pathFor: () => null,
  lessonFor: () => null,
};

const SUBJECT = {
  id: "sub-1",
  name: "cell biology",
  avatar: "biology" as never,
  color: "#7c5cff",
  status: "ready" as const,
};

const props = {
  data: EMPTY,
  resume: null,
  learnerName: "demo learner",
  onLearn: () => {},
  onCreateSubject: () => {},
  onOpenSubject: () => {},
  onResume: () => {},
};

describe("HomeDesk — /knows-adapted Home (#64b)", () => {
  test("uses the original knows grammar, not a new dashboard system", () => {
    const html = renderToStaticMarkup(createElement(HomeDesk, props));
    /* the real knows classes carry the visuals — no parallel system */
    for (const cls of [
      "room-knows",
      "knows-side-paper",
      "knows-scroll",
      "knows-head",
      "knows-kicker",
      "knows-sheets",
      "knows-sec",
      "knows-people",
      "knows-empty",
      "knows-foot",
    ]) {
      expect(html, `missing .${cls}`).toContain(cls);
    }
  });

  test("a fresh account is honest — no seeded subjects, resume or friends", () => {
    const html = renderToStaticMarkup(createElement(HomeDesk, props));
    expect(html).not.toContain("desk-subject-");
    expect(html).not.toContain("desk-resume");
    /* every section exists but each shows its honest empty, not data */
    for (const id of [
      "desk-continue",
      "desk-week",
      "desk-subjects",
      "desk-activity",
      "desk-shelf",
      "desk-friends",
    ]) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    expect(html).toContain("nothing is seeded");
    expect(html).toContain("deferred");
  });

  test("real subjects + resume render their own data", () => {
    const html = renderToStaticMarkup(
      createElement(HomeDesk, {
        ...props,
        data: { ...EMPTY, subjects: [SUBJECT] },
        resume: {
          lessonId: "l1",
          lessonTitle: "Diffusion and osmosis",
          subjectName: "cell biology",
        },
      }),
    );
    expect(html).toContain('data-testid="desk-subject-sub-1"');
    expect(html).toContain("cell biology");
    expect(html).toContain('data-testid="desk-resume"');
    expect(html).toContain("Diffusion and osmosis");
  });
});
