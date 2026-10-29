/**
 * Typed Meta proposal validation (INGESTION stage 3-4 + grounding contract).
 * Model output is untrusted data through three independent gates:
 *   1. `parseProposal`    — full deep-shape validation, bounds included.
 *   2. `checkCitations`   — every cited segmentId exists in THIS source.
 *   3. `checkEvidence`    — every evidence quote appears verbatim inside a
 *                           cited segment's text (misleading-but-valid ids
 *                           are caught here, not by id membership).
 * Any failure forces `needs_review` — never a silent accept.
 */
import { v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";

const NAME_MAX = 120;
const LABEL_MAX = 120;
const TEXT_MAX = 2000;
const QUOTE_MIN = 20;
const QUOTE_MAX = 500;
const MAX_ITEMS = 40;

/** A verbatim excerpt lifted from a cited segment — the support check's unit. */
const evidenceQuote = v.object({
  segmentId: v.string(),
  quote: v.string(),
});

export const metaProposalValidator = v.object({
  suggestedSubjects: v.array(
    v.object({
      name: v.string(),
      confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      segmentIds: v.array(v.string()),
      explanation: v.optional(v.string()),
    }),
  ),
  concepts: v.array(
    v.object({
      label: v.string(),
      summary: v.optional(v.string()),
      sourceSegmentIds: v.array(v.string()),
      evidence: v.array(evidenceQuote),
    }),
  ),
  draftCurriculum: v.optional(
    v.object({
      sections: v.array(
        v.object({
          title: v.string(),
          units: v.array(
            v.object({
              title: v.string(),
              lessons: v.array(
                v.object({
                  title: v.string(),
                  objectives: v.array(v.string()),
                  sourceSegmentIds: v.array(v.string()),
                  evidence: v.array(evidenceQuote),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
  warnings: v.array(v.string()),
});
export type MetaProposal = Infer<typeof metaProposalValidator>;
type LessonDraft = NonNullable<MetaProposal["draftCurriculum"]>["sections"][number]["units"][number]["lessons"][number];

export function parseProposal(text: string): MetaProposal | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { raw = JSON.parse(m[0]); } catch { return null; }
  }
  return isProposalShape(raw) ? raw : null;
}

/** Deep structural check: every field, every nesting level, all bounds. */
function isProposalShape(x: unknown): x is MetaProposal {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  const str = (s: unknown, max: number) => typeof s === "string" && s.length > 0 && s.length <= max;
  const optStr = (s: unknown) => s === undefined || (typeof s === "string" && s.length <= TEXT_MAX);
  const idArr = (a: unknown, min: number) =>
    Array.isArray(a) && a.length >= min && a.length <= MAX_ITEMS && a.every((s) => str(s, 200));
  const evArr = (a: unknown) =>
    Array.isArray(a) &&
    a.every((e) => {
      const q = e as Record<string, unknown>;
      return typeof e === "object" && e !== null && typeof q === "object" && q !== null && str(q.segmentId, 200) &&
        typeof q.quote === "string" && q.quote.length >= QUOTE_MIN && q.quote.length <= QUOTE_MAX;
    });
  const confOk = (c: unknown) => c === "high" || c === "medium" || c === "low";

  if (!Array.isArray(p.suggestedSubjects) || p.suggestedSubjects.length < 1 ||
    p.suggestedSubjects.length > MAX_ITEMS || !Array.isArray(p.concepts)) return false;
  if (!Array.isArray(p.warnings) || !p.warnings.every((w) => str(w, 300))) return false;

  const subsOk = p.suggestedSubjects.every((s) => {
    const o = s as Record<string, unknown>;
    return typeof o === "object" && o !== null && str(o.name, NAME_MAX) && confOk(o.confidence) &&
      idArr(o.segmentIds, 1) && optStr(o.explanation);
  });
  const conceptsOk = (p.concepts as unknown[]).every((c) => {
    const o = c as Record<string, unknown>;
    return typeof o === "object" && o !== null && str(o.label, LABEL_MAX) && optStr(o.summary) &&
      idArr(o.sourceSegmentIds, 1) && evArr(o.evidence) && (o.evidence as unknown[]).length > 0 &&
      (o.evidence as { segmentId: string }[]).every((e) => (o.sourceSegmentIds as string[]).includes(e.segmentId));
  });
  if (!subsOk || !conceptsOk) return false;

  if (p.draftCurriculum !== undefined) {
    const dc = p.draftCurriculum as Record<string, unknown>;
    if (typeof dc !== "object" || dc === null || !Array.isArray(dc.sections)) return false;
    if ((dc.sections as unknown[]).length > MAX_ITEMS) return false;
    return (dc.sections as unknown[]).every((sec) => {
      const s = sec as Record<string, unknown>;
      if (typeof s !== "object" || s === null) return false;
      if (!str(s.title, NAME_MAX) || !Array.isArray(s.units)) return false;
      if ((s.units as unknown[]).length > MAX_ITEMS) return false;
      return (s.units as unknown[]).every((u) => {
        const un = u as Record<string, unknown>;
        if (typeof un !== "object" || un === null) return false;
        if (!str(un.title, NAME_MAX) || !Array.isArray(un.lessons) || un.lessons.length === 0 || un.lessons.length > MAX_ITEMS) return false;
        return (un.lessons as LessonDraft[]).every((l) =>
          typeof l === "object" && l !== null &&
          str(l.title, NAME_MAX) &&
          Array.isArray(l.objectives) && l.objectives.length > 0 && l.objectives.every((ob) => str(ob, 300)) &&
          idArr(l.sourceSegmentIds, 1) && evArr(l.evidence) && l.evidence.length > 0 &&
          l.evidence.every((e) => l.sourceSegmentIds.includes(e.segmentId)),
        );
      });
    });
  }
  return true;
}

export type CitationCheck =
  | { ok: true }
  | { ok: false; kind: "unknown_segment" | "no_citations"; detail: string };

function allCitedIds(p: MetaProposal): Set<string> {
  const cites = new Set<string>();
  for (const s of p.suggestedSubjects) s.segmentIds.forEach((i) => cites.add(i));
  for (const c of p.concepts) c.sourceSegmentIds.forEach((i) => cites.add(i));
  for (const sec of p.draftCurriculum?.sections ?? [])
    for (const u of sec.units)
      for (const l of u.lessons) l.sourceSegmentIds.forEach((i) => cites.add(i));
  return cites;
}

/** Gate 2: every cited segment id must be one the source actually contains. */
export function checkCitations(p: MetaProposal, authorizedSegmentIds: Set<string>): CitationCheck {
  const cites = allCitedIds(p);
  if (cites.size === 0) return { ok: false, kind: "no_citations", detail: "zero citations" };
  for (const id of cites)
    if (!authorizedSegmentIds.has(id))
      return { ok: false, kind: "unknown_segment", detail: `cited segment not in source: ${id}` };
  return { ok: true };
}

export type EvidenceCheck =
  | { ok: true }
  | { ok: false; kind: "quote_not_in_segment" | "quote_segment_mismatch"; detail: string };

/**
 * Gate 3 — semantic support: each evidence quote must appear verbatim in the
 * text of the segment it cites. A proposal citing real ids but inventing the
 * claim (valid-id hallucination, e.g. osmosis content absent from the excerpt)
 * fails here. `segments` maps segmentId → extracted text.
 */
export function checkEvidence(p: MetaProposal, segments: Map<string, string>): EvidenceCheck {
  const units: { label: string; evidence: { segmentId: string; quote: string }[] }[] = [
    ...p.concepts.map((c) => ({ label: c.label, evidence: c.evidence })),
    ...(p.draftCurriculum?.sections ?? []).flatMap((s) =>
      s.units.flatMap((u) => u.lessons.map((l) => ({ label: l.title, evidence: l.evidence })))),
  ];
  const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
  for (const u of units) {
    for (const ev of u.evidence) {
      const text = segments.get(ev.segmentId);
      if (text === undefined)
        return { ok: false, kind: "quote_segment_mismatch", detail: `${u.label}: quote cites unknown segment ${ev.segmentId}` };
      if (!norm(text).includes(norm(ev.quote)))
        return { ok: false, kind: "quote_not_in_segment", detail: `${u.label}: quote not found in segment ${ev.segmentId}` };
    }
  }
  return { ok: true };
}

/** Remap model-visible string refs to typed ids — only after all gates pass. */
export function resolveSegmentIds(ids: string[]): Id<"sourceSegments">[] {
  return ids as Id<"sourceSegments">[];
}
