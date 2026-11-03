/**
 * Owner-scoped curriculum read (Issue #50): the real approved draft path for
 * the right-hand learning drawer. Returns the versioned tree — sections →
 * units → lessons — for one owned subject. Never exposes answer keys or
 * foreign data.
 *
 * Per-lesson `progress` (Issue #53) is computed server-side from the
 * caller's own mastery rows and evaluated attempts — the only states a
 * client may ever display. A lesson with no objectives is `untracked`
 * (nothing to measure), which is honest — never "not started" and never
 * "complete".
 */
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import { masteryState, sourceRef } from "./tables/learning";
import type { Doc, Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });

/** Issue #53 — the honest path-node state a client renders verbatim. */
const lessonProgress = v.object({
  /** false → `state` is "untracked": the lesson has no objectives at all. */
  tracked: v.boolean(),
  state: v.union(v.literal("untracked"), masteryState),
  /** objectives with at least one mastery/evidence row. */
  assessedObjectives: v.number(),
  totalObjectives: v.number(),
  /** evaluated attempts on this lesson's activities (bounded reads). */
  evaluatedAttempts: v.number(),
});

/** Lesson rollup: demonstrated only when EVERY tracked objective is;
 * practicing if any is; learning once real evidence exists. `states`
 * must contain one entry per lesson objective (read or undefined) —
 * partial objective coverage can never produce "demonstrated". */
function rollupProgress(
  totalObjectives: number,
  states: (Doc<"mastery">["state"] | undefined)[],
  evaluatedAttempts: number,
) {
  if (totalObjectives === 0) {
    return { tracked: false, state: "untracked" as const, assessedObjectives: 0, totalObjectives, evaluatedAttempts };
  }
  const assessed = states.filter((s) => s !== undefined).length;
  const state =
    states.length === totalObjectives && states.every((s) => s === "demonstrated") ? "demonstrated" as const
    : states.some((s) => s === "practicing") ? "practicing" as const
    : assessed > 0 || evaluatedAttempts > 0 ? "learning" as const
    : "not_started" as const;
  return { tracked: true, state, assessedObjectives: assessed, totalObjectives, evaluatedAttempts };
}

export const pathTreeShape = v.object({
  subjectId: v.id("subjects"),
  versionId: v.id("curriculumVersions"),
  sections: v.array(
    v.object({
      _id: v.id("sections"),
      title: v.string(),
      units: v.array(
        v.object({
          _id: v.id("units"),
          title: v.string(),
          lessons: v.array(
            v.object({
              _id: v.id("lessons"),
              title: v.optional(v.string()),
              specVersion: v.number(),
              objectiveIds: v.array(v.id("objectives")),
              sourceRefs: v.array(sourceRef),
              activityCount: v.number(),
              progress: lessonProgress,
            }),
          ),
        }),
      ),
    }),
  ),
});

type DbCtx = { db: QueryCtx["db"] };

/**
 * The shared path-tree read — the newest eligible curriculum version for
 * `subjectId`, with per-lesson progress rolled up from `ownerId`'s own
 * mastery/attempt rows. Callers own the authorization decision:
 * `getPath` requires the signed-in owner, `demo.getPath` requires the
 * seeded demo owner. Returns null when no eligible version exists.
 */
export async function readPathTree(
  ctx: DbCtx,
  ownerId: Id<"users">,
  subjectId: Id<"subjects">,
): Promise<{
  subjectId: Id<"subjects">;
  versionId: Id<"curriculumVersions">;
  sections: {
    _id: Id<"sections">;
    title: string;
    units: {
      _id: Id<"units">;
      title: string;
      lessons: {
        _id: Id<"lessons">;
        title?: string;
        specVersion: number;
        objectiveIds: Id<"objectives">[];
        sourceRefs: NonNullable<Doc<"lessons">["sourceRefs"]>;
        activityCount: number;
        progress: ReturnType<typeof rollupProgress>;
      }[];
    }[];
  }[];
} | null> {
  // Correct eligible version: highest version number whose state is not
  // superseded/rejected — NOT whichever row happens to sort last by _id.
  // Version-ordered index desc: newest eligible (not superseded/rejected).
  const versions = await ctx.db
    .query("curriculumVersions")
    .withIndex("by_subject_version", (q) => q.eq("subjectId", subjectId))
    .order("desc")
    .take(50);
  const version = versions.find((ver) => ver.state !== "superseded" && ver.state !== "rejected");
  if (version === undefined) return null;

  // Evidence is read through exact per-objective and per-activity
  // indexes — never a global first-N window. A take() on by_user_time
  // returns whichever rows sort first, so a lesson's own proof could be
  // silently dropped and "progress" reported from an arbitrary subset.
  const lessonShape = async (l: Doc<"lessons">) => {
    const acts = await ctx.db
      .query("activities")
      .withIndex("by_lesson", (q) => q.eq("lessonId", l._id))
      .take(50);
    // Exact mastery read per objective — by_user_objective is unique per
    // pair, so .first() is the complete row, not a sample.
    const states = await Promise.all(
      l.objectiveIds.slice(0, 30).map(async (oid) => {
        const m = await ctx.db
          .query("mastery")
          .withIndex("by_user_objective", (q) => q.eq("userId", ownerId).eq("objectiveId", oid))
          .first();
        return m?.state;
      }),
    );
    // Per-activity attempt reads: bounded at 500 evaluated+unevaluated
    // rows per activity — far above any realistic retry volume, and
    // scoped so no other lesson's attempts can crowd out this evidence.
    let evaluatedAttempts = 0;
    for (const a of acts) {
      const rows = await ctx.db
        .query("attempts")
        .withIndex("by_user_activity", (q) => q.eq("userId", ownerId).eq("activityId", a._id))
        .take(500);
      evaluatedAttempts += rows.reduce((n, r) => n + (r.evaluation !== undefined ? 1 : 0), 0);
    }
    return {
      _id: l._id,
      title: l.title,
      specVersion: l.specVersion,
      objectiveIds: l.objectiveIds,
      sourceRefs: l.sourceRefs ?? [],
      activityCount: acts.length,
      progress: rollupProgress(l.objectiveIds.length, states, evaluatedAttempts),
    };
  };

  const sections = await ctx.db
    .query("sections")
    .withIndex("by_version_order", (q) => q.eq("versionId", version._id))
    .take(30);
  return {
    subjectId,
    versionId: version._id,
    sections: await Promise.all(
      sections.map(async (sec) => ({
        _id: sec._id,
        title: sec.title,
        units: await Promise.all(
          (
            await ctx.db
              .query("units")
              .withIndex("by_section_order", (q) => q.eq("sectionId", sec._id))
              .take(30)
          ).map(async (unit) => ({
            _id: unit._id,
            title: unit.title,
            lessons: await Promise.all(
              (
                await ctx.db
                  .query("lessons")
                  .withIndex("by_unit_order", (q) => q.eq("unitId", unit._id))
                  .take(30)
              ).map(lessonShape),
            ),
          })),
        ),
      })),
    ),
  };
}

export const getPath = query({
  args: { subjectId: v.id("subjects") },
  returns: v.union(pathTreeShape, v.null()),
  handler: async (ctx, { subjectId }) => {
    const ownerId = await requireLearnerId(ctx);
    const subject = await ctx.db.get(subjectId);
    if (subject === null || subject.ownerId !== ownerId) throw err("UNAUTHORIZED", "subject not found");
    return await readPathTree(ctx, ownerId, subjectId);
  },
});
