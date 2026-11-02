/**
 * Account profile / persona API (Issue #66). One-time durable persona
 * assignment, editable name + photo, persona-matched cursor accent,
 * idempotent initialization, owner-scoped privacy.
 *
 * Contract notes for E2 (Profile page + people capsule):
 *  - `profiles.getMine` — the caller's full profile (incl. masked-able
 *    email + isAnonymous). Private; never another user's.
 *  - `profiles.initialize` — idempotent: first call assigns a stable
 *    persona + accent + image; repeat calls replay the same profile, never
 *    re-roll. One mutation = one transaction, so two racing sign-in
 *    callbacks still produce exactly one durable assignment.
 *  - `profiles.update` — whitelisted edits only (name, image, personaId,
 *    color). Never touches learning data, membership or attempts.
 *  - `profiles.getDisplay` — batched, display-safe fields ONLY (name,
 *    personaId, color) for capsules/member faces. No email, no anonymous
 *    flag, no private study data — safe to show room participants.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  PERSONA_IDS,
  defaultPersonaFor,
  personaById,
  personaImagePath,
  type PersonaId,
} from "./personas";
import type { Doc, Id } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });

const NAME_MAX = 40;

const profileShape = {
  userId: v.id("users"),
  personaId: v.optional(v.string()),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  color: v.optional(v.string()),
  email: v.optional(v.string()),
  isAnonymous: v.boolean(),
  initialized: v.boolean(),
};

const toProfile = (u: Doc<"users">) => ({
  userId: u._id,
  personaId: u.personaId,
  name: typeof u.name === "string" && u.name ? u.name : undefined,
  image: u.image,
  color: u.color,
  email: u.email,
  isAnonymous: u.isAnonymous === true,
  initialized: u.personaId !== undefined,
});

async function me(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw err("UNAUTHORIZED", "not signed in");
  return userId;
}

/** `profiles.getMine` — the caller's own profile, or null when signed out. */
export const getMine = query({
  args: {},
  returns: v.union(v.object(profileShape), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const u = await ctx.db.get(userId);
    return u === null ? null : toProfile(u);
  },
});

/**
 * `profiles.initialize` — ONE-TIME durable assignment. Idempotent: an
 * already-initialized account replays its profile unchanged (two racing
 * callbacks converge on the same row inside one transaction). Never
 * re-rolls an existing persona, never overwrites a chosen name/photo.
 */
export const initialize = mutation({
  args: {},
  returns: v.object(profileShape),
  handler: async (ctx) => {
    const userId = await me(ctx);
    const u = await ctx.db.get(userId);
    if (u === null) throw err("UNAUTHORIZED", "account not found");
    if (u.personaId !== undefined) return toProfile(u); // idempotent replay
    const persona = defaultPersonaFor(String(userId));
    await ctx.db.patch(userId, {
      personaId: persona.id,
      color: u.color ?? persona.accent,
      image: u.image ?? personaImagePath(persona.id),
      name: u.name ?? persona.label.toLowerCase(),
    });
    return toProfile({ ...u, personaId: persona.id, color: u.color ?? persona.accent, image: u.image ?? personaImagePath(persona.id), name: u.name ?? persona.label.toLowerCase() });
  },
});

/**
 * `profiles.update` — editable display fields. personaId changes pull the
 * matching cursor accent (the "matching cursor" contract) unless the caller
 * also passes an explicit color. All other fields are whitelist-validated.
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    personaId: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.object(profileShape),
  handler: async (ctx, args) => {
    const userId = await me(ctx);
    const u = await ctx.db.get(userId);
    if (u === null) throw err("UNAUTHORIZED", "account not found");
    const patch: Record<string, string | undefined> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0 || name.length > NAME_MAX) {
        throw err("INVALID_INPUT", `name must be 1..${NAME_MAX} characters`);
      }
      patch.name = name;
    }
    if (args.image !== undefined) {
      const image = args.image.trim();
      if (image.length > 2048) throw err("INVALID_INPUT", "image ref too long");
      patch.image = image === "" ? undefined : image;
    }
    if (args.personaId !== undefined) {
      const persona = personaById(args.personaId);
      if (persona === undefined) throw err("INVALID_INPUT", "unknown persona");
      patch.personaId = persona.id;
      // The persona's own accent follows unless explicitly overridden.
      patch.color = args.color ?? persona.accent;
      if (u.image === undefined || u.image === personaImagePath((u.personaId ?? "") as PersonaId)) {
        patch.image = personaImagePath(persona.id);
      }
    } else if (args.color !== undefined) {
      if (!/^#[0-9a-f]{3,8}$/i.test(args.color)) throw err("INVALID_INPUT", "color must be hex");
      patch.color = args.color;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(userId, patch);
    return toProfile({ ...u, ...patch });
  },
});

/**
 * `profiles.getDisplay` — the ONLY cross-user profile read: batched
 * display-safe fields for capsules/member faces. Anything sensitive is
 * structurally absent, so a guessed userId can never reach email, flags or
 * study data. Bounded at 20 ids.
 */
export const getDisplay = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      personaId: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { userIds }) => {
    await me(ctx); // signed-in only — display identity is not world-public
    const out: { userId: Id<"users">; personaId?: string; name?: string; image?: string; color?: string }[] = [];
    for (const id of userIds.slice(0, 20)) {
      const u = await ctx.db.get(id);
      if (u === null) continue;
      out.push({ userId: u._id, personaId: u.personaId, name: u.name, image: u.image, color: u.color });
    }
    return out;
  },
});

/** Exported so E2's UI can render the same catalog (ids are stable). */
export { PERSONA_IDS };
