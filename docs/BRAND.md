# PearNotes brand — mark, lockups, icon set

Owner-approved identity (**Assignment E3**): **Sticker P** — a folded-paper letterform "P" rendered as a die-cut sticker: near-black ink body, warm-cream sticker border, slight tilt, single lime fold accent. Generated via FLORA (Recraft V4.1 Pro Vector); full prompts, run ids, cost and licensing record in `brand-proposals-e3/PROPOSAL.md`.

## Files

| Asset | Path | Use |
|---|---|---|
| Mark (icon-only) | `public/assets/pearnotes-mark.svg` | rail brand, landing header, favicon source, in-app logo references |
| Horizontal lockup | `public/assets/pearnotes-lockup.svg` | headers, docs, OG compositions |
| Stacked lockup | `public/assets/pearnotes-lockup-stacked.svg` | square/compact placements |
| Favicon PNG | `public/favicon.png` (64), `public/icons/favicon-32.png`, `public/icons/favicon-16.png`, `public/favicon.ico` | tabs/bookmarks |
| Apple touch | `public/apple-touch-icon.png`, `public/icons/apple-touch-icon.png` (180, ink tile) | iOS home screen |
| PWA | `public/icons/icon-192/512/1024.png` (transparent), `icon-512-maskable.png` (ink tile, 60% mark) | manifest |
| Social card | `public/assets/og-image.png` (1200×630) | OG/Twitter (absolute URL pending verified canonical domain) |
| Accent alternates | `brand-proposals-e3/svg/c4a-sticker-p-{pink,violet}*.svg` | reserved — not shipped |

## Palette

`--ink #0B0B0D` (sticker body + tiles) · `--paper-cream #E8DDC0` (die-cut border) · `--lime #C6E14A` (fold accent; product token `#C6F750` kept for UI). Wordmark: **Bricolage Grotesque 800** (SIL OFL), outlined to vector paths in the lockup SVGs so no font file is needed.

## Rules

- The cream die-cut border is the contrast mechanism — the mark works on light **and** dark without a recolor. Do not drop the border on dark surfaces.
- Clearspace: ≥ ¼ of mark height. Minimum sizes: 16 px favicon, 24 px in-app.
- Do not recolor the fold except via the shipped accent alternates; do not rotate/skew beyond the built-in tilt.
- Keep `public/assets/ourspace-mark.png` in the tree (unreferenced) for MIT attribution history; the OurSpaces LICENSE and Thomas Nguyen copyright stay intact.
- AI-generated mark: trademark registrability is not guaranteed — human refinement + clearance search recommended before legal registration (recorded in `brand-proposals-e3/PROPOSAL.md`).
