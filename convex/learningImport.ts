/**
 * Ingestion job surface (P00.5 contract — docs/phase00/META_POC_CONTRACT.md).
 * Owner-scoped lifecycle: begin → extraction/classification (internal,
 * scheduled via ingestMeta.runJob) → needs_review → accepted. The model only
 * ever produces a proposal row; nothing here writes subjects or curriculum.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
// _generated/api.d.ts predates these modules (codegen is deployment-gated);
// internal resolves through the same anyApi proxy at runtime.
import { anyApi } from "convex/server";
const internal = anyApi;
import { learnerId, requireLearnerId, requireOwnedSource } from "./learningAuth";
import { importJobState, importProposalShape } from "./tables/learning";
import type { Doc, Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });

/**
 * `imports.begin` — idempotent per (owner, source, idempotencyKey). A retry
 * with the same key on the SAME source returns the original job; the same
 * key on a DIFFERENT source is a client bug and is rejected, never silently
 * bound to the wrong document.
 */
export const begin = mutation({
  args: { sourceId: v.id("sources"), idempotencyKey: v.string() },
  returns: v.object({ jobId: v.id("importJobs"), state: importJobState }),
  handler: async (ctx, { sourceId, idempotencyKey }) => {
    const ownerId = await requireLearnerId(ctx);
    const source = await requireOwnedSource(ctx, sourceId);
    if (source.status === "deleted") throw err("INVALID_INPUT", "source deleted");
    const key = idempotencyKey.trim().slice(0, 64);
    if (!key) throw err("INVALID_INPUT", "idempotencyKey required");
    const existing = await ctx.db
      .query("importJobs")
      .withIndex("by_owner_source_key", (q) =>
        q.eq("ownerId", ownerId).eq("sourceId", sourceId).eq("idempotencyKey", key),
      )
      .first();
    if (existing) return { jobId: existing._id, state: existing.state };
    const clash = await ctx.db
      .query("importJobs")
      .withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId).eq("idempotencyKey", key))
      .first();
    if (clash) throw err("CONFLICT", "idempotencyKey already used for a different source");
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      ownerId, sourceId, idempotencyKey: key, state: "extracting",
      createdAt: now, updatedAt: now,
    });
    // Kick the pipeline: extraction → Muse call → proposal/needs_review.
    await ctx.scheduler.runAfter(0, internal.ingestMeta.runJob, { jobId });
    return { jobId, state: "extracting" as const };
  },
});

const jobShape = {
  _id: v.id("importJobs"),
  sourceId: v.id("sources"),
  state: importJobState,
  error: v.optional(v.string()),
  createdAt: v.number(),
};

/** Job for the caller, or null — not-owner is indistinguishable from missing. */
async function ownedJob(ctx: QueryCtx, jobId: Id<"importJobs">): Promise<Doc<"importJobs"> | null> {
  const userId = await learnerId(ctx);
  if (userId === null) return null;
  const job = await ctx.db.get(jobId);
  return job !== null && job.ownerId === userId ? job : null;
}

/** `imports.getStatus` — job state + error only, owner-scoped. */
export const getStatus = query({
  args: { jobId: v.id("importJobs") },
  returns: v.union(v.object(jobShape), v.null()),
  handler: async (ctx, { jobId }) => {
    const job = await ownedJob(ctx, jobId);
    if (job === null) return null;
    const { _id, sourceId, state, error, createdAt } = job;
    return { _id, sourceId, state, error, createdAt };
  },
});

/** `imports.getProposal` — the reviewable typed suggestion, owner only. */
export const getProposal = query({
  args: { jobId: v.id("importJobs") },
  returns: v.union(
    v.object({
      _id: v.id("importProposals"),
      state: v.union(
        v.literal("pending"),
        v.literal("user_edited"),
        v.literal("accepted"),
        v.literal("rejected"),
      ),
      proposal: importProposalShape,
      // The concurrency token review() requires — the UI must echo it back.
      revision: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, { jobId }) => {
    if ((await ownedJob(ctx, jobId)) === null) return null;
    const row = await ctx.db
      .query("importProposals")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    return row === null ? null : { _id: row._id, state: row.state, proposal: row.proposal, revision: row.revision };
  },
});

/** Ingestion-internal: store extracted page/paragraph segments for a source. */
export const recordSegments = internalMutation({
  args: {
    sourceId: v.id("sources"),
    segments: v.array(
      v.object({
        segmentNo: v.number(),
        page: v.optional(v.number()),
        text: v.string(),
        kind: v.optional(
          v.union(v.literal("paragraph"), v.literal("heading"), v.literal("caption"), v.literal("formula")),
        ),
      }),
    ),
  },
  returns: v.array(v.id("sourceSegments")),
  handler: async (ctx, { sourceId, segments }) => {
    const now = Date.now();
    const ids: Id<"sourceSegments">[] = [];
    for (const s of segments) {
      ids.push(await ctx.db.insert("sourceSegments", { ...s, sourceId, createdAt: now }));
    }
    return ids;
  },
});

/** Ingestion-internal: advance the job state machine, recording model facts. */
export const setJobState = internalMutation({
  args: {
    jobId: v.id("importJobs"),
    state: importJobState,
    error: v.optional(v.string()),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { jobId, ...patch } = args;
    await ctx.db.patch(jobId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

/** Ingestion-internal: persist a validated proposal for learner review. */
export const storeProposal = internalMutation({
  args: {
    jobId: v.id("importJobs"),
    proposal: importProposalShape,
  },
  returns: v.id("importProposals"),
  handler: async (ctx, { jobId, proposal }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("importProposals")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    if (existing) {
      // A re-run replaces a still-pending proposal; a user-edited one is kept.
      if (existing.state === "pending") {
        await ctx.db.patch(existing._id, { proposal, updatedAt: now });
        return existing._id;
      }
      return existing._id;
    }
    return await ctx.db.insert("importProposals", { jobId, state: "pending", proposal, createdAt: now, updatedAt: now });
  },
});
