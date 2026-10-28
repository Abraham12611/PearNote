import type { CSSProperties, ReactNode } from "react";
import { pickSticker, stickerUrl, type JourneyStickerTheme } from "./journeyAssets";

/* ------------------------------------------------------------------
 * Decorative layer for the journey surfaces. Everything here is
 * aria-hidden eye-candy governed by JOURNEY_REDESIGN §decorations:
 * ≤3 per viewport, margins only, never behind text, reduced-motion
 * safe. Copy that *means* something belongs in DOM text (JourneyNote),
 * not baked into images — keeps it localizable and readable.
 * ------------------------------------------------------------------ */

export interface JourneyStickerProps {
  /** registry name (journeyAssets) — or pass `theme` + `seed` to rotate */
  name?: string;
  theme?: JourneyStickerTheme;
  /** deterministic rotation key when using `theme` */
  seed?: string | number;
  size?: number;
  /** degrees; ±2–6 reads "stuck on", not crooked */
  rotate?: number;
  className?: string;
}

/** A generated die-cut sticker PNG. Decorative only — never carries
 *  meaning, so it is always aria-hidden. */
export function JourneySticker({
  name,
  theme,
  seed = "0",
  size = 96,
  rotate = -3,
  className = "",
}: JourneyStickerProps) {
  const asset = name
    ? name
    : theme
      ? pickSticker(theme, seed)?.name
      : undefined;
  if (!asset) return null;
  return (
    <img
      className={`pjs-sticker ${className}`}
      src={stickerUrl(asset)}
      width={size}
      height={size}
      style={{ rotate: `${rotate}deg` } as CSSProperties}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
    />
  );
}

export type JourneyDoodleKind =
  | "squiggle"
  | "arrow"
  | "sparkle"
  | "tape";

/** Tiny inline-SVG doodles for trail margins — the "confetti" layer
 *  that costs zero network weight. All aria-hidden. */
export function JourneyDoodle({
  kind,
  size = 48,
  rotate = 0,
  className = "",
}: {
  kind: JourneyDoodleKind;
  size?: number;
  rotate?: number;
  className?: string;
}) {
  return (
    <svg
      className={`pjs-doodle pjs-${kind} ${className}`}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ rotate: `${rotate}deg` } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      {kind === "squiggle" && (
        <path d="M6 30c6-10 12-10 18 0s12 10 18 0" fill="none" strokeWidth="4" strokeLinecap="round" />
      )}
      {kind === "arrow" && (
        <path d="M8 36C20 30 30 20 36 8m0 0-9 2m9-2 2 9" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === "sparkle" && (
        <path d="M24 6l3 12 12 3-12 3-3 12-3-12-12-3 12-3z" fill="currentColor" stroke="none" />
      )}
      {kind === "tape" && <rect x="10" y="16" width="28" height="14" rx="2.5" fill="currentColor" stroke="none" />}
    </svg>
  );
}

/** Paper sticky-note chip for encouragement copy. Text lives in the
 *  DOM — screen readers can ignore the whole chip (`aria-hidden`), but
 *  the copy stays real text for i18n and crisp zoom. */
export function JourneyNote({
  children,
  rotate = -2,
  tone = "paper",
  className = "",
}: {
  children: ReactNode;
  rotate?: number;
  /** paper (cream) | lime — lime is rare: one meaningful note per view */
  tone?: "paper" | "lime";
  className?: string;
}) {
  return (
    <span
      className={`pjs-note tone-${tone} ${className}`}
      style={{ rotate: `${rotate}deg` } as CSSProperties}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
