import type { CSSProperties, ReactNode } from "react";
import { SUBJECT_AVATAR_IDS, type SubjectAvatarId } from "./types";

/** Coerce an arbitrary stored/backend string into a known pack id —
 *  anything unrecognized draws the dashed `unknown` disc. */
export function normalizeAvatar(id: string): SubjectAvatarId {
  return (SUBJECT_AVATAR_IDS as readonly string[]).includes(id)
    ? (id as SubjectAvatarId)
    : "unknown";
}

/* ------------------------------------------------------------------
 * Original subject-disc illustrations. Flat cut-paper shapes in
 * `--pn-paper` with ink details — no gradients, no glows, and always
 * paper-on-hue so the art stays readable on any subject color.
 * Phase-00 vector placeholders for the illustrated avatar pack in
 * design/ASSETS_BRANDING.md; the compositions are original work, not
 * copied mascots or characters.
 * ------------------------------------------------------------------ */

const PAPER = "#f5efdf";
const INK = "#1d1712";
const SHADE = "rgba(23, 16, 25, 0.16)";

const ground = <ellipse cx="48" cy="79" rx="21" ry="4" fill={SHADE} />;

const SCENES: Record<SubjectAvatarId, ReactNode> = {
  /* beaker flask with liquid, bubbles and vapour dots */
  science: (
    <g>
      {ground}
      <path
        d="M42 26h12v13l13.5 25a7 7 0 0 1-6 10.5h-27a7 7 0 0 1-6-10.5L42 39Z"
        fill={PAPER}
      />
      <path d="M36 55h24l4.5 8.5a4.5 4.5 0 0 1-4 6.5h-25a4.5 4.5 0 0 1-4-6.5Z" fill={INK} />
      <circle cx="44" cy="62" r="2.4" fill={PAPER} />
      <circle cx="52" cy="66" r="1.8" fill={PAPER} />
      <circle cx="40" cy="18" r="1.8" fill={PAPER} />
      <circle cx="53" cy="13" r="2.4" fill={PAPER} />
      <circle cx="47" cy="20" r="1.4" fill={PAPER} />
    </g>
  ),
  /* pi shape beside a small multiplication tile */
  math: (
    <g>
      {ground}
      <rect x="29" y="24" width="38" height="7.5" rx="3.75" fill={PAPER} />
      <rect x="36" y="29" width="7.5" height="34" rx="3.75" fill={PAPER} />
      <rect x="53" y="29" width="7.5" height="34" rx="3.75" fill={PAPER} />
      <g transform="rotate(45 68 56)">
        <rect x="61.5" y="54" width="13" height="4" rx="2" fill={PAPER} />
        <rect x="66" y="49.5" width="4" height="13" rx="2" fill={PAPER} />
      </g>
      <rect x="68" y="70" width="6" height="6" rx="1.5" fill={PAPER} />
      <rect x="60" y="70" width="6" height="6" rx="1.5" fill={PAPER} />
    </g>
  ),
  /* cell with nucleus and organelles */
  biology: (
    <g>
      {ground}
      <circle cx="48" cy="47" r="28" fill={PAPER} />
      <circle
        cx="48" cy="47" r="22.5" fill="none" stroke={INK} strokeWidth="2"
        strokeDasharray="2.5 6" opacity="0.45"
      />
      <circle cx="43" cy="43" r="9.5" fill={INK} />
      <ellipse cx="58" cy="54" rx="4.5" ry="2.8" fill={INK} transform="rotate(28 58 54)" />
      <ellipse cx="39" cy="58" rx="4.2" ry="2.6" fill={INK} transform="rotate(-22 39 58)" />
      <circle cx="57" cy="36" r="2.6" fill={INK} />
    </g>
  ),
  /* atom with three orbits and electrons */
  physics: (
    <g>
      {ground}
      <g fill="none" stroke={PAPER} strokeWidth="3.4">
        <ellipse cx="48" cy="46" rx="28" ry="10.5" />
        <ellipse cx="48" cy="46" rx="28" ry="10.5" transform="rotate(60 48 46)" />
        <ellipse cx="48" cy="46" rx="28" ry="10.5" transform="rotate(-60 48 46)" />
      </g>
      <circle cx="48" cy="46" r="5.5" fill={PAPER} />
      <circle cx="66" cy="30" r="3.4" fill={INK} />
      <circle cx="31" cy="59" r="3.4" fill={INK} />
    </g>
  ),
  /* three-atom molecule on paper bonds */
  chemistry: (
    <g>
      {ground}
      <g stroke={PAPER} strokeWidth="4.5" strokeLinecap="round">
        <path d="M46 45 30 33" />
        <path d="M50 45 66 33" />
        <path d="M48 50v20" />
      </g>
      <circle cx="48" cy="46" r="7" fill={INK} stroke={PAPER} strokeWidth="2.5" />
      <circle cx="28" cy="32" r="9" fill={PAPER} />
      <circle cx="68" cy="32" r="9" fill={PAPER} />
      <circle cx="48" cy="72" r="9" fill={PAPER} />
    </g>
  ),
  /* medical cross over a pulse line */
  medicine: (
    <g>
      {ground}
      <rect x="41" y="22" width="14" height="40" rx="4" fill={PAPER} />
      <rect x="28" y="35" width="40" height="14" rx="4" fill={PAPER} />
      <path
        d="M28 72h12l4-8 6 14 5-9 3 3h10" fill="none"
        stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </g>
  ),
  /* two-tone capsule, a scored pill and a sparkle */
  pharmacy: (
    <g>
      {ground}
      <g transform="rotate(-25 47 48)">
        <rect x="29" y="40" width="36" height="16" rx="8" fill={INK} />
        <path d="M29 48a8 8 0 0 1 8-8h10v16H37a8 8 0 0 1-8-8Z" fill={PAPER} />
        <rect x="29" y="40" width="36" height="16" rx="8" fill="none" stroke={PAPER} strokeWidth="2.5" />
      </g>
      <circle cx="66" cy="65" r="6" fill={PAPER} />
      <path d="M63 65h6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M30 24v10M25 29h10" stroke={PAPER} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  /* little terminal window with a prompt */
  "computer-science": (
    <g>
      {ground}
      <rect x="23" y="30" width="50" height="37" rx="8" fill={PAPER} />
      <circle cx="31" cy="37" r="2" fill={INK} />
      <circle cx="38" cy="37" r="2" fill={INK} />
      <circle cx="45" cy="37" r="2" fill={INK} />
      <path
        d="M31 48.5 38 53l-7 4.5" fill="none" stroke={INK}
        strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="43" y="55.5" width="11" height="4" rx="2" fill={INK} />
    </g>
  ),
  /* fluted column with a small star */
  history: (
    <g>
      {ground}
      <rect x="31" y="24" width="34" height="7" rx="2.5" fill={PAPER} />
      <rect x="36" y="34" width="24" height="33" fill={PAPER} />
      <path d="M44 37v27M52 37v27" stroke={INK} strokeWidth="2" opacity="0.5" />
      <rect x="29" y="70" width="38" height="7" rx="2.5" fill={PAPER} />
      <path d="M68 18l2.2 4.6 4.6 2.2-4.6 2.2-2.2 4.6-2.2-4.6-4.6-2.2 4.6-2.2Z" fill={PAPER} />
    </g>
  ),
  /* open book with ruled lines */
  literature: (
    <g>
      {ground}
      <path d="M48 36q-12-7-24-1v34q12-6 24 1Z" fill={PAPER} />
      <path d="M48 36q12-7 24-1v34q-12-6-24 1Z" fill={PAPER} />
      <path d="M48 36v34" stroke={INK} strokeWidth="2" opacity="0.5" />
      <g stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M30 44q7-3 13 0M30 51q7-3 13 0M30 58q7-3 13 0" />
        <path d="M53 44q7-3 13 0M53 51q7-3 13 0M53 58q7-3 13 0" />
      </g>
    </g>
  ),
  /* two overlapping speech bubbles */
  languages: (
    <g>
      {ground}
      <path d="M22 24h34a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H37l-8 8 1.5-8H22a7 7 0 0 1-7-7V31a7 7 0 0 1 7-7Z" fill={PAPER} />
      <text x="39" y="46" textAnchor="middle" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="800" fontSize="22" fill={INK}>A</text>
      <path
        d="M58 52h20a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-9l-6.5 6.5L63 72h-5a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6Z"
        fill={INK} stroke={PAPER} strokeWidth="2.5"
      />
      <text x="68" y="68" textAnchor="middle" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="800" fontSize="14" fill={PAPER}>é</text>
    </g>
  ),
  /* rising bars, a trend arrow and a coin */
  economics: (
    <g>
      {ground}
      <rect x="26" y="52" width="9.5" height="21" rx="3" fill={PAPER} />
      <rect x="41" y="44" width="9.5" height="29" rx="3" fill={PAPER} />
      <rect x="56" y="34" width="9.5" height="39" rx="3" fill={PAPER} />
      <path
        d="M28 44 42 37l13-8 12-6" fill="none" stroke={INK}
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M60 22h9v9" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="60" r="7" fill={INK} stroke={PAPER} strokeWidth="2.5" />
    </g>
  ),
  /* painter's palette and a brush */
  art: (
    <g>
      {ground}
      <path
        d="M47 28c-13 0-24 9-24 21 0 13 11 22 24 22 4 0 7-2 7-6 0-3-2-5-2-8s3-6 8-6h5c8 0 13-5 13-12 0-6-14-11-31-11Z"
        fill={PAPER}
      />
      <circle cx="56" cy="42" r="4.5" fill={INK} />
      <circle cx="35" cy="42" r="3.4" fill={INK} />
      <circle cx="43" cy="35" r="3.4" fill={INK} />
      <circle cx="33" cy="52" r="3.4" fill={INK} />
      <g transform="rotate(38 68 60)">
        <rect x="65.5" y="50" width="5" height="24" rx="2.5" fill={PAPER} />
        <path d="M65.5 74h5l-1 7h-3Z" fill={INK} />
      </g>
    </g>
  ),
  /* gear beside a small set-square */
  engineering: (
    <g>
      {ground}
      <g fill={PAPER}>
        <rect x="41" y="16" width="6" height="11" rx="2" />
        <rect x="41" y="16" width="6" height="11" rx="2" transform="rotate(60 44 42)" />
        <rect x="41" y="16" width="6" height="11" rx="2" transform="rotate(120 44 42)" />
        <rect x="41" y="16" width="6" height="11" rx="2" transform="rotate(180 44 42)" />
        <rect x="41" y="16" width="6" height="11" rx="2" transform="rotate(240 44 42)" />
        <rect x="41" y="16" width="6" height="11" rx="2" transform="rotate(300 44 42)" />
        <circle cx="44" cy="42" r="15" />
      </g>
      <circle cx="44" cy="42" r="6" fill={INK} />
      <path d="M58 74h20V52Z" fill="none" stroke={PAPER} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M64 74h9v-9" fill="none" stroke={PAPER} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
  /* the pear — PearNotes' own mark */
  general: (
    <g>
      {ground}
      <ellipse cx="48" cy="57" rx="17.5" ry="18" fill={PAPER} />
      <ellipse cx="48" cy="35" rx="10.5" ry="12" fill={PAPER} />
      <rect x="46" y="14" width="3.6" height="11" rx="1.8" fill={INK} transform="rotate(-9 48 20)" />
      <ellipse cx="57" cy="21" rx="7.5" ry="3.6" fill={INK} transform="rotate(-26 57 21)" />
    </g>
  ),
  /* dashed ring and a question mark — unclassified fallback */
  unknown: (
    <g>
      <circle
        cx="48" cy="48" r="26" fill="none" stroke={PAPER}
        strokeWidth="3.4" strokeDasharray="7 8"
      />
      <text
        x="48" y="61" textAnchor="middle"
        fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif"
        fontWeight="800" fontSize="34" fill={PAPER}
      >?</text>
    </g>
  ),
};

export function SubjectAvatar({
  avatar,
  color,
  size = 88,
  className,
  style,
}: {
  avatar: SubjectAvatarId;
  color: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      style={style}
      /* the subject name on the parent control is the accessible label */
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="48" cy="48" r="48" fill={color} />
      {SCENES[avatar] ?? SCENES.unknown}
    </svg>
  );
}
