import type { CSSProperties } from "react";
import type { PathNodeState } from "./types";

/* ------------------------------------------------------------------
 * JourneyNode — the tactile journey button (P00 asset pack, issue
 * "journey interaction asset pack"). One layered-SVG component covers
 * the full state×kind matrix the path drawer needs:
 *
 *   state: not_started | available | in_progress | practicing |
 *          demonstrated | needs_review | locked
 *   kind:  lesson (default) | practice | checkpoint
 *   flags: recommended ("next" tag) · remedial (smaller branch node)
 *   extra: loading · disabled — neither exists in PathNodeState, so
 *          they are props, never invented data.
 *
 * The 2.5D feel is pure geometry: a ground shadow, a darker extruded
 * "skirt" and a top face that translates on hover/press — pressing the
 * node literally squashes the skirt. No bitmaps, themeable through
 * --jnode-* CSS vars and the `hue` prop (subject colour).
 * ------------------------------------------------------------------ */

/** Mirrors shell `PathNodeKind` (Engineer 2, journey branch). Kept local
 *  so the pack stands alone until that branch lands. */
export type JourneyNodeKind = "lesson" | "practice" | "checkpoint";

export interface JourneyNodeProps {
  /** node state — drives face colour, glyph and ring (default: lesson look) */
  state?: PathNodeState;
  /** structural node type — `lesson` when omitted */
  kind?: JourneyNodeKind;
  /** ordinal shown on plain lesson nodes */
  order?: number;
  /** 0–1 progress ring — only meaningful on `in_progress` */
  progress?: number;
  /** lime "next" tag */
  recommended?: boolean;
  /** remedial practice branch — renders smaller, stepped off the trail */
  remedial?: boolean;
  /** skeleton pulse while path data resolves */
  loading?: boolean;
  /** presentational/off state — sets aria-disabled, kills interaction */
  disabled?: boolean;
  /** rendered px size: "sm" (44, compact row) | "md" (72) | "lg" (96, map) */
  size?: "sm" | "md" | "lg" | number;
  /** subject signature hue — demonstrated/in-progress faces wear it */
  hue?: string;
  /** accessible name, e.g. "Diffusion and osmosis — in progress" */
  label: string;
  onClick?: () => void;
  /** `span` renders inert art (side cards, previews); default `button` */
  as?: "button" | "span";
  className?: string;
}

const PX = { sm: 44, md: 72, lg: 96 } as const;

function Glyph({ state, kind, order }: { state: PathNodeState; kind: JourneyNodeKind; order?: number }) {
  if (state === "demonstrated") {
    return (
      <path
        d="M-9 0.5 -3.5 6 9 -6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (state === "locked") {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round">
        <rect x="-8" y="-3" width="16" height="12" rx="3.4" />
        <path d="M-4.5 -3 v-3.4 a4.5 4.5 0 0 1 9 0 V-3" />
      </g>
    );
  }
  if (state === "needs_review") {
    return (
      <g fill="currentColor">
        <rect x="-2.1" y="-11" width="4.2" height="14" rx="2.1" />
        <circle cy="8" r="2.7" />
      </g>
    );
  }
  if (state === "in_progress") {
    return <path d="M-4.5 -7.5 8 0 -4.5 7.5 Z" fill="currentColor" />;
  }
  if (kind === "practice" || state === "practicing") {
    /* ascending drill steps — practice, not a copied dumbbell */
    return (
      <path
        d="M-9 6.5 h4.5 v-4.5 h4.5 v-4.5 h4.5 v-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (kind === "checkpoint") {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-6.5 -8.5 h13 c-1 5 -1.6 7 -4.2 8 l-2.3 1 -2.3 -1 c-2.6 -1 -3.2 -3 -4.2 -8 Z" fill="currentColor" stroke="none" />
        <path d="M0 0.5 v4" />
        <path d="M-5.5 8 h11" />
      </g>
    );
  }
  return (
    <text
      className="pjn-num"
      textAnchor="middle"
      dominantBaseline="central"
      fill="currentColor"
    >
      {order ?? "·"}
    </text>
  );
}

export function JourneyNode({
  state = "available",
  kind = "lesson",
  order,
  progress,
  recommended = false,
  remedial = false,
  loading = false,
  disabled = false,
  size = "md",
  hue,
  label,
  onClick,
  as = "button",
  className = "",
}: JourneyNodeProps) {
  const px = typeof size === "number" ? size : PX[size];
  const inert = as === "span";
  const classes = [
    "pjn",
    `pjn-${size === "sm" || remedial ? "sm" : size === "lg" ? "lg" : "md"}`,
    `is-${state}`,
    kind !== "lesson" ? `kind-${kind}` : "",
    recommended ? "is-next" : "",
    remedial ? "is-remedial" : "",
    loading ? "is-loading" : "",
    disabled ? "is-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const art = (
    <>
      <svg
        className="pjn-art"
        viewBox="0 0 96 96"
        width={px}
        height={px}
        aria-hidden="true"
        focusable="false"
      >
        {/* ground shadow */}
        <ellipse className="pjn-shadow" cx="48" cy="83" rx="30" ry="7.5" />
        {/* extruded skirt — the squishable 2.5D layer */}
        <circle className="pjn-skirt" cx="48" cy="54" r="31" />
        {/* pressable top face */}
        <g className="pjn-face">
          <circle className="pjn-top" cx="48" cy="46" r="31" />
          <circle className="pjn-rim" cx="48" cy="46" r="24.5" />
          <path
            className="pjn-sheen"
            d="M30 34 a24 24 0 0 1 22 -13"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g className="pjn-glyph" transform="translate(48 46)">
            {!loading && <Glyph state={state} kind={kind} order={order} />}
          </g>
        </g>
        {/* progress ring hugs the skirt on in-progress nodes */}
        {state === "in_progress" && typeof progress === "number" && (
          <circle
            className="pjn-progress"
            cx="48"
            cy="46"
            r="37"
            pathLength={1}
            strokeDasharray={`${Math.min(1, Math.max(0, progress))} 1`}
          />
        )}
      </svg>
      {recommended && <span className="pjn-tag">next</span>}
    </>
  );

  const style = { "--jnode-hue": hue } as CSSProperties;

  if (inert) {
    return (
      <span className={`${classes} pjn-inert`} style={style} role="img" aria-label={label}>
        {art}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      style={style}
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {art}
    </button>
  );
}
