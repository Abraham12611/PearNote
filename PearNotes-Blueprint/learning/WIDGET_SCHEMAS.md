# Widget schema registry, rendering and validation contracts

## Registry contract

Each widget type registers: `type`, `schemaVersion`, `validate(data)`, `render`, `createDefaults`, `allowedSpaceKinds`, `minSize`, `focusView`, `supportsThread`, `permissionRules`, `isAssessable`, `accessibilityFallback`, `migrations`. Keep the existing OurSpaces `widgetDataValidator` model as a starting point; extend with versioned typed education cases.

```ts
// Illustrative interface, not copied from upstream
interface LearningWidgetDefinition<TConfig> {
  type: string;
  schemaVersion: number;
  allowedSpaceKinds: Array<'lesson'|'study'|'group_hq'>;
  minSize: { width: number; height: number };
  validate: (raw: unknown) => TConfig;
  isAssessable: boolean;
  supportsThread: boolean;
}
```

## Education specs

| Type | Required config | Server-owned state | Required UI actions |
|---|---|---|---|
| `lessonCard` | title, blocks, objectiveIds, sourceRefs | approved revision | read, source, annotate |
| `sourceViewer` | sourceId, segment/page selectors | access policy, file metadata | open passage, back |
| `challenge` | objectiveIds, prompt, kind, key/rubric, hints | attempts, grading, lock rules | submit, feedback, retry |
| `teachBack` | objectiveIds, prompt, rubric, sourceRefs | attempts, feedback confidence | submit explanation, follow-up |

## Validation layers

1. **Syntax:** parse strict JSON with size limits; reject arbitrary HTML/script fields.
2. **References:** check every objective, source, segment, lesson and concept ID exists and is in authorization scope.
3. **Semantics:** challenge options nonempty, single correct answer where required, teach-back rubric has measurable criteria, learning objective assessable.
4. **Presentation:** min/max size, permitted theme values, safe markdown rendering, valid label length.
5. **Version:** explicit migration from older schema; preserve original attempts bound to old revision.

## AI content safety

Untrusted uploaded text may contain fake system instructions. Treat it as *data* and exclude it from developer/system instructions. No direct code execution from model-generated widget configs. Sanitize external links, markdown and images. Show sourced excerpts as content with safe escaping and origin marker.

## Widget factory

Use `createLessonCanvas(lessonSpec)` to allocate zones, choose default positions and create widget entries deterministically. Prevent overlapping default placements with a layout allocator, and add new AI-proposed practice objects only in reserved space. Allow user edits to win over regeneration.

## Cross-context reuse

A `challenge` can be rendered in a solo lesson or shared study room. **Presentation is shared; attempts and scoring are per-user.** Thread comments are scoped to room membership. In personal space, author comments can remain private. A `sourceViewer` in group context must point only to published/shared source references.

## Accessibility contract

Every widget has keyboard activation, meaningful accessible name, linear-mode rendering, focus escape, text zoom support, and non-drag alternatives. A graded interactive diagram requires an equivalent accessible exercise.

## QA fixture

For each widget type maintain: valid minimal payload, valid rich payload, missing key, unauthorized source, version migration and responsive layout screenshots. Keep schema unit tests separate from AI evaluator tests.
