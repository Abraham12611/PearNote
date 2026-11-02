/* ------------------------------------------------------------------
 * PearNotesDock — the actual OurSpaces dock adapted for `/app` (#64).
 *
 * This is not a new rail design: the DOM skeleton, class names and
 * motion vars are the SAME ones `src/components/Rail.tsx` renders for
 * `/#/space/*`, so the native geometry (80px floating rail → 76px
 * bottom dock), hover/tooltip behavior, staggered tile pop, dashed
 * create tile and "you" portrait all come from the original
 * implementation's CSS (src/index.css .space-rail family):
 *
 *   <aside .space-rail>
 *     <a .rail-brand>            → home
 *     <div .space-list>
 *       <div .space-link-wrap style=--i>   per tile
 *         <button .space-link.is-active>   icon tile + badges
 *         <span .space-tooltip>            hover label + hint
 *       </div>
 *       <button .create-space-button>      dashed +  → /app/new
 *     </div>
 *     <button .rail-you>                   face + gear → /app/settings
 *   </aside>
 *
 * Destination tiles take the role room tiles play in OurSpaces: same
 * square, same color field, same glyph, same `aria-current`, same
 * `space-link-<id>` testid convention (`nav-link-<key>` here).
 * ------------------------------------------------------------------ */

import type { CSSProperties } from "react";
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

export interface DockItem {
  key: AppNavKey;
  /** single-glyph tile face — the native tiles use one character +
   *  U+FE0E to force the text-glyph variant, same as spaces do. */
  icon: string;
  label: string;
  color: string;
  /** absolute /app path builder — the only thing navigate() receives. */
  to: () => string;
  /** optional tooltip tail, same role as SpaceMeta.preview. */
  hint?: string;
}

/** The six list tiles — settings rides the native "you" slot at the
 *  foot, so all seven destinations exist in native positions. */
export const DOCK_ITEMS: DockItem[] = [
  { key: "home", icon: "⌂", label: "home", color: "#c6f750", to: appHomePath, hint: "your desk" },
  { key: "learn", icon: "✎", label: "learn", color: "#7c5cff", to: appLearnPath, hint: "pick a subject" },
  { key: "library", icon: "🗂", label: "library", color: "#ffb03a", to: appLibraryPath },
  { key: "groups", icon: "👥", label: "groups", color: "#13b8a6", to: appGroupsPath },
  { key: "achievements", icon: "🏆", label: "shelf", color: "#e63da8", to: appAchievementsPath },
  { key: "profile", icon: "☺", label: "profile", color: "#3d6eff", to: appProfilePath },
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
                style={{ backgroundColor: item.color }}
                data-testid={`nav-link-${item.key}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate(item.to())}
              >
                <span>{`${item.icon}`}</span>
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
