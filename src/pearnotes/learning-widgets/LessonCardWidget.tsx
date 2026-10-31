/**
 * LessonCardWidget — the grounded explanation card.
 *
 * Renders a `lessonCard` ActivitySpec: heading + body, objective and
 * citation chips, expandable readable view, and a "ask about this" action
 * on text selection. Reading a card is NOT mastery — it emits no attempts.
 */
import { useId, useRef, useState } from "react";
import type { LearningWidgetProps } from "./types";
import { useDialogA11y } from "../ui/a11y";

export interface LessonCardWidgetProps extends LearningWidgetProps {
  spec: Extract<
    import("../learning-engine/types").ActivitySpec,
    { kind: "lessonCard" }
  >;
  /** Optional original illustration (alt text required — it adds context). */
  heroImageUrl?: string;
  heroImageAlt?: string;
}

export function LessonCardWidget({
  envelope,
  spec,
  port,
  fixtureLabel,
  heroImageUrl,
  heroImageAlt,
  onOpenSource,
}: LessonCardWidgetProps) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState("");
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ open: expanded, containerRef: dialogRef, onEscape: () => setExpanded(false) });

  const captureSelection = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    setSelection(text.length >= 8 ? text : "");
  };

  const askTutor = () => {
    port.onRequestTutor?.({
      activityId: envelope.activityId,
      lessonId: envelope.lessonId,
      objectiveIds: envelope.objectiveIds,
      selectedText: selection || undefined,
    });
  };

  const citations = envelope.sourceRefs;

  return (
    <article className="pnlw pnlw-card" aria-labelledby={titleId}>
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel}</span>}

      {heroImageUrl && (
        <img className="pnlw-card-hero" src={heroImageUrl} alt={heroImageAlt ?? ""} />
      )}

      <span className="pn-kicker">lesson card</span>
      <h3 id={titleId} className="pnlw-card-heading">
        {spec.heading}
      </h3>
      <p ref={bodyRef} className="pnlw-card-body" onMouseUp={captureSelection}>
        {spec.body}
      </p>

      <div className="pnlw-chiprow">
        <span className="pnlw-meta-chip">
          {envelope.objectiveIds.length} objective{envelope.objectiveIds.length === 1 ? "" : "s"}
        </span>
        {citations.map((ref) => (
          <button
            key={ref.segmentId ?? ref.sourceId}
            type="button"
            className="pnlw-cite"
            onClick={() => onOpenSource?.(ref)}
          >
            source{ref.page ? ` · p.${ref.page}` : ""} ↗
          </button>
        ))}
      </div>

      <div className="pnlw-card-actions">
        {selection && (
          <button type="button" className="pnlw-btn" onClick={askTutor}>
            ask about “{selection.slice(0, 28)}{selection.length > 28 ? "…" : ""}”
          </button>
        )}
        <button
          type="button"
          className="pnlw-btn"
          onClick={() => setExpanded(true)}
          aria-haspopup="dialog"
        >
          read it bigger
        </button>
      </div>

      {expanded && (
        <div className="pnlw-card-overlay" role="presentation">
          <div
            ref={dialogRef}
            className="pnlw-card-reader"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby={`${titleId}-reader`}
          >
            <h4 id={`${titleId}-reader`} className="pnlw-card-heading">
              {spec.heading}
            </h4>
            <p className="pnlw-card-body">{spec.body}</p>
            <div className="pnlw-chiprow">
              {citations.map((ref) => (
                <button
                  key={ref.segmentId ?? ref.sourceId}
                  type="button"
                  className="pnlw-cite"
                  onClick={() => onOpenSource?.(ref)}
                >
                  source{ref.page ? ` · p.${ref.page}` : ""} ↗
                </button>
              ))}
            </div>
            <button type="button" className="pnlw-btn pnlw-btn-go" onClick={() => setExpanded(false)}>
              back to the board
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
