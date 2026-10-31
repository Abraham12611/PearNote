/**
 * ClassificationChallenge — the tactile sort/classify assessed widget.
 *
 * Learners sort feature "chips" (small paper cards) into bucket "trays".
 * Three equivalent input modes:
 *   - pointer drag: press a chip, drag it onto a tray, release
 *   - tap-tap / click-click: tap a chip to pick it up, tap a tray to drop
 *   - keyboard: focus a chip, Enter/Space picks up, Tab/arrows to a tray,
 *     Enter drops; Escape cancels; Enter on a placed chip returns it
 *
 * The widget emits ONE typed `AttemptSubmission` when the learner submits;
 * evaluation arrives through the port and wrong items are stamped with
 * their expected tray. All scoring is backend-fixture — no XP, no mastery.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  ActivityEnvelope,
  AttemptResult,
  AttemptSubmission,
  ClassificationSpec,
  LearningWidgetPort,
  SourceRef,
  SubmissionPhase,
} from "./types";
import {
  allPlaced,
  assignItem,
  buildClassificationResponse,
  placedCount,
  unassignItem,
  type Assignments,
} from "./logic";

const DRAG_THRESHOLD_PX = 6;

export interface ClassificationChallengeProps {
  envelope: ActivityEnvelope;
  spec: ClassificationSpec;
  port: LearningWidgetPort;
  fixtureLabel?: string;
  onOpenSource?(ref: SourceRef): void;
}

interface DragState {
  itemId: string;
  x: string;
  y: string;
  label: string;
}

export function ClassificationChallenge({
  envelope,
  spec,
  port,
  fixtureLabel,
  onOpenSource,
}: ClassificationChallengeProps) {
  const liveId = useId();
  const [assignments, setAssignments] = useState<Assignments>({});
  /** Chip currently lifted (click-tap or keyboard mode). */
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const pressRef = useRef<{ itemId: string; startX: number; startY: number; label: string } | null>(
    null,
  );

  const interactive = phase === "idle";
  const itemById = new Map(spec.items.map((i) => [i.id, i]));
  const bucketById = new Map(spec.buckets.map((b) => [b.id, b]));
  const markById = new Map((result?.marks ?? []).map((m) => [m.itemId, m]));

  /* --- placement ------------------------------------------------------------- */

  const place = useCallback(
    (itemId: string, bucketId: string) => {
      if (!interactive) return;
      setAssignments((a) => assignItem(a, itemId, bucketId));
      setHeldItemId(null);
      const label = itemById.get(itemId)?.label ?? itemId;
      const bucket = bucketById.get(bucketId)?.label ?? bucketId;
      setAnnounce(`${label} dropped in ${bucket}`);
    },
    [interactive, itemById, bucketById],
  );

  const backToPile = useCallback(
    (itemId: string) => {
      if (!interactive) return;
      setAssignments((a) => unassignItem(a, itemId));
      const label = itemById.get(itemId)?.label ?? itemId;
      setAnnounce(`${label} back on the pile`);
    },
    [interactive, itemById],
  );

  /* --- pointer drag ------------------------------------------------------------ */

  const onChipPointerDown = (itemId: string, label: string, e: React.PointerEvent) => {
    if (!interactive) return;
    pressRef.current = { itemId, startX: e.clientX, startY: e.clientY, label };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const press = pressRef.current;
      if (!press) return;
      const dx = e.clientX - press.startX;
      const dy = e.clientY - press.startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          setDragging({
            itemId: press.itemId,
            x: `${press.startX}px`,
            y: `${press.startY}px`,
            label: press.label,
          });
          setHeldItemId(null);
        }
        return;
      }
      setDragging({ ...dragging, x: `${e.clientX}px`, y: `${e.clientY}px` });
    };
    const up = (e: PointerEvent) => {
      const press = pressRef.current;
      pressRef.current = null;
      if (dragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const bucketEl = el?.closest<HTMLElement>("[data-pnlw-bucket]");
        if (bucketEl?.dataset.pnlwBucket) place(dragging.itemId, bucketEl.dataset.pnlwBucket);
        setDragging(null);
      } else if (press) {
        // Simple press: toggle "picked up".
        setHeldItemId((h) => {
          const next = h === press.itemId ? null : press.itemId;
          if (next) setAnnounce(`picked up ${press.label} — choose a tray`);
          return next;
        });
      }
    };
    const cancel = () => {
      pressRef.current = null;
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging, place]);

  /* --- keyboard ---------------------------------------------------------------- */

  const onChipKeyDown = (itemId: string, label: string, e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (assignments[itemId]) {
        backToPile(itemId);
      } else {
        setHeldItemId((h) => (h === itemId ? null : itemId));
        setAnnounce(`picked up ${label} — tab to a tray and press enter`);
      }
    }
  };

  const onBucketKeyDown = (bucketId: string, e: React.KeyboardEvent) => {
    if (!interactive) return;
    if ((e.key === "Enter" || e.key === " ") && heldItemId) {
      e.preventDefault();
      place(heldItemId, bucketId);
    }
  };

  const onBoardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && heldItemId) {
      setHeldItemId(null);
      setAnnounce("put it back — nothing picked up");
    }
  };

  /* --- submission ---------------------------------------------------------------- */

  const submit = async () => {
    if (!allPlaced(spec, assignments) || !interactive) return;
    setPhase("submitting");
    setErrorMessage(null);
    const submission: AttemptSubmission = {
      ...envelope,
      response: buildClassificationResponse(assignments),
    };
    try {
      const evaluation = await port.submitAttempt(submission);
      setResult(evaluation);
      setPhase("evaluated");
      setAnnounce(
        evaluation.verdict === "correct"
          ? "all sorted — nicely done"
          : `marked: ${evaluation.verdict}. misplaced chips show their tray`,
      );
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "submission failed");
      setAnnounce("submission failed — your sort is kept, retry");
    }
  };

  const retry = () => {
    setAssignments({});
    setResult(null);
    setPhase("idle");
    setHeldItemId(null);
    setAnnounce("fresh attempt — everything back on the pile");
  };

  const pile = spec.items.filter((i) => !assignments[i.id]);
  const ready = allPlaced(spec, assignments);

  const chipClass = (itemId: string, inBucket: boolean) => {
    const mark = markById.get(itemId);
    return [
      "pnlw-chip",
      inBucket ? "pnlw-chip-in" : "",
      heldItemId === itemId ? "is-held" : "",
      dragging?.itemId === itemId ? "is-ghost-source" : "",
      mark ? (mark.correct ? "is-correct" : "is-wrong") : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <section
      className="pnlw pnlw-challenge"
      aria-label={spec.prompt}
      onKeyDown={onBoardKeyDown}
      data-pnlw-phase={phase}
    >
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel} · fixture grader</span>}

      <header className="pnlw-head">
        <span className="pn-kicker">challenge · sort it out</span>
        <h3 className="pnlw-prompt">{spec.prompt}</h3>
      </header>

      {/* the pile */}
      <div className="pnlw-pile" role="group" aria-label="feature pile — chips to sort">
        {pile.length === 0 && <span className="pnlw-pile-empty">all sorted — hit submit</span>}
        {pile.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={chipClass(item.id, false)}
            style={{ rotate: `${((i * 7) % 9) - 4}deg` }}
            disabled={!interactive}
            aria-pressed={heldItemId === item.id}
            onPointerDown={(e) => onChipPointerDown(item.id, item.label, e)}
            onKeyDown={(e) => onChipKeyDown(item.id, item.label, e)}
          >
            <span className="pnlw-chip-label">{item.label}</span>
            {item.caption && <span className="pnlw-chip-caption">{item.caption}</span>}
          </button>
        ))}
      </div>

      {/* the trays */}
      <div className="pnlw-trays">
        {spec.buckets.map((bucket) => {
          const inside = spec.items.filter((i) => assignments[i.id] === bucket.id);
          return (
            <div
              key={bucket.id}
              className={`pnlw-tray${heldItemId ? " is-target" : ""}`}
              data-pnlw-bucket={bucket.id}
              onClick={() => heldItemId && place(heldItemId, bucket.id)}
              role="button"
              tabIndex={interactive ? 0 : -1}
              aria-label={`${bucket.label} tray — ${inside.length} placed`}
              aria-disabled={!interactive}
              onKeyDown={(e) => onBucketKeyDown(bucket.id, e)}
            >
              <span className="pnlw-tray-label">{bucket.label}</span>
              {bucket.hint && <span className="pnlw-tray-hint">{bucket.hint}</span>}
              <div className="pnlw-tray-slots">
                {inside.map((item, i) => {
                  const mark = markById.get(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={chipClass(item.id, true)}
                      style={{ rotate: `${((i * 5) % 7) - 3}deg` }}
                      disabled={!interactive}
                      title={
                        mark && !mark.correct
                          ? `belongs in ${bucketById.get(mark.expectedBucketId ?? "")?.label ?? "?"}`
                          : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (interactive) backToPile(item.id);
                      }}
                    >
                      <span className="pnlw-chip-label">{item.label}</span>
                      {mark &&
                        (mark.correct ? (
                          <span className="pnlw-stamp pnlw-stamp-ok" aria-hidden="true">✓</span>
                        ) : (
                          <span
                            className="pnlw-stamp pnlw-stamp-no"
                            aria-label={`belongs in ${bucketById.get(mark.expectedBucketId ?? "")?.label}`}
                          >
                            → {bucketById.get(mark.expectedBucketId ?? "")?.label}
                          </span>
                        ))}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* drag ghost */}
      {dragging && (
        <div
          className="pnlw-chip pnlw-chip-ghost"
          style={{ transform: `translate(calc(${dragging.x} - 50%), calc(${dragging.y} - 50%))` }}
          aria-hidden="true"
        >
          <span className="pnlw-chip-label">{dragging.label}</span>
        </div>
      )}

      {/* footer: submit / result */}
      <footer className="pnlw-foot">
        {phase !== "evaluated" ? (
          <>
            <button
              type="button"
              className="pnlw-btn pnlw-btn-go"
              disabled={!ready || !interactive}
              onClick={submit}
            >
              {phase === "submitting" ? "checking…" : `submit sort · ${placedCount(assignments)}/${spec.items.length}`}
            </button>
            {phase === "error" && (
              <span className="pnlw-error" role="alert">
                {errorMessage} — your placements are kept.
              </span>
            )}
          </>
        ) : (
          <div className={`pnlw-result pnlw-result-${result?.verdict}`} role="status">
            <strong>
              {result?.verdict === "correct"
                ? "clean sweep"
                : result?.verdict === "partial"
                  ? "nearly there"
                  : "not yet"}
            </strong>
            <p>{result?.feedback}</p>
            {result?.explanation && <p className="pnlw-explainer">{result.explanation}</p>}
            {result?.explanationSourceRefs?.map((ref) => (
              <button
                key={ref.segmentId}
                type="button"
                className="pnlw-cite"
                onClick={() => onOpenSource?.(ref)}
              >
                from your source{ref.page ? ` · p.${ref.page}` : ""} ↗
              </button>
            ))}
            <button type="button" className="pnlw-btn" onClick={retry}>
              try again
            </button>
          </div>
        )}
      </footer>

      <span id={liveId} className="pnlw-live" role="status" aria-live="polite">
        {announce}
      </span>
    </section>
  );
}
