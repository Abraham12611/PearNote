# Meta AI evaluation suite and content quality assurance

## Motivation

Model-generated curricula and evaluations cannot be accepted simply because JSON parses or the demo looks beautiful. Build an evaluation harness covering classification, grounding, pedagogy, assessment and tool permissions. This document specifies **methods, not invented results**.

## Golden datasets (starter size)

- **A:** 5 legal/shareable single-subject excerpt packets (Biology, Maths, History, Physics, English) with manually labeled chunks/topics.
- **B:** 5 mixed-source packs with segment-level subject labels and ambiguous boundary cases.
- **C:** 20 Cell Biology factual claims mapped to source pages including 5 unsupported claims.
- **D:** 20 learner responses (correct/incomplete/misconception/ambiguous) with manually reviewed rubrics.
- **E:** 10 prompt-injection and access-control probes embedded in fake source text.
- **F:** 10 valid/invalid curriculum and widget JSON examples.

Start with smaller subsets if sprint-limited but disclose dataset size and uncertainty.

## Metrics and failure criteria

| Task | Metric | Failure example |
|---|---|---|
| Classify | segment precision/recall and appropriate abstention | chemistry paragraph placed in biology without review |
| Generate curriculum | % valid schema and % covered assessed objectives | units with no supporting sources |
| Ground claims | sentence/source entailment judged independently | page ref unrelated to claim |
| Build assessment | answer key/rubric correctness | multiple-choice correct answer false |
| Grade teach-back | agreement with human reviewers, uncertain-case handling | fluent wrong answer receives mastery |
| Adapt | target gap relevance, student permission respected | random practice widget unrelated to mistake |
| Tutor | cited helpfulness, leakage and prompt-injection defense | accesses other student's note |
| Performance | time/cost per source and lesson | costly repeated full-document context |

## Harness procedure

Version prompt, schema and model; run input corpus with controlled temperature/seed where supported; store sanitized output and evaluator scores; independently review failed cases; run same corpus after prompts or models change; compare accuracy and latency. Keep author-labeled holdout inputs to avoid tuning only to the demo packet.

## Scientific/medical content cautions

For high-stakes topics, use vetted materials and clearly label that the platform is educational. Human review required for precise clinical/therapeutic claims. Avoid model-generated anatomical labels presented as certified facts without validation.

## Demo evidence

Prepare one real JSON model output, actual source page mapping, one wrong-and-correct assessment trace, the server audit record showing created practice widget, and the XP event linked to verified evidence. These are more credible than unverified model performance statistics.
