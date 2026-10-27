# Success metrics, product analytics, and research

## North-star metric

**Weekly qualified learning outcomes:** count of *unique student × objective* pairs demonstrated through an assessed interaction, with deduplication and minimum evidence. This is more meaningful than raw minutes or XP.

## Funnel

1. Registered → subject creation started.
2. Upload/manual-create → approved subject.
3. Approved subject → generated usable path.
4. Usable path → first lesson opened.
5. Lesson → assessed practice completed.
6. Assessed practice → objective demonstrated.
7. First demonstrated objective → return for meaningful practice within 7 days.

## Metrics by pillar

| Pillar | Metrics | Segment |
|---|---|---|
| Activation | time to first usable lesson; source extraction success; approval abandonment | PDF size, device, cohort |
| Quality | valid lesson schema %, citation supported %, assessment agreement | source type, concept |
| Learning | first-attempt correctness, correction success, 7-day delayed recall | prior knowledge / activity |
| Retention | D1/D7/D28 qualified activity, not app launches | acquisition channel |
| Exploration | source opens, concept navigations, useful manual board edits | guided vs explore |
| Groups | session invite acceptance, collaborative tasks completed | group size |
| Gamification | XP integrity, quest completion, streak burnout signals | novice vs veteran |
| Cost | cost per processed MB, generated lesson, active learner | model/version |
| Trust | permission violations, provenance errors, incorrect AI feedback | severity |

## Events

Use privacy-minimal product events such as `subject_creation_started`, `source_upload_completed`, `classification_reviewed`, `curriculum_published`, `lesson_opened`, `activity_submitted`, `objective_evaluated`, `remediation_offered`, `remediation_accepted`, `reward_granted`, `room_joined`, `resource_shared`. Link via pseudonymous IDs. Avoid logging full student responses in analytics events; store them in secured learning data only.

## Evaluation baseline

- At least one Biology source packet with independently reviewed objectives and expected answers.
- One mixed-domain packet to test subject separation and user corrections.
- An ambiguous or incomplete text packet to test abstention.
- A set of good, incomplete and wrong teach-back answers graded by a human rubric.
- Measure *supported factual claims* and *correct navigation/permission actions*, not just subjective helpfulness.

## Experiments

A/B tests after launch: path only vs path+spatial board, guided vs exploration default, hints-first vs full explanations, optional trophies vs no trophies. State hypothesis, exclusion criteria and student-outcome metrics before deployment. Do not use engagement alone to claim learning benefit.
