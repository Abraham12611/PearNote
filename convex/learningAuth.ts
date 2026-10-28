/**
 * The one door for learning-domain reads and writes
 * (engineering/PERMISSIONS.md "Authorization patterns").
 *
 * Rules enforced here so no caller can forget them:
 *  - Identity comes from Convex Auth, never from a client argument.
 *  - A resource the caller doesn't own is indistinguishable from one that
 *    doesn't exist: ownership failures return null / [] / throw
 *    UNAUTHORIZED, never "found but not yours".
 *  - Segment text is only reachable through its parent source's owner check.
 *
 * Add new assert* helpers here for Phase 01 surfaces (curricula, lessons,
 * attempts, mastery) instead of open-coding owner comparisons per function.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

/** API_CONTRACTS.md error model — stable codes a client can branch on. */
export const unauthorized = (message: string) =>
  new ConvexError({ code: "UNAUTHORIZED" as const, message });

/**
 * The signed-in learner's users row id, or null. Guests count — an anonymous
 * account is a real, persistent identity (docs/data-model-plan.md §1) and its
 * subjects survive the guest→join upgrade, so learning isn't behind a wall.
 */
export async function learnerId(ctx: Ctx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/** The signed-in learner, or throw UNAUTHORIZED. Server-derived — never an argument. */
export async function requireLearnerId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await learnerId(ctx);
  if (userId === null) throw unauthorized("not signed in");
  return userId;
}

/**
 * assertSubjectOwner / assertSourceOwner return the doc for the owner and
 * null for everyone else — including when the row doesn't exist. A guessed id
 * therefore leaks neither existence nor ownership.
 */
export async function ownedSubject(
  ctx: Ctx,
  subjectId: Id<"subjects">,
): Promise<Doc<"subjects"> | null> {
  const userId = await learnerId(ctx);
  if (userId === null) return null;
  const subject = await ctx.db.get(subjectId);
  return subject !== null && subject.ownerId === userId ? subject : null;
}

export async function ownedSource(
  ctx: Ctx,
  sourceId: Id<"sources">,
): Promise<Doc<"sources"> | null> {
  const userId = await learnerId(ctx);
  if (userId === null) return null;
  const source = await ctx.db.get(sourceId);
  return source !== null && source.ownerId === userId ? source : null;
}

/**
 * Read-authorization for document text (PERMISSIONS.md: private by default).
 * Resolves segment → parent source → owner. Returns both when authorized.
 */
export async function ownedSegment(
  ctx: Ctx,
  segmentId: Id<"sourceSegments">,
): Promise<{ segment: Doc<"sourceSegments">; source: Doc<"sources"> } | null> {
  const segment = await ctx.db.get(segmentId);
  if (segment === null) return null;
  const source = await ownedSource(ctx, segment.sourceId);
  return source === null ? null : { segment, source };
}

/** Write-path variants: throw instead of returning null. */
export async function requireOwnedSubject(
  ctx: Ctx,
  subjectId: Id<"subjects">,
): Promise<Doc<"subjects">> {
  const subject = await ownedSubject(ctx, subjectId);
  if (subject === null) throw unauthorized("no such subject");
  return subject;
}

export async function requireOwnedSource(
  ctx: Ctx,
  sourceId: Id<"sources">,
): Promise<Doc<"sources">> {
  const source = await ownedSource(ctx, sourceId);
  if (source === null) throw unauthorized("no such source");
  return source;
}
