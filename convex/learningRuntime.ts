/**
 * Lesson runtime API (Issue #31 slice 1): read an approved lesson's spec,
 * record server-evaluated attempts, derive mastery, and persist consented
 * practice proposals. Ownership chains lesson→unit→section→version→subject.
 * Engine wiring (Engineer 1's deterministic adapter) is a follow-up behind
 * the practiceProposals store — this file owns all auth/persistence.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import type { Doc, Id } from "./_generated/dataModel";
import { activitySpec } from "./tables/learning";

const err = (code: string, message: string) => new ConvexError({ code, message });

/** Resolve lesson→subject and verify the caller owns the subject. */
async function ownedLesson(ctx: { db: { get: (id: never) => Promise<unknown> } }, lessonId: Id<"lessons">, userId: Id<"users">) {
  const db = ctx.db as { get: (id: string) => Promise<Doc<"lessons"> | Doc<"units"> | Doc<"sections"> | Doc<"curriculumVersions"> | Doc<"subjects"> | null> };
  const lesson = (await db.get(lessonId)) as Doc<"lessons"> | null;
  if (lesson === null) return null;
  const unit = (await db.get(lesson.unitId)) as Doc<"units"> | null;
  if (unit === null) return null;
  const section = (await db.get(unit.sectionId)) as Doc<"sections"> | null;
  if (section === null) return null;
  const version = (await db.get(section.versionId)) as Doc<"curriculumVersions"> | null;
  if (version === null) return null;
  const subject = (await db.get(version.subjectId)) as Doc<"subjects"> | null;
  if (subject === null || subject.ownerId !== userId) return null;
  return { lesson, subject };
}

/** `learningRuntime.getLesson` — owner-scoped lesson + activities + objectives. */
export const getLesson = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(
    v.object({
      _id: v.id("lessons"),
      title: v.optional(v.string()),
      specVersion: v.number(),
      objectiveIds: v.array(v.id("objectives")),
      activities: v.array(
        v.object({ _id: v.id("activities"), spec: activitySpec, revision: v.number() }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { lessonId }) => {
    const userId = await requireLearnerId(ctx);
    const found = await ownedLesson(ctx as never, lessonId, userId);
    if (found === null) return null;
    const acts = await ctx.db
      .query("activities")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
      .collect();
    return {
      _id: found.lesson._id,
      title: found.lesson.title,
      specVersion: found.lesson.specVersion,
      objectiveIds: found.lesson.objectiveIds,
      // Strip server-only answer keys before any read leaves the backend.
      activities: acts
        .map((a) => ({
          _id: a._id,
          spec: stripKeys(a.spec),
          revision: a.revision,
        }))
        .sort((a, b) => a._id.localeCompare(b._id)),
    };
  },
});

/** Remove server-only answer keys without violating the closed union. */
function stripKeys(spec: Doc<"activities">["spec"]): Doc<"activities">["spec"] {
  const clone = { ...spec } as Record<string, unknown>;
  delete clone.correctOptionId;
  delete clone.expectedAnswer;
  return clone as Doc<"activities">["spec"];
}

/** Deterministic server-side evaluation — never model-graded here. */
function evaluate(spec: Doc<"activities">["spec"], response: { kind: "choice"; optionId: string } | { kind: "text"; text: string } | { kind: "teachBack"; text: string }) {
  if (spec.kind === "multipleChoice" && response.kind === "choice") {
    const correct = spec.correctOptionId === response.optionId;
    return { verdict: correct ? "correct" as const : "incorrect" as const, score: correct ? 1 : 0 };
  }
  if (spec.kind === "shortAnswer" && response.kind === "text") {
    const expected = (spec.expectedAnswer ?? "").toLowerCase();
    const given = response.text.toLowerCase().trim();
    const verdict = expected !== "" && given.includes(expected) ? "correct" as const : given.length >= 20 ? "partial" as const : "incorrect" as const;
    return { verdict, score: verdict === "correct" ? 1 : verdict === "partial" ? 0.5 : 0 };
  }
  // teachBack + mismatched responses need human/model review — never auto-pass.
  return { verdict: "needs_review" as const, score: undefined as number | undefined };
}

/** `learningRuntime.submitAttempt` — ownership-checked, revision-pinned, evaluated. */
export const submitAttempt = mutation({
  args: {
    activityId: v.id("activities"),
    activityRevision: v.number(),
    response: v.union(
      v.object({ kind: v.literal("choice"), optionId: v.string() }),
      v.object({ kind: v.literal("text"), text: v.string() }),
      v.object({ kind: v.literal("teachBack"), text: v.string() }),
    ),
  },
  returns: v.object({
    attemptId: v.id("attempts"),
    verdict: v.union(v.literal("correct"), v.literal("partial"), v.literal("incorrect"), v.literal("needs_review")),
    masteryUpdated: v.number(),
  }),
  handler: async (ctx, { activityId, activityRevision, response }) => {
    const userId = await requireLearnerId(ctx);
    const activity = await ctx.db.get(activityId);
    if (activity === null) throw err("INVALID_INPUT", "activity not found");
    if (activity.revision !== activityRevision) throw err("CONFLICT", "activity revised; reload before answering");
    const found = await ownedLesson(ctx as never, activity.lessonId, userId);
    if (found === null) throw err("UNAUTHORIZED", "activity not found");

    const ev = evaluate(activity.spec, response);
    const now = Date.now();
    const attemptId = await ctx.db.insert("attempts", {
      userId, activityId, activityRevision,
      state: ev.verdict === "needs_review" ? "submitted" : "evaluated",
      response: response as never,
      evaluation: { verdict: ev.verdict, score: ev.score, evaluatedAt: now },
      createdAt: now,
    });

    // Mastery upsert per lesson objective (by_user_objective uniqueness).
    let masteryUpdated = 0;
    for (const objectiveId of found.lesson.objectiveIds) {
      const existing = await ctx.db
        .query("mastery")
        .withIndex("by_user_objective", (q) => q.eq("userId", userId).eq("objectiveId", objectiveId))
        .first();
      const band = ev.verdict === "correct" ? "high" : ev.verdict === "partial" ? "medium" : ev.verdict === "needs_review" ? undefined : "low";
      const state = ev.verdict === "correct" ? "demonstrated" : ev.verdict === "incorrect" ? "learning" : existing?.state ?? "learning";
      if (existing === null) {
        await ctx.db.insert("mastery", {
          userId, objectiveId, state,
          scoreBand: band,
          evidence: [{ attemptId, at: now }],
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(existing._id, {
          state, scoreBand: band ?? existing.scoreBand,
          evidence: [...existing.evidence.slice(-19), { attemptId, at: now }],
          updatedAt: now,
        });
      }
      masteryUpdated++;
    }
    return { attemptId, verdict: ev.verdict, masteryUpdated };
  },
});

/** `learningRuntime.listPractice` — owner's proposals for a lesson. */
export const listPractice = query({
  args: { lessonId: v.id("lessons") },
  returns: v.array(
    v.object({
      _id: v.id("practiceProposals"),
      state: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
      rationale: v.string(),
      spec: activitySpec,
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, { lessonId }) => {
    const userId = await requireLearnerId(ctx);
    if ((await ownedLesson(ctx as never, lessonId, userId)) === null) return [];
    return await ctx.db
      .query("practiceProposals")
      .withIndex("by_owner_lesson", (q) => q.eq("ownerId", userId).eq("lessonId", lessonId))
      .collect()
      .then((rows) => rows.map((r) => ({ _id: r._id, state: r.state, rationale: r.rationale, spec: r.spec, createdAt: r.createdAt })));
  },
});

/**
 * `learningRuntime.reviewPractice` — the learner's consent gate for the ghost
 * branch. Accept materializes the supplemental activity under the same lesson
 * (next order); reject is terminal and the triggerKey dedupe prevents the same
 * evidence set from re-proposing.
 */
export const reviewPractice = mutation({
  args: {
    proposalId: v.id("practiceProposals"),
    action: v.union(v.literal("accept"), v.literal("reject")),
  },
  returns: v.object({
    state: v.union(v.literal("accepted"), v.literal("rejected")),
    activityId: v.optional(v.id("activities")),
  }),
  handler: async (ctx, { proposalId, action }) => {
    const userId = await requireLearnerId(ctx);
    const proposal = await ctx.db.get(proposalId);
    if (proposal === null || proposal.ownerId !== userId) throw err("UNAUTHORIZED", "proposal not found");
    if (proposal.state === "accepted" || proposal.state === "rejected") {
      if (proposal.state !== action + "ed" && proposal.state !== action + "ted") throw err("CONFLICT", `already ${proposal.state}`);
      return { state: proposal.state } as never;
    }
    const now = Date.now();
    if (action === "reject") {
      await ctx.db.patch(proposalId, { state: "rejected", updatedAt: now });
      return { state: "rejected" as const };
    }
    const activityId = await ctx.db.insert("activities", {
      lessonId: proposal.lessonId,
      spec: proposal.spec,
      objectiveIds: proposal.objectiveIds,
      sourceRefs: proposal.sourceRefs,
      revision: 1,
      createdAt: now,
    });
    await ctx.db.patch(proposalId, { state: "accepted", updatedAt: now });
    return { state: "accepted" as const, activityId };
  },
});
