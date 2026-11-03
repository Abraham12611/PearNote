/**
 * Home desk — the owner-approved "your desk" mockup on the /knows paper
 * grammar. Every module is desk-aggregate driven; with no desk backend a
 * fresh account gets honest empties, never invented records.
 */
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HomeDesk } from "../src/pearnotes/shell/app/HomeDesk";
import type { DeskData, PearNotesData } from "../src/pearnotes/shell/types";

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

const DESK: DeskData = {
  learner: { name: "sam" },
  today: [{ id: "t1", title: "Cell biology", minutes: 30, done: true }],
  focus: [{ id: "f1", text: "Finish Diffusion and osmosis", done: true }],
  studiedDays: ["2026-11-01"],
  streakDays: 3,
  upcoming: [{ id: "u1", kind: "quiz", title: "Unit 2 quiz", startTs: Date.now() + 86400000 }],
  achievements: [{ id: "a1", key: "streak3", title: "study streak", detail: "3 days", icon: "sprout", unseen: true }],
  unseenAchievements: 1,
  activity: [{ id: "e1", actorName: "Maya", kind: "lesson", text: "completed Cell biology — Unit 1", happenedAt: Date.now() }],
  crew: [{ userId: "u-maya", name: "Maya" }],
  crewNote: { authorName: "Maya", text: "anyone up for a study session later?", happenedAt: Date.now() },
  xpTotal: 405,
  sourceCount: 1,
  revisit: [{ objectiveId: "o1", subjectId: "sub-1", statement: "Predict water movement across a membrane", subjectName: "Cell biology", lastAt: Date.now() - 8 * 86400000 }],
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

describe("HomeDesk — the mockup desk", () => {
  test("keeps the knows paper grammar", () => {
    const html = renderToStaticMarkup(createElement(HomeDesk, props));
    for (const cls of ["room-knows", "knows-side-paper", "knows-scroll", "knows-kicker"]) {
      expect(html, `missing .${cls}`).toContain(cls);
    }
    expect(html).toContain("your desk");
  });

  test("a fresh account is honest — every module, zero invented records", () => {
    const html = renderToStaticMarkup(createElement(HomeDesk, props));
    expect(html).not.toContain("desk-subject-");
    expect(html).not.toContain("desk-resume");
    for (const id of [
      "desk-continue", "desk-subjects", "desk-focus", "desk-session",
      "desk-calendar", "desk-achievements", "desk-crew", "desk-activity", "desk-upcoming",
    ]) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    for (const honest of ["nothing in progress", "no subjects yet", "no focus yet", "no earned stickers", "just you so far", "nothing to report", "nothing scheduled"]) {
      expect(html, `missing honest empty "${honest}"`).toContain(honest);
    }
  });

  test("each subject tile is exactly one accessible button — no nesting", () => {
    const html = renderToStaticMarkup(
      createElement(HomeDesk, { ...props, data: { ...EMPTY, subjects: [SUBJECT] } }),
    );
    const tile = html.match(/<button[^>]*data-testid="desk-subject-sub-1"[^>]*>([\s\S]*?)<\/button>/);
    expect(tile).not.toBeNull();
    expect(tile![1]).not.toContain("<button");
  });

  test("a real desk renders seeded/aggregate data in every module", () => {
    const html = renderToStaticMarkup(
      createElement(HomeDesk, {
        ...props,
        desk: DESK,
        data: { ...EMPTY, subjects: [SUBJECT], resume: { lessonId: "l1", lessonTitle: "Diffusion and osmosis", subjectName: "cell biology" } },
        resume: { lessonId: "l1", lessonTitle: "Diffusion and osmosis", subjectName: "cell biology" },
      }),
    );
    for (const text of [
      "Diffusion and osmosis", "cell biology", "Cell biology",
      "Finish Diffusion and osmosis", "study streak", "Unit 2 quiz",
      "Maya", "anyone up for a study session later?",
      "completed Cell biology — Unit 1", "3", "1 new",
    ]) {
      expect(html, `missing "${text}"`).toContain(text);
    }
  });
});
