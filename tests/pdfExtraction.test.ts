/**
 * Issue #36 — PDF extraction tests via Engineer 1's parser (synthetic PDFs
 * only; no paid model calls, no private documents). Verifies page-numbered
 * segments, honest failures and caps used by convex/pdfExtractionNode.ts.
 */
import { describe, expect, test } from "vitest";
import { extractPdfSegments, PdfExtractionError } from "../src/pearnotes/pdf-extraction/index";

const LIMITS = { maxBytes: 20 * 1024 * 1024, maxPages: 50, maxSegments: 200, maxTextChars: 120_000 };

/** Minimal valid multi-page PDF with real xref offsets. */
function makePdf(pages: string[][], encrypted = false): Uint8Array {
  const bodies: string[] = [
    "<</Type/Catalog/Pages 2 0 R>>",
    `<</Type/Pages/Kids[${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}]/Count ${pages.length}>>`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  pages.forEach((lines, i) => {
    const pid = 4 + i * 2;
    const content = lines.length
      ? `BT /F1 12 Tf 72 720 Td ${lines.map((l) => `(${l}) Tj 0 -20 Td`).join(" ")} ET`
      : "";
    bodies[pid - 1] = `<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 3 0 R>>>>/Contents ${pid + 1} 0 R>>`;
    bodies[pid] = `<</Length ${content.length}>>\nstream\n${content}\nendstream`;
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  bodies.forEach((body, i) => {
    offsets[i] = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${bodies.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<</Size ${bodies.length + 1}/Root 1 0 R${encrypted ? "/Encrypt 9 9 R" : ""}>>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

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
