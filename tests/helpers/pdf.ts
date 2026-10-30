/** Shared synthetic-PDF builder for extraction/orchestration tests. */
export function makePdf(pages: string[][], encrypted = false): Uint8Array {
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
