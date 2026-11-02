# E3 · Zero-cost asset slots — usable TODAY, no Flora spend

Everything below already ships in the repo — E1/E2 can build every listed slot at **$0**, no generation needed. Gaps stay gated behind `FLORA_PROPOSAL.md` batch approval. Status legend for `ASSET_MANIFEST.md`: these are the **E** (exists) and **C** (compose) slots made concrete.

> **Rights note:** the repository's *code* is MIT-licensed OurSpaces. **Media assets are not automatically MIT-cleared** — illustrated avatars, stickers, textures and brand files are in-repo and safe for in-app use, but anything containing stock/third-party photography (people photos, demo-video scenes, link-card art, space covers, the email header) needs a per-asset rights confirmation before use beyond the app (marketing, OG, external). Items flagged ⚠ below.

## Avatars — persona pack (E2: profile, chooser, cursor, friends capsule)

Repository holds **27 unique avatar PNGs**: 8 canonical starter portraits + 19 additional unique portraits.

| Slot | Use | Notes |
|---|---|---|
| 8 canonical personas | `public/avatars/{juno,momo,pico,wren,ziggy,clover,pepper,kiwi}.png` | starter set — `VISITOR_AVATAR_NAMES` in `src/data/avatars.ts`; cursor accent per `AVATAR_PLAN.md` |
| 19 alternates | `public/avatars/{alex,ash,casey,dev,gigi,jordan,jules,kenji,marco,maya,morgan,noor,priya,ren,riley,rio,sam,sky,theo}.png` | same clay family — chooser overflow / demo people / custom fallback |
| Cursor face chips | derive 64px center-crops from each persona PNG locally | $0 — PIL/sips resize, face stays upper-third |
| `people-capsule` | overlapping rings of the same PNGs | DOM composition — `MemberFace` ancestor |

## Brand (locked — do not alter)

`pearnotes-mark.svg` · `pearnotes-lockup.svg` (horizontal) · `pearnotes-lockup-stacked.svg` · `og-image.png` · full favicon/PWA set — all in `public/assets`, `public/icons`, `public/favicon.*`.

## Stickers & paper (E1: landing collage layers · E2: knows/Home boards, shelf)

| Family | Files | Slots they cover |
|---|---|---|
| Die-cut stickers ×18 | `public/assets/stickers/*.png` (ours, matcha-cake, glad-ur-here, crew-high-five, holo-smiley, skate-sun, moon-sparkle, cherry-duo, double-smile, good-vibes, hello-cat, pizza-pals, roller-crew, since-19, socks-terrier, sparkle-burst, tahoe-car, blah-blah) | landing story deco, Home pins, Shelf art, hero collage accents |
| Paper textures ×5 | `public/assets/textures/{note-paper,note-torn-paper,daily-question-paper,link-shelf-ledger,widget-paper-v1}.*` | card/slip backgrounds, library stack, calendar board |
| Hardware | `public/assets/ui/quote-pushpin.png` | pinned-note accents |
| Posters ×3 | `public/assets/cozy-{color-poster,poster-starry,poster-wave}.svg` | hero field backgrounds, section breaks |
| Link-card art ×4 palettes | `public/assets/link-card-{ceramic,collage-amber,collage-teal,collage-violet,riso,textile}.{png,webp}` + `link-card-fallback.*` ⚠ | landing "study in a space" spot, Library card faces — stock-derived art, confirm before external use |
| Space covers ×4 | `public/assets/space-covers/{game-day,the-family,the-house,us-two}.png` ⚠ | Groups room cards — photo covers, real groups get own covers |

## Photo collage stock (E1: hero + story sections) ⚠ rights-confirm

- `public/photos/crew/*.jpg` — camera-roll, friday-at-mayas, paint-night, pizza-night, rio-socks, roof-dusk, tahoe-sunrise (7 full scenes + `thumbs/`) ⚠ contains people/photography — confirm rights before external use
- `public/photos/couple`, `hackathon` dirs; `compare.svg`, `lotus-night.svg`, `same-moon.svg`, `window-garden.svg` ⚠
- `public/demo-video-assets/*.jpg` — desk/board scenes (holly-desk, thomas-desk, build-room-pile, crawl-strip, reading-circle, keep-takeaway, link-card-arrival, myspace-glitter, chat-crew, feed-photos) — hero collage "mini canvas" frames, modal scene panel base ⚠ third-party/stock imagery — in-app reuse OK pending audit, not for OG/marketing

## Icon treatments (E2: dock + widget chrome)

- **Dock glyph family exists** — `src/pearnotes/shell/app/AppRail.tsx` `ICONS` map: 7 inline SVGs (home/learn/library/groups/achievements/profile/settings), consistent `viewBox 96`, shared stroke props. **Keep this family**, restyle stroke to the 2–3px ink spec if needed — no new icon art required for v1.
- **Journey stickers in code** — `src/pearnotes/ui/journeyAssets.ts` `JOURNEY_STICKERS` theme map (`pickSticker`) already supplies path stickers; extend the theme list rather than replacing it.
- **Path node states** — `JourneyNode.tsx` draws current/completed/locked in code; keep states out of artwork.

## Modal & surfaces

- Two-tone modal: left panel composes `demo-video-assets` scene or poster SVG + taped texture + Sticker P — all existing.
- Email header: `public/assets/email/signin-header.png` is upstream art — **usable short-term, flagged**: replace or re-clear before external/marketing use; alt text + plain-text parity required (`ASSET_AND_FLORA_BRIEF` §6).

## Coverage vs. manifest

Covered at $0: avatars/cursors, brand, stickers/frames/textures, hero collage components, modal scene, dock icons, Shelf sticker art, Library card faces, Groups room covers.
Still gated (batch approval): subject discs (educational motifs), trophy set, hero **custom** collage if stock composition reads too social, path-node subject glyphs. Compose first — generation only where stock can't honestly fill the slot.
