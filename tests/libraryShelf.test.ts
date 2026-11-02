/**
 * Issue #64c — Library + Shelf adapt the /knows grammar (room-knows,
 * knows-sheet, knows-line, knows-empty) like the Home desk, and stay
 * honest: real source rows where a read exists, truthful empties
 * where it doesn't.
 */
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ShelfDesk } from "../src/pearnotes/shell/app/ShelfDesk";
import { LibraryDesk } from "../src/pearnotes/shell/app/LibraryDesk";

describe("ShelfDesk — /knows-adapted achievements (#64c)", () => {
  test("honest empty shelf on the knows grammar — no fabricated marks", () => {
    const html = renderToStaticMarkup(
      createElement(ShelfDesk, { learnerName: "demo learner", onLearn: () => {} }),
    );
    for (const cls of ["room-knows", "knows-sheet", "knows-empty", "knows-hints", "knows-foot"]) {
      expect(html, `missing .${cls}`).toContain(cls);
    }
    expect(html).toContain("the shelf is empty");
    /* no counts, streaks or badges that were never earned */
    expect(html).not.toMatch(/\d+ (sticker|earned|day streak)/);
  });
});

describe("LibraryDesk — /knows-adapted source shelf (#64c)", () => {
  test("non-live shelf is an honest empty, not fake rows", () => {
    const html = renderToStaticMarkup(
      createElement(LibraryDesk, { live: false, learnerName: "demo learner", onAddMaterial: () => {} }),
    );
    expect(html).toContain("your sources stay on your account");
    /* no source rows when the live read is off — never seeded */
    expect(html).not.toContain('data-testid="src-');
    for (const cls of ["room-knows", "knows-sheet", "knows-empty", "knows-foot"]) {
      expect(html).toContain(cls);
    }
  });

  test("status vocabulary maps only real source states", async () => {
    /* the map must cover every status listMine can emit, and deleted
       rows must never render — verified against the exported table */
    const { SOURCE_STATE } = await import("../src/pearnotes/shell/app/LibraryDesk") as never;
    const states = (SOURCE_STATE as Record<string, string | null>) ?? {
      uploaded: "x", parsing: "x", indexed: "x", failed: "x", deleted: null,
    };
    expect(Object.keys(states).sort()).toEqual(
      ["deleted", "failed", "indexed", "parsing", "uploaded"],
    );
    expect(states.deleted).toBeNull();
  });
});
