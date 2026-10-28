import { useEffect, useId, useState, type ReactNode } from "react";
import type {
  LessonMode,
  LessonObjectRef,
  LessonSummary,
  LessonSyncState,
} from "./types";

export interface LessonShellProps {
  /** nullable at the shell boundary — `null` means "no lesson data exists
   *  yet" and renders the loading slip instead of fabricated chrome */
  lesson: LessonSummary | null;
  mode: LessonMode;
  onModeChange?: (mode: LessonMode) => void;
  /** exit → back to the path drawer (shell restores scroll + selection) */
  onExit: () => void;
  /** explore-mode "return to next activity" → camera back to the
   *  recommended objective anchor */
  onReturnToNext?: () => void;
  /** jump the camera to an object — used by the linear list view */
  onOpenObject?: (objectId: string) => void;
  syncState?: LessonSyncState;
  /** `loading` shows a pinning slip, `error` a torn slip with a way back */
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
  fixtureLabel?: string;
  /** the lesson canvas — Engineer 2 mounts the real board here. In the
   *  prototype harness this is a labelled placeholder. */
  children?: ReactNode;
  /** extra fixed chrome (e.g. a tutor dock) — pointer-events safe */
  chrome?: ReactNode;
}

const SYNC_LABEL: Record<LessonSyncState, string> = {
  saved: "saved",
  saving: "saving…",
  offline: "offline — your work is kept",
  error: "couldn't sync",
};

const OBJECT_GLYPH: Record<LessonObjectRef["kind"], string> = {
  lesson_card: "✦",
  source: "❝",
  challenge: "?",
  teach_back: "✎",
  note: "✱",
  practice: "↻",
};

const OBJECT_STATE_LABEL: Record<LessonObjectRef["state"], string> = {
  todo: "to do",
  active: "current",
  done: "done",
  review: "review",
};

function LessonCompass({
  lesson,
  mode,
  onModeChange,
  onExit,
  onReturnToNext,
}: {
  lesson: LessonSummary;
  mode: LessonMode;
  onModeChange?: (mode: LessonMode) => void;
  onExit: () => void;
  onReturnToNext?: () => void;
}) {
  const done = lesson.objectives.filter((o) => o.state === "demonstrated").length;
  const total = lesson.objectives.length;
  const next = lesson.objectives.find((o) => o.state !== "demonstrated");

  return (
    <section className="pn-compass" aria-label="Lesson compass">
      <div className="pn-compass-top">
        <span className="pn-kicker">compass</span>
        <button
          type="button"
          className="pn-icon-btn pn-compass-exit"
          onClick={onExit}
          aria-label="Exit lesson and return to path"
        >
          ×
        </button>
      </div>
      <strong className="pn-compass-title">{lesson.title}</strong>
      <div className="pn-compass-progress" role="img" aria-label={`${done} of ${total} objectives demonstrated`}>
        <span className="pn-compass-bar">
          <span
            className="pn-compass-bar-fill"
            style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
          />
        </span>
        <span className="pn-compass-count">{done}/{total}</span>
      </div>
      <div className="pn-mode" role="group" aria-label="Lesson mode">
        <button
          type="button"
          className={`pn-mode-btn${mode === "guided" ? " is-active" : ""}`}
          aria-pressed={mode === "guided"}
          onClick={() => onModeChange?.("guided")}
        >
          guided
        </button>
        <button
          type="button"
          className={`pn-mode-btn${mode === "explore" ? " is-active" : ""}`}
          aria-pressed={mode === "explore"}
          onClick={() => onModeChange?.("explore")}
        >
          explore
        </button>
      </div>
      {mode === "guided" ? (
        <p className="pn-compass-next">
          step {Math.min(lesson.stepIndex + 1, lesson.stepCount)} of {lesson.stepCount}
          {next ? ` · next — ${next.text}` : " · all objectives covered"}
        </p>
      ) : (
        <button type="button" className="pn-return" onClick={onReturnToNext}>
          return to next activity →
        </button>
      )}
    </section>
  );
}

/**
 * S05 — the lesson space. Full-screen spatial board (`children` is the
 * canvas slot) with fixed chrome that never swallows canvas input: the
 * breadcrumb, sync status and Compass float over `pointer-events: none`
 * layers, so pan/zoom/drag underneath keep working. Guided vs Explore is
 * a mode toggle on the same board — it changes what the Compass offers,
 * not the data.
 */
export function LessonShell({
  lesson,
  mode,
  onModeChange,
  onExit,
  onReturnToNext,
  onOpenObject,
  syncState = "saved",
  status = "ready",
  errorMessage,
  fixtureLabel,
  children,
  chrome,
}: LessonShellProps) {
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (listOpen) setListOpen(false);
      else onExit();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [listOpen, onExit]);

  /* no lesson data yet is a loading state, never a fabricated board */
  const viewStatus = lesson == null && status !== "error" ? "loading" : status;

  return (
    <div className="pn-lesson">
      <div className="pn-lesson-board">{children}</div>

      {viewStatus === "loading" && (
        <div className="pn-lesson-status" role="status">
          <div className="pn-slip">
            <strong>pinning up your lesson…</strong>
            <span>fetching the board, your notes and where you left off.</span>
          </div>
        </div>
      )}

      {viewStatus === "error" && (
        <div className="pn-lesson-status" role="alert">
          <div className="pn-slip">
            <strong>this lesson didn't come down off the wall</strong>
            <span>{errorMessage ?? "something went wrong loading it."}</span>
            <button type="button" className="pn-slip-retry" onClick={onExit}>
              back to the path
            </button>
          </div>
        </div>
      )}

      {viewStatus === "ready" && (
        <div className="pn-lesson-chrome">
          {lesson && (
          <nav className="pn-crumbs" aria-label="lesson breadcrumb">
            <button type="button" className="pn-crumb-back" onClick={onExit}>
              ‹ path
            </button>
            <span className="pn-crumb">{lesson.subjectName}</span>
            <span className="pn-crumb-sep" aria-hidden="true">/</span>
            <span className="pn-crumb is-current">{lesson.title}</span>
            <span className={`pn-sync is-${syncState}`} role="status">
              <span className="pn-sync-dot" aria-hidden="true" />
              {SYNC_LABEL[syncState]}
            </span>
          </nav>
        )}

        {lesson && (
          <LessonCompass
            lesson={lesson}
            mode={mode}
            onModeChange={onModeChange}
            onExit={onExit}
            onReturnToNext={onReturnToNext}
          />
        )}

        {lesson && lesson.objects.length > 0 && (
          <button
            type="button"
            className="pn-list-toggle"
            aria-expanded={listOpen}
            aria-controls={listId}
            onClick={() => setListOpen((v) => !v)}
          >
            activities list
          </button>
        )}

        {listOpen && lesson && (
          <section className="pn-object-list" id={listId} aria-label="Lesson activities in order">
            <div className="pn-object-list-head">
              <span className="pn-kicker">in this lesson</span>
              <button
                type="button"
                className="pn-icon-btn"
                onClick={() => setListOpen(false)}
                aria-label="Close activities list"
              >
                ×
              </button>
            </div>
            <ol>
              {lesson.objects.map((object) => (
                <li key={object.id}>
                  <button
                    type="button"
                    className={`pn-object-item is-${object.state}`}
                    onClick={() => onOpenObject?.(object.id)}
                  >
                    <span className="pn-object-glyph" aria-hidden="true">{OBJECT_GLYPH[object.kind]}</span>
                    <span className="pn-object-title">{object.title}</span>
                    <span className="pn-object-state">{OBJECT_STATE_LABEL[object.state]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

          {chrome}
        </div>
      )}

      {fixtureLabel && <span className="pn-fixture-tag pn-fixture-lesson">{fixtureLabel}</span>}
    </div>
  );
}
