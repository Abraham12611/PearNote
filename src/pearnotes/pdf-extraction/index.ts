/**
 * Private server-side PDF extraction (issue #32).
 *
 * Parses native selectable text from in-memory PDF bytes into deterministic,
 * page-numbered, source-grounded segments. No OCR, no network, no canvas,
 * no wall clock. Hard input failures throw `PdfExtractionError`; everything
 * recoverable surfaces as typed warnings.
 *
 * Engine: Mozilla pdf.js (`pdfjs-dist`, legacy Node build). Node ≥20:
 * extraction uses the DOM-free textContent API only — no rendering.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { paragraphsOfPage, type PdfTextItem } from "./segment";
import {
  PdfExtractionError,
  type PdfExtraction,
  type PdfExtractionOptions,
  type PdfSegment,
  type PdfWarning,
} from "./types";

export * from "./types";
export { paragraphsOfPage, itemsToLines } from "./segment";

const PDF_SIGNATURE = "%PDF-";

function assertInput(bytes: Uint8Array, options: PdfExtractionOptions) {
  if (!bytes || bytes.byteLength === 0) throw new PdfExtractionError("empty_input", "no PDF bytes supplied");
  if (options.maxBytes <= 0 || options.maxPages <= 0 || options.maxSegments <= 0 || options.maxTextChars <= 0) {
    throw new PdfExtractionError("malformed_options", "limits must be positive");
  }
  if (bytes.byteLength > options.maxBytes) {
    throw new PdfExtractionError("oversized", `${bytes.byteLength}B exceeds limit ${options.maxBytes}B`);
  }
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.startsWith(PDF_SIGNATURE)) {
    throw new PdfExtractionError("invalid_pdf", "missing %PDF- signature");
  }
}

function isPasswordError(err: unknown): boolean {
  return (
    (typeof err === "object" && err !== null && (err as { name?: string }).name === "PasswordException") ||
    /password/i.test(String(err))
  );
}

function isEncryptDict(bytes: Uint8Array): boolean {
  const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.byteLength - 8192)));
  return /\/Encrypt\b/.test(tail);
}

/**
 * Extract page-numbered text segments from private PDF bytes.
 * Deterministic: identical bytes + options → identical output.
 */
export async function extractPdfSegments(
  bytes: Uint8Array,
  options: PdfExtractionOptions,
): Promise<PdfExtraction> {
  assertInput(bytes, options);
  if (isEncryptDict(bytes)) {
    throw new PdfExtractionError("encrypted", "encrypted/password-protected PDF is unsupported");
  }

  // pdf.js transfers (detaches) its data buffer — hand it a private copy so
  // the caller's bytes are never consumed.
  const safeBytes = bytes.slice();
  let doc;
  try {
    doc = await getDocument({
      data: safeBytes,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
      password: "",
    }).promise;
  } catch (err) {
    if (isPasswordError(err)) {
      throw new PdfExtractionError("encrypted", "password-protected PDF is unsupported");
    }
    throw new PdfExtractionError("invalid_pdf", `unparseable document: ${(err as Error).message?.slice(0, 120)}`);
  }

  const warnings: PdfWarning[] = [];
  const segments: PdfSegment[] = [];
  const pageCount = doc.numPages;
  const pagesToRead = Math.min(pageCount, options.maxPages);
  if (pageCount > options.maxPages) {
    warnings.push({
      code: "page_limit",
      message: `document has ${pageCount} pages; only the first ${options.maxPages} were read`,
    });
  }

  let truncated = false;
  let textChars = 0;
  let segmentNo = 0;
  let emptyPages = 0;
  let anyText = false;

  try {
    for (let page = 1; page <= pagesToRead && !truncated; page++) {
      const pg = await doc.getPage(page);
      const content = await pg.getTextContent({ includeMarkedContent: false });
      const items = (content.items as unknown[]).filter(
        (i): i is PdfTextItem => typeof (i as PdfTextItem).str === "string" && (i as PdfTextItem).str.trim().length > 0,
      );
      pg.cleanup();

      if (items.length === 0) {
        emptyPages++;
        warnings.push({ page, code: "empty_page", message: `page ${page} has no selectable text (scanned/image content — no OCR performed)` });
        continue;
      }
      anyText = true;

      const { paragraphs, uncertainOrder } = paragraphsOfPage(items);
      if (uncertainOrder) {
        warnings.push({ page, code: "uncertain_order", message: `text order on page ${page} could not be recovered confidently` });
      }

      for (const p of paragraphs) {
        if (textChars + p.text.length > options.maxTextChars) {
          warnings.push({ code: "text_limit", message: `extracted text exceeds ${options.maxTextChars} chars; later content dropped` });
          truncated = true;
          break;
        }
        segmentNo++;
        if (segmentNo > options.maxSegments) {
          warnings.push({ code: "segment_limit", message: `more than ${options.maxSegments} paragraphs; remainder dropped` });
          truncated = true;
          break;
        }
        textChars += p.text.length;
        const seg: PdfSegment = { segmentNo, page, text: p.text };
        if (p.kind === "heading") seg.kind = "heading";
        seg.quoteStart = p.quoteStart;
        seg.quoteEnd = p.quoteEnd;
        segments.push(seg);
      }
    }
  } finally {
    // Release the document even when a page parse throws — pdf.js holds
    // worker memory per open document.
    await doc.destroy();
  }

  if (!anyText) {
    warnings.unshift({
      code: "no_extractable_text",
      message: "no selectable text found — document is likely scanned/image-only; OCR is not performed",
    });
  }
  if (emptyPages > 0 && anyText) {
    warnings.push({ code: "layout_complex", message: `${emptyPages} page(s) contained no extractable text` });
  }

  return { pageCount, segments, warnings, truncated };
}
