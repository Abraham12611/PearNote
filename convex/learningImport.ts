/**
 * Ingestion job surface (P00.5 contract — docs/phase00/META_POC_CONTRACT.md).
 * Owner-scoped job lifecycle: begin → extraction/classification (internal,
 * scheduled) → needs_review → accepted. The model only ever produces a
 * proposal row; nothing here writes subjects or curriculum.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { learnerId, requireLearnerId, requireOwnedSource } from "./learningAuth";
import { importJobState } from "./tables/learning";
import type { Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });

/** `imports.begin` — idempotent per (owner, idempotencyKey). Returns the job. */
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
      .withIndex("by_owner_key", (q) => q.eq("ownerId", ownerId).eq("idempotencyKey", key))
      .first();
    if (existing) return { jobId: existing._id, state: existing.state };
    const now = Date.now();
    const jobId = await ctx.db.insert("importJobs", {
      ownerId, sourceId, idempotencyKey: key, state: "uploaded",
      createdAt: now, updatedAt: now,
    });
    return { jobId, state: "uploaded" as const };
  },
});

const jobShape = {
  _id: v.id("importJobs"),
  sourceId: v.id("sources"),
  state: importJobState,
  error: v.optional(v.string()),
  createdAt: v.number(),
};

async function ownedJob(ctx: { db: { get: (id: Id<"importJobs">) => Promise<unknown> } }, jobId: Id<"importJobs">) {
  const userId = await learnerId(ctx as never);
  if (userId === null) return null;
  const job = (await ctx.db.get(jobId)) as { ownerId: string } | null;
  return job !== null && job.ownerId === userId ? job : null;
}

/** `imports.getStatus` — job state + error only, owner-scoped. */
export const getStatus = query({
  args: { jobId: v.id("importJobs") },
  returns: v.union(v.object(jobShape), v.null()),
  handler: async (ctx, { jobId }) => {
    const job = (await ownedJob(ctx, jobId)) as {
      _id: Id<"importJobs">; sourceId: Id<"sources">; state: string; error?: string; createdAt: number;
    } | null;
    if (job === null) return null;
    return { _id: job._id, sourceId: job.sourceId, state: job.state as never, error: job.error, createdAt: job.createdAt };
  },
});

/** `imports.getProposal` — the reviewable suggestion, owner only. */
export const getProposal = query({
  args: { jobId: v.id("importJobs") },
  returns: v.union(v.object({ _id: v.id("importProposals"), state: v.string(), proposal: v.any() }), v.null()),
  handler: async (ctx, { jobId }) => {
    if ((await ownedJob(ctx, jobId)) === null) return null;
    const row = await ctx.db
      .query("importProposals")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .first();
    return row === null ? null : { _id: row._id, state: row.state, proposal: row.proposal };
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
