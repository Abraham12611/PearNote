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

/* ── The orchestrator — framework-free so the whole state machine is unit-
 * testable with delayed user emissions, fake timers and a fake mutation.
 * `useAuthIdentity` is a thin adapter that forwards query/store changes. */

export interface SyncServerUser extends ServerIdentityFields {
  userId: string;
  isAnonymous?: boolean;
}

export interface SyncPorts {
  /** Current full identity incl. userId. */
  getIdentity(): LocalIdentity & { userId: string };
  /** Merge display fields only (never userId). */
  setIdentity(patch: Partial<LocalIdentity>): void;
  /** Bind the tab to an authenticated Convex user id. */
  adoptUserId(userId: string): void;
  /** Signed out: forget the adopted auth id AND mint a fresh local guest
   * identity. Returns the new minted identity (it becomes the new base). */
  releaseAuthUserId(): LocalIdentity;
  /** Mirror local display fields to the account row. */
  pushProfile(fields: { name: string; color?: string; emoji?: string; image?: string }): void;
  /** Debounce: returns a cancel handle. */
  schedule(fn: () => void, ms: number): () => void;
}

const PUSH_DEBOUNCE_MS = 400;

/**
 * createIdentitySync — one per mount. Call `onUser` whenever the
 * `currentUser` query emits (including undefined during load) and
 * `onLocalEdit` whenever the tab identity changes. Ordering is the whole
 * contract: transition-reset → hydrate → gated debounced push.
 */
export function createIdentitySync(baseInitial: LocalIdentity, ports: SyncPorts) {
  let base = { ...baseInitial };
  let hydratedFor: string | null = null;
  let joinedId: string | null = null;
  let started = false;
  // Which auth id the tab identity is currently bound to — null while the
  // tab is a pure local guest. Sniffed at construction: a restored session
  // may already hold an adopted (non-uuid) Convex id.
  const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let adoptedUserId: string | null = UUIDISH.test(ports.getIdentity().userId)
    ? null
    : ports.getIdentity().userId;
  let latestUser: SyncServerUser | null | undefined;
  let cancelPush: (() => void) | null = null;

  const cancelPendingPush = () => {
    cancelPush?.();
    cancelPush = null;
  };

  const onUser = (user: SyncServerUser | null | undefined) => {
    latestUser = user;
    const nextJoined = user && user.userId && !user.isAnonymous ? user.userId : null;
    const transition = nextJoined !== joinedId || !started;

    // userId lifecycle — runs BEFORE the display reset so the reset uses the
    // right base (post-release mint, not the stale adopted persona).
    if (user === null) {
      // Confirmed sign-out: release ONLY a genuinely adopted auth id — a
      // pure guest keeps its minted identity (original §1 behavior).
      if (adoptedUserId !== null) {
        const mint = ports.releaseAuthUserId();
        // Display fields ONLY — carrying mint.userId into `base` would let a
        // later setIdentity(base) overwrite a freshly adopted account id.
        base = { name: mint.name, color: mint.color, emoji: mint.emoji, avatarUrl: mint.avatarUrl };
        adoptedUserId = null;
      }
    } else if (user?.userId) {
      if (adoptedUserId !== null && user.userId !== adoptedUserId) {
        // A DIFFERENT account arriving (A→undefined→B, direct A→B): release
        // A's id + mint first — B can never inherit A's identity/presence.
        const mint = ports.releaseAuthUserId();
        base = { name: mint.name, color: mint.color, emoji: mint.emoji, avatarUrl: mint.avatarUrl };
        adoptedUserId = null;
      }
      ports.adoptUserId(user.userId);
      adoptedUserId = user.userId;
    }
    // undefined (loading): keep adoptedUserId — a same-account token refresh
    // must not re-mint. Display still drops to base below, so nothing of A
    // renders if a different account is pending.

    if (transition) {
      joinedId = nextJoined;
      hydratedFor = null;
      cancelPendingPush(); // a queued A-fields push must NEVER flush into B
      ports.setIdentity({ ...base });
      started = true;
    }

    // Joined account: server state ALWAYS wins — first hydrate AND every
    // subsequent remote update (other device). Not a local edit: the
    // up-push compares against the latest server snapshot, so an applied
    // merge reads equal → no write → no feedback loop.
    if (joinedId !== null && latestUser && latestUser.isAnonymous !== true) {
      hydratedFor = joinedId;
      ports.setIdentity(mergeServerIdentity(latestUser, base));
    }
  };

  const onLocalEdit = () => {
    if (!mayMirrorLocalEdit({ joinedId, hydratedFor, hasServerProfile: !!latestUser?.userId })) return;
    cancelPendingPush();
    const capturedJoined = joinedId;
    cancelPush = ports.schedule(() => {
      cancelPush = null;
      const saved = latestUser;
      // Flush-time guards: still the same account, still joined, and the
      // identity we're about to push belongs to THIS account's session.
      if (!saved?.userId || saved.isAnonymous === true) return;
      if (String(saved.userId) !== String(capturedJoined)) return;
      const cur = ports.getIdentity();
      if (
        saved.name === cur.name &&
        saved.color === cur.color &&
        saved.emoji === cur.emoji &&
        saved.image === cur.avatarUrl
      ) {
        return;
      }
      ports.pushProfile({ name: cur.name, color: cur.color, emoji: cur.emoji, image: cur.avatarUrl });
    }, PUSH_DEBOUNCE_MS);
  };

  return {
    onUser,
    onLocalEdit,
    /** Test/debug visibility into the state machine. */
    state: () => ({ joinedId, hydratedFor, base: { ...base } }),
  };
}
