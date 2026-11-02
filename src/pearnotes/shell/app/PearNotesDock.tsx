/* ------------------------------------------------------------------
 * PearNotesDock — the actual OurSpaces dock adapted for `/app` (#64).
 *
 * This is not a new rail design: the DOM skeleton, class names and
 * motion vars are the SAME ones `src/components/Rail.tsx` renders for
 * `/#/space/*`, so the native geometry (80px floating rail → 76px
 * bottom dock), hover/tooltip behavior, staggered tile pop, dashed
 * create tile and "you" portrait all come from the original
 * implementation's CSS (src/index.css .space-rail family).
 *
 * The tile faces keep PearNotes' OWN commissioned icon set — the same
 * 7-stroke-linecap SVGs the first rail used — rendered inside the
 * original `.space-link` tiles in place of room emojis (per owner
 * review: custom icons, not platform-dependent text/emoji glyphs).
 * ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from "react";
import { MemberFace } from "../../../components/MemberFace";
import {
  appAchievementsPath,
  appGroupsPath,
  appHomePath,
  appLearnPath,
  appLibraryPath,
  appNewPath,
  appProfilePath,
  appSettingsPath,
  type AppNavKey,
} from "./routes";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The commissioned PearNotes icon set — same SVGs the first rail
 *  shipped, one per destination (settings uses the native gear already
 *  on `.rail-you`). `aria-hidden` because every tile has `aria-label`. */
export const DOCK_ICONS: Record<Exclude<AppNavKey, "settings">, ReactNode> = {
  home: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M18 50 48 22l30 28" />
      <path {...STROKE} d="M28 48v26h40V48" />
      <path {...STROKE} d="M42 74V60h12v14" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M48 14l7 24 24 7-24 7-7 24-7-24-24-7 24-7z" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M26 18h14v60H26zM46 18h14l10 60H56z" />
    </svg>
  ),
  groups: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <circle {...STROKE} cx="36" cy="38" r="13" />
      <circle {...STROKE} cx="62" cy="34" r="10" />
      <path {...STROKE} d="M16 76c2-14 10-21 20-21s18 7 20 21" />
      <path {...STROKE} d="M60 56c9 1 15 8 17 20" />
    </svg>
  ),
  achievements: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M30 16h36v16c0 12-8 20-18 20s-18-8-18-20z" />
      <path {...STROKE} d="M30 22H16c0 12 6 18 16 20M66 22h14c0 12-6 18-16 20" />
      <path {...STROKE} d="M48 52v12M34 78h28M40 64h16l4 14H36z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <circle {...STROKE} cx="48" cy="34" r="15" />
      <path {...STROKE} d="M20 78c4-16 14-24 28-24s24 8 28 24" />
    </svg>
  ),
};

export interface DockItem {
  key: AppNavKey;
  label: string;
  /** native .space-link tile colour field */
  color: string;
  /** icon ink — the SVGs stroke `currentColor`; light tiles take ink,
   *  saturated tiles take paper white. */
  ink: string;
  /** absolute /app path builder — the only thing navigate() receives. */
  to: () => string;
  /** optional tooltip tail, same role as SpaceMeta.preview. */
  hint?: string;
}

/** The six list tiles — settings rides the native "you" slot at the
 *  foot, so all seven destinations exist in native positions. */
export const DOCK_ITEMS: DockItem[] = [
  { key: "home", label: "home", color: "#c6f750", ink: "#1d1712", to: appHomePath, hint: "your desk" },
  { key: "learn", label: "learn", color: "#7c5cff", ink: "#fffaf2", to: appLearnPath, hint: "pick a subject" },
  { key: "library", label: "library", color: "#ffb03a", ink: "#1d1712", to: appLibraryPath },
  { key: "groups", label: "groups", color: "#13b8a6", ink: "#fffaf2", to: appGroupsPath },
  { key: "achievements", label: "shelf", color: "#e63da8", ink: "#fffaf2", to: appAchievementsPath },
  { key: "profile", label: "profile", color: "#3d6eff", ink: "#fffaf2", to: appProfilePath },
];

/** The `+` tile keeps the original's semantics: create a new thing.
 *  In PearNotes that's a new subject — /app/new. */
export const DOCK_CREATE = { label: "new subject", to: appNewPath };

export function PearNotesDock({
  active,
  onNavigate,
  onCreate,
  self,
  /** the rail-you tile reads as settings in the original; keep it. */
  settingsOpen = false,
  /** Real contextual counts only (same slot as `waiting` on the
   *  original — e.g. N sources awaiting review on Library). Never wire
   *  fabricated numbers in here. */
  signals,
}: {
  active: AppNavKey | null;
  onNavigate: (to: string) => void;
  onCreate?: () => void;
  self?: { name: string; color: string; emoji?: string; avatarUrl?: string };
  settingsOpen?: boolean;
  signals?: Partial<Record<AppNavKey, number>>;
}) {
  return (
    <aside className="space-rail">
      <a
        className="rail-brand"
        href={appHomePath()}
        title="PearNotes home"
        aria-label="PearNotes home"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(appHomePath());
        }}
      >
        <img src="/assets/pearnotes-mark.svg" alt="PearNotes" />
      </a>

      <div className="space-list">
        {DOCK_ITEMS.map((item, i) => {
          const isActive = item.key === active;
          const count = !isActive ? signals?.[item.key] : 0;
          return (
            <div
              key={item.key}
              className="space-link-wrap"
              style={{ "--i": i } as CSSProperties}
            >
              <button
                type="button"
                className={`space-link ${isActive ? "is-active" : ""}`}
                style={{ backgroundColor: item.color, color: item.ink }}
                data-testid={`nav-link-${item.key}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate(item.to())}
              >
                {DOCK_ICONS[item.key as Exclude<AppNavKey, "settings">]}
                {Boolean(count) && (
                  <b className="rail-turn" data-testid={`nav-turn-${item.key}`}>
                    {count}
                  </b>
                )}
              </button>
              <span className="space-tooltip">
                {item.label}
                {item.hint ? ` · ${item.hint}` : ""}
                {Boolean(count) ? ` · ${count} waiting` : ""}
              </span>
            </div>
          );
        })}

      </div>

      {/* `+` stays pinned outside the scrollable strip (mobile keeps it
          a tap away at the rail's end, like the original's create tile). */}
      <div
        className="space-link-wrap"
        style={{ "--i": DOCK_ITEMS.length } as CSSProperties}
      >
        <button
          type="button"
          className="create-space-button"
          aria-label={DOCK_CREATE.label}
          data-testid="nav-create"
          onClick={onCreate}
        >
          <span>+</span>
        </button>
        <span className="space-tooltip">{DOCK_CREATE.label}</span>
      </div>

      {self && (
        <div
          className="space-link-wrap rail-you-wrap"
          style={{ "--i": DOCK_ITEMS.length + 1 } as CSSProperties}
        >
          <button
            type="button"
            className={`rail-you ${settingsOpen ? "is-open" : ""}`}
            style={{ "--look": self.color } as CSSProperties}
            aria-label="Settings"
            data-testid="nav-settings"
            onClick={() => onNavigate(appSettingsPath())}
          >
            <MemberFace
              name={self.name}
              emoji={self.emoji}
              color={self.color}
              avatarUrl={self.avatarUrl}
              size="sm"
            />
            <span className="rail-you-gear" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="10" height="10">
                <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 3.5-.1-1.5 2-1.6-2-3.4-2.4.9a8 8 0 0 0-2.6-1.5L14.9 2H9.1l-.4 2.6a8 8 0 0 0-2.6 1.5l-2.4-.9-2 3.4 2 1.6a8 8 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a8 8 0 0 0 2.6 1.5l.4 2.6h5.8l.4-2.6a8 8 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.6.1-1.5Z" fill="currentColor" />
              </svg>
            </span>
          </button>
          <span className="space-tooltip">you · settings</span>
        </div>
      )}
    </aside>
  );
}
