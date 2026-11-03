import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Desk domain — the Home "your desk" data systems (session plan W3).
 *
 * Same privacy posture as tables/learning.ts: every row is owner-scoped
 * and only ever read through learningAuth ownership checks — except the
 * clearly-flagged seeded demo accounts (`users.demoTag`), whose rows are
 * sample content served read-only by convex/demo.ts.
 *
 * XP, achievements and activity are SERVER-issued records: they are
 * written by backend flows (attempt grading, review acceptance, the demo
 * seed), never by a client mutation — the client can read them but can
 * never award itself points, badges or history.
 */

/** One audited award of XP. `day` (YYYY-MM-DD, UTC) powers the streak. */
export const xpReason = v.union(
  v.literal("objective_demonstrated"),
  v.literal("lesson_completed"),
  v.literal("challenge_correct"),
  v.literal("teachback_evaluated"),
  v.literal("practice_accepted"),
  v.literal("sample"),
);

export const xpLedger = defineTable({
  userId: v.id("users"),
  points: v.number(),
  reason: xpReason,
  /** What earned it (attempt/activity/lesson id) — audit trail. */
  refId: v.optional(v.string()),
  day: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_day", ["userId", "day"])
  // One ref can only pay out once — dedupe guard for retries.
  .index("by_user_ref", ["userId", "refId"]);

export const achievementIcon = v.union(
  v.literal("sprout"),
  v.literal("star"),
  v.literal("bolt"),
  v.literal("book"),
  v.literal("trophy"),
);

/** A server-issued achievement — the desk's "3 new" shelf card. */
export const achievements = defineTable({
  userId: v.id("users"),
  key: v.string(),
  title: v.string(),
  detail: v.string(),
  icon: achievementIcon,
  tint: v.optional(v.string()),
  /** The evidence that issued it (objective/lesson/attempt ref). */
  evidenceRef: v.optional(v.string()),
  seen: v.boolean(),
  issuedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_key", ["userId", "key"]);

export const activityKind = v.union(
  v.literal("upload"),
  v.literal("review"),
  v.literal("lesson"),
  v.literal("challenge"),
  v.literal("teachback"),
  v.literal("streak"),
  v.literal("crew_message"),
  v.literal("sample"),
);

/**
 * One line in the desk's "recent activity" feed. `ownerId` is whose feed
 * it lands on; `actorName` is the rendered attribution ("you", "Maya").
 * Crew-authored lines only appear after the owner consented to sharing
 * (friendships.shareActivity) — emitters must check it.
 */
export const activityEvents = defineTable({
  ownerId: v.id("users"),
  actorName: v.string(),
  actorUserId: v.optional(v.id("users")),
  kind: activityKind,
  text: v.string(),
  subjectId: v.optional(v.id("subjects")),
  subjectName: v.optional(v.string()),
  happenedAt: v.number(),
}).index("by_owner_time", ["ownerId", "happenedAt"]);

export const studyEventKind = v.union(
  // one row of today's "study session?" checklist
  v.literal("session_item"),
  v.literal("quiz"),
  v.literal("group"),
  v.literal("review"),
  v.literal("deadline"),
);

/** Planned study — calendar dots, the today checklist and "coming up". */
export const studyEvents = defineTable({
  userId: v.id("users"),
  kind: studyEventKind,
  title: v.string(),
  subjectId: v.optional(v.id("subjects")),
  subjectName: v.optional(v.string()),
  startTs: v.number(),
  minutes: v.optional(v.number()),
  done: v.boolean(),
  order: v.optional(v.number()),
  color: v.optional(v.string()),
}).index("by_user_start", ["userId", "startTs"]);

/** "this week's focus" checklist. weekKey = ISO week, e.g. "2026-W45". */
export const weeklyFocus = defineTable({
  userId: v.id("users"),
  weekKey: v.string(),
  text: v.string(),
  done: v.boolean(),
  order: v.number(),
}).index("by_user_week", ["userId", "weekKey"]);

/**
 * The "crew" — an explicit, consented relationship. A fresh account has
 * zero rows: the desk shows an invite panel, never invented friends.
 * `shareActivity` gates whether the friend's actions may appear in each
 * other's feeds (checked by emitters, not trusted to clients).
 */
export const friendships = defineTable({
  userId: v.id("users"),
  friendUserId: v.id("users"),
  state: v.union(v.literal("pending"), v.literal("accepted")),
  shareActivity: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_state", ["userId", "state"])
  .index("by_pair", ["userId", "friendUserId"]);
