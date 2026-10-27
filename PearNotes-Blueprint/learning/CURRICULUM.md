# Subject, curriculum and learning path generation

## What a subject means

A **subject** is an owner-controlled learning domain with sources and a versioned curriculum. It is **not** the same as a lesson canvas or an OurSpaces room. The subject picker uses personalized illustrated discs, not predefined example subjects. Manual subjects can exist without content.

## Curriculum hierarchy

`Subject → CurriculumVersion → Sections → Units → Lessons → Objectives → Activities`. Concepts and source segments form cross-links rather than fitting exclusively into a single tree. A section is broad, a unit is a coherent bundle of lessons, and a lesson has assessable objectives and an interactive canvas.

## Generation constraints

- Build within **provided source coverage**; warn if a textbook excerpt covers only a subset of a discipline.
- Ground concepts in real source segment IDs. Additional pedagogical examples must be labeled and checked.
- Output deterministic ordering keys; generated title must be editable.
- Limit Phase 1 to a small curriculum (e.g., 2 sections, 2–3 units/section, 1–3 lessons/unit depending on actual content) so no flood of shallow, repetitive lessons. These are initial caps, not product limitations.
- Express prerequisites as candidate links, not absolute facts without educational validation.
- Each lesson requires 1–3 explicit learning objectives and at least one assessment activity matching each objective.
- Use JSON schema/validators and repair/retry invalid model outputs within bounded limits.
- A version is published only when all referenced concepts/source segments exist and no duplicate order keys remain.

## Path drawer behavior

- Visual winding path of section banners and unit/lesson nodes; generated structure supplies order and labels, not arbitrary AI-authored SVG.
- `not_started`, `available`, `in_progress`, `practicing`, `demonstrated`, `needs_review` states derived from learning records.
- Recommended next node highlighted. Previously learned nodes still open; users can explore ahead by design. Optionally mark proficiency rewards gated without hiding basic references.
- Node preview shows goal, source count, activity count, state, and Start/Resume. `No sources yet` manual subject shows onboarding CTA.
- Drawer scroll state persists between lesson navigation and back.

## Updates when additional materials arrive

Create a draft diff: `new concept`, `expand lesson`, `add unit`, `duplicate`, `potential contradiction`, `new subject suggestion`. Student reviews; publishing creates a new curriculum version. Preserve past attempts and source references and map unchanged objective IDs to their previous mastery records. Changed objective semantics require new IDs or explicit migration.

## Curriculum quality checks

- Lesson titles not duplicates of units; prerequisite sequence sensible.
- Every assessed objective maps to a rubric or deterministic answer key.
- Source references valid and relevant, no unsupported blanket claims.
- No lesson contains zero meaningful interaction.
- Comprehensible at user's stated level, while noting uncertainty.
- Subject names editable, no hardcoded Biology except demo/test fixtures.

## Biology demo fixture specification

Use legally shareable, real cell-biology source excerpts covering membrane structure, diffusion, active transport and ATP as appropriate. Expected lesson: *Diffusion and Active Transport*. One deliberate student misconception can trigger a remedial branch. The demo dataset may be preprocessed for resilience, but the code path must demonstrate genuine model generation with clearly described caching.
