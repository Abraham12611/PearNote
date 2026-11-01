# PearNotes — E3 Brand Identity Proposals (record)

**Status:** ✅ SELECTED — **4.2 · Sticker P** (ink body, cream die-cut border, tilted; lime fold). Applied to app logo + favicon/icon set on branch `feature/e3-brand-identity` (see `SELECTED` below).
**FLORA project:** `prj_ns74pm82b56q9annhw5zjxt1e18hcd8d` — *PearNotes E3 Brand Identity* (folder `PearNotes`)
Canvas: https://app.flora.ai/projects/ns74pm82b56q9annhw5zjxt1e18hcd8d
**Workspace:** `ws_qd7b0svaf2xr5w45pg702365nx84f3qm` (ImisiD Elijah's workspace)
**Date:** 2026-11-01 · **Total spend:** $3.82 USD (round 1: $2.325 · round 2 Folded-P refinement: $1.495)

Open `index.html` for the comparison sheet (light/dark, header scale, favicon previews, lockups, monochrome).

## Candidates

| # | Name | Direction | Lead asset |
|---|------|-----------|------------|
| 1 | The Folded Pear | pear + folded sticky-note | `svg/c1b-pear-note-v2-*.svg` (+ GPT lockups `flora-src/c5`, `c8`; alt take `c1-folded-pear`) |
| 2 | The Open Page | open book + sprout (knowledge motif) | `svg/c2-book-pear-*.svg` |
| 3 | Pip, the Note-Buddy | original paper-pear character | `flora-src/c6-sticker.png` (+ vector sketch `svg/c3-character-*.svg`) |
| 4 | The Folded P ★ | geometric folded-paper P monogram — **owner's pick**, refined below | `svg/c4-p-monogram-*.svg` |
| 5 | The Path Pear | stepping-stone learning path inside a pear | `svg/c7-path-pear-*.svg` |

Variant suffixes: `-light` (original colors, transparent bg), `-dark` (ink→paper), `-mono-ink`, `-mono-paper`, `-pink`/`-violet` (accent-fold recolors), `-pink-dark`/`-violet-dark`. Variants were produced by fill remapping on the returned vector path data — no extra model calls.

### Round 2 — Folded P refined to the app UI grammar (owner pick)

| # | Sub-direction | Lead asset |
|---|---------------|------------|
| 4.1 | Origami P — cream ribbon, lime fold undersides, die-cut border (**lead**) | `svg/c4e-origami-p-*.svg` |
| 4.2 | Sticker P — ink slab body, cream die-cut border, tilted | `svg/c4a-sticker-p-*.svg` |
| 4.3 | Stack P — two overlapping paper sheets forming P | `svg/c4b-pill-p-*.svg` |
| 4.4 | Torn-slip P — IOU/receipt torn edge, seed counter | `svg/c4c-torn-p-*.svg` |

Context render: `flora-src/c4d-appicon-teal.png` — origami-P on ink tile over teal topographic canvas (target PWA-icon feel). The sticker-border variants read on both light and dark without recolor.

## Generation record

| File | Model | Run id | Charged |
|------|-------|--------|---------|
| `flora-src/c1-folded-pear.svg` | Recraft V4.1 Pro Vector `t2i-recraft-v4-1-pro-vector-t2i` | `run_m170twk8trq644dtksrr4zss3d8hdmc7` | $0.36 |
| `flora-src/c2-book-pear.svg` | Recraft V4.1 Pro Vector | `run_m1758en2s785qava9q61b3aqeh8hc571` | $0.36 |
| `flora-src/c3-character.svg` | Recraft V4.1 Pro Vector | `run_m176s0cmg2w3y210aw18mgkzk58hdcq5` | $0.36 |
| `flora-src/c4-p-monogram.svg` | Recraft V4.1 Pro Vector | `run_m17943w8p4jayv8f3vx7q1yfan8hdf0r` | $0.36 |
| `flora-src/c1b-pear-note-v2.svg` | Recraft V4.1 Pro Vector | `run_m17emdp7srgc2vh5fcwh2fr7tn8hcqjf` | $0.36 |
| `flora-src/c7-path-pear.svg` | Recraft V4.1 Pro Vector | `run_m17037pr2ceqf4ts78zych0px98hc0qe` | $0.36 |
| `flora-src/c5-lockup.png` | GPT Image 2.5 Sunburst `t2i-gpt-image-2-5-sunburst` | `run_m171sef9a92aa74tpcczpnxznx8hd42k` | $0.055 |
| `flora-src/c6-sticker.png` | GPT Image 2.5 Sunburst | `run_m17fqwc2ez7n9bbaypdfz2x7kx8hdmzg` | $0.055 |
| `flora-src/c8-stacked-lockup.png` | GPT Image 2.5 Sunburst | `run_m172qnnjppjbgedntfmz2cs57n8hcjb3` | $0.055 |
| `flora-src/c4a-sticker-p.svg` | Recraft V4.1 Pro Vector | `run_m1790dh1c9n5ccjdfxdmb1gb7h8hdjfw` | $0.36 |
| `flora-src/c4b-pill-p.svg` | Recraft V4.1 Pro Vector | `run_m17dgqyyzq947zsrxs8f7qr33x8hdsfh` | $0.36 |
| `flora-src/c4c-torn-p.svg` | Recraft V4.1 Pro Vector | `run_m17a3r3amxy3v73bjke91fs6k98hc9gc` | $0.36 |
| `flora-src/c4e-origami-p.svg` | Recraft V4.1 Pro Vector | `run_m177aj34yr9qdae8ywac059hf98hdwcv` | $0.36 |
| `flora-src/c4d-appicon-teal.png` | GPT Image 2.5 Sunburst | `run_m17b4y0h7bgnxq3k4ee2fpgzn98hdrb9` | $0.055 |

Asset ids on FLORA (in order above): `asset_jd7dpg02efepz4mg7a8weseka18hcr1a`, `asset_jd737jpg7jybyrbrr80b5h4etd8hcfkp`, `asset_jd7ck2n886z51e68jatpeqgrpn8hdtsh`, `asset_jd7e2ejaytqdgbs15hc06g504h8hc15h`, `asset_jd749jk3ym4jm8atywavs1x11x8hcpz2`, `asset_jd739xb6hbdh507hr8m56fk1298hdbft`, `asset_jd74vx53rhv3jttpvg1md2c60s8hd6pn`, `asset_jd730m7fmehf0f26nghxzysb618hcwnd`, `asset_jd7a48kx4q7j5w101v74wdrdgd8hd83h`.

## Prompts (verbatim)

1. **c1-folded-pear** — "Minimal flat vector logo icon: a pear silhouette combined with a folded paper note — the pear body is a rounded-square sticky note with one folded bottom corner, a short stem and single leaf on top. Die-cut sticker style with a clean bold near-black #0B0B0D outline, warm cream paper #F5EFDF fill, and one restrained lime green #C6F750 accent on the folded corner and leaf. Simple geometric shapes, generous negative space, strong silhouette readable at 16px favicon size. No text, no gradients, no shadows. Original design for a spatial learning app called PearNotes."
2. **c2-book-pear** — "Minimal flat vector logo icon: an open book seen from the front, its two curved pages together forming the silhouette of a pear, a small stem and leaf rising from the book spine. Symbolizes notes transforming into understanding. Flat die-cut sticker style, bold near-black #0B0B0D outlines, warm cream #F5EFDF page fill, one single lime green #C6F750 leaf. Simple geometric silhouette readable at 16px favicon size, generous negative space. No text, no gradients, no shadows. Original mark, does not resemble any existing brand."
3. **c3-character** — "Flat vector mascot logo icon: a small friendly pear-shaped folded-paper character, die-cut sticker style with thick near-black #0B0B0D outline, warm cream #F5EFDF body, one tiny lime green #C6F750 leaf on its stem, simple confident face with two dot eyes and a small smile, holding a tiny dark pencil. Cute but restrained and premium, geometric rounded shapes, original character design — NOT an owl, does not resemble Duolingo or any existing mascot. Readable at small favicon size. No text, no gradients, no shadows."
4. **c4-p-monogram** — "Minimal geometric logo icon: a bold abstract letter P monogram constructed from a single folded ribbon of paper, the inner counter of the P shaped like a small pear seed or map pin suggesting a spatial learning path. Flat vector die-cut sticker aesthetic, near-black #0B0B0D ribbon with a warm cream #F5EFDF edge detail and one lime green #C6F750 accent fold. Strong simple silhouette readable at 16px favicon size. No text, no gradients, no shadows. Original mark for the learning app PearNotes."
5. **c5-lockup** — "Horizontal logo lockup for 'PearNotes', a spatial learning app. Left side: a minimal flat vector icon of a pear merged with a folded paper sticky note, near-black ink outline, warm cream paper fill, lime green #C6F750 folded corner. Right side: the word 'PearNotes' set in a bold rounded grotesque typeface, dark ink #0B0B0D. Scrapbook sticker sensibility, clean flat vector design, plain white background, premium and slightly playful. No gradients, no shadows."
6. **c6-sticker** — "Brand identity concept for 'PearNotes': a die-cut sticker of a small pear made of folded cream paper with a tiny friendly face and a small pencil tucked beside it, standing on a curled sheet of notes. Flat vector sticker style, thick near-black outline, warm cream paper body, restrained lime green #C6F750 accents. Playful, premium, original — not an owl, does not resemble Duolingo or Notion. Below the sticker the word 'PearNotes' in bold rounded dark type, plain white background, no gradients."
7. **c1b-pear-note-v2** — "Minimal flat vector logo icon: a classic pear silhouette — narrow top widening to a round bottom — where the bottom-right edge curls up like a folded paper note corner revealing a lime green #C6F750 underside, a short stem and single leaf on top. Die-cut sticker style, bold near-black #0B0B0D outline, warm cream paper #F5EFDF body fill. The shape must read unmistakably as a pear, not a square or apple. Simple geometric forms, generous negative space, readable at 16px favicon size. No text, no gradients, no shadows. Original design."
8. **c7-path-pear** — "Minimal flat vector logo icon: a dotted learning path of three small rounded stepping-stone nodes connected by a curved line, the path sweeping upward and curling into the outline of a pear, ending in a small stem and single leaf. Symbolizes a spatial learning journey growing into understanding. Die-cut sticker style, near-black #0B0B0D strokes and nodes, warm cream #F5EFDF pear fill, one lime green #C6F750 leaf and one lime starting node. Bold simple silhouette readable at 16px favicon size, generous negative space. No text, no gradients, no shadows. Original mark."
9. **c8-stacked-lockup** — "Compact stacked logo lockup for 'PearNotes': centered above, a minimal flat vector icon of a pear whose bottom-right edge is folded like a paper note corner showing a lime green underside, short stem and lime leaf, near-black outline, warm cream paper fill; centered below the icon the word 'PearNotes' in a bold rounded grotesque typeface in dark ink. Flat die-cut sticker style, plain white background, premium and playful, no gradients, no shadows."

### Round 2 prompts (Folded P refinement, UI-grammar tuned)

10. **c4a-sticker-p** — "Flat vector logo icon: a bold letter P folded from a single sheet of paper, drawn as a die-cut sticker with a thick warm cream #F5EFDF border outline hugging the whole silhouette like scrapbook stickers. Near-black #0B0B0D paper body, one bright lime green #C6F750 fold accent, slight playful 3-degree tilt. Chunky rounded corners, tactile sticker aesthetic, strong silhouette readable at 16px favicon size, generous negative space. No text, no gradients, no shadows. Original mark."
11. **c4b-pill-p** — "Flat vector logo icon: an ultra-chunky rounded letter P built from a fat folded paper ribbon, all terminals ending in soft pill shapes like rounded button caps, the fold crease revealing a lime green #C6F750 underside. Warm cream #F5EFDF ribbon body with bold near-black #0B0B0D outline, die-cut sticker feel, extremely simple and bold, readable at 16px favicon size. No text, no gradients, no shadows. Original mark for a playful spatial learning app."
12. **c4c-torn-p** — "Flat vector logo icon: a letter P cut from warm cream paper with a hand-torn bottom edge and one folded top corner, a small near-black #0B0B0D pear-seed shaped droplet sitting in the counter of the P, one lime green #C6F750 accent on the fold. Die-cut scrapbook sticker aesthetic, bold near-black outline, irregular tactile paper edges, simple bold silhouette readable at 16px favicon size. No text, no gradients, no shadows. Original mark."
13. **c4d-appicon-teal** — "App icon presentation: a single die-cut sticker of a bold folded-paper letter P with lime green fold accents, sitting centered on a deep teal #1d9e8c canvas background with subtle topographic line texture, near-black rounded-square app-icon tile behind the sticker, playful scrapbook style, flat vector look, no text, no shadows, square composition."
14. **c4e-origami-p** — "Flat vector logo icon: a bold letter P folded origami-style from a single wide ribbon of warm cream #F5EFDF paper, the folded underside flaps revealing bright lime green #C6F750 at the top-left and bottom-left folds, a thick cream die-cut sticker border hugging the whole silhouette. Clean geometric origami folds, bold simple shape readable at 16px favicon size, generous negative space, no text, no gradients, no shadows. Original mark for a playful scrapbook-style learning app."

## Rights & licensing notes

- Outputs are original generations; no source/reference imagery used (pure text-to-image/vector).
- Recraft and GPT Image plans grant usage rights to generated outputs, but **AI-generated marks may have limited copyright/trademark registrability** — recommend a human designer refinement pass + trademark clearance search (Pear, Pear Deck, Notion, Duolingo, OurSpaces) before shipping/registering.
- **Fonts:** Bricolage Grotesque + IBM Plex Sans are SIL OFL — safe for wordmark typesetting; convert wordmark to outlines in final exports.
- Raster candidates (C5, C6, C8) are 1024×1024 JPEGs (white background) — reference renders only; final deliverables need vector redraw or high-res transparent export.

## Directory

```
brand-proposals-e3/
├── index.html          # comparison sheet (open in browser)
├── PROPOSAL.md         # this record
├── flora-src/          # raw FLORA outputs (SVG masters + PNG renders)
├── svg/                # derived variants: -light / -dark / -mono-ink / -mono-paper
├── png/                # rasterized previews of the vector concepts
└── check/              # spot-check renders (dev artifact)
```

## SELECTED — 4.2 · Sticker P (owner approval, 2026-11-01)

**Master:** `public/assets/pearnotes-mark.svg` — tight-cropped viewBox (`265 264 1518 1518`), transparent background, source vector `flora-src/c4a-sticker-p.svg` (run `run_m1790dh1c9n5ccjdfxdmb1gb7h8hdjfw`, Recraft V4.1 Pro Vector, $0.36).

**Shipped exports** (headless-Chrome raster at 2×, LANCZOS downsample; favicon.ico packed via PIL):

| File | Size | Notes |
|------|------|-------|
| `public/favicon.png` | 64×64 RGBA | transparent |
| `public/favicon.ico` | 16/32/64 multi | packed ICO |
| `public/icons/favicon-16/32.png` | 16/32 RGBA | transparent |
| `public/icons/apple-touch-icon.png` + `public/apple-touch-icon.png` | 180×180 | ink `#0B0B0D` tile, mark 72% |
| `public/icons/icon-192/512/1024.png` | RGBA | transparent, mark ~96% |
| `public/icons/icon-512-maskable.png` | 512×512 | ink tile, mark 60% (safe zone) |
| `public/assets/og-image.png` | 1200×630 | teal canvas + ink tile + wordmark |

Accent alternates kept in `svg/c4a-sticker-p-{pink,violet}*.svg` — not shipped; available for future subject/event themes.

**Applied refs:** `index.html` (favicon links, title, OG/twitter meta, theme-color), `public/manifest.webmanifest` (name, description, start_url `/`, ink theme), logo img refs in `Rail.tsx`, `DemoBanner.tsx`, `Outro.tsx`, `MailReel.tsx`, `About.tsx` (src + lockup brand strings → PearNotes).
