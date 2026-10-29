/**
 * Typed Meta proposal validation (INGESTION stage 3-4 + grounding contract).
 * The model's raw JSON is untrusted data: it must parse, match this shape,
 * and cite only segment ids that exist and belong to THIS source. Citations
 * pointing at other documents, invented ids, or empty claim sets are
 * rejected or downgraded to `needs_review` — never trusted.
 */
import { v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const modelSourceRef = v.object({
  /** The model cites segments by the stable *string* ids we handed it. */
  segmentId: v.string(),
  page: v.optional(v.number()),
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

/** Parse the model's text into the typed proposal, or null when it isn't the shape. */
export function parseProposal(text: string): MetaProposal | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // Tolerate a single fenced/embedded JSON object — common model habit.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { raw = JSON.parse(m[0]); } catch { return null; }
  }
  if (!isProposalShape(raw)) return null;
  return raw;
}

function isProposalShape(x: unknown): x is MetaProposal {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  if (!Array.isArray(p.suggestedSubjects) || !Array.isArray(p.concepts) || !Array.isArray(p.warnings)) return false;
  if (p.suggestedSubjects.length === 0) return false;
  const strArr = (a: unknown) => Array.isArray(a) && a.every((s) => typeof s === "string");
  const subjOk = p.suggestedSubjects.every((s) => {
    const o = s as Record<string, unknown>;
    return typeof o.name === "string" && ["high", "medium", "low"].includes(String(o.confidence)) && strArr(o.segmentIds);
  });
  const conceptOk = p.concepts.every((c) => {
    const o = c as Record<string, unknown>;
    return typeof o.label === "string" && strArr(o.sourceSegmentIds);
  });
  return subjOk && conceptOk;
}

export type CitationCheck =
  | { ok: true }
  | { ok: false; kind: "unknown_segment" | "no_citations"; detail: string };

/**
 * Grounding check: every cited segment id must be one we actually gave the
 * model (exists + belongs to the job's source). Invented ids, ids from other
 * sources, and citation-free concept lists are caught here.
 */
export function checkCitations(
  proposal: MetaProposal,
  authorizedSegmentIds: Set<string>,
): CitationCheck {
  const citeAll: string[] = [];
  for (const s of proposal.suggestedSubjects) citeAll.push(...s.segmentIds);
  for (const c of proposal.concepts) citeAll.push(...c.sourceSegmentIds);
  for (const sec of proposal.draftCurriculum?.sections ?? [])
    for (const u of sec.units)
      for (const l of u.lessons) citeAll.push(...l.sourceSegmentIds);
  const cites = new Set(citeAll);
  if (proposal.concepts.length > 0 && cites.size === 0) {
    return { ok: false, kind: "no_citations", detail: "concepts with zero citations" };
  }
  for (const id of cites) {
    if (!authorizedSegmentIds.has(id)) {
      return { ok: false, kind: "unknown_segment", detail: `cited segment not in source: ${id}` };
    }
  }
  return { ok: true };
}

/** Remap model-visible string refs to typed ids — only after checkCitations passes. */
export function resolveSegmentIds(ids: string[]): Id<"sourceSegments">[] {
  return ids as Id<"sourceSegments">[];
}
