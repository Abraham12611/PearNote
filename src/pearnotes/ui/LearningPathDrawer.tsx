import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDialogA11y } from "./a11y";
import { SubjectAvatar } from "./SubjectAvatar";
import type { LearningPath, PathLesson, PathUnit, PearSubject } from "./types";

export interface LearningPathDrawerProps {
  open: boolean;
  /** the subject whose space this is; null while it loads */
  subject: PearSubject | null;
  /** the curriculum view; `null`/`status:"loading"` draws the skeleton */
  path: LearningPath | null;
  /** controlled selection; internal selection is used when omitted */
  selectedLessonId?: string | null;
  /** restore scroll on re-open — S04: "preserve scroll and selected node" */
  initialScrollTop?: number;
  fixtureLabel?: string;
  onSelectLesson?: (lessonId: string | null) => void;
  onStartLesson?: (lessonId: string) => void;
  /** visible back affordance (e.g. return to the subject picker) */
  onBack?: () => void;
  onClose: () => void;
  /** `needs_material` state → subject source wizard */
  onAddMaterials?: () => void;
  /** `generating` state → browse the subject's sources meanwhile */
  onBrowseSources?: () => void;
  onRetry?: () => void;
  onScroll?: (scrollTop: number) => void;
}

const ROW = 112;
const XS = [50, 20, 50, 80];

const NODE_STATE_LABEL: Record<PathLesson["state"], string> = {
  not_started: "not started",
  available: "ready to start",
  in_progress: "in progress",
  practicing: "practice",
  demonstrated: "demonstrated",
  needs_review: "needs review",
  locked: "locked",
};

function ctaLabel(lesson: PathLesson) {
  switch (lesson.state) {
    case "in_progress": return "resume →";
    case "practicing": return "keep practicing →";
    case "demonstrated": return "walk through again →";
    case "needs_review": return "review →";
    case "locked": return "locked";
    default: return "start →";
  }
}

function trailPath(points: { x: number; y: number }[]) {
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

function nodeX(lesson: PathLesson, index: number, prevX: number) {
  if (!lesson.remedial) return XS[index % XS.length];
  /* remedial branches step off the main wind to the open side */
  return prevX < 50 ? 84 : 16;
}

function NodeGlyph({ lesson, order }: { lesson: PathLesson; order: number }) {
  if (lesson.state === "demonstrated") {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (lesson.state === "locked") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="6" y="10" width="12" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M9 10V8a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    );
  }
  if (lesson.state === "needs_review") return <span aria-hidden="true">!</span>;
  if (lesson.state === "practicing") return <span aria-hidden="true">↻</span>;
  return <span aria-hidden="true">{order}</span>;
}

function NodePreview({
  lesson,
  onStart,
  onDismiss,
}: {
  lesson: PathLesson;
  onStart?: (lessonId: string) => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const locked = lesson.state === "locked";
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lesson.id]);

  return (
    <div className="pn-preview-row" role="presentation">
      <div className="pn-preview" ref={ref} role="group" aria-label={`${lesson.title} preview`}>
        <span className={`pn-preview-state is-${lesson.state}`}>{NODE_STATE_LABEL[lesson.state]}</span>
        <h5 className="pn-preview-title">{lesson.title}</h5>
        {lesson.objectives.length > 0 && (
          <ul className="pn-preview-objectives">
            {lesson.objectives.slice(0, 3).map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        )}
        <div className="pn-preview-meta">
          <span>{lesson.activityCount} activities</span>
          <span>{lesson.sourceCount === 1 ? "1 source" : `${lesson.sourceCount} sources`}</span>
        </div>
        <div className="pn-preview-actions">
          <button
            type="button"
            className="pn-cta pn-cta-dark"
            disabled={locked}
            onClick={() => onStart?.(lesson.id)}
          >
            {ctaLabel(lesson)}
          </button>
          <button type="button" className="pn-preview-close" onClick={onDismiss} aria-label="Close lesson preview">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function Pathway({
  unit,
  unitIndex,
  selectedId,
  onPick,
  onStart,
  onDismiss,
}: {
  unit: PathUnit;
  unitIndex: number;
  selectedId: string | null;
  onPick: (lesson: PathLesson) => void;
  onStart?: (lessonId: string) => void;
  onDismiss: () => void;
}) {
  const xs: number[] = [];
  unit.lessons.forEach((lesson, i) => {
    xs.push(nodeX(lesson, i, i === 0 ? 50 : xs[i - 1]));
  });
  const height = unit.lessons.length * ROW;
  const points = xs.map((x, i) => ({ x, y: i * ROW + ROW / 2 }));

  return (
    <div className="pn-unit">
      <div className="pn-unit-head">
        <span className="pn-pill pn-unit-pill">unit {unitIndex + 1}</span>
        <h4 className="pn-unit-title">{unit.title}</h4>
      </div>
      <ol className="pn-pathway" style={{ height }}>
        <svg
          className="pn-trail"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={trailPath(points)} />
        </svg>
        {unit.lessons.map((lesson, i) => {
          const selected = lesson.id === selectedId;
          return (
            <li
              key={lesson.id}
              className="pn-node-row"
              style={{ top: i * ROW, height: ROW }}
            >
              <div className="pn-node-wrap" style={{ left: `calc(${xs[i]}% - 40px)` }}>
                <button
                  type="button"
                  className={`pn-node is-${lesson.state}${lesson.remedial ? " is-remedial" : ""}${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  aria-label={`${lesson.title} — ${NODE_STATE_LABEL[lesson.state]}`}
                  onClick={() => onPick(lesson)}
                >
                  {lesson.state === "in_progress" && typeof lesson.progress === "number" && (
                    <svg className="pn-node-ring" viewBox="0 0 80 80" aria-hidden="true">
                      <circle cx="40" cy="40" r="35" className="pn-node-ring-track" />
                      <circle
                        cx="40" cy="40" r="35" className="pn-node-ring-fill"
                        strokeDasharray={`${Math.round(220 * Math.min(1, Math.max(0, lesson.progress)))} 220`}
                      />
                    </svg>
                  )}
                  {lesson.recommended && <span className="pn-next-tag">next</span>}
                  <NodeGlyph lesson={lesson} order={i + 1} />
                </button>
                <span className="pn-node-name">{lesson.title}</span>
              </div>
              {selected && (
                <NodePreview lesson={lesson} onStart={onStart} onDismiss={onDismiss} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SkeletonPath() {
  return (
    <div className="pn-skeleton-path" aria-busy="true" aria-label="Loading the learning path">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="pn-node-skeleton" style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

/**
 * S04 — the learning path. A right-hand drawer (≈52vw desktop, wider on
 * tablet, full-screen sheet on mobile) over a dimmed Home. Modal: focus is
 * trapped, Escape clears the node preview first then closes, focus returns
 * to the trigger. Every generation phase renders honestly — loading,
 * generating, needs_material, needs_review, ready and error are distinct.
 */
export function LearningPathDrawer({
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
}: LearningPathDrawerProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const restoredScroll = useRef(false);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);

  const selectedId = selectedLessonId !== undefined ? selectedLessonId : internalSelected;
  const status = path?.status ?? "loading";

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

  if (!open) return null;

  return (
    <div className="pn-layer pn-layer-drawer">
      <div className="pn-scrim pn-scrim-drawer" onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        className="pn-drawer"
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
              <SubjectAvatar avatar={subject.avatar} color={subject.color} size={52} />
              <div className="pn-drawer-heading">
                <span className="pn-kicker">learning path</span>
                <h3 className="pn-drawer-title">{subject.name}</h3>
                <span className="pn-drawer-progress">
                  {progress.total > 0
                    ? `${progress.done} of ${progress.total} lessons demonstrated`
                    : "no lessons yet"}
                </span>
              </div>
            </>
          ) : (
            <div className="pn-drawer-heading">
              <span className="pn-kicker">learning path</span>
              <h3 className="pn-drawer-title">loading…</h3>
            </div>
          )}
          <div className="pn-drawer-controls">
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
              data-autofocus={status !== "ready" ? true : undefined}
            >
              ×
            </button>
          </div>
        </header>

        <div
          className="pn-drawer-body"
          ref={bodyRef}
          onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
        >
          {status === "loading" && <SkeletonPath />}

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

          {(status === "ready" || status === "needs_review") && (
            <>
              {status === "needs_review" && (
                <div className="pn-slip pn-slip-status" role="status">
                  <strong>this path has changes to review</strong>
                  <span>nothing is published until you look it over.</span>
                </div>
              )}
              <ol className="pn-path-sections">
                {path?.sections.map((section) => (
                  <li key={section.id} className="pn-section">
                    <div className="pn-section-band">
                      <h4 className="pn-section-title">{section.title}</h4>
                      {section.theme && <span className="pn-section-theme">{section.theme}</span>}
                    </div>
                    {section.units.map((unit, unitIndex) => (
                      <Pathway
                        key={unit.id}
                        unit={unit}
                        unitIndex={unitIndex}
                        selectedId={selectedId}
                        onPick={pick}
                        onStart={onStartLesson}
                        onDismiss={clearSelection}
                      />
                    ))}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
