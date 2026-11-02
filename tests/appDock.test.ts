/**
 * Issue #64 — the /app dock is the actual OurSpaces `.space-rail`
 * adapted, not a second dock. These tests pin the nav contract:
 * every one of the seven destinations exists in a native slot and
 * routes to a parseable `/app` path.
 */
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DOCK_CREATE,
  DOCK_ICONS,
  DOCK_ITEMS,
} from "../src/pearnotes/shell/app/PearNotesDock";
import { appSettingsPath } from "../src/pearnotes/shell/app/routes";
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

  test("every tile face is the commissioned SVG set — no text/emoji glyphs", () => {
    const markups = DOCK_ITEMS.map((item) =>
      renderToStaticMarkup(DOCK_ICONS[item.key]),
    );
    for (const markup of markups) {
      expect(markup).toContain("<svg");
      expect(markup).toContain('aria-hidden="true"');
      /* platform-dependent glyph regression — none of the old
         text/emoji or the \\u000e control-char bug may come back */
      expect(markup).not.toContain("\u000e");
    }
    /* …and each icon is actually distinct art */
    expect(new Set(markups).size).toBe(DOCK_ITEMS.length);
  });

  test("settings navigates and reports its own active state", () => {
    const route = appRouteFromPathname(appSettingsPath());
    expect(route.kind).toBe("settings");
    expect(appNavKeyFor(route)).toBe("settings");
  });
});
