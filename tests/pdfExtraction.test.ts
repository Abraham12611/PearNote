/**
 * Issue #36 — PDF extraction tests via Engineer 1's parser (synthetic PDFs
 * only; no paid model calls, no private documents). Verifies page-numbered
 * segments, honest failures and caps used by convex/pdfExtractionNode.ts.
 */
import { describe, expect, test } from "vitest";
import { extractPdfSegments, PdfExtractionError } from "../src/pearnotes/pdf-extraction/index";
import { makePdf } from "./helpers/pdf";

const LIMITS = { maxBytes: 20 * 1024 * 1024, maxPages: 50, maxSegments: 200, maxTextChars: 120_000 };



describe("extractPdfSegments — synthetic documents", () => {
  test("two-page PDF → page-numbered sequential segments", async () => {
    const pdf = makePdf([
      ["The cell membrane surrounds every living cell.", "It controls what enters and leaves."],
      ["Diffusion moves particles down a concentration gradient."],
    ]);
    const res = await extractPdfSegments(pdf, LIMITS);
    expect(res.pageCount).toBe(2);
    expect(res.segments.length).toBeGreaterThanOrEqual(3);
    expect(res.segments[0].segmentNo).toBe(1);
    expect(res.segments.every((s) => s.page >= 1 && s.page <= 2)).toBe(true);
    expect(res.segments.some((s) => s.page === 2 && s.text.includes("Diffusion"))).toBe(true);
    // Deterministic: same bytes → same output
    const again = await extractPdfSegments(pdf, LIMITS);
    expect(again.segments).toEqual(res.segments);
  });

  test("scanned/empty page → warning, not fake OCR text", async () => {
    const res = await extractPdfSegments(makePdf([["Real text here."], []]), LIMITS);
    expect(res.segments.some((s) => s.text.includes("Real text"))).toBe(true);
    expect(res.warnings.some((w) => w.code === "empty_page" && w.page === 2)).toBe(true);
  });

  test("image-only PDF → zero segments + no_extractable_text", async () => {
    const res = await extractPdfSegments(makePdf([[]]), LIMITS);
    expect(res.segments).toHaveLength(0);
    expect(res.warnings.some((w) => w.code === "no_extractable_text")).toBe(true);
  });

  test("invalid bytes → invalid_pdf; missing signature rejected", async () => {
    await expect(extractPdfSegments(new TextEncoder().encode("not a pdf"), LIMITS))
      .rejects.toMatchObject({ code: "invalid_pdf" });
    await expect(extractPdfSegments(new Uint8Array(0), LIMITS))
      .rejects.toMatchObject({ code: "empty_input" });
  });

  test("encrypted marker → encrypted error", async () => {
    await expect(extractPdfSegments(makePdf([["x"]], true), LIMITS))
      .rejects.toMatchObject({ code: "encrypted" });
  });

  test("caps: oversized bytes rejected; maxPages truncation warns", async () => {
    const pdf = makePdf([["a real paragraph of sufficient length for testing."]]);
    await expect(extractPdfSegments(pdf, { ...LIMITS, maxBytes: 10 }))
      .rejects.toMatchObject({ code: "oversized" });
    const multi = makePdf(Array.from({ length: 5 }, (_, i) => [`Page ${i + 1} content line here.`]));
    const res = await extractPdfSegments(multi, { ...LIMITS, maxPages: 2 });
    expect(res.warnings.some((w) => w.code === "page_limit")).toBe(true);
    expect(Math.max(...res.segments.map((s) => s.page))).toBe(2);
  });
});
