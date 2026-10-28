import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../styles/journey.css";
import { useDialogA11y } from "./a11y";
import { JourneyNode } from "./JourneyNode";
import { JourneyDoodle, JourneyNote, JourneySticker } from "./JourneySticker";
import { pickSticker, type JourneyStickerTheme } from "./journeyAssets";
import type { LearningPathDrawerProps } from "./LearningPathDrawer";
import type {
  LearningPath,
  PathLesson,
  PathNodeKind,
  PathUnit,
  PearSubject,
} from "./types";

/* ------------------------------------------------------------------
 * JourneyDrawer — Issue #21 exact-mockup rebuild.
 *
 * One shared chrome reproduces the authoritative reference
 * (02_PIXEL_REFERENCE_TARGET_COPY_THIS.png):
 *
 *   cream hero   — "unit N" badge, unit title, friend line, illustrated
 *                  mascot sticker (deterministic per subject)
 *   dark body    — raised social strip, raised unit-progress card,
 *                  premium 2.5D JourneyNode steps on a centered lane,
 *                  uniform down-chevrons between nodes (the mockup's own
 *                  connector — Option A, no grey path fragments)
 *   fixed lime   — "▶ continue lesson N" capsule that never scrolls
 *
 * Compact occupies 25–30vw of desktop (owner's explicit correction);
 * expanded is the same composition at ~48vw with a winding guidebook
 * trail, side cards and one extra sticker. Same props as
 * LearningPathDrawer plus `mode`/`onModeChange`.
 * ------------------------------------------------------------------ */

export type JourneyMode = "compact" | "expanded";

export interface JourneyDrawerProps extends LearningPathDrawerProps {
  /** controlled mode; when omitted the drawer manages it */
  mode?: JourneyMode;
  /** uncontrolled default; falls back to the saved preference */
  defaultMode?: JourneyMode;
  onModeChange?: (mode: JourneyMode) => void;
  /** expanded footer "invite" affordance — host wires the real flow */
  onInviteCrew?: () => void;
}

const MODE_KEY = "pn.journey.mode";

function savedMode(): JourneyMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "expanded"
      ? "expanded"
      : "compact";
  } catch {
    return "compact";
  }
}

const NODE_STATE_LABEL: Record<PathLesson["state"], string> = {
  not_started: "not started",
  available: "ready",
  in_progress: "in progress",
  practicing: "practice",
  demonstrated: "completed",
  needs_review: "needs review",
  locked: "locked",
};

function nodeKind(lesson: PathLesson): PathNodeKind {
  return lesson.kind ?? (lesson.remedial || lesson.state === "practicing" ? "practice" : "lesson");
}

/** Step meta under a node — "completed · 6 min" / "practice · 5 min". */
function stepMeta(lesson: PathLesson): string {
  const kind = nodeKind(lesson);
  const base =
    kind === "checkpoint"
      ? lesson.state === "locked"
        ? "quiz"
        : "checkpoint"
      : kind === "practice" && lesson.state !== "practicing"
        ? "practice"
        : NODE_STATE_LABEL[lesson.state];
  return lesson.durationMin != null ? `${base} · ${lesson.durationMin} min` : base;
}

/** Expanded card line — "{state} · {kind?} · {duration}". */
function cardMeta(lesson: PathLesson) {
  const kind = nodeKind(lesson);
  const parts = [NODE_STATE_LABEL[lesson.state]];
  if (kind !== "lesson") parts.push(kind === "checkpoint" ? "checkpoint" : "practice");
  if (lesson.durationMin != null) parts.push(`${lesson.durationMin} min`);
  return parts.join(" · ");
}

/* --- social --------------------------------------------------------- */

const FACE_COLORS = ["#ffd9a8", "#a8d8ff", "#ffb8d1", "#c8f0a8", "#d9c8ff"];

function FacePile({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  return (
    <span className="pnj-faces" aria-hidden="true">
      {shown.map((name, i) => (
        <span
          key={name}
          className="pnj-face"
          style={{ background: FACE_COLORS[i % FACE_COLORS.length] } as CSSProperties}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {names.length > shown.length && (
        <span className="pnj-face pnj-face-more">+{names.length - shown.length}</span>
      )}
    </span>
  );
}

/** One-line social snippet — renders nothing when the node has none. */
function SocialLine({ lesson }: { lesson: PathLesson }) {
  const s = lesson.social;
  if (!s) return null;
  const text =
    s.studyingNow != null && s.studyingNow > 0
      ? `${s.studyingNow} studying now`
      : s.completed != null && s.completed > 0
        ? `${s.completed} friends completed this`
        : null;
  if (!text) return null;
  return (
    <span className="pnj-social">
      {s.friends && s.friends.length > 0 && <FacePile names={s.friends} />}
      {text}
    </span>
  );
}

/* --- continue + unit helpers ----------------------------------------- */

/** The lesson the fixed CTA points at: recommended first, else the
 *  in-progress lesson, else the first open one. */
function findContinue(path: LearningPath | null) {
  if (!path) return null;
  const units = path.sections.flatMap((s) => s.units);
  const all = units.flatMap((u) => u.lessons.map((l, i) => ({ l, order: i + 1 })));
  const pick =
    all.find(({ l }) => l.recommended) ??
    all.find(({ l }) => l.state === "in_progress") ??
    all.find(
      ({ l }) =>
        l.state === "available" ||
        l.state === "not_started" ||
        l.state === "needs_review" ||
        l.state === "practicing",
    );
  return pick ? { lesson: pick.l, order: pick.order } : null;
}

function unitProgress(unit: PathUnit) {
  const total = unit.lessons.length;
  const done = unit.lessons.filter((l) => l.state === "demonstrated").length;
  return { done, total };
}

/* --- hero ------------------------------------------------------------ */

const HERO_THEME: Record<string, JourneyStickerTheme> = {
  biology: "bio",
  chemistry: "bio",
  medicine: "bio",
  pharmacy: "bio",
  math: "study",
  physics: "study",
  "computer-science": "study",
  engineering: "study",
};

/** Deterministic illustrated mascot — same subject always draws the same
 *  hero sticker; falls back to the leaping-pear brand sticker. */
function heroStickerName(subject: PearSubject | null): string {
  const theme = subject ? HERO_THEME[subject.avatar] : undefined;
  const picked = theme ? pickSticker(theme, `${subject?.id ?? "hero"}-hero`) : undefined;
  return picked?.name ?? "you-got-this";
}

function UnitBadge({ index }: { index: number | null }) {
  return (
    <span className="pnj-hero-badge">{index != null ? `unit ${index + 1}` : "learn path"}</span>
  );
}

/* --- compact mode: the reference lane --------------------------------- */

/** Small uniform chevron between node steps — the mockup's connector.
 *  Centered on the lane axis, constant size/opacity, never a fragment. */
function StepLink() {
  return (
    <li className="pnj-link" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
        <path
          d="M7 9.5 12 14.5 17 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </li>
  );
}

function CompactUnit({
  unit,
  unitIndex,
  subjectHue,
  selectedId,
  onPick,
}: {
  unit: PathUnit;
  unitIndex: number;
  subjectHue?: string;
  selectedId: string | null;
  onPick: (lesson: PathLesson) => void;
}) {
  const p = unitProgress(unit);
  return (
    <li className="pnj-unit">
      {/* raised unit-progress card */}
      <div className="pnj-card">
        <span className="pnj-card-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <rect x="5" y="4" width="14" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M9 9h6M9 12.5h6M9 16h3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="pnj-card-text">
          <strong>unit progress</strong>
          <span
            className="pnj-card-bar"
            role="progressbar"
            aria-valuenow={p.done}
            aria-valuemin={0}
            aria-valuemax={p.total}
            aria-label={`Unit ${unitIndex + 1}: ${p.done} of ${p.total} lessons`}
          >
            <span
              className="pnj-card-bar-fill"
              style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }}
            />
          </span>
        </span>
        <span className="pnj-card-count">
          {p.done} of {p.total} lessons
        </span>
      </div>

      {/* centered node lane — chevron connectors, no visible spine */}
      <ol className="pnj-steps">
        {unit.lessons.map((lesson, i) => {
          const kind = nodeKind(lesson);
          const locked = lesson.state === "locked";
          const size = kind === "checkpoint" ? 84 : kind === "practice" ? 60 : 72;
          return (
            <li key={lesson.id} className="pnj-step-li">
              <div className={`pnj-step${lesson.remedial ? " is-remedial" : ""}`}>
                <JourneyNode
                  state={lesson.state}
                  kind={kind}
                  order={i + 1}
                  progress={lesson.progress}
                  recommended={lesson.recommended && lesson.state !== "in_progress"}
                  remedial={lesson.remedial}
                  disabled={locked}
                  size={size}
                  hue={subjectHue}
                  label={`${lesson.title} — ${NODE_STATE_LABEL[lesson.state]}${kind !== "lesson" ? `, ${kind}` : ""}`}
                  onClick={() => onPick(lesson)}
                  className={lesson.id === selectedId ? "is-selected" : ""}
                />
                <span className="pnj-step-name">{lesson.title}</span>
                <span className={`pnj-step-meta is-${lesson.state} kind-${kind}`}>
                  {stepMeta(lesson)}
                </span>
                <SocialLine lesson={lesson} />
              </div>
              {i < unit.lessons.length - 1 && <StepLink />}
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/* --- expanded mode: guidebook trail ------------------------------------ */

const TRAIL_X = [26, 74, 26, 74];
const EXP_ROW = 168;

function trailD(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    const midY = (prev.y + next.y) / 2;
    d += ` C ${prev.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`;
  }
  return d;
}

function ExpandedUnit({
  unit,
  unitIndex,
  subjectHue,
  selectedId,
  onPick,
}: {
  unit: PathUnit;
  unitIndex: number;
  subjectHue?: string;
  selectedId: string | null;
  onPick: (lesson: PathLesson) => void;
}) {
  const p = unitProgress(unit);
  const height = unit.lessons.length * EXP_ROW;
  const xs = unit.lessons.map((_, i) => TRAIL_X[i % TRAIL_X.length]);
  const points = xs.map((x, i) => ({ x, y: i * EXP_ROW + EXP_ROW / 2 }));

  return (
    <li className="pnjx-unit">
      <div className="pnj-card pnjx-card-unit">
        <span className="pnj-card-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <rect x="5" y="4" width="14" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M9 9h6M9 12.5h6M9 16h3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="pnj-card-text">
          <strong>
            unit {unitIndex + 1} · {unit.title}
          </strong>
          <span
            className="pnj-card-bar"
            role="progressbar"
            aria-valuenow={p.done}
            aria-valuemin={0}
            aria-valuemax={p.total}
            aria-label={`Unit ${unitIndex + 1}: ${p.done} of ${p.total} lessons`}
          >
            <span
              className="pnj-card-bar-fill"
              style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }}
            />
          </span>
        </span>
        <span className="pnj-card-count">
          {p.done} of {p.total} lessons
        </span>
      </div>

      <ol className="pnjx-trail" style={{ height }}>
        {/* single continuous dashed spine through node centres — nodes
            cover the join so it reads as edge-to-edge arcs */}
        <svg
          className="pnjx-trail-line"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={trailD(points)} />
        </svg>
        {unit.lessons.map((lesson, i) => {
          const kind = nodeKind(lesson);
          const locked = lesson.state === "locked";
          const cardSide = xs[i] < 50 ? "right" : "left";
          return (
            <li key={lesson.id} className="pnjx-row" style={{ top: i * EXP_ROW, height: EXP_ROW }}>
              <div className="pnjx-node-wrap" style={{ left: `${xs[i]}%` }}>
                <JourneyNode
                  state={lesson.state}
                  kind={kind}
                  order={i + 1}
                  progress={lesson.progress}
                  recommended={lesson.recommended}
                  remedial={lesson.remedial}
                  disabled={locked}
                  size={kind === "checkpoint" ? 96 : kind === "practice" ? 76 : 88}
                  hue={subjectHue}
                  label={`${lesson.title} — ${NODE_STATE_LABEL[lesson.state]}${kind !== "lesson" ? `, ${kind}` : ""}`}
                  onClick={() => onPick(lesson)}
                  className={lesson.id === selectedId ? "is-selected" : ""}
                />
                <span className="pnjx-node-name" aria-hidden="true">
                  {lesson.title}
                </span>
              </div>
              <div className={`pnjx-card on-${cardSide}${lesson.id === selectedId ? " is-selected" : ""}`}>
                <span className="pnjx-card-state">{cardMeta(lesson)}</span>
                <strong className="pnjx-card-title">{lesson.title}</strong>
                <SocialLine lesson={lesson} />
                {lesson.state === "demonstrated" && lesson.social?.completed ? (
                  <JourneyNote rotate={-2} className="pnjx-card-note">
                    nice work! {lesson.social.completed} friends finished this
                  </JourneyNote>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/* --- shared shells ------------------------------------------------------ */

function SkeletonRows() {
  return (
    <div className="pn-skeleton-path" aria-busy="true" aria-label="Loading the learning path">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="pn-node-skeleton" style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

/**
 * The journey panel. Renders the same honest statuses as
 * LearningPathDrawer; `ready`/`needs_review` switch between the compact
 * reference lane and the expanded guidebook map.
 */
export function JourneyDrawer({
  open,
  subject,
  path,
  selectedLessonId,
  initialScrollTop,
  fixtureLabel,
  onSelectLesson,
  onStartLesson,
  onBack,
  onClose,
  onAddMaterials,
  onBrowseSources,
  onRetry,
  onScroll,
  mode,
  defaultMode,
  onModeChange,
  onInviteCrew,
}: JourneyDrawerProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const restoredScroll = useRef(false);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [internalMode, setInternalMode] = useState<JourneyMode>(
    () => defaultMode ?? savedMode(),
  );

  const resolvedMode = mode ?? internalMode;
  const setMode = (next: JourneyMode) => {
    setInternalMode(next);
    onModeChange?.(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* preference persistence is best-effort */
    }
  };

  const selectedId = selectedLessonId !== undefined ? selectedLessonId : internalSelected;
  const status = path?.status ?? "loading";
  const hasPath = status === "ready" || status === "needs_review";

  const pick = (lesson: PathLesson) => {
    const next = lesson.id === selectedId ? null : lesson.id;
    setInternalSelected(next);
    onSelectLesson?.(next);
  };
  const clearSelection = () => {
    setInternalSelected(null);
    onSelectLesson?.(null);
  };

  useDialogA11y({
    open,
    containerRef: dialogRef,
    onEscape: () => (selectedId ? clearSelection() : onClose()),
  });

  useEffect(() => {
    if (!open) {
      restoredScroll.current = false;
      return;
    }
    if (!restoredScroll.current && bodyRef.current && initialScrollTop != null) {
      bodyRef.current.scrollTop = initialScrollTop;
      restoredScroll.current = true;
    }
  }, [open, initialScrollTop]);

  const progress = useMemo(() => {
    const lessons = path?.sections.flatMap((s) => s.units.flatMap((u) => u.lessons)) ?? [];
    return {
      done: lessons.filter((l) => l.state === "demonstrated").length,
      total: lessons.length,
    };
  }, [path]);

  const continueTarget = useMemo(() => findContinue(path), [path]);

  /** Unit that owns the continue target — drives the hero badge/title. */
  const activeUnit = useMemo(() => {
    const units = path?.sections.flatMap((s) => s.units) ?? [];
    if (units.length === 0) return { unit: null as PathUnit | null, index: null as number | null };
    const idx = continueTarget
      ? units.findIndex((u) => u.lessons.some((l) => l.id === continueTarget.lesson.id))
      : 0;
    const i = idx >= 0 ? idx : 0;
    return { unit: units[i], index: i };
  }, [path, continueTarget]);

  const selectedLesson = useMemo(() => {
    if (!selectedId) return null;
    return (
      path?.sections
        .flatMap((s) => s.units.flatMap((u) => u.lessons))
        .find((l) => l.id === selectedId) ?? null
    );
  }, [path, selectedId]);

  if (!open) return null;

  const heroTitle = hasPath
    ? activeUnit.unit?.title ?? subject?.name ?? "learning path"
    : subject?.name ?? "learning path";
  const heroSub = hasPath
    ? path?.social?.friendsLearning
      ? `${path.social.friendsLearning} friends are learning ${subject?.name ?? "this"}`
      : progress.total > 0
        ? `${progress.done} of ${progress.total} lessons completed`
        : (subject?.name ?? "")
    : (subject?.name ?? "");
  const socialCount = path?.social?.friendsLearning ?? path?.social?.friendsStudied;

  return (
    <div className="pn-layer pn-layer-drawer">
      <div className="pn-scrim pn-scrim-drawer" onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        className={`pn-drawer pnj pnj-${resolvedMode}`}
        role="dialog"
        aria-modal="true"
        aria-label={subject ? `${subject.name} learning path` : "learning path"}
        tabIndex={-1}
        style={{ "--subject-hue": subject?.color ?? "var(--pn-subject-general)" } as CSSProperties}
      >
        {/* ---- cream hero ------------------------------------------------ */}
        <header className="pnj-hero">
          {fixtureLabel && <span className="pn-fixture-tag">{fixtureLabel}</span>}
          <div className="pnj-hero-text">
            <UnitBadge index={hasPath ? activeUnit.index : null} />
            <h3 className="pnj-hero-title">{heroTitle}</h3>
            {heroSub && <p className="pnj-hero-sub">{heroSub}</p>}
          </div>
          <JourneySticker
            name={heroStickerName(subject)}
            size={resolvedMode === "compact" ? 92 : 110}
            rotate={5}
            className="pnj-hero-mascot"
          />
          <div className="pn-drawer-controls pnj-hero-controls">
            <button
              type="button"
              className="pn-icon-btn pnj-mode-btn"
              onClick={() => setMode(resolvedMode === "compact" ? "expanded" : "compact")}
              aria-label={resolvedMode === "compact" ? "Open guidebook map view" : "Back to list view"}
              title={resolvedMode === "compact" ? "guidebook" : "list"}
            >
              {resolvedMode === "compact" ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M5 4h5.5v16H5zM13.5 4H19v16h-5.5z" fill="none" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M6 6.5h12M6 12h12M6 17.5h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              )}
            </button>
            {onBack && (
              <button
                type="button"
                className="pn-icon-btn"
                onClick={onBack}
                aria-label="Back to subject picker"
              >
                ‹
              </button>
            )}
            <button
              type="button"
              className="pn-icon-btn"
              onClick={onClose}
              aria-label="Close learning path"
              data-autofocus={!hasPath ? true : undefined}
            >
              ×
            </button>
          </div>
        </header>

        {/* ---- dark body --------------------------------------------------- */}
        <div
          className="pn-drawer-body pnj-body"
          ref={bodyRef}
          onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
        >
          {status === "loading" && <SkeletonRows />}

          {status === "generating" && (
            <div className="pn-slip pn-slip-status" role="status">
              <strong>sketching your path…</strong>
              <span>
                your sources are being read and arranged into sections, units and
                lessons. you can look through the material while it works.
              </span>
              {onBrowseSources && (
                <button type="button" className="pn-slip-retry" onClick={onBrowseSources}>
                  browse sources
                </button>
              )}
            </div>
          )}

          {status === "needs_material" && (
            <div className="pn-empty-path">
              <span className="pn-empty-path-disc" aria-hidden="true">
                +
              </span>
              <strong>nothing on this path yet</strong>
              <p>
                {subject?.name ?? "this subject"} is real, but it has no material
                to build from. add a PDF, some notes, or a few objectives and the
                path draws itself.
              </p>
              {onAddMaterials && (
                <button type="button" className="pn-cta" onClick={onAddMaterials}>
                  add resources
                </button>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="pn-slip" role="alert">
              <strong>the path tore on the way in</strong>
              <span>{path?.error?.message ?? "the learning path couldn't be loaded."}</span>
              {path?.error?.retryable !== false && onRetry && (
                <button type="button" className="pn-slip-retry" onClick={onRetry}>
                  try again
                </button>
              )}
            </div>
          )}

          {hasPath && (
            <>
              {status === "needs_review" && (
                <div className="pn-slip pn-slip-status" role="status">
                  <strong>this path has changes to review</strong>
                  <span>nothing is published until you look it over.</span>
                </div>
              )}

              {/* raised social strip — only real social data */}
              {socialCount ? (
                <div className="pnj-strip">
                  <FacePile names={path?.social?.names ?? []} />
                  <p className="pnj-strip-text">
                    <strong>+{socialCount} others</strong> are studying{" "}
                    {subject?.name?.toLowerCase() ?? "this"} right now
                  </p>
                  <span className="pnj-strip-sparks" aria-hidden="true">
                    <JourneyDoodle kind="sparkle" size={18} />
                    <JourneyDoodle kind="sparkle" size={12} />
                  </span>
                </div>
              ) : null}

              {resolvedMode === "expanded" ? (
                <ol className="pnjx-sections">
                  {path?.sections.map((section) => (
                    <li key={section.id} className="pnjx-section">
                      <ol className="pnjx-units">
                        {section.units.map((unit, unitIndex) => (
                          <ExpandedUnit
                            key={unit.id}
                            unit={unit}
                            unitIndex={unitIndex}
                            subjectHue={subject?.color}
                            selectedId={selectedId}
                            onPick={pick}
                          />
                        ))}
                      </ol>
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="pnj-units">
                  {path?.sections.flatMap((section) =>
                    section.units.map((unit, unitIndex) => (
                      <CompactUnit
                        key={unit.id}
                        unit={unit}
                        unitIndex={unitIndex}
                        subjectHue={subject?.color}
                        selectedId={selectedId}
                        onPick={pick}
                      />
                    )),
                  )}
                </ol>
              )}

              {selectedLesson && (
                <div
                  className="pnj-selection"
                  role="group"
                  aria-label={`${selectedLesson.title} preview`}
                >
                  <span className={`pn-preview-state is-${selectedLesson.state}`}>
                    {NODE_STATE_LABEL[selectedLesson.state]}
                  </span>
                  <h5 className="pnj-selection-title">{selectedLesson.title}</h5>
                  {selectedLesson.objectives.length > 0 && (
                    <ul className="pn-preview-objectives">
                      {selectedLesson.objectives.slice(0, 3).map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                  <div className="pn-preview-meta">
                    <span>{selectedLesson.activityCount} activities</span>
                    {selectedLesson.sourceCount > 0 && (
                      <span>
                        {selectedLesson.sourceCount === 1
                          ? "1 source"
                          : `${selectedLesson.sourceCount} sources`}
                      </span>
                    )}
                    {selectedLesson.durationMin != null && (
                      <span>{selectedLesson.durationMin} min</span>
                    )}
                  </div>
                  <div className="pnj-selection-actions">
                    <button
                      type="button"
                      className="pn-cta pn-cta-dark"
                      disabled={selectedLesson.state === "locked"}
                      onClick={() => onStartLesson?.(selectedLesson.id)}
                    >
                      {selectedLesson.state === "in_progress"
                        ? "resume →"
                        : selectedLesson.state === "demonstrated"
                          ? "walk through again →"
                          : selectedLesson.state === "locked"
                            ? "locked"
                            : "start →"}
                    </button>
                    <button
                      type="button"
                      className="pn-preview-close"
                      onClick={clearSelection}
                      aria-label="Close lesson preview"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---- fixed lime CTA ---------------------------------------------- */}
        {hasPath && (
          <footer className="pnj-cta-bar">
            {resolvedMode === "expanded" && path?.social?.friendsLearning ? (
              <div className="pnj-crew">
                <span className="pnj-crew-text">
                  <strong>study this unit with your crew</strong>
                  <span>
                    {path.social.friendsLearning} friends are learning {subject?.name}
                  </span>
                </span>
                <FacePile names={path.social.names ?? []} />
                {onInviteCrew && (
                  <button type="button" className="pnj-invite" onClick={onInviteCrew}>
                    invite
                  </button>
                )}
              </div>
            ) : null}
            {continueTarget ? (
              <button
                type="button"
                className="pnj-continue"
                onClick={() => onStartLesson?.(continueTarget.lesson.id)}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
                continue lesson {continueTarget.order}
                <span className="pnj-continue-title">{continueTarget.lesson.title}</span>
                <svg
                  className="pnj-continue-chev"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="M7 9.5 12 14.5 17 9.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <span className="pnj-continue pnj-continue-done" role="status">
                every lesson finished — nice work
              </span>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}
