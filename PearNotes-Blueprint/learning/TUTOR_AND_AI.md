# Pear Tutor, AI agents, tools, grounding, and action rights

## Tutor identity

Pear Tutor is a contextual, persistent facilitator—not a free-floating chatbot. It knows authorized current subject, lesson objective, selected widget, recent attempts and cited source segments. It does **not** know other students' private work or hidden group sources. It should teach via hints and questions where appropriate, not solve every graded task by default.

## Two different AI channels

**Private Tutor:** personal thread, owner sources, attempts and study plan. **Group Facilitator:** explicitly invoked in shared room via button or `@Pear`, with access only to group-approved content. Do not merge or cross-index the two stores.

## Launch affordances

Bottom action dock menu: `Hint`, `Explain`, `Quiz me`, `Show source`, `Help me practice`. User can ask about selected widget with `this` resolved by active widget ID. Show the context chip prominently to prevent surprising answers from the wrong lesson.

## Tool inventory

| Tool | Reads/writes | Approval |
|---|---|---|
| `getCurrentLesson` | read lesson + objectives | no |
| `searchAuthorizedSources` | read permitted segments with citations | no |
| `getMyAttemptSummary` | read own relevant attempts | no |
| `focusWidget` | local camera navigation | no, reversible |
| `suggestHint` | generate response | no |
| `draftPracticeActivity` | create typed proposed challenge | review before persistent write |
| `pinExplanation` | propose new board note | confirm |
| `scheduleReview` | propose practice timing | confirm if changing plan |
| `shareToGroup` | privileged publication | always explicit confirm + scope review |
| `awardXP` / `deleteUserObjects` | NOT model accessible | forbidden |

## Prompt construction

System role defines tutor rules, allowed tools and source precedence. Developer context includes subject ID, lesson/selected widget and authorized reference IDs—not raw unbounded whole documents. Retrieved source passages are quoted as untrusted data. User message is separate. Model replies should be structured with `answer`, `sourceRefs`, `uncertainty`, `suggestedActions`, `requiresReview` and optional teaching style.

## Pedagogy

Hints-first when an activity is in progress; do not auto-reveal the answer. Offer analogies, examples, counterexamples and questions. Encourage learner explanation. When uncertain or sources disagree, state limitation and navigate to original source. Do not grant mastery or declare diagnoses.

## AI edits to canvas

1. Model proposes typed widget and rationale.
2. Validate schema/objective/source relevance.
3. Present semi-transparent object (ghost) with Accept/Reject and source summary.
4. Accepting executes authorized Convex mutation; preserve undo/audit.
5. AI must not overwrite active human editing or move saved personal notes.

## Provider adapter / models

Use official accessible Meta APIs for Muse Spark and, in future, relevant multimodal/voice/image capabilities. Verify model names, endpoints, availability, token limits and pricing with up-to-date official docs; don't hardcode assumptions from promotional pages. No model API key in client. Preserve model version/prompt version in generation logs.

## Audit and evaluation

Record tool type, authorizing user/scope, proposal ID, approval status, source count, model version, latency/cost and result status. Test prompt injection, cross-user leakage, groundedness, incorrect hint, refusal to guess where source absent, and non-duplicating action retry.
