/**
 * Account-switch-safe identity sync (Issue #76) — the pure decisions behind
 * `useAuthIdentity`. Server-authoritative: the account profile always wins
 * over the tab's local persona, and a transition between accounts passes
 * through the tab's OWN minted base — never through the previous account's
 * adopted fields. Original OurSpaces guest behavior is preserved: with no
 * joined account the tab's minted identity stands untouched.
 */

/** What the tab currently displays / would mirror up. */
export interface LocalIdentity {
  name: string;
  color?: string;
  emoji?: string;
  avatarUrl?: string;
}

/** The server profile row (profiles.getMine / auth.currentUser shape). */
export interface ServerIdentityFields {
  name?: string;
  color?: string;
  emoji?: string;
  image?: string;
  personaId?: string;
}

/**
 * Server wins per-field. Anything the server does NOT provide falls back to
 * the tab's own base — NOT to whatever identity was previously adopted —
 * so an account switch can never leak A's name/color/face into B's tab.
 * `personaId` supplies the illustrated face when `image` is absent.
 */
export function mergeServerIdentity(
  server: ServerIdentityFields,
  base: LocalIdentity,
): LocalIdentity {
  return {
    name: server.name?.trim() ? server.name : base.name,
    color: server.color ?? base.color,
    emoji: server.emoji ?? base.emoji,
    avatarUrl: server.image ?? (server.personaId ? `/avatars/${server.personaId}.png` : base.avatarUrl),
  };
}

/**
 * May the tab's local edit be mirrored to the account row? Only after THIS
 * account finished hydrating — the A→logout→B window (`hydratedFor` still
 * naming A or null) must never write B's row from stale local state.
 */
export function mayMirrorLocalEdit(args: {
  joinedId: string | null;
  hydratedFor: string | null;
  hasServerProfile: boolean;
}): boolean {
  const { joinedId, hydratedFor, hasServerProfile } = args;
  return joinedId !== null && hydratedFor === joinedId && hasServerProfile;
}

/** Should the down-hydrate run now? A joined account we haven't served yet. */
export function shouldHydrate(joinedId: string | null, hydratedFor: string | null): boolean {
  return joinedId !== null && hydratedFor !== joinedId;
}
