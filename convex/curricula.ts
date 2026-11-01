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
import { requireLearnerId } from "./learningAuth";
import { masteryState, sourceRef } from "./tables/learning";
import type { Doc } from "./_generated/dataModel";

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
 * practicing if any is; learning once real evidence exists. */
function rollupProgress(
  lesson: Doc<"lessons">,
  masteryByObjective: Map<string, Doc<"mastery">>,
  evaluatedAttempts: number,
) {
  const total = lesson.objectiveIds.length;
  if (total === 0) {
    return { tracked: false, state: "untracked" as const, assessedObjectives: 0, totalObjectives: 0, evaluatedAttempts };
  }
  const states = lesson.objectiveIds.map((oid) => masteryByObjective.get(String(oid))?.state);
  const assessed = states.filter((s) => s !== undefined).length;
  const state =
    states.every((s) => s === "demonstrated") ? "demonstrated" as const
    : states.some((s) => s === "practicing") ? "practicing" as const
    : assessed > 0 || evaluatedAttempts > 0 ? "learning" as const
    : "not_started" as const;
  return { tracked: true, state, assessedObjectives: assessed, totalObjectives: total, evaluatedAttempts };
}

export const getPath = query({
  args: { subjectId: v.id("subjects") },
  returns: v.union(
    v.object({
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
    }),
    v.null(),
  ),
  handler: async (ctx, { subjectId }) => {
    const ownerId = await requireLearnerId(ctx);
    const subject = await ctx.db.get(subjectId);
    if (subject === null || subject.ownerId !== ownerId) throw err("UNAUTHORIZED", "subject not found");
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

    // Evidence for the whole path — two bounded per-user reads, once,
    // never per-lesson scans. mastery rows are objective-keyed; attempts
    // arrive activity-keyed and are grouped onto their lessons below.
    const masteryRows = await ctx.db
      .query("mastery")
      .withIndex("by_user", (q) => q.eq("userId", ownerId))
      .take(500);
    const masteryByObjective = new Map(masteryRows.map((m) => [String(m.objectiveId), m]));
    const recentAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_time", (q) => q.eq("userId", ownerId))
      .take(500);
    const evaluatedByActivity = new Map<string, number>();
    for (const a of recentAttempts) {
      if (a.evaluation === undefined) continue;
      evaluatedByActivity.set(String(a.activityId), (evaluatedByActivity.get(String(a.activityId)) ?? 0) + 1);
    }

    const lessonShape = async (l: Doc<"lessons">) => {
      const acts = await ctx.db
        .query("activities")
        .withIndex("by_lesson", (q) => q.eq("lessonId", l._id))
        .take(50);
      const evaluatedAttempts = acts.reduce(
        (n, a) => n + (evaluatedByActivity.get(String(a._id)) ?? 0), 0,
      );
      return {
        _id: l._id,
        title: l.title,
        specVersion: l.specVersion,
        objectiveIds: l.objectiveIds,
        sourceRefs: l.sourceRefs ?? [],
        activityCount: acts.length,
        progress: rollupProgress(l, masteryByObjective, evaluatedAttempts),
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
            (await ctx.db.query("units").withIndex("by_section_order", (q) => q.eq("sectionId", sec._id)).take(30)).map(
              async (unit) => ({
                _id: unit._id,
                title: unit.title,
                lessons: await Promise.all(
                  (await ctx.db
                    .query("lessons")
                    .withIndex("by_unit_order", (q) => q.eq("unitId", unit._id))
                    .take(30)).map(lessonShape),
                ),
              }),
            ),
          ),
        })),
      ),
    };
  },
});
