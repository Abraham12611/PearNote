/**
 * Minimal deterministic PDF builder for tests — produces valid single/duplex
 * text PDFs with Helvetica lines. NOT a general library: just enough PDF
 * syntax for pdf.js to parse pages + text runs.
 */

function esc(s: string): string {
  return s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7E]/g, "?");
}

/** pages: array of pages; each page is an array of text lines (top→bottom). */
export function makePdf(pages: string[][], opts?: { encrypted?: boolean }): Uint8Array {
  const objs: string[] = [];
  const pageIds: number[] = [];
  // obj 1: catalog, 2: pages, 3: font, then per page: content + page objects
  let id = 4;
  const pageObjs = pages.map((lines) => {
    const content = [
      "BT /F1 12 Tf",
      ...lines.map((l, i) => `50 ${750 - i * 18} Td (${esc(l)}) Tj ET BT /F1 12 Tf`),
      "ET",
    ].join("\n");
    const contentId = id++;
    const pageId = id++;
    pageIds.push(pageId);
    objs[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    return pageId;
  });
  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objs[2] = `<< /Type /Pages /Kids [${pageObjs.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageObjs.length} >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefAt = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = opts?.encrypted
    ? `<< /Size ${objs.length} /Root 1 0 R /Encrypt 5 0 R >>`
    : `<< /Size ${objs.length} /Root 1 0 R >>`;
  out += `trailer\n${trailer}\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
