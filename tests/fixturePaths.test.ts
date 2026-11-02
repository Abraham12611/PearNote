/**
 * Issue #61 — the blank-drawer bug: three fixture subjects shared ONE
 * sample path/lesson, so Algebra and Chemistry rendered an empty cream
 * panel. These tests pin the keyed contract: every fixture subject owns
 * a real path, and every node on every path deep-links to a real
 * lesson. A subject or node missing from the keyed maps is a bug, not
 * an empty state.
 */
import { describe, expect, test } from "vitest";
import {
  FIXTURE_LESSONS,
  FIXTURE_PATHS,
  FIXTURE_SUBJECTS,
} from "../src/pearnotes/ui/fixtures";
import { pathHasRenderableNodes } from "../src/pearnotes/ui/types";

function pathLessons(path: (typeof FIXTURE_PATHS)[string]) {
  return path.sections.flatMap((s) => s.units.flatMap((u) => u.lessons));
}

describe("keyed fixture coverage (#61)", () => {
  test("every fixture subject resolves its own path", () => {
    for (const subject of FIXTURE_SUBJECTS) {
      const path = FIXTURE_PATHS[subject.id];
      expect(path, `missing path for ${subject.id}`).toBeDefined();
      expect(path.subjectId).toBe(subject.id);
      expect(pathLessons(path).length).toBeGreaterThan(0);
    }
  });

  test("every node on every path resolves a deep-linkable lesson", () => {
    const ids = new Set<string>();
    for (const path of Object.values(FIXTURE_PATHS)) {
      for (const node of pathLessons(path)) {
        expect(ids.has(node.id), `duplicate lesson id ${node.id}`).toBe(false);
        ids.add(node.id);
        const lesson = FIXTURE_LESSONS[node.id];
        expect(lesson, `missing lesson for ${node.id}`).toBeDefined();
        expect(lesson.subjectId).toBe(path.subjectId);
        /* deep-link chrome needs a real verified position on the path */
        expect(lesson.stepIndex).toBeGreaterThanOrEqual(0);
        expect(lesson.stepCount).toBeGreaterThan(0);
      }
    }
  });

  test("every demo subject's path is in a state the drawer actually renders", () => {
    /* #61 review — `pathHasRenderableNodes` is the REAL gate both
       drawers use: `ready`/`needs_review` render nodes, everything
       else shows a status slip. Existence in the map is not enough —
       the status must render. */
    for (const subject of FIXTURE_SUBJECTS) {
      const path = FIXTURE_PATHS[subject.id];
      expect(
        pathHasRenderableNodes(path.status),
        `${subject.name} path status "${path.status}" renders no nodes`,
      ).toBe(true);
      expect(pathLessons(path).length).toBeGreaterThan(0);
    }
  });

  test("lesson summaries stay inside their own subject", () => {
    const subjectIds = new Set(FIXTURE_SUBJECTS.map((s) => s.id));
    for (const lesson of Object.values(FIXTURE_LESSONS)) {
      expect(subjectIds.has(lesson.subjectId)).toBe(true);
      expect(lesson.subjectName.length).toBeGreaterThan(0);
    }
  });
});
