# Assessment, mastery evidence, spaced revision and adaptation

## Separating engagement from understanding

Opening a source, clicking an object, watching a video or spending time in a space are engagement; **not sufficient evidence** of knowledge. Valid mastery signals include independent recall, reasoned explanation, application to a new example and delayed retest.

## Assessment kinds

- Objective: multiple-choice with verified answer; matching; ordering; fill-the-blank with acceptable variants; numeric exact/tolerance; code/graph tests where deterministic.
- Open-ended: short response/teach-back graded against anchored rubric criteria and verified source content, with uncertainty score and human-review pathway later.
- Group: all participants can interact, but results and mastery remain individual except explicitly revealed summaries.

## Attempt record

Store activity ID+revision, user ID, submission, previous hints, rubric criteria, evaluation, source references, evaluator version, timestamp, and idempotency token. Attempt immutable after evaluation except documented regrade metadata. Protect sensitive free-text content in storage/logging.

## Concept state rules (MVP)

| State | Evidence |
|---|---|
| `not_started` | no meaningful exposure/practice |
| `learning` | exposure or first attempt, insufficient independent evidence |
| `practicing` | partial/uncertain outcomes or dependence on hints |
| `demonstrated` | defined objective threshold achieved by valid assessment |

Avoid blindly turning a percentage into mastery. Each objective defines a set of accepted evidence types; thresholds should be evaluated and calibrated. `demonstrated` is not a permanent immunity from forgetting.

## Adaptation trigger

Phase 1 targeted branch: after two related errors or one failed relevant challenge plus inadequate teach-back, mark `suspected_gap`. Verify related objective/source content, draft an alternate micro-practice activity, ask user to accept, record whether it helped. Do not diagnose a misconception from one ambiguous wrong click. Later phases add Bayesian/IRT-like tracking only with evidence and expert validation.

## Review scheduling

Phase 2: manual/automated due dates based on evidence date and outcome; Phase 3: validated spaced retrieval policy, with intervals adjusted by success, difficulty and elapsed time. Revision prompts are optional and configurable, with rest days and accessible scheduling.

## Feedback rules

- Explain what was correct/incorrect with evidence, not judgment of the learner.
- For incomplete input, explain uncertainty and ask a specific follow-up.
- For math/science, deterministic validation and trusted reference checks where possible.
- Multiple reasonable answers need accepted-variant criteria.
- If AI feedback is questionable, allow student to inspect rubric/source and challenge it; future educator review feature.

## Outcome metrics

Per objective: first/second attempt pass, hints required, time since last qualified attempt, delayed retest score and correction success. Product-wide: compare independent learner performance on matched but unseen tasks, not XP total.
