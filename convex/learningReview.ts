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
 */
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import type { Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });
const NAME_MAX = 120;

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
    /** Optimistic concurrency — must equal proposal.revision ?? 0. */
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

    // 2) Optimistic concurrency — a stale UI can't approve unseen content.
    if (expectedProposalRevision !== undefined && expectedProposalRevision !== (proposal.revision ?? 0)) {
      throw err("CONFLICT", "proposal changed since you viewed it; reload and re-review");
    }

    // 3) Transitions: needs_review + pending|user_edited → accepted|rejected.
    //    Repeat of the same terminal action = idempotent return; opposite
    //    action on a terminal proposal = CONFLICT.
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
    if (job.state !== "needs_review") {
      throw err("INVALID_STATE", `job is ${job.state}, not needs_review`);
    }

    if (action === "reject") {
      await ctx.db.patch(proposal._id, { state: "rejected", updatedAt: now });
      await ctx.db.patch(jobId, { state: "cancelled", updatedAt: now });
      return { proposalId: proposal._id, state: "rejected" as const, subjectIds: [], curriculumVersionIds: [] };
    }

    // 4) APPROVE — validate edits against a whitelist.
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
    const kept = subjectsIn.filter((_, i) => !discarded.has(i));

    let attachTarget: Id<"subjects"> | null = null;
    if (edits?.attachToSubjectId !== undefined) {
      const existing = await ctx.db.get(edits.attachToSubjectId);
      if (existing === null || existing.ownerId !== ownerId) throw err("UNAUTHORIZED", "attach target subject not found");
      attachTarget = existing._id;
    }
    if (kept.length === 0 && attachTarget === null) throw err("INVALID_INPUT", "nothing to approve: all suggested subjects discarded");

    // 5) Re-verify EVERY cited segment belongs to this job's source.
    const segs = await ctx.db
      .query("sourceSegments")
      .withIndex("by_source_number", (q) => q.eq("sourceId", job.sourceId))
      .take(500);
    const allowed = new Set(segs.map((s) => String(s._id)));
    const cited: string[] = [];
    for (const s of kept) cited.push(...s.segmentIds);
    for (const c of proposal.proposal.concepts) cited.push(...c.sourceSegmentIds);
    for (const sec of proposal.proposal.draftCurriculum?.sections ?? [])
      for (const u of sec.units)
        for (const l of u.lessons) cited.push(...l.sourceSegmentIds);
    for (const id of cited) {
      if (!allowed.has(String(id))) throw err("INVALID_INPUT", `cited segment ${id} not in this job's source`);
    }

    // 6) Materialize — atomic. Draft only: no published path, no activities,
    //    no canvas, no attempts/mastery.
    const mkRef = (segId: Id<"sourceSegments">) => ({ sourceId: job.sourceId, segmentId: segId });
    const subjectIds: Id<"subjects">[] = [];
    const versionIds: Id<"curriculumVersions">[] = [];

    const primarySubject: Id<"subjects"> = attachTarget ?? await ctx.db.insert("subjects", {
      ownerId,
      name: renames.get(0) ?? kept[0].name,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    const targetIds: { subjectId: Id<"subjects">; segIds: Id<"sourceSegments">[]; name: string }[] = [];
    if (attachTarget !== null) {
      targetIds.push({ subjectId: attachTarget, segIds: kept.flatMap((s) => s.segmentIds), name: "" });
    } else {
      subjectIds.push(primarySubject);
      targetIds.push({ subjectId: primarySubject, segIds: kept[0].segmentIds, name: kept[0].name });
      for (const s of kept.slice(1)) {
        const sid = await ctx.db.insert("subjects", {
          ownerId, name: renames.get(subjectsIn.indexOf(s)) ?? s.name,
          status: "draft", createdAt: now, updatedAt: now,
        });
        subjectIds.push(sid);
        targetIds.push({ subjectId: sid, segIds: s.segmentIds, name: s.name });
      }
    }

    // subjectSources links (deduped segment list per subject).
    for (const t of targetIds) {
      await ctx.db.insert("subjectSources", {
        subjectId: t.subjectId, sourceId: job.sourceId,
        segmentIds: [...new Set(t.segIds)], origin: "ai_proposal", createdAt: now,
      });
    }

    // Concepts attach to the primary/target subject (documented v1 limit).
    const conceptIds: Id<"concepts">[] = [];
    for (const c of proposal.proposal.concepts) {
      conceptIds.push(await ctx.db.insert("concepts", {
        subjectId: primarySubject, label: c.label, summary: c.summary,
        provenance: "ai_proposal",
        sourceRefs: c.sourceSegmentIds.map((id) => mkRef(id)),
        createdAt: now,
      }));
    }

    // DRAFT curriculum version per target subject — version = next number.
    for (const t of targetIds) {
      const prior = await ctx.db
        .query("curriculumVersions")
        .withIndex("by_subject", (q) => q.eq("subjectId", t.subjectId))
        .collect();
      const versionId = await ctx.db.insert("curriculumVersions", {
        subjectId: t.subjectId,
        version: prior.length === 0 ? 1 : Math.max(...prior.map((v0) => v0.version)) + 1,
        state: "draft",
        generatedFromJobId: String(jobId),
        createdAt: now,
      });
      versionIds.push(versionId);
      const dc = proposal.proposal.draftCurriculum;
      if (dc === undefined) continue;
      let sOrder = 0;
      for (const sec of dc.sections) {
        const sectionId = await ctx.db.insert("sections", { versionId, order: sOrder++, title: sec.title });
        let uOrder = 0;
        for (const u of sec.units) {
          const unitId = await ctx.db.insert("units", { sectionId, order: uOrder++, title: u.title });
          let lOrder = 0;
          for (const l of u.lessons) {
            // Each lesson objective string → objective row carrying the
            // lesson's verified segment refs; lesson pins those ids.
            const objectiveIds: Id<"objectives">[] = [];
            for (const stmt of l.objectives) {
              objectiveIds.push(await ctx.db.insert("objectives", {
                subjectId: t.subjectId, conceptIds, statement: stmt, createdAt: now,
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
