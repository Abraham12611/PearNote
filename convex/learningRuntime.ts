/**
 * Lesson runtime API (Issue #31 slice 1): read an approved lesson's spec,
 * record server-evaluated attempts, derive mastery, and persist consented
 * practice proposals. Ownership chains lesson→unit→section→version→subject.
 * Engine wiring (Engineer 1's deterministic adapter) is a follow-up behind
 * the practiceProposals store — this file owns all auth/persistence.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireLearnerId } from "./learningAuth";
import type { Doc, Id } from "./_generated/dataModel";
import { activitySpec, masteryState, sourceRef } from "./tables/learning";
import type { NoteData } from "./widgetData";
import { randomSuffix, slugify } from "./spaces";

import { evaluateForRemediation } from "../src/pearnotes/learning-engine/remediation";
import { deriveMastery } from "../src/pearnotes/learning-engine/mastery";
import type { ObjectiveEvidence } from "../src/pearnotes/learning-engine/types";

const err = (code: string, message: string) => new ConvexError({ code, message });

/** Resolve lesson→subject and verify the caller owns the subject.
 *  Exported for the demo read path (convex/demo.ts) which authorizes the
 *  seeded demo owner instead of the signed-in caller. */
export async function ownedLesson(ctx: { db: { get: (id: never) => Promise<unknown> } }, lessonId: Id<"lessons">, userId: Id<"users">) {
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
      sourceRefs: v.array(sourceRef),
      /**
       * Issue #53: the real objective statements plus the caller's own
       * server-computed mastery — the only honest inputs for a progress
       * compass. Empty array = lesson tracks no objectives (untracked),
       * never "0 of 0 covered".
       */
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
    const objectives = await Promise.all(
      found.lesson.objectiveIds.slice(0, 30).map(async (oid) => {
        const obj = await ctx.db.get(oid);
        if (obj === null) return null;
        const m = await ctx.db
          .query("mastery")
          .withIndex("by_user_objective", (q) => q.eq("userId", userId).eq("objectiveId", oid))
          .first();
        // No mastery row is honest "not_started" — it means zero evaluated
        // evidence, a state the server can actually vouch for.
        return { _id: obj._id, statement: obj.statement, mastery: m?.state ?? "not_started", evidenceCount: m?.evidence.length ?? 0 };
      }),
    );
    return {
      _id: found.lesson._id,
      title: found.lesson.title,
      specVersion: found.lesson.specVersion,
      objectiveIds: found.lesson.objectiveIds,
      sourceRefs: found.lesson.sourceRefs ?? [],
      objectives: objectives.filter((o) => o !== null),
      // Strip server-only answer keys before any read leaves the backend.
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
  },
});

/** Remove server-only answer keys without violating the closed union.
 *  Exported for the demo read path — same stripping contract. */
export function stripKeys(spec: Doc<"activities">["spec"]): Doc<"activities">["spec"] {
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

/**
 * Per-item post-grading marks (Issue #50 §3a): which submitted item landed
 * in the right bucket — derived from the server key AFTER evaluation. The
 * correct bucket is never disclosed, so a wrong mark can't be mined for the
 * answer. Only classify produces per-item marks; needs_review returns none.
 */
function classifyMarks(
  spec: Doc<"activities">["spec"],
  response: Doc<"attempts">["response"],
): { itemId: string; correct: boolean }[] | undefined {
  if (spec.kind !== "classify" || response.kind !== "classification" || spec.correctAssignments === undefined) {
    return undefined;
  }
  const key = new Map(spec.correctAssignments.map((a) => [a.itemId, a.bucketId]));
  return response.assignments.map((a) => ({ itemId: a.itemId, correct: key.get(a.itemId) === a.bucketId }));
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
    marks: v.optional(v.array(v.object({ itemId: v.string(), correct: v.boolean() }))),
  }),
  handler: async (ctx, { activityId, activityRevision, response, attemptKey }) => {
    const userId = await requireLearnerId(ctx);
    const activity = await ctx.db.get(activityId);
    // Missing and foreign are the same answer — probing well-formed ids can
    // never distinguish "doesn't exist" from "not yours" (code AND message).
    if (activity === null) throw err("UNAUTHORIZED", "activity not found");
    // Ownership BEFORE revision/dedupe: a foreign activity must be
    // indistinguishable from a missing one — a CONFLICT or replay answer
    // would confirm the row exists and leak its revision.
    const found = await ownedLesson(ctx as never, activity.lessonId, userId);
    if (found === null) throw err("UNAUTHORIZED", "activity not found");
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
        const replayVerdict = dup.evaluation?.verdict ?? "needs_review";
        return {
          attemptId: dup._id,
          verdict: replayVerdict,
          masteryUpdated: 0,
          // Same safeguard as first submission: an unevaluated needs_review
          // attempt must never emit marks — replaying it can't be used as
          // an answer-key oracle.
          marks: replayVerdict === "needs_review" ? undefined : classifyMarks(activity.spec, dup.response),
        };
      }
    }

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
    // Desk emitters (W4): XP follows the verdict — never the click — and
    // the feed records the honest event. Scheduled after commit so a slow
    // feed write can never block the verdict path.
    if (ev.verdict === "correct" || ev.verdict === "partial") {
      await ctx.scheduler.runAfter(0, internal.desk.awardXp, {
        userId,
        points: ev.verdict === "correct" ? 10 : 5,
        reason: "challenge_correct",
        refId: String(attemptId),
      });
    }
    const subject = await ctx.db.get(found.subject._id);
    await ctx.scheduler.runAfter(0, internal.desk.recordActivity, {
      ownerId: userId,
      actorName: "you",
      actorUserId: userId,
      kind: "challenge",
      text: `answered a ${activity.spec.kind === "multipleChoice" ? "challenge" : activity.spec.kind === "teachBack" ? "teach-back" : "question"} — ${ev.verdict.replace("_", " ")}`,
      subjectId: found.subject._id,
      subjectName: subject?.name ?? found.subject.name,
    });
    // Per-item marks only once a verdict exists — never for needs_review.
    const marks = ev.verdict === "needs_review" ? undefined : classifyMarks(activity.spec, response);

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
        return { attemptId, verdict: ev.verdict, masteryUpdated, marks }; // policy: propose only at ≥2 mistakes
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
    return { attemptId, verdict: ev.verdict, masteryUpdated, marks };
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
    if (sourceRefs.some((r) => r.segmentId === undefined)) {
      throw new Error("scored refs require segmentId");
    }
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

const TEMPLATE_ID = "cells_classify_v1";

/**
 * Sanity-only negation screen (Issue #45): a passage that DENIES the fact
 * ("plant cells do not have a cell wall", "lacks chloroplasts") cannot be
 * attested as support for it. This is a reviewer-mistake guard on top of
 * the human attestation — trust still comes from the attested row, never
 * from lexical analysis. The screen only fires when EVERY occurrence of
 * the term in the segment sits inside a negated clause; one affirmed
 * mention is enough to let the reviewer proceed.
 */
const NEGATION_CUE = /\b(no|not|never|without|lack|lacks|lacked|lacking|absence|absent|devoid|exclude|excluding|neither)\b/;
function segmentContradicts(text: string, term: string): boolean {
  const lower = text.toLowerCase();
  let idx = lower.indexOf(term);
  if (idx === -1) return false; // absence is checked separately by includes()
  let affirmed = false;
  while (idx !== -1 && !affirmed) {
    // Same-clause cue before the term: split the preceding window on
    // clause punctuation so a negation in an earlier clause doesn't count.
    const clauseBefore = lower.slice(Math.max(0, idx - 80), idx).split(/[.;:!?(),\n]/).pop() ?? "";
    const after = lower.slice(idx + term.length, idx + term.length + 50);
    const negated =
      NEGATION_CUE.test(clauseBefore) ||
      /\b(is|are|was|were|remains?)\s+(absent|missing|not\s+present|lacking)\b/.test(after);
    if (!negated) affirmed = true;
    idx = lower.indexOf(term, idx + term.length);
  }
  return !affirmed;
}

/**
 * Trusted attestation path (Issue #45): an internal/reviewer assertion that
 * specific lesson-approved segments support a specific fact→bucket. Sanity
 * checks (segment exists, belongs to the lesson's approved refs, text
 * mentions the fact term un-negated) guard against typos and contradictory
 * passages — they are NOT the basis of trust; the attestation itself is.
 * Immutable per (template, lesson, item).
 */
export const attestClassificationFacts = mutation({
  args: {
    templateId: v.string(),
    lessonId: v.id("lessons"),
    items: v.array(v.object({
      itemId: v.string(),
      bucketId: v.string(),
      segmentIds: v.array(v.id("sourceSegments")),
    })),
  },
  returns: v.object({ attested: v.number() }),
  handler: async (ctx, { templateId, lessonId, items }) => {
    // Real reviewer identity: the authenticated owner attesting their own
    // lesson — recorded as their userId, not a caller-supplied string.
    const attesterId = await requireLearnerId(ctx);
    const found = await ownedLesson(ctx as never, lessonId, attesterId);
    if (found === null) throw err("UNAUTHORIZED", "lesson not found");
    const lesson = found.lesson;
    const attestedBy = `owner:${String(attesterId)}`;
    const approved = new Set((lesson.sourceRefs ?? []).map((r) => String(r.segmentId)));
    if (approved.size === 0) throw new Error("lesson has no approved citations");
    const itemTerms: Record<string, string> = {
      "f-wall": "wall", "f-chloroplast": "chloroplast", "f-bigvac": "vacuole",
      "f-membrane": "membrane", "f-nucleus": "nucleus", "f-cytoplasm": "cytoplasm",
    };
    const allowedBuckets = new Set(CELLS_CLASSIFY.buckets.map((b) => b.id));
    let count = 0;
    for (const it of items) {
      if (itemTerms[it.itemId] === undefined) throw new Error(`unknown item ${it.itemId}`);
      if (!allowedBuckets.has(it.bucketId)) throw new Error(`unknown bucket ${it.bucketId}`);
      if (it.segmentIds.length === 0) throw new Error("attestation requires segmentIds");
      for (const sid of it.segmentIds) {
        if (!approved.has(String(sid))) throw new Error("segment outside lesson-approved refs");
        const seg = await ctx.db.get(sid);
        if (seg === null) throw new Error("segment missing");
        if (!seg.text.toLowerCase().includes(itemTerms[it.itemId])) {
          throw new Error(`segment text does not mention term for ${it.itemId}`);
        }
        if (segmentContradicts(seg.text, itemTerms[it.itemId])) {
          throw new Error(`segment contradicts the fact for ${it.itemId} — cite an affirming passage`);
        }
      }
      const existing = await ctx.db
        .query("factAttestations")
        .withIndex("by_template_lesson", (q) => q.eq("templateId", templateId).eq("lessonId", lessonId))
        .collect();
      const dup = existing.find((r) => r.itemId === it.itemId);
      if (dup !== undefined) {
        if (dup.bucketId !== it.bucketId) throw new Error("immutable attestation conflict");
        continue; // idempotent — same attestation already present
      }
      await ctx.db.insert("factAttestations", {
        templateId, lessonId, itemId: it.itemId, bucketId: it.bucketId,
        segmentIds: it.segmentIds, attestedBy, createdAt: Date.now(),
      });
      count++;
    }
    // One safe procedure: attest → schedule materialize for THIS lesson.
    // Idempotent end-to-end (attestation dedupes, materializer dedupes).
    await ctx.scheduler.runAfter(0, internal.learningRuntime.materializeScoredActivity, { lessonId });
    return { attested: count };
  },
});

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

    // Grounding: ONLY the lesson's OWN persisted approved citations. Issue
    // #45 removed the objectives→concepts→subject fallback for scored
    // compilation — broad subject concepts were never validated as
    // per-lesson support, and an implicit fallback could ground a graded
    // key on material the lesson never cited. No per-lesson refs → abstain.
    const refs: { sourceId: Id<"sources">; segmentId: Id<"sourceSegments"> }[] = [];
    const segIds = new Set<string>();
    for (const r of lesson.sourceRefs ?? []) {
      if (r.segmentId === undefined) continue;
      // Ref/segment integrity + live-source check: a stored ref is dropped
      // when the segment is gone, belongs to a different source than the
      // ref claims, or its source was deleted.
      const seg = await ctx.db.get(r.segmentId);
      if (seg === null || seg.sourceId !== r.sourceId) continue;
      const src = await ctx.db.get(r.sourceId);
      if (src === null || src.status === "deleted") continue;
      segIds.add(String(r.segmentId));
      refs.push({ sourceId: r.sourceId, segmentId: r.segmentId });
    }
    if (refs.length === 0) return { activityId: null }; // never fake citations
    // Scope: only lessons the owner has actually attested (see below).
    // TRUSTED ATTESTATION (Issue #45): every scored item must have a
    // reviewer-attested fact→bucket→segment binding, all citations inside
    // this lesson's own approved refs. Missing ANY attestation → abstain.
    const attestRows = await ctx.db
      .query("factAttestations")
      .withIndex("by_template_lesson", (q) => q.eq("templateId", TEMPLATE_ID).eq("lessonId", lessonId))
      .collect();
    const byItem = new Map(attestRows.map((r) => [r.itemId, r]));
    const correctBucket = new Map(CELLS_CLASSIFY.correctAssignments.map((a) => [a.itemId, a.bucketId]));
    const unattested = CELLS_CLASSIFY.items.some((i) => {
      const row = byItem.get(i.id);
      if (row === undefined) return true;                       // no attestation
      if (row.bucketId !== correctBucket.get(i.id)) return true; // wrong bucket attested
      return !row.segmentIds.every((sid) => segIds.has(String(sid))); // ref not lesson-approved
    });
    if (unattested) return { activityId: null };

    // Citations = the union of VERIFIED attested segments (with their
    // source ids resolved) — never an arbitrary first-N subset.
    const attestedSegIds = new Set<string>();
    for (const i of CELLS_CLASSIFY.items) {
      const row = byItem.get(i.id);
      if (row !== undefined) row.segmentIds.forEach((sid) => attestedSegIds.add(String(sid)));
    }
    const cited: { sourceId: Id<"sources">; segmentId: Id<"sourceSegments"> }[] = [];
    for (const sid of attestedSegIds) {
      const seg = await ctx.db.get(sid as Id<"sourceSegments">);
      if (seg !== null) cited.push({ sourceId: seg.sourceId, segmentId: seg._id });
    }
    if (cited.length === 0) return { activityId: null };
    const activityId = await ctx.db.insert("activities", {
      lessonId,
      spec: CELLS_CLASSIFY as never,
      objectiveIds: lesson.objectiveIds,
      sourceRefs: cited,
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

/** `learningRuntime.getLessonSegments` — owner-scoped: the lesson's own
 * approved segment texts, for attestation/review UI. Small bounded read. */
export const getLessonSegments = query({
  args: { lessonId: v.id("lessons") },
  returns: v.array(
    v.object({ _id: v.id("sourceSegments"), segmentNo: v.number(), page: v.optional(v.number()), text: v.string() }),
  ),
  handler: async (ctx, { lessonId }) => {
    const userId = await requireLearnerId(ctx);
    const found = await ownedLesson(ctx as never, lessonId, userId);
    if (found === null) return [];
    const out: { _id: Id<"sourceSegments">; segmentNo: number; page?: number; text: string }[] = [];
    for (const r of (found.lesson.sourceRefs ?? []).slice(0, 20)) {
      if (r.segmentId === undefined) continue;
      const seg = await ctx.db.get(r.segmentId);
      if (seg === null || seg.sourceId !== r.sourceId) continue;   // integrity: ref/segment mismatch
      const src = await ctx.db.get(r.sourceId);
      if (src === null || src.status === "deleted" || src.ownerId !== userId) continue;
      out.push({ _id: seg._id, segmentNo: seg.segmentNo, page: seg.page, text: seg.text.slice(0, 2000) });
    }
    return out;
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
      // Idempotent repeat: an accepted proposal replays the SAME activityId
      // (stored at materialization) — a retry never loses the activity or
      // mints a second one.
      return { state: proposal.state, activityId: proposal.activityId } as never;
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
    await ctx.db.patch(proposalId, { state: "accepted", activityId, updatedAt: now });
    return { state: "accepted" as const, activityId };
  },
});

/** W5 — provision the lesson's inherited-room canvas.
 *  Idempotent: an already-provisioned lesson returns its space; the room
 *  is owned by the subject's owner and named after the lesson so it reads
 *  correctly in the rail/spaces list. Internal only — provisioning comes
 *  from the approval path (learningReview) or the demo seed. */
export const ensureLessonSpace = internalMutation({
  args: { lessonId: v.id("lessons") },
  returns: v.id("spaces"),
  handler: async (ctx, { lessonId }) => {
    const lesson = await ctx.db.get(lessonId);
    if (lesson === null) throw err("UNAUTHORIZED", "lesson not found");
    const unit = await ctx.db.get(lesson.unitId);
    const section = unit === null ? null : await ctx.db.get(unit.sectionId);
    const version = section === null ? null : await ctx.db.get(section.versionId);
    const subject = version === null ? null : await ctx.db.get(version.subjectId);
    const now = Date.now();
    const name = `${subject?.name ?? "lesson"} · ${lesson.title ?? "lesson"}`;
    let spaceId = lesson.canvasSpaceId;
    if (spaceId === undefined) {
      spaceId = await ctx.db.insert("spaces", {
        name,
        type: "ongoing",
        icon: "lesson",
        color: subject?.theme ?? "#7c5cff",
        ownerId: subject?.ownerId,
        slug: `${slugify(name)}-${randomSuffix()}`,
        createdAt: now,
        lastActivityAt: now,
      });
      await ctx.db.patch(lessonId, { canvasSpaceId: spaceId });
    }
    await ensureLessonWidgets(ctx, spaceId, lesson, subject?.name ?? "lesson", now);
    return spaceId;
  },
});

/** Widget synthesis (W5 tail) — pin the lesson's activities as note
 *  cards inside its room: lessonCard → the pinned sheet, graded kinds →
 *  challenge prompts (answer keys NEVER render), teachBack → the
 *  teach-it-back prompt. `createdBy: "lesson:<id>"` is the provenance
 *  marker AND the dedupe key — re-provisioning can never duplicate cards. */
async function ensureLessonWidgets(
  ctx: MutationCtx,
  spaceId: Id<"spaces">,
  lesson: Doc<"lessons">,
  subjectName: string,
  now: number,
) {
  const marker = `lesson:${String(lesson._id)}`;
  const existing = await ctx.db
    .query("widgets")
    .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
    .take(50);
  if (existing.some((w) => w.createdBy === marker)) return;
  const acts = await ctx.db
    .query("activities")
    .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
    .take(20);
  let z = existing.length + 1;
  const pin = (i: number, data: NoteData) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return ctx.db.insert("widgets", {
      spaceId,
      type: "note",
      x: 140 + col * 360,
      y: 150 + row * 300,
      w: 320,
      h: 240,
      z: z++,
      data,
      createdBy: marker,
      createdAt: now,
      rotate: ((i * 7) % 5) - 2,
    });
  };
  // The room's anchor card — what this lesson is for.
  await pin(0, {
    title: lesson.title ?? "lesson",
    text: `a ${subjectName} lesson — the cards here are its activities`,
    kicker: subjectName,
    pin: true,
  });
  for (const [i, act] of acts.entries()) {
    const s = act.spec;
    if (s.kind === "lessonCard") {
      await pin(i + 1, { title: s.heading, text: s.body, kicker: "read me" });
    } else if (s.kind === "multipleChoice") {
      await pin(i + 1, {
        title: s.prompt,
        text: s.options.map((o, j) => `${String.fromCharCode(97 + j)}) ${o.label}`).join("   "),
        kicker: "challenge",
      });
    } else if (s.kind === "shortAnswer") {
      await pin(i + 1, { title: s.prompt, kicker: "answer it", text: "write the answer in your own words" });
    } else if (s.kind === "classify") {
      await pin(i + 1, {
        title: s.prompt,
        text: `sort ${s.items.length} items into ${s.buckets.map((b) => b.label).join(" / ")}`,
        kicker: "challenge",
      });
    } else if (s.kind === "teachBack") {
      await pin(i + 1, { title: s.prompt, kicker: "teach it back", text: "explain it like a friend would check you" });
    }
  }
}

/** W5 — the lesson's room handle for the UI mount. Owner-scoped; the
 *  client gets {spaceId, slug} or null (no canvas yet / foreign id). */
export const getLessonSpace = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(v.object({ spaceId: v.id("spaces"), slug: v.string() }), v.null()),
  handler: async (ctx, { lessonId }) => {
    const userId = await requireLearnerId(ctx);
    const found = await ownedLesson(ctx, lessonId, userId);
    if (found === null || found.lesson.canvasSpaceId === undefined) return null;
    const space = await ctx.db.get(found.lesson.canvasSpaceId);
    if (space === null || space.slug === undefined) return null;
    return { spaceId: space._id, slug: space.slug };
  },
});
