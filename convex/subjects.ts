/**
 * Subject ownership surface (Phase 00.4). Contracts: engineering/API_CONTRACTS.md.
 *
 * Every function derives the owner from ctx.auth via learningAuth.ts — a
 * client-supplied ownerId does not exist in any args shape, so there is no
 * path from a forged id to owning or reading someone else's subject.
 * Reads fail closed: not-owner looks exactly like not-found.
 *
 * Nothing here ever creates content on its own: subjects are born
 * `manual_empty` and stay that way until the learner or an approved import
 * fills them (AGENTS.md rule 7 — never seed a real student's subjects).
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  learnerId,
  ownedSubject,
  requireLearnerId,
  requireOwnedSubject,
} from "./learningAuth";
import { subjectStatus } from "./tables/learning";
import type { Doc } from "./_generated/dataModel";

const invalidInput = (message: string) =>
  new ConvexError({ code: "INVALID_INPUT" as const, message });

const NAME_MAX = 120;

const subjectSummary = {
  _id: v.id("subjects"),
  name: v.string(),
  avatarId: v.optional(v.string()),
  theme: v.optional(v.string()),
  goal: v.optional(v.string()),
  status: subjectStatus,
  createdAt: v.number(),
  updatedAt: v.number(),
};

// Never hand the raw row back: ownerId/_creationTime are deliberately not
// part of the client surface (returns validators reject extra fields).
const toSummary = (s: Doc<"subjects">) => ({
  _id: s._id,
  name: s.name,
  avatarId: s.avatarId,
  theme: s.theme,
  goal: s.goal,
  status: s.status,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

/** `subjects.listMine` — own subject summaries. Signed-out visitors get []. */
export const listMine = query({
  args: {},
  returns: v.array(v.object(subjectSummary)),
  handler: async (ctx) => {
    const userId = await learnerId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("subjects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return rows.map(toSummary);
  },
});

/** `subjects.get` — one subject, owner only. Guessed ids return null. */
export const get = query({
  args: { subjectId: v.id("subjects") },
  returns: v.union(v.object(subjectSummary), v.null()),
  handler: async (ctx, { subjectId }) => {
    const subject = await ownedSubject(ctx, subjectId);
    return subject === null ? null : toSummary(subject);
  },
});

/** `subjects.createManual` — an empty subject the learner names themselves. */
export const createManual = mutation({
  args: {
    name: v.string(),
    avatarId: v.optional(v.string()),
    theme: v.optional(v.string()),
    goal: v.optional(v.string()),
  },
  returns: v.object({ subjectId: v.id("subjects") }),
  handler: async (ctx, args) => {
    const ownerId = await requireLearnerId(ctx);
    const name = args.name.trim();
    if (name.length === 0 || name.length > NAME_MAX) {
      throw invalidInput(`subject name must be 1..${NAME_MAX} characters`);
    }
    const now = Date.now();
    const subjectId = await ctx.db.insert("subjects", {
      ownerId,
      name,
      avatarId: args.avatarId,
      theme: args.theme,
      goal: args.goal,
      status: "manual_empty",
      createdAt: now,
      updatedAt: now,
    });
    return { subjectId };
  },
});

/** `subjects.rename` — owner only. */
export const rename = mutation({
  args: { subjectId: v.id("subjects"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { subjectId, name }) => {
    await requireOwnedSubject(ctx, subjectId);
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > NAME_MAX) {
      throw invalidInput(`subject name must be 1..${NAME_MAX} characters`);
    }
    await ctx.db.patch(subjectId, { name: trimmed, updatedAt: Date.now() });
    return null;
  },
});

/** `subjects.setStatus` — lifecycle transitions, owner only. */
export const setStatus = mutation({
  args: { subjectId: v.id("subjects"), status: subjectStatus },
  returns: v.null(),
  handler: async (ctx, { subjectId, status }) => {
    const subject = await requireOwnedSubject(ctx, subjectId);
    if (subject.status !== status) {
      await ctx.db.patch(subjectId, { status, updatedAt: Date.now() });
    }
    return null;
  },
});
