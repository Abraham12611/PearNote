# Responsive, accessibility and internationalization requirements

## Device matrices

| Viewport | Path UI | Lesson UI | Navigation |
|---|---|---|---|
| >=1200px desktop | 50–55% right drawer | full interactive canvas | floating left rail, bottom dock |
| 768–1199px | 60–70% right drawer | adaptive fitted canvas | compact rail |
| <768px | full-screen sheet | stacked/linear activity mode + optional pinch pan | bottom/compact navigation |

Do not merely scale every canvas widget to fit a phone; reading text and interactive answers must remain readable.

## Accessibility acceptance

- Reach all tasks by keyboard, including avatar selection, drawer controls, activities and returning to the original viewport.
- Provide accessible names and status narration for dashed `+`, progress nodes, rewards and timer changes.
- Provide **non-spatial alternative** for navigating the lesson sequence and answering challenges.
- Dialogs trap focus and restore focus to trigger on close; keyboard escape works; backdrop click never discards unsaved work without warning.
- Allow reduced motion, text zoom to 200%, sufficient color contrast, and high-contrast state changes not relying only on green/red.
- All diagrams include descriptions, labels and accessible alternatives; audiovisual resources need transcripts/captions as capabilities expand.
- Timer/quizzes should allow extensions or untimed mode where appropriate.
- Reward features must not shame students with learning disabilities or interrupted streaks.

## Localization planning

Store locale, timezone, display name separately from learning data. Date/number formatting localized. Source language may differ from UI language; include per-source language detection. AI translation needs provenance and uncertainty when terminology is specialized. Avoid fixed widths assuming English labels.

## Low bandwidth and failure recovery

Lazy-load rich illustrations and large PDFs; show lightweight text content first. Do not drop user answers on reconnection. Maintain drafts until authoritative server acknowledgement. Show data-sync state truthfully. Allow user to read cached source excerpts when network quality is poor where permitted and technically feasible.
