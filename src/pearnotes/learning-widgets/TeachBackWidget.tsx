/**
 * TeachBackWidget — the learner explains the idea in their own words.
 *
 * Emits a `{kind:"text"}` attempt submission; structured rubric feedback
 * comes back through the port and is displayed criterion-by-criterion.
 * Fluency never equals a pass — the widget shows coverage, missing pieces
 * and an honest uncertainty line rather than a grade claim.
 */
import { useId, useState } from "react";
import type {
  AttemptResult,
  AttemptSubmission,
  LearningWidgetProps,
  SubmissionPhase,
} from "./types";
import type { ActivitySpec } from "../learning-engine/types";

export interface TeachBackWidgetProps extends LearningWidgetProps {
  spec: Extract<ActivitySpec, { kind: "teachBack" }>;
}

const MIN_CHARS = 40;

export function TeachBackWidget({
  envelope,
  spec,
  port,
  fixtureLabel,
  onOpenSource,
}: TeachBackWidgetProps) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const interactive = phase === "idle" || phase === "error";
  const enough = text.trim().length >= MIN_CHARS;

  const submit = async () => {
    if (!enough || !interactive) return;
    setPhase("submitting");
    setErrorMessage(null);
    const submission: AttemptSubmission = {
      ...envelope,
      response: { kind: "text", text: text.trim() },
    };
    try {
      const evaluation = await port.submitAttempt(submission);
      setResult(evaluation);
      setPhase("evaluated");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "submission failed");
    }
  };

  const retry = () => {
    setPhase("idle");
    setResult(null);
  };

  return (
    <section className="pnlw pnlw-teach" aria-label="teach it back">
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel} · fixture feedback</span>}

      <span className="pn-kicker">teach-back</span>
      <h3 className="pnlw-prompt">{spec.prompt}</h3>

      {phase !== "evaluated" ? (
        <>
          <fieldset className="pnlw-rubric-preview">
            <legend>we'll listen for</legend>
            <ul>
              {spec.rubricCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </fieldset>

          <label className="pnlw-teach-label" htmlFor={inputId}>
            explain it like you're teaching a friend
          </label>
          <textarea
            id={inputId}
            className="pnlw-teach-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!interactive}
            rows={5}
            placeholder="type what you remember — your own words, not the book's"
          />
          <div className="pnlw-teach-foot">
            <span className="pnlw-teach-count" aria-live="polite">
              {enough ? "ready to submit" : `${MIN_CHARS - text.trim().length} more characters`}
            </span>
            <button
              type="button"
              className="pnlw-btn pnlw-btn-go"
              disabled={!enough || !interactive}
              onClick={submit}
            >
              {phase === "submitting" ? "listening…" : "submit teach-back"}
            </button>
          </div>
          {phase === "error" && (
            <p className="pnlw-error" role="alert">
              {errorMessage} — your words are kept.
            </p>
          )}
        </>
      ) : (
        <div className={`pnlw-result pnlw-result-${result?.verdict}`} role="status">
          <strong>
            {result?.verdict === "correct"
              ? "covered it"
              : result?.verdict === "partial"
                ? "partially covered"
                : "thin so far"}
          </strong>
          <p>{result?.feedback}</p>
          {result?.rubric && (
            <ul className="pnlw-rubric-result">
              {result.rubric.map((r) => (
                <li key={r.criterion} className={r.covered ? "is-covered" : "is-missing"}>
                  <span aria-hidden="true">{r.covered ? "✓" : "…"}</span> {r.criterion}
                  {!r.covered && <em> — missing</em>}
                </li>
              ))}
            </ul>
          )}
          {result?.explanationSourceRefs?.map((ref) => (
            <button
              key={ref.segmentId}
              type="button"
              className="pnlw-cite"
              onClick={() => onOpenSource?.(ref)}
            >
              reread the source{ref.page ? ` · p.${ref.page}` : ""} ↗
            </button>
          ))}
          <p className="pnlw-uncertainty">
            rubric feedback is a steer, not a grade — nothing here changes mastery by itself.
          </p>
          <button type="button" className="pnlw-btn" onClick={retry}>
            say it again
          </button>
        </div>
      )}
    </section>
  );
}
