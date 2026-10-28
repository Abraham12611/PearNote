import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../styles/journey.css";
import { useDialogA11y } from "./a11y";
import { SubjectAvatar } from "./SubjectAvatar";
import type { LearningPathDrawerProps } from "./LearningPathDrawer";
import type { LearningPath, PathLesson, PathNodeKind, PathUnit } from "./types";

/* ------------------------------------------------------------------
 * JourneyDrawer — the hybrid learning-path redesign
 * (docs/phase00/JOURNEY_REDESIGN.md).
 *
 * Compact (default): the mockup-1 structure at ~26vw — numbered rows,
 * per-unit progress bar, one-line social snippets, sticky continue CTA.
 * Expanded: the mockup-3 "guidebook" map — hero banner, winding trail,
 * side cards, sticky notes, crew footer — at ~48vw.
 *
 * Same contract as LearningPathDrawer plus `mode`/`onModeChange`; new
 * data fields (kind, durationMin, social, path.social) are optional and
 * only ever supplied by real path data or labelled fixtures.
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
  available: "ready to start",
  in_progress: "in progress",
  practicing: "practice",
  demonstrated: "completed",
  needs_review: "needs review",
  locked: "locked",
};

function nodeKind(lesson: PathLesson): PathNodeKind {
  return lesson.kind ?? (lesson.remedial || lesson.state === "practicing" ? "practice" : "lesson");
}

/* --- glyphs -------------------------------------------------------- */

function Glyph({ lesson, order }: { lesson: PathLesson; order: number }) {
  const size = 22;
  if (lesson.state === "demonstrated")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (lesson.state === "locked")
    return (
      <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden="true">
        <rect x="6" y="10" width="12" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M9 10V8a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    );
  if (lesson.state === "in_progress")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
      </svg>
    );
  const kind = nodeKind(lesson);
  if (kind === "checkpoint")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d="M7 4h10v3a5 5 0 0 1-10 0z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 2.9M17 6h2.5a2.5 2.5 0 0 1-2.6 2.9M12 12v3m-3.5 4h7l-1-4h-5z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "practice")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M9.5 9.5h5M9.5 12.5h5M9.5 15.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  if (lesson.state === "needs_review") return <span aria-hidden="true">!</span>;
  return <span aria-hidden="true">{order}</span>;
}

/* --- small pieces --------------------------------------------------- */

function FacePile({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  return (
    <span className="pnj-faces" aria-hidden="true">
      {shown.map((name) => (
        <span key={name} className="pnj-face">
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
      ? `${s.studyingNow} studying now with you`
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

function stateChip(lesson: PathLesson) {
  const kind = nodeKind(lesson);
  if (kind === "checkpoint") return "checkpoint";
  if (kind === "practice") return "practice";
  if (lesson.state === "demonstrated") return "completed";
  if (lesson.state === "locked") return "locked";
  if (lesson.state === "needs_review") return "review";
  return "lesson";
}

function metaText(lesson: PathLesson) {
  const chip = stateChip(lesson);
  return lesson.durationMin != null ? `${chip} · ${lesson.durationMin} min` : chip;
}

/** Expanded card line — "{state} · {kind?} · {duration}" without
 *  duplicating words (e.g. "completed · 5 min", "locked · practice · 5 min"). */
function cardMeta(lesson: PathLesson) {
  const kind = nodeKind(lesson);
  const parts = [NODE_STATE_LABEL[lesson.state]];
  if (kind !== "lesson") parts.push(kind === "checkpoint" ? "checkpoint" : "practice");
  if (lesson.durationMin != null) parts.push(`${lesson.durationMin} min`);
  return parts.join(" · ");
}

/** The lesson the sticky CTA points at: recommended first, else the
 *  in-progress lesson, else the first open one. Returns the lesson and a
 *  1-based order inside its unit ("Continue lesson 2"). */
function findContinue(path: LearningPath | null) {
  if (!path) return null;
  const units = path.sections.flatMap((s) => s.units);
  const all = units.flatMap((u) => u.lessons.map((l, i) => ({ l, order: i + 1 })));
  const pick =
    all.find(({ l }) => l.recommended) ??
    all.find(({ l }) => l.state === "in_progress") ??
    all.find(({ l }) => l.state === "available" || l.state === "not_started" || l.state === "needs_review" || l.state === "practicing");
  return pick ? { lesson: pick.l, order: pick.order } : null;
}

function unitProgress(unit: PathUnit) {
  const total = unit.lessons.length;
  const done = unit.lessons.filter((l) => l.state === "demonstrated").length;
  const active = unit.lessons.findIndex((l) => l.state !== "demonstrated" && l.state !== "locked") + 1;
  return { done, total, active };
}

/* --- compact mode ---------------------------------------------------- */

function CompactUnit({
  unit,
  unitIndex,
  selectedId,
  onPick,
}: {
  unit: PathUnit;
  unitIndex: number;
  selectedId: string | null;
  onPick: (lesson: PathLesson) => void;
}) {
  const p = unitProgress(unit);
  return (
    <li className="pnj-unit">
      <div className="pnj-unit-progress">
        <span className="pnj-unit-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="5" y="4" width="14" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M9 9h6M9 12.5h6M9 16h3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="pnj-unit-progress-text">
          <strong>Unit {unitIndex + 1} progress</strong>
          <span className="pnj-unit-bar" role="progressbar" aria-valuenow={p.done} aria-valuemin={0} aria-valuemax={p.total} aria-label={`Unit ${unitIndex + 1}: ${p.done} of ${p.total} lessons`}>
            <span className="pnj-unit-bar-fill" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
          </span>
        </span>
        <span className="pnj-unit-count">{p.done} of {p.total} lessons</span>
      </div>
      <ol className="pnj-rows">
        {unit.lessons.map((lesson, i) => {
          const locked = lesson.state === "locked";
          const current = lesson.state === "in_progress";
          return (
            <li key={lesson.id}>
              <button
                type="button"
                className={`pnj-row is-${lesson.state}${lesson.recommended ? " is-next" : ""}${nodeKind(lesson) !== "lesson" ? ` kind-${nodeKind(lesson)}` : ""}${lesson.id === selectedId ? " is-selected" : ""}`}
                disabled={locked}
                aria-pressed={lesson.id === selectedId}
                onClick={() => onPick(lesson)}
              >
                <span className="pnj-dot">
                  {current && typeof lesson.progress === "number" && (
                    <svg className="pnj-ring" viewBox="0 0 44 44" aria-hidden="true">
                      <circle cx="22" cy="22" r="19" className="pnj-ring-track" />
                      <circle cx="22" cy="22" r="19" className="pnj-ring-fill"
                        strokeDasharray={`${Math.round(119 * Math.min(1, Math.max(0, lesson.progress)))} 119`} />
                    </svg>
                  )}
                  <Glyph lesson={lesson} order={i + 1} />
                </span>
                <span className="pnj-row-text">
                  <strong>
                    {i + 1}. {lesson.title}
                  </strong>
                  {lesson.objectives[0] && <small>{lesson.objectives[0]}</small>}
                  <SocialLine lesson={lesson} />
                </span>
                <span className="pnj-row-meta">
                  {lesson.recommended && !current && <span className="pnj-tag">next</span>}
                  {current && <span className="pnj-tag">jump in!</span>}
                  <span className="pnj-meta">{metaText(lesson)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/* --- expanded mode --------------------------------------------------- */

const TRAIL_X = [26, 74, 26, 74];
const EXP_ROW = 150;

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
  selectedId,
  onPick,
}: {
  unit: PathUnit;
  unitIndex: number;
  selectedId: string | null;
  onPick: (lesson: PathLesson) => void;
}) {
  const height = unit.lessons.length * EXP_ROW;
  const xs = unit.lessons.map((_, i) => TRAIL_X[i % TRAIL_X.length]);
  const points = xs.map((x, i) => ({ x, y: i * EXP_ROW + EXP_ROW / 2 }));

  return (
    <li className="pnjx-unit">
      <div className="pnjx-unit-band">
        <span className="pn-pill">unit {unitIndex + 1}</span>
        <h4 className="pnjx-unit-title">{unit.title}</h4>
      </div>
      <ol className="pnjx-trail" style={{ height }}>
        <svg className="pnjx-trail-line" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={trailD(points)} />
        </svg>
        {unit.lessons.map((lesson, i) => {
          const locked = lesson.state === "locked";
          const cardSide = xs[i] < 50 ? "right" : "left";
          return (
            <li key={lesson.id} className="pnjx-row" style={{ top: i * EXP_ROW, height: EXP_ROW }}>
              <div className="pnjx-node-wrap" style={{ left: `${xs[i]}%` }}>
                <button
                  type="button"
                  className={`pnjx-node is-${lesson.state}${nodeKind(lesson) !== "lesson" ? ` kind-${nodeKind(lesson)}` : ""}${lesson.remedial ? " is-remedial" : ""}${lesson.id === selectedId ? " is-selected" : ""}`}
                  disabled={locked}
                  aria-pressed={lesson.id === selectedId}
                  aria-label={`${lesson.title} — ${NODE_STATE_LABEL[lesson.state]}`}
                  onClick={() => onPick(lesson)}
                >
                  {lesson.state === "in_progress" && typeof lesson.progress === "number" && (
                    <svg className="pnj-ring" viewBox="0 0 84 84" aria-hidden="true">
                      <circle cx="42" cy="42" r="37" className="pnj-ring-track" />
                      <circle cx="42" cy="42" r="37" className="pnj-ring-fill"
                        strokeDasharray={`${Math.round(232 * Math.min(1, Math.max(0, lesson.progress)))} 232`} />
                    </svg>
                  )}
                  {lesson.recommended && <span className="pnj-tag pnj-tag-node">next</span>}
                  <Glyph lesson={lesson} order={i + 1} />
                </button>
                {/* mobile: side cards collapse away, the name keeps the
                    node identifiable (aria-label covers a11y either way) */}
                <span className="pnjx-node-name" aria-hidden="true">{lesson.title}</span>
              </div>
              <div className={`pnjx-card on-${cardSide}${lesson.id === selectedId ? " is-selected" : ""}`}>
                <span className="pnjx-card-state">{cardMeta(lesson)}</span>
                <strong className="pnjx-card-title">{lesson.title}</strong>
                <SocialLine lesson={lesson} />
                {lesson.state === "demonstrated" && lesson.social?.completed ? (
                  <span className="pnj-note" aria-hidden="true">Nice work! {lesson.social.completed} friends finished this lesson</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/* --- shared shells --------------------------------------------------- */

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
 * The hybrid journey panel. Renders the same honest statuses as
 * LearningPathDrawer; `ready`/`needs_review` switch between the compact
 * list and the expanded guidebook map.
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
  const selectedLesson = useMemo(() => {
    if (!selectedId) return null;
    return (
      path?.sections
        .flatMap((s) => s.units.flatMap((u) => u.lessons))
        .find((l) => l.id === selectedId) ?? null
    );
  }, [path, selectedId]);

  if (!open) return null;

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
        {fixtureLabel && <span className="pn-fixture-tag">{fixtureLabel}</span>}

        <header className="pn-drawer-head">
          {subject ? (
            <>
              <SubjectAvatar avatar={subject.avatar} color={subject.color} size={resolvedMode === "compact" ? 44 : 52} />
              <div className="pn-drawer-heading">
                <span className="pn-kicker">learn path</span>
                <h3 className="pn-drawer-title">{subject.name}</h3>
                <span className="pn-drawer-progress">
                  {progress.total > 0
                    ? `${progress.done} of ${progress.total} lessons completed`
                    : "no lessons yet"}
                </span>
              </div>
            </>
          ) : (
            <div className="pn-drawer-heading">
              <span className="pn-kicker">learn path</span>
              <h3 className="pn-drawer-title">loading…</h3>
            </div>
          )}
          <span className="pnj-mascot" aria-hidden="true">you got this!</span>
          <div className="pn-drawer-controls">
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
              <button type="button" className="pn-icon-btn" onClick={onBack} aria-label="Back to subject picker">
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

        {hasPath && path?.social?.friendsStudied ? (
          <div className="pnj-social-strip">
            <FacePile names={path.social.names ?? []} />
            <span>
              <strong>{path.social.friendsStudied} friends studied this</strong>
              {path.social.names?.length ? ` — ${path.social.names.join(", ")} are on this path.` : ""}
            </span>
          </div>
        ) : null}

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
              <span className="pn-empty-path-disc" aria-hidden="true">+</span>
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

              {resolvedMode === "expanded" ? (
                <ol className="pnjx-sections">
                  {path?.sections.map((section) => (
                    <li key={section.id} className="pnjx-section">
                      <div className="pnjx-hero">
                        <span className="pnj-note pnj-note-hero" aria-hidden="true">tiny but mighty!</span>
                        <span className="pn-kicker">{section.theme ?? "unit"}</span>
                        <h4 className="pnjx-hero-title">{section.title}</h4>
                        {path.social?.friendsLearning ? (
                          <span className="pnjx-hero-meta">{path.social.friendsLearning} friends learning alongside you</span>
                        ) : null}
                      </div>
                      <ol className="pnjx-units">
                        {section.units.map((unit, unitIndex) => (
                          <ExpandedUnit
                            key={unit.id}
                            unit={unit}
                            unitIndex={unitIndex}
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
                        selectedId={selectedId}
                        onPick={pick}
                      />
                    )),
                  )}
                </ol>
              )}

              {selectedLesson && (
                <div className="pnj-selection" role="group" aria-label={`${selectedLesson.title} preview`}>
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
                      <span>{selectedLesson.sourceCount === 1 ? "1 source" : `${selectedLesson.sourceCount} sources`}</span>
                    )}
                    {selectedLesson.durationMin != null && <span>{selectedLesson.durationMin} min</span>}
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
                    <button type="button" className="pn-preview-close" onClick={clearSelection} aria-label="Close lesson preview">
                      ×
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {hasPath && continueTarget && (
          <footer className="pnj-cta-bar">
            {resolvedMode === "expanded" && path?.social?.friendsLearning ? (
              <div className="pnj-crew">
                <span className="pnj-crew-text">
                  <strong>study this unit with your crew</strong>
                  <span>{path.social.friendsLearning} friends are learning {subject?.name}</span>
                </span>
                <FacePile names={path.social.names ?? []} />
                {onInviteCrew && (
                  <button type="button" className="pnj-invite" onClick={onInviteCrew}>
                    invite
                  </button>
                )}
              </div>
            ) : null}
            <button
              type="button"
              className="pnj-continue"
              onClick={() => onStartLesson?.(continueTarget.lesson.id)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
              continue lesson {continueTarget.order}
              <span className="pnj-continue-title">{continueTarget.lesson.title}</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
