/**
 * ChallengeCard — the assessed-practice dispatcher.
 *
 * Renders whichever validated spec kind arrives: `classify` gets the
 * tactile sort board, `multipleChoice` a tappable option set,
 * `shortAnswer` a quick line. All share one submission lifecycle —
 * idle → submitting → evaluated | error — and emit typed attempts only.
 */
import { useId, useState } from "react";
import type {
  AttemptResult,
  AttemptSubmission,
  LearningWidgetProps,
  SubmissionPhase,
  WidgetActivitySpec,
} from "./types";
import type { ActivitySpec } from "../learning-engine/types";
import { validateWidgetSpec } from "./logic";
import { ClassificationChallenge } from "./ClassificationChallenge";

export interface ChallengeCardProps extends LearningWidgetProps {
  spec: WidgetActivitySpec;
}

export function ChallengeCard(props: ChallengeCardProps) {
  const { spec } = props;
  if (spec.kind === "classify") {
    return <ClassificationChallenge {...props} spec={spec} />;
  }
  if (spec.kind === "multipleChoice") {
    return <ChoiceChallenge {...props} spec={spec} />;
  }
  if (spec.kind === "shortAnswer") {
    return <ShortAnswerChallenge {...props} spec={spec} />;
  }
  // lessonCard / teachBack specs belong to their own widgets.
  return (
    <section className="pnlw pnlw-challenge" aria-label="challenge">
      <p className="pnlw-error">
        this card can't render a “{spec.kind}” activity — wrong widget for the spec.
      </p>
    </section>
  );
}

/* --- multiple choice ----------------------------------------------------------- */

function ChoiceChallenge({
  envelope,
  spec,
  port,
  fixtureLabel,
}: ChallengeCardProps & { spec: Extract<ActivitySpec, { kind: "multipleChoice" }> }) {
  const groupId = useId();
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const interactive = phase === "idle" || phase === "error";

  const submit = async () => {
    if (!choiceId || !interactive) return;
    setPhase("submitting");
    const submission: AttemptSubmission = {
      ...envelope,
      response: { kind: "choice", optionId: choiceId },
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

  return (
    <section className="pnlw pnlw-challenge" aria-labelledby={groupId}>
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel} · fixture grader</span>}
      <span className="pn-kicker">challenge</span>
      <h3 id={groupId} className="pnlw-prompt">{spec.prompt}</h3>

      <div className="pnlw-options" role="radiogroup" aria-labelledby={groupId}>
        {spec.options.map((opt) => {
          const chosen = choiceId === opt.id;
          const isAnswer = phase === "evaluated" && chosen;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={!interactive}
              className={`pnlw-option${chosen ? " is-chosen" : ""}${
                isAnswer ? (result?.verdict === "correct" ? " is-correct" : " is-wrong") : ""
              }`}
              onClick={() => interactive && setChoiceId(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {phase !== "evaluated" ? (
        <footer className="pnlw-foot">
          <button
            type="button"
            className="pnlw-btn pnlw-btn-go"
            disabled={!choiceId || !interactive}
            onClick={submit}
          >
            {phase === "submitting" ? "checking…" : "submit answer"}
          </button>
          {phase === "error" && (
            <span className="pnlw-error" role="alert">{errorMessage}</span>
          )}
        </footer>
      ) : (
        <footer className={`pnlw-result pnlw-result-${result?.verdict}`} role="status">
          <strong>{result?.verdict === "correct" ? "that's it" : "not this one"}</strong>
          <p>{result?.feedback}</p>
          {result?.explanation && <p className="pnlw-explainer">{result.explanation}</p>}
          <button
            type="button"
            className="pnlw-btn"
            onClick={() => {
              setPhase("idle");
              setResult(null);
              setChoiceId(null);
            }}
          >
            try again
          </button>
        </footer>
      )}
    </section>
  );
}

/* --- short answer ---------------------------------------------------------------- */

function ShortAnswerChallenge({
  envelope,
  spec,
  port,
  fixtureLabel,
}: ChallengeCardProps & { spec: Extract<ActivitySpec, { kind: "shortAnswer" }> }) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const interactive = phase === "idle" || phase === "error";

  return (
    <section className="pnlw pnlw-challenge" aria-labelledby={inputId}>
      {fixtureLabel && <span className="pnlw-tape">{fixtureLabel} · fixture grader</span>}
      <span className="pn-kicker">challenge</span>
      <h3 id={inputId} className="pnlw-prompt">{spec.prompt}</h3>
      <textarea
        className="pnlw-teach-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!interactive}
        rows={3}
      />
      <footer className="pnlw-foot">
        <button
          type="button"
          className="pnlw-btn pnlw-btn-go"
          disabled={!text.trim() || !interactive}
          onClick={async () => {
            setPhase("submitting");
            try {
              const evaluation = await port.submitAttempt({
                ...envelope,
                response: { kind: "text", text: text.trim() },
              });
              setResult(evaluation);
              setPhase("evaluated");
            } catch {
              setPhase("error");
            }
          }}
        >
          {phase === "submitting" ? "checking…" : "submit"}
        </button>
        {phase === "evaluated" && result && (
          <span className={`pnlw-result pnlw-result-${result.verdict}`} role="status">
            {result.feedback ?? result.verdict}
          </span>
        )}
      </footer>
    </section>
  );
}

export { validateWidgetSpec };
