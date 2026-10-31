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
import { activitySpec, sourceRef } from "./tables/learning";
import { internalMutation } from "./_generated/server";
import { evaluateForRemediation } from "../src/pearnotes/learning-engine/remediation";
import { deriveMastery } from "../src/pearnotes/learning-engine/mastery";
import type { ObjectiveEvidence } from "../src/pearnotes/learning-engine/types";

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
      .take(50);
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
  delete clone.correctAssignments;
  return clone as Doc<"activities">["spec"];
}

/** Deterministic server-side evaluation — never model-graded here. */
function evaluate(spec: Doc<"activities">["spec"], response: Doc<"attempts">["response"]) {
  if (spec.kind === "multipleChoice") {
    if (response.kind !== "choice" || spec.correctOptionId === undefined) {
      return { verdict: "needs_review" as const, score: undefined as number | undefined };
    }
    const correct = spec.correctOptionId === response.optionId;
    return { verdict: correct ? "correct" as const : "incorrect" as const, score: correct ? 1 : 0 };
  }
  if (spec.kind === "shortAnswer") {
    if (response.kind !== "text" || spec.expectedAnswer === undefined) {
      return { verdict: "needs_review" as const, score: undefined as number | undefined };
    }
    const expected = spec.expectedAnswer.toLowerCase().trim();
    const given = response.text.toLowerCase().trim().replace(/\s+/g, " ");
    const verdict = expected !== "" && given === expected ? "correct" as const : "incorrect" as const;
    return { verdict, score: verdict === "correct" ? 1 : 0 };
  }
  if (spec.kind === "classify") {
    if (response.kind !== "classification" || spec.correctAssignments === undefined) {
      return { verdict: "needs_review" as const, score: undefined as number | undefined };
    }
    const key = new Map(spec.correctAssignments.map((a) => [a.itemId, a.bucketId]));
    const itemIds = new Set(spec.items.map((i) => i.id));
    const bucketIds = new Set(spec.buckets.map((b) => b.id));
    const submitted = response.assignments.map((a) => a.itemId);
    const valid =
      key.size === spec.items.length &&
      submitted.length === spec.items.length &&
      new Set(submitted).size === submitted.length &&         // no dup item ids
      submitted.every((id) => itemIds.has(id)) &&              // real items only
      response.assignments.every((a) => bucketIds.has(a.bucketId)); // real buckets
    if (!valid) {
      return { verdict: "needs_review" as const, score: undefined as number | undefined };
    }
    const matched = response.assignments.filter((a) => key.get(a.itemId) === a.bucketId).length;
    const score = matched / spec.items.length;
    const verdict = score === 1 ? "correct" as const : score >= 0.5 ? "partial" as const : "incorrect" as const;
    return { verdict, score };
  }
  // teachBack + mismatched responses need human/model review — never auto-pass.
  return { verdict: "needs_review" as const, score: undefined as number | undefined };
}

/** `learningRuntime.submitAttempt` — ownership-checked, revision-pinned, evaluated. */
export const submitAttempt = mutation({
  args: {
    activityId: v.id("activities"),
    activityRevision: v.number(),
    attemptKey: v.string(),
    response: v.union(
      v.object({ kind: v.literal("choice"), optionId: v.string() }),
      v.object({ kind: v.literal("text"), text: v.string() }),
      v.object({
        kind: v.literal("classification"),
        assignments: v.array(v.object({ itemId: v.string(), bucketId: v.string() })),
      }),
    ),
  },
  returns: v.object({
    attemptId: v.id("attempts"),
    verdict: v.union(v.literal("correct"), v.literal("partial"), v.literal("incorrect"), v.literal("needs_review")),
    masteryUpdated: v.number(),
  }),
  handler: async (ctx, { activityId, activityRevision, response, attemptKey }) => {
    const userId = await requireLearnerId(ctx);
    const activity = await ctx.db.get(activityId);
    if (activity === null) throw err("INVALID_INPUT", "activity not found");
    if (activity.revision !== activityRevision) throw err("CONFLICT", "activity revised; reload before answering");
    // Idempotent submit: a retried key returns the original attempt.
    // Exact indexed dedupe — no scan cap, no replay ambiguity.
    {
      const dup = await ctx.db
        .query("attempts")
        .withIndex("by_user_activity_key", (q) =>
          q.eq("userId", userId).eq("activityId", activityId).eq("attemptKey", attemptKey))
        .first();
      if (dup !== null) {
        if (JSON.stringify(dup.response) !== JSON.stringify(response)) {
          throw err("CONFLICT", "attemptKey reused with a different response");
        }
        return { attemptId: dup._id, verdict: dup.evaluation?.verdict ?? "needs_review", masteryUpdated: 0 };
      }
    }
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
      attemptKey,
    });

    // Mastery upsert ONLY for objectives this activity actually assesses —
    // and ONLY when the attempt is truly evaluated (needs_review never
    // writes evidence or changes state).
    let masteryUpdated = 0;
    if (ev.verdict === "needs_review") {
      return { attemptId, verdict: ev.verdict, masteryUpdated };
    }
    // Aggregate evidence across ALL activities assessing each objective —
    // mastery after remedial practice must see evidence from every activity.
    // Relevant activities: everything on the same lesson (incl. accepted
    // remedial practice). Bounded indexed read.
    const relatedActs = await ctx.db
      .query("activities")
      .withIndex("by_lesson", (q) => q.eq("lessonId", activity.lessonId))
      .take(50);
    const actById = new Map(relatedActs.map((a) => [String(a._id), a]));
    const priorAttempts = (await ctx.db
      .query("attempts")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .take(200))
      .filter((a) => actById.has(String(a.activityId)));
    const evidenceRows = priorAttempts
      .filter((a) => a.evaluation !== undefined)
      .flatMap((a) =>
        (actById.get(String(a.activityId))?.objectiveIds ?? []).map((objectiveId) => ({
          attemptId: String(a._id),
          userId: String(userId),
          objectiveId: String(objectiveId),
          activityId: String(a.activityId),
          activityRevision: a.activityRevision,
          actionKind: (a.response.kind === "choice" ? "choice" : a.response.kind === "classification" ? "classification" : a.response.kind === "text" ? "text" : "teachBack") as ObjectiveEvidence["actionKind"],
          verdict: a.evaluation!.verdict,
          score: a.evaluation!.score,
          sourceSegmentIds: (actById.get(String(a.activityId))?.sourceRefs ?? []).map((r) => r.segmentId).filter((x): x is Id<"sourceSegments"> => x !== undefined).map(String),
          lessonId: String(actById.get(String(a.activityId))?.lessonId ?? activity.lessonId),
          evaluatedAt: a.evaluation!.evaluatedAt,
        })),
      );
    for (const objectiveId of activity.objectiveIds) {
      // Policy-derived mastery: the engine recomputes the objective's state
      // from ALL of this learner's evaluated evidence — one lucky correct
      // answer can never jump straight to demonstrated.
      const evidenceFor = evidenceRows.filter((e) => e.objectiveId === String(objectiveId));
      const engineMastery = deriveMastery(String(objectiveId), String(userId), evidenceFor);
      const derivedState = engineMastery.state;
      const existing = await ctx.db
        .query("mastery")
        .withIndex("by_user_objective", (q) => q.eq("userId", userId).eq("objectiveId", objectiveId))
        .first();
      const band = ev.verdict === "correct" ? "high" : ev.verdict === "partial" ? "medium" : "low";
      const state = derivedState;
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
    // Remediation trigger: after evaluated incorrect evidence, ask the
    // deterministic engine whether a practice branch is justified. The
    // engine decides — this backend only supplies real evidence, the
    // authorized segment set and a gradable remedial spec, then persists
    // any "propose" outcome with triggerKey dedupe.
    if (ev.verdict === "incorrect") {
      const attempts = await ctx.db
        .query("attempts")
        .withIndex("by_user_activity", (q) => q.eq("userId", userId).eq("activityId", activityId))
        .take(50);
      const authorizedSegmentIds = activity.sourceRefs
        .map((r) => r.segmentId)
        .filter((x): x is Id<"sourceSegments"> => x !== undefined)
        .map(String);
      const incorrectCount = attempts.filter((a) => a.evaluation?.verdict === "incorrect").length;
      if (incorrectCount < 2) {
        return { attemptId, verdict: ev.verdict, masteryUpdated }; // policy: propose only at ≥2 mistakes
      }
      for (const objectiveId of activity.objectiveIds) {
        const evidence: ObjectiveEvidence[] = attempts
          .filter((a) => a.evaluation !== undefined)
          .map((a) => ({
            attemptId: String(a._id),
            userId: String(userId),
            objectiveId: String(objectiveId),
            activityId: String(a.activityId),
            activityRevision: a.activityRevision,
            actionKind: a.response.kind === "choice" ? "choice" as const : a.response.kind === "text" ? "text" as const : "teachBack" as const,
            verdict: a.evaluation!.verdict,
            score: a.evaluation!.score,
            sourceSegmentIds: authorizedSegmentIds,
            lessonId: String(activity.lessonId),
            evaluatedAt: a.evaluation!.evaluatedAt,
          }));
        // Gradable remedial spec: same validated options + ground truth,
        // framed as a source-cited retry (answer key stays server-side).
        const remedialSpec =
          activity.spec.kind === "multipleChoice"
            ? ({ ...activity.spec, prompt: `Revisit the source passage, then retry: ${activity.spec.prompt}` } as typeof activity.spec)
            : activity.spec;
        const outcome = evaluateForRemediation({
          userId: String(userId),
          objectiveId: String(objectiveId),
          evidence,
          authorizedSegmentIds,
          remediationSpec: remedialSpec as never,
        });
        if (outcome.kind !== "proposal") continue;
        const incorrectIds = attempts
          .filter((a) => a.evaluation?.verdict === "incorrect")
          .map((a) => a._id);
        // One live proposal per (activity, objective) — stable key means a
        // second evaluate→propose on growing evidence can never duplicate it.
        const triggerKey = `${activityId}:${objectiveId}`;
        const dup = await ctx.db
          .query("practiceProposals")
          .withIndex("by_trigger", (q) => q.eq("triggerKey", triggerKey))
          .first();
        if (dup !== null) continue;
        const now2 = Date.now();
        await ctx.db.insert("practiceProposals", {
          ownerId: userId,
          lessonId: activity.lessonId,
          triggerKey,
          triggerAttemptIds: incorrectIds.slice(-10),
          rationale: outcome.proposal.reason,
          spec: outcome.proposal.activitySpec as never,
          objectiveIds: [objectiveId],
          sourceRefs: activity.sourceRefs,
          state: "proposed",
          createdAt: now2,
          updatedAt: now2,
        });
      }
    }
    return { attemptId, verdict: ev.verdict, masteryUpdated };
  },
});

/**
 * `learningRuntime.compileLessonActivity` — owner-scoped activity creation.
 * SECURITY: client-supplied grading keys are STRIPPED — the public path can
 * only produce unscored activities (which grade as needs_review). Scored
 * activities come exclusively from `internalCompileScoredActivity`, where
 * the key arrives via trusted server data (model/proposal/materialization),
 * never from a client arg.
 */
export const internalCompileScoredActivity = internalMutation({
  args: {
    ownerId: v.id("users"),
    lessonId: v.id("lessons"),
    spec: activitySpec,
    objectiveIds: v.array(v.id("objectives")),
    sourceRefs: v.array(sourceRef),
  },
  returns: v.object({ activityId: v.id("activities") }),
  handler: async (ctx, { ownerId, lessonId, spec, objectiveIds, sourceRefs }) => {
    const lesson = await ctx.db.get(lessonId);
    if (lesson === null) throw new Error("lesson not found");
    // Ownership chain: lesson→unit→section→version→subject must belong to ownerId.
    const unit = await ctx.db.get(lesson.unitId);
    const section = unit === null ? null : await ctx.db.get(unit.sectionId);
    const version = section === null ? null : await ctx.db.get(section.versionId);
    const subject = version === null ? null : await ctx.db.get(version.subjectId);
    if (subject === null || subject.ownerId !== ownerId) throw new Error("unauthorized lesson");
    const allowed = new Set(lesson.objectiveIds.map(String));
    for (const oid of objectiveIds) {
      if (!allowed.has(String(oid))) throw new Error("objective not on lesson");
    }
    if (sourceRefs.length === 0) throw new Error("empty source references");
    // Citations must be a subset of the lesson's approved segment assignment.
    const approved = new Set<string>();
    for (const oid of lesson.objectiveIds) {
      const obj = await ctx.db.get(oid);
      if (obj === null) continue;
      for (const cid of obj.conceptIds) {
        const c = await ctx.db.get(cid);
        if (c === null) continue;
        for (const r of c.sourceRefs) {
          if (r.segmentId !== undefined) approved.add(String(r.segmentId));
        }
      }
    }
    for (const ref of sourceRefs) {
      const src = await ctx.db.get(ref.sourceId);
      if (src === null || src.status === "deleted") throw new Error("source missing/deleted");
      if (src.ownerId !== ownerId) throw new Error("foreign-owned source");
      if (ref.segmentId !== undefined) {
        const seg = await ctx.db.get(ref.segmentId);
        if (seg === null || seg.sourceId !== ref.sourceId) {
          throw new Error("segment/source mismatch");
        }
        if (approved.size === 0 || !approved.has(String(ref.segmentId))) {
          throw new Error("segment outside approved lesson citations");
        }
      }
    }
    const activityId = await ctx.db.insert("activities", {
      lessonId, spec, objectiveIds, sourceRefs, revision: 1, createdAt: Date.now(),
    });
    return { activityId };
  },
});

/**
 * Trusted scored-activity materialization for an approved lesson. Resolves
 * the lesson's own authorized source segments and compiles a validated,
 * source-backed classify activity — key derived server-side, never client
 * input. Scheduled from learningReview.review on approval.
 */
const CELLS_CLASSIFY = {
  kind: "classify" as const,
  prompt: "Sort each cell feature: shared by plant and animal, or plant-only?",
  items: [
    { id: "f-wall", label: "cellulose cell wall" },
    { id: "f-chloroplast", label: "chloroplasts" },
    { id: "f-bigvac", label: "large permanent vacuole" },
    { id: "f-membrane", label: "cell membrane" },
    { id: "f-nucleus", label: "nucleus" },
    { id: "f-cytoplasm", label: "cytoplasm" },
  ],
  buckets: [
    { id: "plant", label: "plant cells only" },
    { id: "shared", label: "shared (plant & animal)" },
  ],
  correctAssignments: [
    { itemId: "f-wall", bucketId: "plant" },
    { itemId: "f-chloroplast", bucketId: "plant" },
    { itemId: "f-bigvac", bucketId: "plant" },
    { itemId: "f-membrane", bucketId: "shared" },
    { itemId: "f-nucleus", bucketId: "shared" },
    { itemId: "f-cytoplasm", bucketId: "shared" },
  ],
};

/** Keyword evidence required for each graded fact (item→bucket). */
const FACT_KEYWORDS: Record<string, string[]> = {
  "f-wall": ["cell wall", "wall"],
  "f-chloroplast": ["chloroplast"],
  "f-bigvac": ["vacuole"],
  "f-membrane": ["membrane"],
  "f-nucleus": ["nucleus"],
  "f-cytoplasm": ["cytoplasm"],
};

export const materializeScoredActivity = internalMutation({
  args: { lessonId: v.id("lessons") },
  returns: v.object({ activityId: v.union(v.id("activities"), v.null()) }),
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (lesson === null) return { activityId: null };
    // Idempotent: a scored classify already on this lesson → return it.
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
      .take(20);
    const prev = existing.find((a) => a.spec.kind === "classify");
    if (prev !== undefined) return { activityId: prev._id };

    // Grounding: the lesson's OWN persisted approved citations. Legacy
    // lessons without sourceRefs fall back to objectives→concepts→refs.
    const refs: { sourceId: Id<"sources">; segmentId: Id<"sourceSegments"> }[] = [];
    const segIds = new Set<string>();
    if (lesson.sourceRefs !== undefined && lesson.sourceRefs.length > 0) {
      for (const r of lesson.sourceRefs) {
        if (r.segmentId !== undefined) {
          segIds.add(String(r.segmentId));
          refs.push({ sourceId: r.sourceId, segmentId: r.segmentId });
        }
      }
    } else {
      for (const oid of lesson.objectiveIds) {
        const obj = await ctx.db.get(oid);
        if (obj === null) continue;
        for (const cid of obj.conceptIds) {
          const concept = await ctx.db.get(cid);
          if (concept === null) continue;
          for (const r of concept.sourceRefs) {
            if (r.segmentId !== undefined && !segIds.has(String(r.segmentId))) {
              segIds.add(String(r.segmentId));
              refs.push({ sourceId: r.sourceId, segmentId: r.segmentId });
            }
          }
        }
      }
    }
    if (refs.length === 0) return { activityId: null }; // never fake citations
    // Scope: only an appropriate approved Biology lesson — the template is
    // a plant-vs-animal cell classification; anything else abstains.
    const lessonIsCells =
      /cell|plant|animal/i.test(lesson.title ?? "") ||
      (await Promise.all(lesson.objectiveIds.map(async (oid) =>
        /cell|plant|animal|membrane|nucleus|cytoplasm|chloroplast|vacuole/i.test(
          (await ctx.db.get(oid))?.statement ?? "")))).some(Boolean);
    if (!lessonIsCells) return { activityId: null };

    // Every graded fact must be supported by the authorized segment text —
    // a scored activity on unrelated material is a false ground.
    const texts: string[] = [];
    for (const r of refs) {
      const seg = await ctx.db.get(r.segmentId);
      if (seg !== null) texts.push(seg.text.toLowerCase());
    }
    const plantBucket = new Set(["f-wall", "f-chloroplast", "f-bigvac"]);
    const NEG = [/no\s+cell\s+wall/, /lack/, /without\s+chloroplast/, /not\s+found\s+in\s+plant/];
    if (texts.some((t) => NEG.some((re) => re.test(t)))) {
      return { activityId: null }; // contradictory passage → abstain
    }
    // Per-segment bucket evidence: a plant-only fact needs its keyword in a
    // segment that also asserts the plant context — corpus-level matches
    // can't launder unrelated keywords.
    const unsupported = CELLS_CLASSIFY.items.some((i) => {
      const kws = FACT_KEYWORDS[i.id] ?? [];
      const evidenced = texts.some((t) =>
        kws.some((kw) => t.includes(kw)) &&
        (plantBucket.has(i.id) ? t.includes("plant") : true));
      return !evidenced;
    });
    if (unsupported) return { activityId: null };

    const activityId = await ctx.db.insert("activities", {
      lessonId,
      spec: CELLS_CLASSIFY as never,
      objectiveIds: lesson.objectiveIds,
      sourceRefs: refs.slice(0, 6),
      revision: 1,
      createdAt: Date.now(),
    });
    return { activityId };
  },
});

export const compileLessonActivity = mutation({
  args: {
    lessonId: v.id("lessons"),
    spec: activitySpec,
    objectiveIds: v.optional(v.array(v.id("objectives"))),
    sourceRefs: v.optional(v.array(sourceRef)),
  },
  returns: v.object({ activityId: v.id("activities"), revision: v.number() }),
  handler: async (ctx, { lessonId, spec, objectiveIds, sourceRefs }) => {
    const userId = await requireLearnerId(ctx);
    const found = await ownedLesson(ctx as never, lessonId, userId);
    if (found === null) throw err("UNAUTHORIZED", "lesson not found");
    const objs = objectiveIds ?? found.lesson.objectiveIds;
    const lessonSet = new Set<string>(found.lesson.objectiveIds.map(String));
    for (const o of objs) {
      if (!lessonSet.has(String(o))) throw err("INVALID_INPUT", "objective not assessed by this lesson");
    }
    const revision = 1;
    const activityId = await ctx.db.insert("activities", {
      lessonId,
      spec: stripKeys(spec), // no client-supplied grading key ever persists
      objectiveIds: objs,
      sourceRefs: sourceRefs ?? [],
      revision,
      createdAt: Date.now(),
    });
    return { activityId, revision };
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
      .take(20)
      .then((rows) => rows.map((r) => ({ _id: r._id, state: r.state, rationale: r.rationale, spec: stripKeys(r.spec), createdAt: r.createdAt })));
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
