/**
 * Page text-items → lines → paragraph segmentation.
 *
 * pdf.js gives positioned text items (str + transform [a,b,c,d,e,f]).
 * We group items into visual lines by baseline y, order lines top→bottom,
 * join lines into the page's normalized text, then split paragraphs on
 * vertical gaps. Offsets are measured against the joined page text so
 * quoteStart/quoteEnd are always true deterministic positions.
 */
export interface PdfTextItem {
  str: string;
  /** pdf.js transform: [scaleX, skewY, skewX, scaleY, x, y]. */
  transform: number[];
}

export interface PageParagraph {
  text: string;
  quoteStart: number;
  quoteEnd: number;
  kind?: "paragraph" | "heading";
}

interface Line {
  y: number;
  items: { x: number; str: string }[];
}

const Y_TOL = 2.5; // baseline jitter treated as same line
const PARA_GAP = 12; // vertical gap (pt) that starts a new paragraph
const MAX_LINE_CHARS = 4000;

function lineText(l: Line): string {
  return l.items
    .sort((a, b) => a.x - b.x)
    .map((i) => i.str)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Normalize raw items into ordered visual lines. Returns the lines and a
 * flag when reading order could not be recovered (missing transforms).
 */
export function itemsToLines(items: PdfTextItem[]): { lines: Line[]; uncertainOrder: boolean } {
  const lines: Line[] = [];
  let uncertainOrder = false;
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const t = it.transform;
    if (!Array.isArray(t) || t.length < 6 || !Number.isFinite(t[4]) || !Number.isFinite(t[5])) {
      uncertainOrder = true;
      continue;
    }
    const x = t[4];
    const y = t[5];
    const existing = lines.find((l) => Math.abs(l.y - y) <= Y_TOL);
    if (existing) existing.items.push({ x, str: it.str });
    else lines.push({ y, items: [{ x, str: it.str }] });
  }
  // Higher y = higher on the page (PDF origin is bottom-left).
  lines.sort((a, b) => b.y - a.y);
  return { lines: lines.filter((l) => lineText(l).length > 0), uncertainOrder };
}

/** A short all-caps line reads as a heading; everything else stays unmarked. */
function kindOf(text: string): "heading" | undefined {
  const letters = text.replace(/[^A-Za-z]/g, "");
  return letters.length >= 3 && letters.length <= 80 && letters === letters.toUpperCase()
    ? "heading"
    : undefined;
}

/**
 * Join lines into page text, then split paragraphs on vertical gaps.
 * Each paragraph's offsets are true positions in that page's joined text.
 */
export function paragraphsOfPage(items: PdfTextItem[]): {
  pageText: string;
  paragraphs: PageParagraph[];
  uncertainOrder: boolean;
} {
  const { lines, uncertainOrder } = itemsToLines(items);
  const paragraphs: PageParagraph[] = [];
  let pageText = "";
  let cur: { start: number; parts: string[]; lastY: number | null } = { start: 0, parts: [], lastY: null };

  const flush = () => {
    // Paragraph text must be an exact slice of the page text it cites —
    // lines are joined with the same "\n" used to build pageText so
    // `pageText.slice(quoteStart, quoteEnd) === text` always holds,
    // including for multi-line paragraphs.
    const text = cur.parts.join("\n").replace(/[ \t]+/g, " ").trim();
    if (!text) {
      cur = { start: pageText.length, parts: [], lastY: null };
      return;
    }
    const quoteStart = cur.start;
    const quoteEnd = quoteStart + text.length;
    paragraphs.push({ text, quoteStart, quoteEnd, kind: kindOf(text) });
    cur = { start: pageText.length, parts: [], lastY: null };
  };

  for (const line of lines) {
    const lt = lineText(line).slice(0, MAX_LINE_CHARS);
    const gap = cur.lastY === null ? 0 : cur.lastY - line.y;
    if (cur.lastY !== null && gap > PARA_GAP) flush();
    if (cur.parts.length === 0) cur.start = pageText.length;
    cur.parts.push(lt);
    pageText += lt + "\n";
    cur.lastY = line.y;
  }
  flush();
  return { pageText, paragraphs, uncertainOrder };
}
