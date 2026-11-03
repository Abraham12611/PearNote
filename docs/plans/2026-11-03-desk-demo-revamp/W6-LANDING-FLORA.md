# W6 — Landing rebuild + Flora asset pack

## Direction

Rebuild `src/entry/LandingPage.tsx` on the inherited `About.tsx`
editorial grammar (already the current base) with **real generated art**
in the OurSpaces collage language — the owner rejected text/CSS-only
heroes. Copy is rewritten around the tenet:

> Students use AI to cram and pass — and understand nothing. The
> autocomplete closes the question before the thinking starts.
> PearNotes turns your own sources into a learning world where progress
> is *evidence*: paths you follow, challenges you answer, teach-backs
> you explain, trophies you actually earned. Duolingo's pull, real
> understanding underneath.

## Flora batch plan (per ASSET_AND_FLORA_BRIEF; quote USD before each run)

| asset | use | format |
|---|---|---|
| hero collage "a source becomes a world" — modular layers (PDF sheet w/ highlighter + page tab, thread→subject disc, 3-node path, lesson/source/challenge cards, citation tag) | hero right half; CSS-composed layers, no baked text | webp/png transparent |
| spot: "bring a source" — taped book/PDF | section 2 | webp |
| spot: "review the path" — discs + paper path sketch | section 2 | webp |
| spot: "study in a space" — widget cards on room bg | section 4 | webp |
| spot: "show what you know" — checkpoint sticker + citation | section 5 | webp |
| subject discs: cell / algebra graph / chemistry cluster | picker + desk + landing reuse | webp + svg trace if clean |
| pear/character mascots + tape/clip/paper decorations | global flourishes | svg/webp |
| purple/teal hero field texture | hero bg | webp |

Rules: no words/logos inside art (DOM supplies text); 2D/2.5D
paper-sticker grammar with ink outlines; palette `--pn-ink #0B0B0D`,
cream `#F5EFDF`, lime `#C6F750`, teal/purple/pink/orange accents;
provenance (model, run, cost, prompt) recorded in `docs/BRAND.md`;
alt text + reduced-motion + no-image fallback required; files under
`public/assets/pearnotes/`.

## Page structure (About-derived, copy new)

1. Hero: three-line claim + sub + `get started` / `look around the demo`
   + demo-fixture caption; collage right.
2. "the cramming problem" — the tenet quote as an editorial pull.
3. material → understanding (3-stage collage w/ spot art).
4. the desk you keep (desk preview composition).
5. study, don't just scroll (lesson room widgets).
6. mastery is evidence (challenge + feedback sticker; no fake stats).
7. friends when you invite them (opt-in; room photo strip).
8. OurSpaces heritage + MIT attribution.
9. final invite + real footer.

## Acceptance

- 1440/768/390 screenshots: authored collage, no black void, no generic
  feature-card grid; hero legible; CTAs route (`/auth/*`, `/demo`).
- Reduced-motion + images-off still fully readable.
- Asset manifest w/ provenance + per-run USD cost committed.
- Owner side-by-side vs `/#/about` and the mockup direction.

Owned paths: `src/entry/LandingPage.tsx`, `src/entry/entry.css`,
`public/assets/pearnotes/*` (new art), `docs/BRAND.md` (manifest),
`src/entry/GetStartedModal.tsx` (poster refresh only if needed).
