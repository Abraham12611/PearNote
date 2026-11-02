/**
 * Issue #64 — the /app dock is the actual OurSpaces `.space-rail`
 * adapted, not a second dock. These tests pin the nav contract:
 * every one of the seven destinations exists in a native slot and
 * routes to a parseable `/app` path.
 */
import { describe, expect, test } from "vitest";
import {
  DOCK_CREATE,
  DOCK_ITEMS,
} from "../src/pearnotes/shell/app/PearNotesDock";
import {
  appNavKeyFor,
  appRouteFromPathname,
  type AppNavKey,
} from "../src/pearnotes/shell/app/routes";

const ALL_NAV: AppNavKey[] = [
  "home",
  "learn",
  "library",
  "groups",
  "achievements",
  "profile",
  "settings",
];

describe("PearNotesDock destinations (#64)", () => {
  test("all seven nav keys are reachable — six tiles + settings slot", () => {
    const covered = new Set(DOCK_ITEMS.map((d) => d.key));
    /* settings rides the native rail-you slot, so six list tiles */
    for (const key of ALL_NAV) {
      expect(
        covered.has(key) || key === "settings",
        `${key} has no dock destination`,
      ).toBe(true);
    }
    expect(DOCK_ITEMS).toHaveLength(6);
  });

  test("every destination routes to a parseable /app path", () => {
    for (const item of DOCK_ITEMS) {
      const to = item.to();
      expect(to.startsWith("/app"), `${item.key} → ${to}`).toBe(true);
      const route = appRouteFromPathname(to);
      expect(route.kind, `${item.key} → unparsed ${to}`).not.toBe("outside");
      expect(route.kind).not.toBe("notfound");
      expect(appNavKeyFor(route)).toBe(item.key);
    }
  });

  test("the dashed create tile navigates to the new-subject route", () => {
    expect(appRouteFromPathname(DOCK_CREATE.to()).kind).toBe("new");
  });

  test("no two tiles share a destination", () => {
    const paths = DOCK_ITEMS.map((d) => d.to());
    expect(new Set(paths).size).toBe(paths.length);
  });
});
