/**
 * Shell-owned fallbacks rendered until Engineer 3's `src/pearnotes/ui/`
 * components land (see slots.tsx). Each one is honest about what exists:
 * no subjects means ONLY a `+` tile (acceptance E01), no path data means an
 * empty drawer, and the lesson placeholder mounts the REAL inherited canvas
 * engine to prove the seam — not a fork.
 *
 * Classes use the `.pns-` (shell) namespace so they never collide with the
 * ui package's `.pn-` classes once its stylesheet lands.
 */
import type {
  LearningPathDrawerProps,
  LessonShellProps,
  PearNotesHomeProps,
  SubjectPickerProps,
} from "./types";

export function HomePlaceholder({
  subjects,
  onLearn,
  onCreateSubject,
}: PearNotesHomeProps) {
  const empty = subjects.length === 0;
  return (
    <div className="pns-home">
      <h1 className="pns-title">PearNotes</h1>
      <p className="pns-subtitle">
        {empty
          ? "your learning desk is empty — start with a subject"
          : `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
      </p>
      <button type="button" className="pns-key" onClick={onLearn}>
        learn →
      </button>
      {empty && (
        <button type="button" className="pns-link" onClick={onCreateSubject}>
          create your first subject
        </button>
      )}
    </div>
  );
}

export function SubjectPickerPlaceholder({
  open,
  subjects,
  status = "ready",
  onSelect,
  onEnter,
  onCreate,
  onClose,
}: SubjectPickerProps) {
  if (!open) return null;
  return (
    <div
      className="pns-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div
        className="pns-modal"
        role="dialog"
        aria-modal="true"
        aria-label="pick a subject"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="pns-modal-title">pick a subject</h2>
        {status === "loading" ? (
          <p className="pns-empty">getting your subjects…</p>
        ) : (
          <div className="pns-picker-grid">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className="pns-subject-tile"
                onClick={() =>
                  onEnter ? onEnter(subject.id) : onSelect?.(subject.id)
                }
              >
                {subject.name}
              </button>
            ))}
            {/* Always present, even with many subjects (SITEMAP rule). */}
            <button
              type="button"
              className="pns-subject-tile pns-subject-tile-new"
              onClick={onCreate}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LearningPathDrawerPlaceholder({
  open,
  subject,
  path,
  onClose,
}: LearningPathDrawerProps) {
  if (!open) return null;
  return (
    <aside className="pns-drawer" role="dialog" aria-label="learning path">
      <button type="button" className="pns-drawer-back" onClick={onClose}>
        ← back
      </button>
      {path ? null : (
        <p className="pns-empty">
          nothing on this path yet
          <small>
            {subject ? subject.name : "path"} — learning data arrives with the
            backend (Phase 01)
          </small>
        </p>
      )}
    </aside>
  );
}

/** The seam Phase 00 exists to prove: the lesson IS the inherited canvas. */
export function LessonShellPlaceholder({
  children,
  onExit,
}: LessonShellProps) {
  return (
    <div className="pns-lesson">
      <nav className="pns-lesson-chrome" aria-label="Lesson">
        <button type="button" className="pns-drawer-back" onClick={onExit}>
          ← exit lesson
        </button>
        <span className="pns-lesson-note">
          lesson canvas — existing engine, no widgets yet
        </span>
      </nav>
      <div className="pns-lesson-board">{children}</div>
    </div>
  );
}
