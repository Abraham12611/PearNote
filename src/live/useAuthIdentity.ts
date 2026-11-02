import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { adoptAuthUserId, updateIdentity, useIdentity } from "./identity";
import { mayMirrorLocalEdit, mergeServerIdentity, shouldHydrate, type LocalIdentity } from "./identitySync";

/**
 * Silent guest sign-in. Runs once the provider has settled and reports the
 * visitor as signed out; Convex Auth persists the tokens in localStorage, so
 * a returning visitor skips straight past this.
 *
 * Deliberately swallows failures: a visitor who cannot sign in still gets the
 * canvas, because guest is the rollback path, not a gate (§1).
 */
function useGuestSession(enabled: boolean) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || isLoading || isAuthenticated || started.current) return;
    started.current = true;
    void signIn("anonymous").catch(() => {
      // Stay a local-only visitor. The canvas is never behind sign-in.
    });
  }, [enabled, isLoading, isAuthenticated, signIn]);
}

/**
 * Adopts the authenticated user id as this tab's identity once the silent
 * guest sign-in lands — and, for a joined person, keeps the tab and the
 * account in step (docs/accounts.md):
 *
 *  - down: the account's saved name/colour/emoji/photo land on the tab once
 *    per sign-in. The account wins over whatever persona the tab minted.
 *    A freshly joined row has no name yet, so the tab's identity stands.
 *  - up: after that, every edit (name field, look row, photo) is mirrored
 *    to the row, debounced, only when something actually differs.
 *
 * Deliberately tolerant: while the session is still in flight `currentUser`
 * is undefined and while a visitor is unauthenticated it is null. In both
 * cases the tab keeps its locally-allocated id and the canvas works exactly
 * as before — guest is the rollback path, never a gate (§1).
 */
export function useAuthIdentity(options?: { silentGuest?: boolean }) {
  /* `silentGuest` defaults to the original behavior (legacy canvas,
     demo). The `/app` gateway passes false: nobody becomes a guest just
     for opening an app URL — a signed-out visitor gets the sign-in
     recovery screen instead (Assignment E1). */
  useGuestSession(options?.silentGuest ?? true);
  const user = useQuery(api.auth.currentUser, {});
  const identity = useIdentity();
  const updateProfile = useMutation(api.auth.updateProfile);
  const hydratedFor = useRef<string | null>(null);
  const latestUser = useRef(user);
  latestUser.current = user;

  /* The tab's OWN minted persona, captured once before any adoption. Every
     account transition restores THIS — so A's profile can never render
     inside B's session and stale A-fields can't be mirrored into B's row
     (Issue #76). Guests keep it the whole time — original behavior. */
  const base = useRef<LocalIdentity | null>(null);
  if (base.current === null) {
    base.current = {
      name: identity.name,
      color: identity.color,
      emoji: identity.emoji,
      avatarUrl: identity.avatarUrl,
    };
  }

  useEffect(() => {
    if (user?.userId) adoptAuthUserId(user.userId);
  }, [user?.userId]);

  const joinedId = user && !user.isAnonymous ? user.userId : null;

  // Transition: account switch OR sign-out — back to the neutral base and
  // re-arm hydration. Same joinedId (token refresh, reload) never resets.
  const prevJoined = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevJoined.current === joinedId) return;
    prevJoined.current = joinedId;
    hydratedFor.current = null;
    if (base.current) updateIdentity({ ...base.current });
  }, [joinedId]);

  // Down: once per joined user — server profile wins per-field.
  useEffect(() => {
    if (!shouldHydrate(joinedId, hydratedFor.current)) return;
    hydratedFor.current = joinedId;
    const saved = latestUser.current;
    if (saved === undefined || saved === null || !base.current) return;
    updateIdentity(mergeServerIdentity(saved, base.current));
  }, [joinedId, user]);

  // Up: mirror edits — only for the hydrated account, only when the row
  // would change. The A→logout→B window (hydratedFor still A/null) is
  // structurally locked out.
  useEffect(() => {
    if (!mayMirrorLocalEdit({ joinedId, hydratedFor: hydratedFor.current, hasServerProfile: !!user })) return;
    const timer = window.setTimeout(() => {
      const saved = latestUser.current;
      if (!saved || String(saved.userId) !== String(joinedId)) return;
      if (
        saved.name === identity.name &&
        saved.color === identity.color &&
        saved.emoji === identity.emoji &&
        saved.image === identity.avatarUrl
      ) {
        return;
      }
      void updateProfile({
        name: identity.name,
        color: identity.color,
        emoji: identity.emoji,
        image: identity.avatarUrl,
      }).catch(() => {
        // A guest token that hasn't refreshed yet; the next edit retries.
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [joinedId, user, identity.name, identity.color, identity.emoji, identity.avatarUrl, updateProfile]);
}

/** Renderless mount point, so the hook only runs inside the Convex provider. */
export function AuthIdentityBridge({
  silentGuest = true,
}: {
  silentGuest?: boolean;
}) {
  useAuthIdentity({ silentGuest });
  return null;
}
