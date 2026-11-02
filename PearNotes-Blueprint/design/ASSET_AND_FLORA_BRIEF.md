# Flora visual art direction and asset production plan — adapt OurSpaces, don't overwrite it

**Purpose:** use original OurSpaces collage/illustration language to make PearNotes landing and every educational surface feel authored, expressive and recognizably inherited. **Status:** artwork specification and production acceptance, NOT a claim that new illustrations have been generated. **Brand lock:** owner selected **Sticker P 4.2** and current production SVG is retained.

## 1. Source style is original OurSpaces

Reference images 04–06, 11–13 in `OURSPACES_FIDELITY_CONTRACT.md` and the existing repository:
- `src/pages/About.tsx`: site-wide editorial composition, vivid hero artwork, photo/illustration collage, semantic sections, functional black CTA; not a generic startup template.
- `/#/space/crew`: teal topographic world with big cutout photo paper, bright pink/purple/teal cards, sticker labels, hand-made tape and black interactive rail.
- `/#/space/crew/knows`: warm cream board, black outline cards and staggered information; people portraits and grounded activity.
- original avatar screenshot 11: lively headshot/illustrated character circles, soft shading, expressive distinct looks, colorful backgrounds.
- owner Home mockups 09–10 are **content/arrangement direction**, not a mandate to redraw the base design as a new visual kit.

**Nonnegotiable:** new art sits inside native paper/card/photo frames. Do not change radius/shadow/button/tape language just because a generated picture has a different aesthetic. Extract and reuse existing frame classes where possible.

## 2. Visual system — tokens and form

Art palette: near-black ink `#0B0B0D`, cream `#F5EFDF`, lime `#C6F750` and Sticker P's cream edge `#E8DDC0` and fold accent `#C6E14A`; animated teal, deep purple, lively pink and sun orange as scene/subject accents. Keep high contrast for source reading. Black hand-drawn 2–3px outline on warm paper; occasional offset black shadows, small physical tape pieces and layered cutouts. Grain/textures subtle, not unreadable. No generic 3D gloss, random photoreal stock, fake dashboard charts, copyrighted character likeness, copied educational mascot, UI text baked into AI raster when accessible HTML can provide actual text.

**Composition:** 2D/2.5D flat/sticker world, playful but precise. Slightly irregular contours, credible lighting/shadow from a physical taped sheet, punchy vivid backgrounds. Illustrated biology/maths/chemistry imagery must be educationally accurate; generated diagram arrows cannot be treated as evidence unless reviewed against source.

## 3. Asset pack A — landing hero (first visual deliverable)

### A1. "A source becomes a world" master collage
Create one modular illustration for the right half of the landing's native About-style hero, plus independent layers (do not flatten all interactive elements into one inaccessible PNG):
- cream annotated textbook/PDF page with a subtle visible page-number tab and highlighter;
- paper clip / green thread linking it to a circular Cell Biology subject disc;
- winding three-node learning path with current and completed states;
- three native spatial widgets: lesson card, source slip and challenge card with illustrated molecule or phospholipid bilayer;
- small "grounded in this page" citation tag and pen/paper stickers;
- optional warm illustrated student silhouette or hands working at desk (not a real identifiable person).
The goal is to make the user immediately see **source upload → reviewed path → tactile lesson** without implying fabricated source content. Replace placeholder text with DOM text/data; keep artwork assets copy-free as far as possible.

Use original About's layout proportions: textual hero one side, authored visual collage other side, strong top brand and CTA. Provide separate layer assets for narrow screens and reduced motion.

### A2. Section spot illustrations
- "Bring a source": tiny animated book/PDF in taped cover.
- "Review the path": draggable-looking subject discs and editable paper path sketch.
- "Study in a space": hand-drawn native widget cards inside original room background.
- "Show what you know": classification/checkpoint sticker and citation, not unearned trophy.
- "Study together": original cursor/portrait visual grammar; opt-in peers only, no claim of live group unless demo.
Every illustration has a text-only meaningful alternative and suitable high-DPI/responsive export.

### A3. Original About-style "story" decorations
One purple/teal hero field, 2–3 hand-cut tags/tape/labels, a lime-highlighted paper line and big display type; keep spacing and section transitions faithful to About. Do not generate a complete page mockup then implement it as a single image.

## 4. Asset pack B — Home / learning room materials

**Home educational objects** needed for original /knows-style adaptation:
- paper and poster variants for Continue studying and First source invitation;
- tiny illustrated subject discs for Biology (cell), Algebra (graph/pi motif), Chemistry (molecule), and fallback Custom; consistent size and crop;
- achievement physical forms: sticker medal, book pin, lab badge, locked peg outline;
- study calendar/pinned note decoration and subject stickers, with actual date text rendered by React, not generated raster;
- empty "your first source" illustration suitable for personal first-use;
- progress labels/small motif cards; no simulated real counts in exported art;
- original frame assets such as tape/note/clip should be shared CSS or reused assets rather than regenerated in ten inconsistent versions.

**Learning path illustrations:** small subject-specific node stickers (cell membrane, math expression, lab glassware) and a generic lesson/quiz/practice icon family; status is dynamic state rendered in code, not hard-coded onto artwork. All assets readable at 24, 32, 48, 96px. Be conservative with decorated path at low zoom.

**Lesson:** diagram art for approved topics only; source-derived and separately validated. No invented citations in exported image. Educational details (e.g. passive vs active membrane transport) have accessible labels and editorial reviewer sign-off before graded material.

## 5. Asset pack C — eight+ personal avatars and cursor look

### Portraits
Start from style of screenshot 11 and `public/avatars/`. At least **eight** new/approved starter profile variants if owner elects to replace the existing set; each an original, distinct illustrated person of matching line weight, face/head crop and lighting; no direct reproduction of real people's photographs. Make variants feel like one cast, not eight unrelated image models. Use inclusive range of appearance and no stereotypes.

### Cursor
The image choice affects *original OurSpaces pointer presence*: cursor color, tiny face circle/name chip, focus ring; create little size variants of each face and map to original cursor runtime. **Do not regenerate the entire cursor design**. Profile photo uploads use separate secure thumbnail pipeline.

### Export
For each portrait: editable source if available, optimized 512/256/96 PNG/WebP, square 1:1, transparent/controlled colored background, documented prompt/model/run/provider, descriptive asset name, license/provenance and human review. Ensure names are fictional/default handles, independent of profile name after personalization.

## 6. Asset pack D — dialog and authentication

Repurpose original OurSpaces screenshot 13 modal structure: left colored scene with taped paper/collage featuring source note and pear illustration; right clean cream content with heading, email input and native pill CTA. Sign-up/sign-in may reuse the *same* visual asset with different text. Avoid producing giant button image or baked text; the modal is an interactive HTML component and must pass accessibility checks.

For OTP email itself, update `convex/emails/signIn.ts` from OurSpaces to PearNotes, use a dedicated **absolute HTTPS** brand header image with accessible alternate and plain-text parity. Check sender rights. Do not generate marketing images that imply Gmail or OAuth endorsement.

## 7. Flora workflow and expense policy

The owner specifically wants Flora MCP for the illustrations. **Prepare detailed prompts and references; do not initiate additional paid generation until a fresh budget and chosen batch are explicitly approved** (past Sticker P work cost a reported $3.82; that does not automatically authorize unlimited new runs).

Per batch:
1. Make side-by-side original OurSpaces screenshot board + desired adapted screen (do not send private user records to external asset tools).
2. Identify missing *asset*, not an entire new UI component. Use Flora to generate only that art; retain original DOM and existing UI.
3. State model and current per-run price estimate; ask owner to approve count/budget before executing.
4. Generate 2–4 cohesive candidates with one style grammar; compare to original; owner chooses.
5. Refine only selected piece and export masters/raster variants; no extra spending without consent.
6. Audit copyright/trademark, brand confusion, unwanted text/artifacts, visual likeness, accuracy; prepare human adjustment.
7. Optimize, commit to `public/pearnotes/*` or a coherent static folder, record provenance in `docs/BRAND.md` or asset manifest.
8. Verify on landing, in modal, at 390/768/1440 and high-density screen, dark and cream backgrounds.
9. Test reduced-motion/no-image/loading-fallback so UI is still fully usable without artwork.
10. Owner accepts side-by-side with original OurSpaces source before release.

### Flora prompt template: hero collage

"Original PearNotes educational spatial scrapbook illustration using the same design DNA as a playful handmade collaborative digital wall: warm cream paper cards, bold near-black cutout outlines, tactile translucent tape, teal topographic and purple surface accents, brilliant lime folded-paper details, slight natural overlap and shadows, friendly 2D/2.5D editorial vector-sticker collage. On right-side compositional frame show a source document, cited highlighted page, illustrated subject token, winding path and a few native-style learning cards connected by a small drawn line. Dense but clear focal hierarchy; generous copy-safe area; NO words/letters/logos, no photoreal people, no fictional citations, no generic startup dashboard, no gradients or unauthorized brand characters. Modular independent objects suitable for animated CSS/HTML composition, responsive cropped variants."

### Flora prompt template: eight avatar family

"One coherent cast member for PearNotes in a human-friendly, colorful illustrated avatar catalog resembling a tactile 2D/2.5D storybook/sticker portrait system: original head-and-shoulders character, simple friendly expression, soft sculpted highlights, bold subtle outline, clean circular framing, contrasting rich background, clear silhouette at 48px, humanly diverse features, outfit/personality individualized. No text, logos, celebrity likeness or copied character, no full body, no generic photoreal stock. Same lighting, framing and art finish as the rest of the 8-character family."

### Flora prompt template: subject icon trio

"Small original round subject portrait for a playful paper-and-sticker collaborative learning world, consistent 2.5D thick-ink cutout art: [CELL BIOLOGY cell with nucleus / ALGEBRA annotated graph line / CHEMISTRY simple bonded sphere cluster], one main recognizable scientific/academic motif, saturated distinctive color field, cream offset sticker border, tiny lime accent, readable at 40px, no text, no UI panel, no fake correctness cues."

## 8. Quality and licensing matrix

| Check | Acceptance |
|---|---|
| Identity | Sticker P remains official; no unapproved alternative mark |
| Visual family | exact original OurSpaces panel/collage reference listed and recognizable |
| Accuracy | educational art reviewed; no unsupported scientific claims/citations |
| Motion | independent image layers or static graceful fallback; reduced motion works |
| Size | PNG/WebP optimized, alt descriptions, no huge startup payload |
| Rights | asset provenance, original author/license, model/provider terms and trademark risk documented |
| Readability | diagram labels provided in DOM, font contrast checked at 200% zoom |
| UX | original dialogs/widgets remain the functional controls |
| Ethics | no misleading peer badges, XP or "live" status baked into art |
| Cost | documented actual Flora runs and charged amounts; user-approved spend |
| Responsive | no clipped faces/cards at 390px, no hidden CTA under hero illustration |

**Do not mistake an attractive concept image for an implemented design.** The output must be actual native, responsive, accessible interface components and source-backed data flows.
