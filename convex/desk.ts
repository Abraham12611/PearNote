/**
 * The desk aggregate — one bounded, owner-scoped read for Home "your desk"
 * (session plan W2/W3). Every field is derivable evidence:
 *
 *   resume      ← the learner's own latest attempt → lesson → subject
 *   today       ← studyEvents session_items for the current UTC day
 *   focus       ← weeklyFocus rows for the current ISO week
 *   calendar    ← days with real evidence (attempts, xp, activity events)
 *   streak      ← consecutive evidence days ending today/yesterday
 *   upcoming    ← future studyEvents
 *   achievements← server-issued rows only
 *   activity    ← activityEvents feed
 *   crew        ← accepted friendships only (fresh account → empty)
 *   xp          ← xpLedger sum
 *
 * Write surface is deliberately internal: recordActivity / awardXp /
 * issueAchievement are internalMutations called by backend flows (attempt
 * grading, review acceptance, the demo seed). There is no client mutation
 * that can award points, badges or feed lines to itself.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { learnerId, requireLearnerId } from "./learningAuth";
import { achievementIcon, activityKind, studyEventKind, xpReason } from "./tables/desk";

const err = (code: string, message: string) => new ConvexError({ code, message });

const DAY_MS = 86_400_000;
const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** ISO week key — matches what the seed writes into weeklyFocus.weekKey. */
export function isoWeekKey(ts: number): string {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // monday = 0
  date.setUTCDate(date.getUTCDate() - day + 3); // nearest thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

/* ---- the shared read model (desk.get + demo.getDesk) ------------------ */

const subjectView = v.object({
  _id: v.id("subjects"),
  name: v.string(),
  avatarId: v.optional(v.string()),
  theme: v.optional(v.string()),
  goal: v.optional(v.string()),
  status: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const deskShape = v.object({
  learner: v.object({
    name: v.string(),
    image: v.optional(v.string()),
    color: v.optional(v.string()),
    personaId: v.optional(v.string()),
  }),
  subjects: v.array(subjectView),
  resume: v.union(
    v.object({
      lessonId: v.id("lessons"),
      lessonTitle: v.string(),
      subjectName: v.string(),
      unitTitle: v.string(),
    }),
    v.null(),
  ),
  today: v.array(
    v.object({
      _id: v.id("studyEvents"),
      title: v.string(),
      subjectName: v.optional(v.string()),
      minutes: v.optional(v.number()),
      done: v.boolean(),
      color: v.optional(v.string()),
    }),
  ),
  focus: v.array(
    v.object({
      _id: v.id("weeklyFocus"),
      text: v.string(),
      done: v.boolean(),
    }),
  ),
  studiedDays: v.array(v.string()),
  streakDays: v.number(),
  upcoming: v.array(
    v.object({
      _id: v.id("studyEvents"),
      kind: studyEventKind,
      title: v.string(),
      subjectName: v.optional(v.string()),
      startTs: v.number(),
      color: v.optional(v.string()),
    }),
  ),
  achievements: v.array(
    v.object({
      _id: v.id("achievements"),
      key: v.string(),
      title: v.string(),
      detail: v.string(),
      icon: achievementIcon,
      tint: v.optional(v.string()),
      issuedAt: v.number(),
      seen: v.boolean(),
    }),
  ),
  unseenAchievements: v.number(),
  activity: v.array(
    v.object({
      _id: v.id("activityEvents"),
      actorName: v.string(),
      kind: activityKind,
      text: v.string(),
      subjectName: v.optional(v.string()),
      happenedAt: v.number(),
    }),
  ),
  crew: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      image: v.optional(v.string()),
      color: v.optional(v.string()),
      personaId: v.optional(v.string()),
    }),
  ),
  crewNote: v.union(
    v.object({ authorName: v.string(), text: v.string(), happenedAt: v.number() }),
    v.null(),
  ),
  xpTotal: v.number(),
  sourceCount: v.number(),
  /* demonstrated objectives stale enough to revisit (cold-start review) */
  revisit: v.array(
    v.object({
      objectiveId: v.id("objectives"),
      subjectId: v.id("subjects"),
      statement: v.string(),
      subjectName: v.string(),
      lastAt: v.number(),
    }),
  ),
});

export type DeskAggregate = {
  learner: { name: string; image?: string; color?: string; personaId?: string };
  subjects: Doc<"subjects">[];
  resume: { lessonId: Id<"lessons">; lessonTitle: string; subjectName: string; unitTitle: string } | null;
  today: Doc<"studyEvents">[];
  focus: Doc<"weeklyFocus">[];
  studiedDays: string[];
  streakDays: number;
  upcoming: Doc<"studyEvents">[];
  achievements: Doc<"achievements">[];
  unseenAchievements: number;
  activity: Doc<"activityEvents">[];
  crew: { userId: Id<"users">; name: string; image?: string; color?: string; personaId?: string }[];
  crewNote: { authorName: string; text: string; happenedAt: number } | null;
  xpTotal: number;
  sourceCount: number;
  revisit: {
    objectiveId: Id<"objectives">;
    subjectId: Id<"subjects">;
    statement: string;
    subjectName: string;
    lastAt: number;
  }[];
};

/**
 * The whole desk for one owner. Shared by `desk.get` (the signed-in owner)
 * and `demo.getDesk` (the flagged demo owner) — the demo reads the exact
 * same systems as a real account, which is the point.
 */
export async function deskAggregate(ctx: DbCtx, userId: Id<"users">): Promise<DeskAggregate> {
  const now = Date.now();
  const todayStart = Date.parse(dayKey(now));
  const todayEnd = todayStart + DAY_MS;

  const [user, subjects, sources, focus, allXp, achievementsRows, activity, friends] =
    await Promise.all([
      ctx.db.get(userId),
      ctx.db.query("subjects").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect(),
      ctx.db.query("sources").withIndex("by_owner", (q) => q.eq("ownerId", userId)).take(200),
      ctx.db
        .query("weeklyFocus")
        .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("weekKey", isoWeekKey(now)))
        .collect(),
      ctx.db.query("xpLedger").withIndex("by_user", (q) => q.eq("userId", userId)).take(1000),
      ctx.db.query("achievements").withIndex("by_user", (q) => q.eq("userId", userId)).take(50),
      ctx.db
        .query("activityEvents")
        .withIndex("by_owner_time", (q) => q.eq("ownerId", userId))
        .order("desc")
        .take(12),
      ctx.db
        .query("friendships")
        .withIndex("by_user_state", (q) => q.eq("userId", userId).eq("state", "accepted"))
        .take(12),
    ]);

  // Resume — the latest real attempt, resolved attempt → activity →
  // lesson → unit → section → version → subject.
  let resume: DeskAggregate["resume"] = null;
  const lastAttempt = await ctx.db
    .query("attempts")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
  if (lastAttempt !== null) {
    const activity = await ctx.db.get(lastAttempt.activityId);
    const lesson = activity === null ? null : await ctx.db.get(activity.lessonId);
    const unit = lesson === null ? null : await ctx.db.get(lesson.unitId);
    const section = unit === null ? null : await ctx.db.get(unit.sectionId);
    const version = section === null ? null : await ctx.db.get(section.versionId);
    const subject = version === null ? null : await ctx.db.get(version.subjectId);
    if (lesson !== null && unit !== null && subject !== null) {
      resume = {
        lessonId: lesson._id,
        lessonTitle: lesson.title ?? "untitled lesson",
        subjectName: subject.name,
        unitTitle: unit.title,
      };
    }
  }

  // Calendar + streak — evidence days from xp, attempts and feed lines.
  const windowStart = now - 45 * DAY_MS;
  const recentAttempts = await ctx.db
    .query("attempts")
    .withIndex("by_user_time", (q) => q.eq("userId", userId).gte("createdAt", windowStart))
    .take(500);
  const studied = new Set<string>();
  for (const x of allXp) studied.add(x.day);
  for (const a of recentAttempts) studied.add(dayKey(a.createdAt));
  for (const e of activity) {
    if (e.kind !== "crew_message" && e.happenedAt >= windowStart) studied.add(dayKey(e.happenedAt));
  }
  let streakDays = 0;
  // today counts once evidence lands; otherwise the streak ends yesterday.
  let cursor = studied.has(dayKey(now)) ? todayStart : todayStart - DAY_MS;
  while (studied.has(dayKey(cursor))) {
    streakDays += 1;
    cursor -= DAY_MS;
  }

  const events = await ctx.db
    .query("studyEvents")
    .withIndex("by_user_start", (q) => q.eq("userId", userId))
    .take(120);
  const today = events
    .filter((e) => e.kind === "session_item" && e.startTs >= todayStart && e.startTs < todayEnd)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const upcoming = events
    .filter((e) => e.kind !== "session_item" && e.startTs >= now - DAY_MS / 2)
    .sort((a, b) => a.startTs - b.startTs)
    .slice(0, 5);

  const crewRows = await Promise.all(friends.map((f) => ctx.db.get(f.friendUserId)));
  const crew = crewRows
    .filter((u): u is Doc<"users"> => u !== null)
    .map((u) => ({
      userId: u._id,
      name: u.name ?? "friend",
      image: u.image,
      color: u.color,
      personaId: u.personaId,
    }));

  const crewNoteEvent = activity.find((e) => e.kind === "crew_message") ?? null;

  /* Cold-start review: objectives the learner already demonstrated but
     hasn't revisited recently resurface for spaced review — evidence
     older than REVISIT_AGE_MS earns a slot, stalest first. */
  const REVISIT_AGE_MS = 5 * DAY_MS;
  const masteryRows = await ctx.db
    .query("mastery")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(200);
  const revisitBase = masteryRows
    .filter((m) => m.state === "demonstrated" && m.evidence.length > 0)
    .map((m) => ({ m, lastAt: Math.max(...m.evidence.map((e) => e.at)) }))
    .filter((c) => now - c.lastAt > REVISIT_AGE_MS)
    .sort((a, b) => a.lastAt - b.lastAt)
    .slice(0, 3);
  const revisit = (
    await Promise.all(
      revisitBase.map(async (c) => {
        const obj = await ctx.db.get(c.m.objectiveId);
        if (obj === null) return null;
        const sub = await ctx.db.get(obj.subjectId);
        return {
          objectiveId: obj._id,
          subjectId: obj.subjectId,
          statement: obj.statement,
          subjectName: sub?.name ?? "subject",
          lastAt: c.lastAt,
        };
      }),
    )
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    learner: {
      name: user?.name ?? "learner",
      image: user?.image,
      color: user?.color,
      personaId: user?.personaId,
    },
    subjects,
    resume,
    today,
    focus,
    studiedDays: [...studied].sort(),
    streakDays,
    upcoming,
    achievements: achievementsRows.sort((a, b) => a.issuedAt - b.issuedAt).slice(0, 6),
    unseenAchievements: achievementsRows.filter((a) => !a.seen).length,
    activity,
    crew,
    crewNote:
      crewNoteEvent === null
        ? null
        : { authorName: crewNoteEvent.actorName, text: crewNoteEvent.text, happenedAt: crewNoteEvent.happenedAt },
    xpTotal: allXp.reduce((n, x) => n + x.points, 0),
    sourceCount: sources.filter((s) => s.status !== "deleted").length,
    revisit,
  };
}

/** Strip each doc down to exactly the deskShape fields — Convex return
 *  validators are exact-match, so raw docs (with _creationTime/ownerId)
 *  would fail validation if returned verbatim. */
export const deskToView = (agg: DeskAggregate) => ({
  learner: agg.learner,
  subjects: agg.subjects.map((s) => ({
    _id: s._id, name: s.name, avatarId: s.avatarId, theme: s.theme,
    goal: s.goal, status: s.status, createdAt: s.createdAt, updatedAt: s.updatedAt,
  })),
  resume: agg.resume,
  today: agg.today.map((e) => ({
    _id: e._id, title: e.title, subjectName: e.subjectName,
    minutes: e.minutes, done: e.done, color: e.color,
  })),
  focus: agg.focus.map((f) => ({ _id: f._id, text: f.text, done: f.done })),
  studiedDays: agg.studiedDays,
  streakDays: agg.streakDays,
  upcoming: agg.upcoming.map((e) => ({
    _id: e._id, kind: e.kind, title: e.title,
    subjectName: e.subjectName, startTs: e.startTs, color: e.color,
  })),
  achievements: agg.achievements.map((a) => ({
    _id: a._id, key: a.key, title: a.title, detail: a.detail,
    icon: a.icon, tint: a.tint, issuedAt: a.issuedAt, seen: a.seen,
  })),
  unseenAchievements: agg.unseenAchievements,
  activity: agg.activity.map((e) => ({
    _id: e._id, actorName: e.actorName, kind: e.kind, text: e.text,
    subjectName: e.subjectName, happenedAt: e.happenedAt,
  })),
  crew: agg.crew,
  crewNote: agg.crewNote,
  xpTotal: agg.xpTotal,
  sourceCount: agg.sourceCount,
  revisit: agg.revisit,
});

/** `desk.get` — the signed-in learner's desk. Empty/honest for a new account. */
export const get = query({
  args: {},
  returns: v.union(deskShape, v.null()),
  handler: async (ctx) => {
    const userId = await learnerId(ctx);
    if (userId === null) return null;
    return deskToView(await deskAggregate(ctx, userId));
  },
});

/** Mark the learner's own achievements seen — the "3 new" chip clears. */
export const markAchievementsSeen = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireLearnerId(ctx);
    const rows = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(rows.filter((a) => !a.seen).map((a) => ctx.db.patch(a._id, { seen: true })));
    return null;
  },
});

/** Toggle one of the learner's own focus/session checklist rows. */
export const toggleChecklistItem = mutation({
  args: { table: v.union(v.literal("weeklyFocus"), v.literal("studyEvents")), id: v.string() },
  returns: v.null(),
  handler: async (ctx, { table, id }) => {
    const userId = await requireLearnerId(ctx);
    if (table === "weeklyFocus") {
      const row = await ctx.db.get(id as Id<"weeklyFocus">);
      if (row === null || row.userId !== userId) throw err("UNAUTHORIZED", "not yours");
      await ctx.db.patch(row._id, { done: !row.done });
    } else {
      const row = await ctx.db.get(id as Id<"studyEvents">);
      if (row === null || row.userId !== userId) throw err("UNAUTHORIZED", "not yours");
      await ctx.db.patch(row._id, { done: !row.done });
    }
    return null;
  },
});

/* ---- internal writers (backend flows and the demo seed only) ---------- */

export const recordActivity = internalMutation({
  args: {
    ownerId: v.id("users"),
    actorName: v.optional(v.string()),
    actorUserId: v.optional(v.id("users")),
    kind: activityKind,
    text: v.string(),
    subjectId: v.optional(v.id("subjects")),
    subjectName: v.optional(v.string()),
    happenedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("activityEvents", {
      ownerId: args.ownerId,
      actorName: args.actorName ?? "you",
      actorUserId: args.actorUserId,
      kind: args.kind,
      text: args.text,
      subjectId: args.subjectId,
      subjectName: args.subjectName,
      happenedAt: args.happenedAt ?? Date.now(),
    });
    return null;
  },
});

/** XP — dedupe on refId so a retried grading path can never double-pay. */
export const awardXp = internalMutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    reason: xpReason,
    refId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { userId, points, reason, refId }) => {
    if (refId !== undefined) {
      const existing = await ctx.db
        .query("xpLedger")
        .withIndex("by_user_ref", (q) => q.eq("userId", userId).eq("refId", refId))
        .first();
      if (existing !== null) return null;
    }
    await ctx.db.insert("xpLedger", { userId, points, reason, refId, day: dayKey(Date.now()), createdAt: Date.now() });
    return null;
  },
});

/** Achievements — one row per (user, key); re-issue attempts are no-ops. */
export const issueAchievement = internalMutation({
  args: {
    userId: v.id("users"),
    key: v.string(),
    title: v.string(),
    detail: v.string(),
    icon: achievementIcon,
    tint: v.optional(v.string()),
    evidenceRef: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user_key", (q) => q.eq("userId", args.userId).eq("key", args.key))
      .first();
    if (existing !== null) return null;
    await ctx.db.insert("achievements", { ...args, seen: false, issuedAt: Date.now() });
    return null;
  },
});
