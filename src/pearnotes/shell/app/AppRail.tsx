/* ------------------------------------------------------------------
 * AppRail — the production PearNotes left rail (Issue #54). One floating
 * dark rail, seven destinations, one honest active state. Collapses to a
 * bottom bar on narrow screens (see app.css) rather than disappearing —
 * SITEMAP: "the left rail remains globally accessible where space
 * allows". Every item routes; nothing here is decorative.
 * ------------------------------------------------------------------ */
import type { ReactNode } from "react";
import type { AppNavKey } from "./routes";
import {
  appAchievementsPath,
  appGroupsPath,
  appHomePath,
  appLearnPath,
  appLibraryPath,
  appProfilePath,
  appSettingsPath,
} from "./routes";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS: Record<AppNavKey, ReactNode> = {
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
  settings: (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <circle {...STROKE} cx="48" cy="48" r="10" />
      <path {...STROKE} d="M48 14v12M48 70v12M14 48h12M70 48h12M24 24l9 9M63 63l9 9M72 24l-9 9M33 63l-9 9" />
    </svg>
  ),
};

const ITEMS: { key: AppNavKey; label: string; path: () => string }[] = [
  { key: "home", label: "home", path: appHomePath },
  { key: "learn", label: "learn", path: appLearnPath },
  { key: "library", label: "library", path: appLibraryPath },
  { key: "groups", label: "groups", path: appGroupsPath },
  { key: "achievements", label: "shelf", path: appAchievementsPath },
  { key: "profile", label: "profile", path: appProfilePath },
  { key: "settings", label: "settings", path: appSettingsPath },
];

export function AppRail({
  active,
  learnerName,
  onNavigate,
}: {
  active: AppNavKey;
  learnerName?: string;
  onNavigate: (to: string) => void;
}) {
  const initial = (learnerName ?? "you").trim().charAt(0).toLowerCase() || "y";
  return (
    <nav className="pna-rail" aria-label="PearNotes">
      <span className="pna-rail-mark" aria-hidden="true">
        <svg viewBox="0 0 96 96" focusable="false">
          <circle cx="48" cy="48" r="48" fill="#a3c26a" />
          <ellipse cx="48" cy="57" rx="17.5" ry="18" fill="#f5efdf" />
          <ellipse cx="48" cy="35" rx="10.5" ry="12" fill="#f5efdf" />
          <rect x="46" y="14" width="3.6" height="11" rx="1.8" fill="#1d1712" transform="rotate(-9 48 20)" />
          <ellipse cx="57" cy="21" rx="7.5" ry="3.6" fill="#1d1712" transform="rotate(-26 57 21)" />
        </svg>
      </span>
      <ul className="pna-rail-list">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`pna-rail-btn${active === item.key ? " is-active" : ""}`}
              aria-current={active === item.key ? "page" : undefined}
              onClick={() => onNavigate(item.path())}
            >
              <span className="pna-rail-icon">
                {item.key === "profile" ? (
                  <span className="pna-rail-face" aria-hidden="true">{initial}</span>
                ) : (
                  ICONS[item.key]
                )}
              </span>
              <span className="pna-rail-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
