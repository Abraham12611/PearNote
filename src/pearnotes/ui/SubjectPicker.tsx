import { useId, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useDialogA11y } from "./a11y";
import { SubjectAvatar } from "./SubjectAvatar";
import type { PearSubject, SubjectStatus } from "./types";

const STATUS_LABEL: Record<SubjectStatus, string> = {
  needs_material: "needs material",
  generating: "being set up",
  needs_review: "needs your review",
  ready: "ready",
  failed: "needs attention",
};

export interface SubjectPickerProps {
  open: boolean;
  /** the learner's real subjects — empty for a new account. Fixture data
   *  must come with `fixtureLabel` so the ribbon marks it prototype-only. */
  subjects: PearSubject[];
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
  /** controlled selection; the picker keeps its own selection if omitted */
  selectedId?: string | null;
  onSelect?: (subjectId: string) => void;
  /** "enter the space" — shell opens the learning path drawer */
  onEnter?: (subjectId: string) => void;
  /** the dashed `+` disc / "create your first subject" CTA → subject wizard */
  onCreate?: () => void;
  onClose: () => void;
  onRetry?: () => void;
  /** visible ribbon marking fixture/mock content, e.g. "prototype fixture" */
  fixtureLabel?: string;
}

/**
 * S02 — "pick a subject". Dark modal over Home; a fresh account sees only
 * the dashed `+` disc and a real create CTA — never a disabled
 * "enter the space" pretending there's something to enter.
 */
export function SubjectPicker({
  open,
  subjects,
  status = "ready",
  errorMessage,
  selectedId,
  onSelect,
  onEnter,
  onCreate,
  onClose,
  onRetry,
  fixtureLabel,
}: SubjectPickerProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useDialogA11y({ open, containerRef: dialogRef, onEscape: onClose });

  if (!open) return null;

  const empty = subjects.length === 0;
  const selected = subjects.find((s) => s.id === selectedId) ?? null;

  const onGridKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const cols = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key === "Home" || event.key === "End" || event.key in cols || event.key === "ArrowUp" || event.key === "ArrowDown") {
      const grid = event.currentTarget;
      const items = Array.from(grid.querySelectorAll<HTMLElement>("[data-pn-disc]"));
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index === -1) return;
      event.preventDefault();
      let next = index;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      else {
        const columns =
          getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
        const delta =
          event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? columns : -columns;
        next = Math.min(items.length - 1, Math.max(0, index + delta));
      }
      items[next]?.focus();
    }
  };

  return (
    <div className="pn-layer">
      {/* nothing unsaved here — a backdrop tap may close freely */}
      <div className="pn-scrim" onClick={onClose} aria-hidden="true" />
      <section
        ref={dialogRef}
        className="pn-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {fixtureLabel && <span className="pn-fixture-tag">{fixtureLabel}</span>}
        <header className="pn-picker-head">
          <div>
            <h2 id={titleId} className="pn-picker-title">pick a subject</h2>
            <p className="pn-picker-sub">
              {status === "loading"
                ? "getting your subjects…"
                : empty
                  ? "nothing here yet — this is your wall, start it with something you want to learn"
                  : "choose a space to study in"}
            </p>
          </div>
          <button type="button" className="pn-close" onClick={onClose} aria-label="Close subject picker">
            ×
          </button>
        </header>

        {status === "loading" && (
          <div className="pn-disc-grid" aria-busy="true" aria-label="Loading subjects">
            {[0, 1, 2].map((i) => (
              <span key={i} className="pn-disc pn-disc-skeleton" style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="pn-slip" role="alert">
            <strong>the list didn't make it</strong>
            <span>{errorMessage ?? "your subjects couldn't be loaded."}</span>
            {onRetry && (
              <button type="button" className="pn-slip-retry" onClick={onRetry}>
                try again
              </button>
            )}
          </div>
        )}

        {status === "ready" && (
          <div
            className="pn-disc-grid"
            role="radiogroup"
            aria-label="your subjects"
            onKeyDown={onGridKeyDown}
          >
            {subjects.map((subject, i) => {
              const isSelected = subject.id === selected?.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select ${subject.name} — ${STATUS_LABEL[subject.status]}`}
                  className={`pn-disc${isSelected ? " is-selected" : ""}`}
                  data-pn-disc
                  data-autofocus={isSelected || (i === 0 && !selected) ? true : undefined}
                  onClick={() => onSelect?.(subject.id)}
                  onDoubleClick={() => onEnter?.(subject.id)}
                >
                  <SubjectAvatar avatar={subject.avatar} color={subject.color} size={88} />
                  <span className="pn-disc-name">{subject.name}</span>
                  <span className="pn-disc-status">{STATUS_LABEL[subject.status]}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="pn-disc pn-disc-create"
              data-pn-disc
              data-autofocus={empty ? true : undefined}
              aria-label="Create a subject"
              onClick={onCreate}
            >
              <span className="pn-disc-plus" aria-hidden="true">+</span>
              <span className="pn-disc-name">{empty ? "create your first subject" : "new subject"}</span>
              <span className="pn-disc-status">{empty ? "from notes, PDFs or scratch" : "upload or start blank"}</span>
            </button>
          </div>
        )}

        {status === "ready" && (
          <footer className="pn-picker-foot">
            {empty ? (
              <button type="button" className="pn-cta" onClick={onCreate} data-autofocus>
                create your first subject
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="pn-cta"
                  disabled={!selected}
                  onClick={() => selected && onEnter?.(selected.id)}
                >
                  {selected ? `enter ${selected.name}` : "enter the space"}
                </button>
                {!selected && <span className="pn-picker-hint">choose a subject first</span>}
              </>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
