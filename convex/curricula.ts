/**
 * Owner-scoped curriculum read (Issue #50): the real approved draft path for
 * the right-hand learning drawer. Returns the versioned tree — sections →
 * units → lessons — for one owned subject. Never exposes answer keys or
 * foreign data.
 */
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import { sourceRef } from "./tables/learning";

const err = (code: string, message: string) => new ConvexError({ code, message });

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
                lessons: (await ctx.db
                  .query("lessons")
                  .withIndex("by_unit_order", (q) => q.eq("unitId", unit._id))
                  .take(30)).map((l) => ({
                    _id: l._id,
                    title: l.title,
                    specVersion: l.specVersion,
                    objectiveIds: l.objectiveIds,
                    sourceRefs: l.sourceRefs ?? [],
                  })),
              }),
            ),
          ),
        })),
      ),
    };
  },
});
