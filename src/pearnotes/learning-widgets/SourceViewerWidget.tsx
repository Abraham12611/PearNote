/**
 * SourceViewerWidget — shows the literal authorized excerpt behind a
 * citation. It renders only what `port.loadSegment` returns; missing,
 * forbidden and deleted sources each get an honest empty state — the
 * widget never invents reference text.
 */
import { useEffect, useState } from "react";
import type {
  LearningWidgetPort,
  SegmentLoadResult,
  SourceRef,
} from "./types";

export interface SourceViewerWidgetProps {
  sourceRef: SourceRef;
  port: LearningWidgetPort;
  fixtureLabel?: string;
  /** Called when the learner wants the full document page (real adapter). */
  onOpenDocument?(sourceId: string, page?: number): void;
  onBack?(): void;
}

export function SourceViewerWidget({
  sourceRef,
  port,
  fixtureLabel,
  onOpenDocument,
  onBack,
}: SourceViewerWidgetProps) {
  const [state, setState] = useState<"loading" | SegmentLoadResult>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    port
      .loadSegment(sourceRef)
      .then((res) => !cancelled && setState(res))
      .catch(() => !cancelled && setState({ status: "missing", segmentId: sourceRef.segmentId ?? "" }));
    return () => {
      cancelled = true;
    };
  }, [port, sourceRef.segmentId, sourceRef.sourceId]);

  return (
    <article className="pnlw pnlw-source" aria-label="source excerpt">
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel}</span>}

      <header className="pnlw-source-head">
        {onBack && (
          <button type="button" className="pnlw-btn pnlw-btn-quiet" onClick={onBack}>
            ← board
          </button>
        )}
        <span className="pn-kicker">source excerpt</span>
      </header>

      {state === "loading" && (
        <div className="pnlw-source-loading" aria-label="loading excerpt">
          <span className="pnlw-sketch" />
          <span className="pnlw-sketch pnlw-sketch-short" />
        </div>
      )}

      {state !== "loading" && state.status === "ready" && (
        <figure className="pnlw-excerpt">
          <blockquote className="pnlw-excerpt-text">
            <p>{state.segment.text}</p>
          </blockquote>
          <figcaption className="pnlw-excerpt-meta">
            {state.segment.sourceTitle ?? "your source"}
            {state.segment.page !== undefined && ` · physical p.${state.segment.page}`}
            {state.segment.kind && ` · ${state.segment.kind}`}
          </figcaption>
          {onOpenDocument && (
            <button
              type="button"
              className="pnlw-btn"
              onClick={() => onOpenDocument(state.segment.sourceId, state.segment.page)}
            >
              open the page ↗
            </button>
          )}
        </figure>
      )}

      {state !== "loading" && state.status !== "ready" && (
        <div className="pnlw-source-empty" role="status">
          <strong>
            {state.status === "missing" && "this excerpt isn't on the board"}
            {state.status === "forbidden" && "this excerpt isn't shared with you"}
            {state.status === "deleted" && "the source was removed"}
          </strong>
          <p>
            {state.status === "missing" &&
              "the lesson cites a segment the server didn't return — no quote is shown rather than an invented one."}
            {state.status === "forbidden" &&
              "you don't have access to this source segment. ask the owner to share it."}
            {state.status === "deleted" &&
              "the document behind this citation was deleted. the citation stays for honesty."}
          </p>
        </div>
      )}
    </article>
  );
}
