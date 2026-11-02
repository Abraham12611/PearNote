# E3 · Flora generation proposal — costed, approval-gated

**⚠ Not executed.** Per owner budget constraint, no billable Flora runs begin without fresh explicit approval of a batch + budget below. Prior spend: $3.82 (E3 branding, `brand-proposals-e3/PROPOSAL.md`).

**Models (verified on `flora_list_models`):** `t2i-recraft-v4-1-pro-vector-t2i` Recraft V4.1 Pro Vector — **$0.36/run**, true SVG for stickers/icons/discs · `t2i-gpt-image-2-5-sunburst` GPT Image 2.5 Sunburst — **$0.055/run**, raster collage/avatar renders · `t2i-gemini-3-pro` Nano Banana Pro — $0.18/run (optional higher-fidelity raster). Workspace `ws_qd7b0svaf2xr5w45pg702365nx84f3qm`; provenance recorded per run (prompt, model, run_id, asset_id, cost).

## Batch H — Hero & entry surfaces (E1)

| Item | Model | Runs | Cost |
|---|---|---|---|
| Hero collage master + mobile crop (2 candidates ×2) | GPT 2.5 Sunburst | 4 | $0.22 |
| Modal scene panel (2 candidates) | GPT 2.5 Sunburst | 2 | $0.11 |
| 4 section spot illustrations | Recraft V4.1 Pro Vector | 4 | $1.44 |
| Sign-in email header (reuse hero layer) | — | 0 | $0 |
| **Batch total** | | **10** | **$1.77** |

**Spending cap: $2.00** (total + 1 spot-illustration retry + Sunburst retry). Any run beyond the cap requires re-approval.

## Batch S — Subject discs, path stickers, trophies, dock glyphs (E2)

| Item | Model | Runs | Cost |
|---|---|---|---|
| Subject discs ×4 (bio/algebra/chem/custom) | Recraft V4.1 Pro Vector | 4 | $1.44 |
| Path-node sticker family (3 subjects + lesson/quiz/practice generic) | Recraft V4.1 Pro Vector | 6 | $2.16 |
| Trophy set ×6 (grid generation, split locally; singles if grids under-deliver) | Recraft V4.1 Pro Vector | 2 | $0.72 |
| Dock icon family ×7 (sheet or singles) | Recraft V4.1 Pro Vector | 2 | $0.72 |
| **Batch total** | | **14** | **$5.04** |

**Spending cap: $5.50** (total + ~1 retry). Any run beyond the cap requires re-approval.

## Batch A — OPTIONAL avatar expansion (+2 personas) — deferred

| Item | Model | Runs | Cost |
|---|---|---|---|
| 2 personas + 1 retry each | GPT 2.5 Sunburst | 4 | $0.22 |

**Spending cap: $0.25.** Default remains the existing eight OurSpaces-style avatars at zero cost; batch A runs only if the owner separately approves additional profiles.

## Totals

| Scope | Amount |
|---|---|
| Base combined (H + S + A) | **$7.03** |
| +15% contingency | **≈ $8.08** |
| **Global authorized ceiling (all batches)** | **$9.00 hard cap — never exceed without new approval** |

Phased option: approve **H first ($1.77 est., $2.00 cap)**, owner reviews against the About reference, then release S.

## Method per batch (per `ASSET_AND_FLORA_BRIEF.md` §7)

1. Side-by-side board: original OurSpaces frame + target slot (no user data sent).
2. Generate only the missing *asset* — native DOM/components stay.
3. 2–4 candidates, one style grammar; owner picks; refine only the pick.
4. Rights audit (trademark/likeness/text artifacts/educational accuracy), then optimize → `public/pearnotes/*` or `public/assets/`, provenance into `PROPOSAL.md`.
5. Verify at 390/768/1440, light+dark, reduced-motion, no-image fallback; owner side-by-side acceptance before release.

## Prompt templates (verbatim from brief §7 — locked)

- **Hero collage:** the §7 "Original PearNotes educational spatial scrapbook illustration…" template — copy-free layers, no UI text, no logos, no photoreal people.
- **Avatar family:** §7 clay-cast portrait template — one coherent family, circular framing, 48px legible, no text/likeness.
- **Subject discs:** §7 motif template — cell nucleus / graph line / bonded spheres, saturated field, cream die-cut edge, lime accent, readable 40px.

## Handoff requirements (for coordinator relay)

- **E1** needs: hero/modal/spot/email-header slots + layout contract (layers + DOM text over art, LCP-friendly first image, lazy collage).
- **E2** needs: disc/sticker/trophy/dock-glyph slots + frame classes (`paper-card`, sticker border, lime ring) — artwork must fit native frames, status drawn in code.
- Both: component reuse ledger per PR; screenshot pairs at 1440×900 & 390×844; no fabricated counts/citations/friends in art.
