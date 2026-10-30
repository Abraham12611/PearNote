/**
 * PearNotes private PDF extraction (issue #32) — contract types.
 *
 * Server-side, in-memory, deterministic. Bytes arrive from Convex storage
 * (Engineer 4's Node action); this module never sees URLs, users, or models.
 */

export type PdfExtractionOptions = {
  /** Hard byte limit — inputs over it fail before parsing. */
  maxBytes: number;
  /** Physical page cap (MVP: 50). Excess pages are skipped, not truncated mid-page. */
  maxPages: number;
  /** Segment cap (Convex batch limit is 200). */
  maxSegments: number;
  /** Total extracted-text cap; overflow flips `truncated` + `text_limit` warning. */
  maxTextChars: number;
};

export type PdfSegment = {
  /** Strictly increasing across the file (1-based). */
  segmentNo: number;
  /** 1-based physical PDF page — never the printed page number. */
  page: number;
  /** Verbatim source text, whitespace-normalized. */
  text: string;
  /** Emitted only for defensible structural reads; absent when uncertain. */
  kind?: "paragraph" | "heading" | "caption" | "formula";
  /** Offsets into this page's own normalized text (0-based, end-exclusive). */
  quoteStart?: number;
  quoteEnd?: number;
};

export type PdfWarningCode =
  | "no_extractable_text" // scanned/image-only or empty pages — no fake OCR
  | "page_limit" // document longer than maxPages; trailing pages skipped
  | "segment_limit" // more paragraphs than maxSegments
  | "text_limit" // more text than maxTextChars
  | "uncertain_order" // text order could not be recovered confidently
  | "empty_page" // page has no selectable text (image/vector-only)
  | "layout_complex"; // tables/multi-column heuristics triggered

export type PdfWarning = { page?: number; code: PdfWarningCode; message: string };

export type PdfExtraction = {
  pageCount: number;
  segments: PdfSegment[];
  warnings: PdfWarning[];
  truncated: boolean;
};

/** Typed hard failure — thrown only when no usable document was produced. */
export type PdfErrorCode =
  | "empty_input"
  | "oversized" // exceeds maxBytes
  | "invalid_pdf" // bad signature or unparseable
  | "encrypted" // password/encrypt dictionary present
  | "malformed_options";

export class PdfExtractionError extends Error {
  readonly code: PdfErrorCode;
  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = "PdfExtractionError";
    this.code = code;
  }
}
