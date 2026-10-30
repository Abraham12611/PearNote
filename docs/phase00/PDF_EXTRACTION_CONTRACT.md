# PDF extraction contract (issue #32 — first checkpoint)

**Owner:** Engineer 1 · **Module:** `src/pearnotes/pdf-extraction/` ·
**Tests:** `tests/pdf-extraction/` · **Dependency:** `pdfjs-dist@4.10.38`
(Mozilla PDF.js, legacy Node build) · **Date:** 2026-10-29

## Dependency decision

`pdfjs-dist` legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) — the same
library Firefox ships, DOM-free for the `getTextContent` path, no canvas,
no worker in Node, `isEvalSupported:false`. Verified on Node 24: parses,
iterates pages, extracts positioned text items. Rejected `pdf-parse`
(unmaintained wrapper) and `unpdf` (extra indirection over the same engine).
**Lockfile delta: this dep only** — flagging ownership of
`package.json`/`package-lock.json` for this change per issue.

## API

```ts
export async function extractPdfSegments(
  bytes: Uint8Array,
  options: PdfExtractionOptions,
): Promise<PdfExtraction>;
```

`{pageCount, segments, warnings, truncated}` — matches the issue contract.
`segments[].quoteStart/quoteEnd` are true 0-based offsets into that page's
joined normalized text — emitted always (deterministically measured, not
invented). Deviations from the issue sketch, justified:

- **Hard failures throw `PdfExtractionError{code}`** —
  `empty_input | oversized | invalid_pdf | encrypted | malformed_options`.
  Recoverable anomalies stay in `warnings[]` (`no_extractable_text`,
  `empty_page`, `page_limit`, `segment_limit`, `text_limit`,
  `uncertain_order`, `layout_complex`). Rationale: a thrown typed error is
  the safe signal for "no usable document" vs. ambiguous empty results.
- **`kind` emitted only for defensible reads** — short ALL-CAPS lines get
  `"heading"`; nothing else is labeled. Uncertainty stays unmarked.
- **The input buffer is copied** — pdf.js detaches its `data`; the caller's
  bytes are never consumed (bug found via determinism test).

## Page/segment handling

pdf.js positioned items → visual lines (baseline-y grouping, x-order) →
top→bottom reading order → paragraphs split on vertical gaps (>12pt).
Pages never merged; `page` = 1-based physical page. `segmentNo` strictly
increasing across the file. Text whitespace-normalized, verbatim otherwise.

## Safety

Byte/page/segment/text caps enforced with `truncated` + warnings. `%PDF-`
signature checked pre-parse. `/Encrypt` dictionary → `encrypted` error
before parsing. Scanned/image-only pages → `no_extractable_text`/`empty_page`
warnings, never fake OCR. No network, no OCR endpoints, no model calls —
inert text only.

## Integration constraints (for Engineer 4)

- Run inside a Convex **Node-runtime action** (`"use node"`), not the
  standard runtime — pdfjs-dist ships native-ish deps and ESM paths that
  need Node. `import { extractPdfSegments } from
  "src/pearnotes/pdf-extraction"` (or relative path) is all that's needed;
  the API is pure async, no env vars, no globals.
- Storage bytes → `new Uint8Array(...)` → call → pass `segments` straight
  to `learningImport.recordSegments` (shape already matches
  `{segmentNo,page,text,kind}`; `quoteStart/quoteEnd` are extras that map
  onto the schema's optional fields).
- Map `PdfExtractionError.code` to import status (`invalid_pdf`/`encrypted`
  → `IMPORT_FAILED` with warning, `oversized` → policy rejection).

## Owner fixture (private — not committed)

The 10-page Cambridge Biology excerpt stays private per issue. Expected:
`pageCount=10`, cell-difference segments cited `page:1..2`, diffusion
`page:9..10`; active-transport coverage NOT asserted. My committed tests
use only synthetic programmatic PDFs (`tests/pdf-extraction/makePdf.ts`).

## Verified this session

`npx vitest run tests/pdf-extraction` → **13/13 pass** (multi-page order,
headings, determinism, invalid/empty/oversized/encrypted/corrupted,
scanned, 60-page cap, segment+text caps, whitespace/injection inertness).
`tsc -b` clean; `npm run build` clean.
