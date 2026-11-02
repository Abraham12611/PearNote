# PearNotes — OurSpaces-first UI/UX fidelity contract

**Decision authority:** owner visual review, 2026-11-02. **Status:** normative specification; NOT a claim of implemented fixes. **Scope:** landing, auth, demo, private app, collaborative spaces, curriculum and lessons.

> PearNotes IS an adaptation of OurSpaces. Reuse existing UI elements, interactions, composition, visual materials, spatial mechanisms and modal patterns. An educational extension must feel like a native OurSpaces feature. Do not construct a second, unrelated UI kit.

This corrects and supersedes previous blueprint descriptions wherever they permit generic SaaS dashboards, bespoke flat dark cards, new independently styled app rails or new lesson canvases. Maintain all privacy, source grounding, server-evidence, accessibility and licensing requirements. Owner-approved brand mark: **Sticker P (concept 4.2)**.

## Rules of inheritance

| Level | Implementation rule | Example |
|---|---|---|
| KEEP | Extend original component without changing its silhouette, dimensions or interaction contract. | OurSpaces floating Rail, MemberFace, breadcrumb, bottom activities pill, black buttons, modal close/focus behavior |
| ADAPT | Extract common primitive from original, preserve existing use, supply new labels/data/icons. | Room-photo dock becomes 7-item navigation dock with custom illustrated SVG navigation glyphs |
| COMPOSE | Rearrange existing native cards and stickers into education-specific compositions. | `/knows` paper cards become personalized learning Home, with curriculum/activity/calendar/achievement content |
| EXTEND | Register new educational widget inside shared widget shell with native drag, resize, focus, thread, gestures. | Source Viewer, Lesson Card, Challenge, Teach-Back |
| EXCEPTION | Document why no native component suffices; prototype against original before new primitive. | Accessible PDF text reader, linear alternative to canvas |
| PROHIBITED | Implement another independently styled design system. | Generic dashboard, giant blank cream path, text-only black landing, feature-card grid, silent fixture fallback |

## Canonical references

1. **Floating left dock:** owner screenshot 04 at `/#/space/crew`. Source `src/components/Rail.tsx` with `space-rail`, `space-list`, `space-link-wrap`, `space-tooltip`, `create-space-button`, `rail-you` and `MemberFace`. The current `src/pearnotes/shell/app/AppRail.tsx` is a divergent duplicate; refactor via shared native dock family.
2. **Home information material:** screenshots 05–06 of `/#/space/crew/knows`. Warm cream background; handwritten/drawn energy; black-stroked cards with offset shadow; useful dense collage rather than empty void. Adapt it to learning and study.
3. **Original room canvas:** screenshot 04, `src/pages/LiveSpace.tsx`, `src/components/Canvas.tsx`, `src/components/WidgetCard.tsx`, `src/components/WidgetPicker.tsx`, inherited widget and presence runtime. Use this for lesson spaces.
4. **OurSpaces About landing:** screenshot 12, `src/pages/About.tsx` and its native CSS/visual system. Use this as structural and editorial basis for public PearNotes landing—not the current `src/entry/LandingPage.tsx`'s almost blank black page.
5. **Original split editorial dialog:** screenshot 13 of inherited OurSpaces modal (image + color left, headline/CTA right, close). Reuse for Get Started, signup, login and identity recovery instead of current `src/entry/GetStartedModal.tsx` independent modal design.
6. **Persona chooser:** screenshot 11, `src/data/avatars.ts`, `src/live/identity.ts`, public avatar assets and original settings UI. Preserve illustration family, profile picture circles, custom-upload gesture and user-specific cursor.
7. **Existing learning path:** screenshot 08, `src/pearnotes/ui/LearningPathDrawer.tsx` and `JourneyDrawer.tsx`. Keep native right-drawer experience and authored path nodes, refine to coordinate with other OurSpaces components.
8. **Sticker P:** `public/assets/pearnotes-mark.svg`, the existing official brand guide `docs/BRAND.md`. Keep the mark; the problem is surrounding page design, not brand selection.

### Owner screenshot key (13 uploaded images, reference artifacts not yet checked into Git)

| # | Screenshot name | Meaning |
|---|---|---|
| 01 | Screenshot 2026-11-02 at 12.32.54 AM.png | Rejected sparse PearNotes landing |
| 02 | Screenshot 2026-11-02 at 12.32.30 AM.png | Rejected "pick a door" modal |
| 03 | Screenshot 2026-11-02 at 12.38.48 AM.png | Rejected dark standalone demo Home and rail |
| 04 | Screenshot 2026-11-02 at 8.31.14 AM.png | Source dock, space and presence from OurSpaces |
| 05 | Screenshot 2026-11-02 at 8.56.13 AM.png | Original /knows top: paper, sections, people |
| 06 | Screenshot 2026-11-02 at 8.56.23 AM.png | Original /knows lower: meaningful cards, data |
| 07 | Screenshot 2026-11-02 at 9.24.37 AM.png | Blank low-contrast second subject path |
| 08 | Screenshot 2026-11-02 at 9.25.05 AM.png | Biology path and lesson nodes reference |
| 09 | image(20261102-083324).png | Home reference composition 1 (teal studio) |
| 10 | image(20261102-083938).png | Home reference composition 2 (paper board) |
| 11 | Screenshot 2026-11-02 at 9.40.14 AM.png | Existing eight-avatar settings chooser |
| 12 | ourspaces.io_.png | Original polished /#/about page |
| 13 | Screenshot 2026-11-02 at 12.31.51 AM.png | Original OurSpaces two-tone modal |

The images exist in the owner conversation, not in Git; they must be consulted during implementation and paired with new previews. File names above are human reference labels, not repository file paths.

## Native material and composition language

- **Stage:** immersive textured teal/topographic canvas or warm paper, with spatial content placement and variation; dark near-black belongs primarily to dock, pills and focal overlays, not every entire content page.
- **Cards:** original paper slips, taped clippings, bold ink 2–3px outlines, inset highlights, bottom/right offset shadow, occasional tiny rotations. Reading cards remain level; shadow is tactile, not generic elevated UI.
- **Hierarchy:** bold Bricolage Grotesque, editorial sentence breaks, compact UI narration in IBM Plex Sans; do not reproduce the literal content of OurSpaces' social example in new learning features.
- **Palette:** ink, cream, lime, purple, teal, orange and pink with distinct roles; vary by learning subject but preserve black card outlines and contrast. Lime is an interactive action/active state, not the entire dialog body.
- **Controls:** chunky round pills, softly animated circle controls, visible focus and selectable border, contact shadows; hover lift on desktop, explicit tap feedback on touch.
- **Illustrations:** custom Flora artwork should look like the existing 2D/2.5D characters, stickers, taped media, not pasted corporate vectors. Keep consistent crop, outline, scale, highlight and transparency.
- **Gesture model:** preserve original pan, zoom, drag handles, focus controls, bottom widget activities pill, contextual threads, live cursors only where authorized; a student must not learn a second interaction system.
- **Layer stack:** no overlay/tooltip overlaps the dock, drawer close button, bottom pill, session status or primary actions; modal layer traps focus and prevents background actions.
- **Responsive:** reuse native layout transformations, not simply scale down 1600px canvas. Mobile has readable card stack and linear lessons while preserving the same material identity.

## Data honesty and safety

A new personal account has **zero subjects, zero study history, no earned achievements and no automatically invented friends**, even though the interface itself must be richly designed. Display generous empty-state illustration and clear learning action. A demo may have sample subjects, friends and achievements only under highly visible DEMO/prototype labeling, with no private reads or writes. "Live", "verified", "mastered" or "friend studying now" is never decorative text in production.

Mastery is server evidence, not card interaction. Personal PDFs, attempts, identity and friends are owner-scoped; group release is deliberate. Keep MIT attribution and independently audit rights of original imagery, fonts and Flora assets.

## Component reuse ledger required in every UI PR

| Field | Engineer must supply |
|---|---|
| Screen and task | route, user intention, edge states |
| Native ancestor | exact original OurSpaces file/export and CSS selectors |
| Preserved physical/behavioral traits | size, typography, outline, overlays, gestures, motion, focus |
| Adaptation | new learning information and icons/data bindings |
| Necessity of new element | why composition from existing pieces is inadequate |
| Failure/empty/data states | backend truth and demo separation |
| Screenshot pair | OurSpaces reference vs new PearNotes at same desktop/mobile viewport |
| Proof | test, preview SHA, keyboard/touch action script, user acceptance |

## Automatic rejection conditions

- Left dock is not unmistakably adapted from original Rail.
- Landing is a text-only dark page with generic four-card feature grid.
- Get Started or authentication shows an oversized standalone "pick a door" slab.
- Home is merely a black dashboard with empty gray tiles or fake friend/reward data.
- Path is a blank cream sheet, low-contrast text or static unreachable spinner.
- Fixture Biology has a path but other selectable fixture subjects do not, with no designed explanation.
- Lesson uses a new noninteractive empty Canvas instead of inherited room conventions, breadcrumb and activities pill.
- Persona only has a generic initial when a durable avatar is assigned, or cursor has no relation to selected identity.
- A badge, source citation, friend activity, result or progress state is presented without real evidence or explicitly labelled fixture.
- No code ancestor, screenshot parity, responsive and owner acceptance proof.

## Related specifications

- `SCREEN_BY_SCREEN_REDESIGN.md` — routes/pages and exact composition.
- `LEARNING_PATH_AND_LESSON_CANVAS.md` — subject selection through widget runtime.
- `IDENTITY_FRIENDS_GROUPS.md` — avatars, presence, group and profile.
- `ASSET_AND_FLORA_BRIEF.md` — generation and asset constraints.
- `../engineering/AUTH_AND_ACCOUNT_RELIABILITY.md` — working Gmail/email and Google.
- `../delivery/REDESIGN_RELEASE_GATES.md` — acceptance protocol.

**Status rule:** these files are directives for future PRs. They do not imply the current merged `develop` UI is approved.
