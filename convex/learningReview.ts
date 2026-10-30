/**
 * Learner review / approval API (Issue #33, contract v2 —
 * docs/phase00/META_POC_CONTRACT.md §9). The ONLY path from a validated
 * Meta proposal to real subjects + DRAFT curriculum. One Convex mutation =
 * one atomic transaction: either the entire materialization commits or
 * nothing does — no half-published paths.
 *
 * Trust model: the proposal is untrusted data the learner saw and chose.
 * Every segmentId is re-verified against THIS job's source at approval time;
 * ownership is never taken from the client; edits are whitelisted fields.
 * Per-subject grounding: concepts, subjectSources links and draft lessons
 * are filtered to segments actually assigned to each subject — nothing
 * cross-subject is ever fabricated or shared.
 */
import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import type { Doc, Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });
const NAME_MAX = 120;
const MAX_VERSION_SCAN = 50; // bounded head-version check; subjects need far fewer

const reviewEdit = v.object({
  /** New display names, keyed by suggestedSubjects array index. */
  renameSubjects: v.optional(v.array(v.object({ index: v.number(), name: v.string() }))),
  /** suggestedSubjects indices the learner discarded entirely. */
  discardSubjects: v.optional(v.array(v.number())),
  /**
   * Explicitly attach materialization to an existing OWNED subject instead
   * of creating new ones. Validated server-side; without it we always
   * create new subjects — never a silent merge/overwrite.
   */
  attachToSubjectId: v.optional(v.id("subjects")),
});

const reviewResult = v.object({
  proposalId: v.id("importProposals"),
  state: v.union(v.literal("accepted"), v.literal("rejected")),
  subjectIds: v.array(v.id("subjects")),
  curriculumVersionIds: v.array(v.id("curriculumVersions")),
});

export const review = mutation({
  args: {
    jobId: v.id("importJobs"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    /** Optimistic concurrency — required for non-terminal transitions. */
    expectedProposalRevision: v.optional(v.number()),
    edits: v.optional(reviewEdit),
  },
  returns: reviewResult,
  handler: async (ctx, { jobId, action, expectedProposalRevision, edits }) => {
    const ownerId = await requireLearnerId(ctx);

    // 1) Own every object on the path — guessed ids fail closed.
    const job = await ctx.db.get(jobId);
    if (job === null || job.ownerId !== ownerId) throw err("UNAUTHORIZED", "job not found");
    const proposal = await ctx.db
      .query("importProposals")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (proposal === null) throw err("INVALID_STATE", "no proposal for job");

    // 2) Terminal proposals: exact repeat of the same action is an idempotent
    //    no-op; the opposite action is a conflict. No revision needed here —
    //    nothing can change underneath the caller.
    const now = Date.now();
    if (proposal.state === "accepted") {
      if (action !== "approve") throw err("CONFLICT", "proposal already accepted");
      const m = proposal.materialized;
      return { proposalId: proposal._id, state: "accepted" as const, subjectIds: m?.subjectIds ?? [], curriculumVersionIds: m?.curriculumVersionIds ?? [] };
    }
    if (proposal.state === "rejected") {
      if (action !== "reject") throw err("CONFLICT", "proposal already rejected");
      return { proposalId: proposal._id, state: "rejected" as const, subjectIds: [], curriculumVersionIds: [] };
    }

    // 3) Non-terminal transition requires the revision the learner saw —
    //    a stale UI can't approve unseen content.
    if (expectedProposalRevision === undefined) {
      throw err("INVALID_INPUT", "expectedProposalRevision required");
    }
    if (expectedProposalRevision !== (proposal.revision ?? 0)) {
      throw err("CONFLICT", "proposal changed since you viewed it; reload and re-review");
    }
    if (job.state !== "needs_review") {
      throw err("INVALID_STATE", `job is ${job.state}, not needs_review`);
    }

    if (action === "reject") {
      await ctx.db.patch(proposal._id, { state: "rejected", updatedAt: now });
      await ctx.db.patch(jobId, { state: "cancelled", updatedAt: now });
      return { proposalId: proposal._id, state: "rejected" as const, subjectIds: [], curriculumVersionIds: [] };
    }

    // 4) APPROVE — validate edits against a whitelist, keeping ORIGINAL
    //    suggestedSubjects indices so discards can't shift renames.
    const subjectsIn = proposal.proposal.suggestedSubjects;
    const discarded = new Set(edits?.discardSubjects ?? []);
    for (const i of discarded) {
      if (!Number.isInteger(i) || i < 0 || i >= subjectsIn.length) throw err("INVALID_INPUT", `discardSubjects index ${i} out of range`);
    }
    const renames = new Map<number, string>();
    for (const r of edits?.renameSubjects ?? []) {
      if (!Number.isInteger(r.index) || r.index < 0 || r.index >= subjectsIn.length) throw err("INVALID_INPUT", `renameSubjects index ${r.index} out of range`);
      const name = r.name.trim();
      if (name.length === 0 || name.length > NAME_MAX) throw err("INVALID_INPUT", "subject name must be 1-120 chars");
      renames.set(r.index, name);
    }
    const kept = subjectsIn
      .map((s, idx) => ({ s, idx }))
      .filter(({ idx }) => !discarded.has(idx));
    if (kept.length === 0) {
      throw err("INVALID_INPUT", "nothing to approve: all suggested subjects discarded");
    }

    let attachTarget: Doc<"subjects"> | null = null;
    if (edits?.attachToSubjectId !== undefined) {
      const existing = await ctx.db.get(edits.attachToSubjectId);
      if (existing === null || existing.ownerId !== ownerId) throw err("UNAUTHORIZED", "attach target subject not found");
      attachTarget = existing;
    }

    // 5) Re-verify EVERY cited segment belongs to this job's source.
    const segs = await ctx.db
      .query("sourceSegments")
      .withIndex("by_source_number", (q) => q.eq("sourceId", job.sourceId))
      .take(500);
    const allowed = new Set(segs.map((s) => String(s._id)));
    const cited: string[] = [];
    for (const { s } of kept) cited.push(...s.segmentIds);
    for (const c of proposal.proposal.concepts) cited.push(...c.sourceSegmentIds);
    for (const sec of proposal.proposal.draftCurriculum?.sections ?? [])
      for (const u of sec.units)
        for (const l of u.lessons) cited.push(...l.sourceSegmentIds);
    for (const id of cited) {
      if (!allowed.has(String(id))) throw err("INVALID_INPUT", `cited segment ${id} not in this job's source`);
    }

    // 6) Materialize — atomic. Draft only: no published path, no activities,
    //    no canvas, no attempts/mastery. Everything filtered per subject.
    const mkRef = (segId: Id<"sourceSegments">) => ({ sourceId: job.sourceId, segmentId: segId });
    const subjectIds: Id<"subjects">[] = [];
    const versionIds: Id<"curriculumVersions">[] = [];

    // Targets: either the single attach subject, or one new subject per
    // kept suggestion (original index preserved for renames).
    const targets: { subjectId: Id<"subjects">; segIds: Set<string> }[] = [];
    if (attachTarget !== null) {
      subjectIds.push(attachTarget._id);
      targets.push({ subjectId: attachTarget._id, segIds: new Set(kept.flatMap(({ s }) => s.segmentIds.map(String))) });
    } else {
      for (const { s, idx } of kept) {
        const sid = await ctx.db.insert("subjects", {
          ownerId,
          name: renames.get(idx) ?? s.name,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        });
        subjectIds.push(sid);
        targets.push({ subjectId: sid, segIds: new Set(s.segmentIds.map(String)) });
      }
    }
    const primarySubject = targets[0].subjectId;

    // subjectSources links — deduped segment list, and deduped row: never
    // create a second link when the pair already exists (e.g. attach re-run).
    for (const t of targets) {
      const segIds = [...new Set([...t.segIds])] as Id<"sourceSegments">[];
      const existing = await ctx.db
        .query("subjectSources")
        .withIndex("by_subject_source", (q) => q.eq("subjectId", t.subjectId).eq("sourceId", job.sourceId))
        .first();
      if (existing === null) {
        await ctx.db.insert("subjectSources", {
          subjectId: t.subjectId, sourceId: job.sourceId, segmentIds: segIds,
          origin: "ai_proposal", createdAt: now,
        });
      } else {
        const merged = [...new Set([...existing.segmentIds, ...segIds])];
        await ctx.db.patch(existing._id, { segmentIds: merged });
      }
    }

    // Per-subject concepts: STRICT boundary — a concept materializes under a
    // target only when ALL its cited segments are inside that subject's
    // approved assignment. A concept that partially or fully falls outside
    // every target is skipped, never silently re-homed to the primary.
    const conceptIdsBySubject = new Map<Id<"subjects">, Id<"concepts">[]>();
    for (const c of proposal.proposal.concepts) {
      const cSegs = new Set(c.sourceSegmentIds.map(String));
      const home = targets.find((t) => [...cSegs].every((id) => t.segIds.has(id)));
      if (home === undefined) continue;
      const cid = await ctx.db.insert("concepts", {
        subjectId: home.subjectId, label: c.label, summary: c.summary,
        provenance: "ai_proposal",
        sourceRefs: c.sourceSegmentIds.map((id) => mkRef(id)),
        createdAt: now,
      });
      const list = conceptIdsBySubject.get(home.subjectId) ?? [];
      list.push(cid);
      conceptIdsBySubject.set(home.subjectId, list);
    }

    // DRAFT curriculum version per target — hierarchy filtered to lessons
    // whose cited segments intersect the subject's assigned segments.
    // Empty units/sections are dropped rather than faking coverage.
    const dc = proposal.proposal.draftCurriculum;
    for (const t of targets) {
      const nextVersion = await nextVersionNo(ctx, t.subjectId);
      const versionId = await ctx.db.insert("curriculumVersions", {
        subjectId: t.subjectId, version: nextVersion, state: "draft",
        generatedFromJobId: String(jobId), createdAt: now,
      });
      versionIds.push(versionId);
      if (dc === undefined) continue;
      const myConcepts = conceptIdsBySubject.get(t.subjectId) ?? [];
      let sOrder = 0;
      for (const sec of dc.sections) {
        const keptUnits: { title: string; lessons: typeof sec.units[number]["lessons"] }[] = [];
        for (const u of sec.units) {
          // STRICT subset: a lesson materializes only when every cited
          // segment is inside this subject's approved assignment.
          const keptLessons = u.lessons.filter((l) =>
            l.sourceSegmentIds.every((id) => t.segIds.has(String(id))),
          );
          if (keptLessons.length > 0) keptUnits.push({ title: u.title, lessons: keptLessons });
        }
        if (keptUnits.length === 0) continue;
        const sectionId = await ctx.db.insert("sections", { versionId, order: sOrder++, title: sec.title });
        let uOrder = 0;
        for (const u of keptUnits) {
          const unitId = await ctx.db.insert("units", { sectionId, order: uOrder++, title: u.title });
          let lOrder = 0;
          for (const l of u.lessons) {
            const objectiveIds: Id<"objectives">[] = [];
            for (const stmt of l.objectives) {
              objectiveIds.push(await ctx.db.insert("objectives", {
                subjectId: t.subjectId, conceptIds: myConcepts, statement: stmt, createdAt: now,
              }));
            }
            await ctx.db.insert("lessons", {
              unitId, order: lOrder++, title: l.title, objectiveIds, specVersion: 1,
            });
          }
        }
      }
    }

    // 7) Terminal record — proposal accepted + immutable materialized ids.
    const materialized = { subjectIds, curriculumVersionIds: versionIds };
    await ctx.db.patch(proposal._id, {
      state: "accepted",
      subjectId: primarySubject,
      materialized,
      updatedAt: now,
    });
    await ctx.db.patch(jobId, { state: "accepted", updatedAt: now });
    return { proposalId: proposal._id, state: "accepted" as const, subjectIds, curriculumVersionIds: versionIds };
  },
});

/** Next curriculum version for a subject — bounded take, not full collect. */
async function nextVersionNo(ctx: MutationCtx, subjectId: Id<"subjects">): Promise<number> {
  const recent = await ctx.db
    .query("curriculumVersions")
    .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
    .order("desc")
    .take(MAX_VERSION_SCAN);
  return recent.length === 0 ? 1 : Math.max(...recent.map((v0) => v0.version)) + 1;
}
