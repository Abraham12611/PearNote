/**
 * Public demo reads (session plan W3) — "Sam's desk".
 *
 * The demo is a REAL seeded account ("sam", an undergrad medical student),
 * not client-side fixtures: the public /demo/* surface reads the same
 * subjects, paths, desk systems and lesson rows a signed-in learner
 * would — resolved only through the `demoTag` marker the internal seed
 * writes. No auth is required and none is assumed; a user-supplied id can
 * never reach these rows because authorization here is "belongs to the
 * flagged demo owner", never "caller supplied the right id".
 *
 * Everything returned is sample data; the client stamps it SAMPLE and the
 * demo chrome labels it. There are deliberately no mutations in this
 * module — the public demo cannot write.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { deskAggregate, deskShape, deskToView } from "./desk";
import { pathTreeShape, readPathTree } from "./curricula";
import { ownedLesson, stripKeys } from "./learningRuntime";
import { activitySpec, masteryState, sourceRef } from "./tables/learning";

/** The seeded learner's tag — written by convex/seedDemo.ts only. */
export const DEMO_TAG = "pearnotes-demo";

/** Resolve the demo owner, or null when the deployment isn't seeded —
 *  the UI renders its honest "demo not set up here" state, not fixtures. */
export async function demoOwner(ctx: Pick<QueryCtx, "db">): Promise<Doc<"users"> | null> {
  const rows = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("demoTag"), DEMO_TAG))
    .take(4);
  return rows.find((u) => u.name === "sam") ?? rows[0] ?? null;
}

const lessonView = v.object({
  _id: v.id("lessons"),
  title: v.optional(v.string()),
  subjectId: v.id("subjects"),
  subjectName: v.string(),
  objectives: v.array(
    v.object({
      _id: v.id("objectives"),
      statement: v.string(),
      mastery: masteryState,
      evidenceCount: v.number(),
    }),
  ),
  activities: v.array(
    v.object({
      _id: v.id("activities"),
      spec: activitySpec,
      revision: v.number(),
      objectiveIds: v.array(v.id("objectives")),
      sourceRefs: v.array(sourceRef),
    }),
  ),
});

/** Build the same view learningRuntime.getLesson returns, keyed to the
 *  demo owner's evidence — answer keys stripped by the same helper. */
async function readDemoLesson(
  ctx: Pick<QueryCtx, "db">,
  demoUserId: Id<"users">,
  lessonId: Id<"lessons">,
) {
  const found = await ownedLesson(ctx as never, lessonId, demoUserId);
  if (found === null) return null;
  const acts = await ctx.db
    .query("activities")
    .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
    .take(50);
  const objectives = await Promise.all(
    found.lesson.objectiveIds.slice(0, 30).map(async (oid) => {
      const obj = await ctx.db.get(oid);
      if (obj === null) return null;
      const m = await ctx.db
        .query("mastery")
        .withIndex("by_user_objective", (q) =>
          q.eq("userId", demoUserId).eq("objectiveId", oid),
        )
        .first();
      return {
        _id: obj._id,
        statement: obj.statement,
        mastery: m?.state ?? ("not_started" as const),
        evidenceCount: m?.evidence.length ?? 0,
      };
    }),
  );
  return {
    _id: found.lesson._id,
    title: found.lesson.title,
    subjectId: found.subject._id,
    subjectName: found.subject.name,
    objectives: objectives.filter((o) => o !== null),
    activities: acts
      .map((a) => ({
        _id: a._id,
        spec: stripKeys(a.spec),
        revision: a.revision,
        objectiveIds: a.objectiveIds,
        sourceRefs: a.sourceRefs,
      }))
      .sort((a, b) => a._id.localeCompare(b._id)),
  };
}

/**
 * `demo.getDesk` — the whole demo surface in one read: persona, the desk
 * aggregate (resume/session/focus/calendar/streak/upcoming/achievements/
 * feed/crew/xp), every subject's published path tree, and every lesson
 * view. Bounded by the fixed seed size.
 */
export const getDesk = query({
  args: {},
  returns: v.union(
    v.object({
      persona: v.object({
        name: v.string(),
        bio: v.string(),
        image: v.optional(v.string()),
        color: v.optional(v.string()),
        personaId: v.optional(v.string()),
      }),
      desk: deskShape,
      paths: v.array(v.object({ subjectId: v.id("subjects"), tree: pathTreeShape })),
      lessons: v.array(lessonView),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const owner = await demoOwner(ctx);
    if (owner === null) return null;
    const desk = deskToView(await deskAggregate(ctx, owner._id));
    const paths = (
      await Promise.all(
        desk.subjects.map(async (s) => {
          const tree = await readPathTree(ctx, owner._id, s._id);
          return tree === null ? null : { subjectId: s._id, tree };
        }),
      )
    ).filter((p) => p !== null);
    const lessonIds = paths.flatMap((p) =>
      p.tree.sections.flatMap((s) => s.units.flatMap((u) => u.lessons.map((l) => l._id))),
    );
    const lessons = (
      await Promise.all(lessonIds.map((id) => readDemoLesson(ctx, owner._id, id)))
    ).filter((l) => l !== null);
    return {
      persona: {
        name: owner.name ?? "sam",
        bio: "undergrad medical student — the sample account behind the public demo",
        image: owner.image,
        color: owner.color,
        personaId: owner.personaId,
      },
      desk,
      paths,
      lessons,
    };
  },
});

/** `demo.getPath` — one subject's tree, public, demo-owner scoped. */
export const getPath = query({
  args: { subjectId: v.id("subjects") },
  returns: v.union(pathTreeShape, v.null()),
  handler: async (ctx, { subjectId }) => {
    const owner = await demoOwner(ctx);
    if (owner === null) return null;
    const subject = await ctx.db.get(subjectId);
    if (subject === null || subject.ownerId !== owner._id) return null;
    return await readPathTree(ctx, owner._id, subjectId);
  },
});

/** `demo.getLesson` — one lesson view, public, demo-owner scoped. */
export const getLesson = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(lessonView, v.null()),
  handler: async (ctx, { lessonId }) => {
    const owner = await demoOwner(ctx);
    if (owner === null) return null;
    return await readDemoLesson(ctx, owner._id, lessonId);
  },
});

/** `demo.isSeeded` — cheap presence check for the demo surface. */
export const isSeeded = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => (await demoOwner(ctx)) !== null,
});
