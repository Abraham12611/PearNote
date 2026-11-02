import { useEffect, useLayoutEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { adoptAuthUserId, getIdentity, releaseAuthUserId, updateIdentity, useIdentity } from "./identity";
import { createIdentitySync, type LocalIdentity } from "./identitySync";

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

  /* The sync state machine lives in identitySync.createIdentitySync —
     framework-free, so its whole lifecycle is covered by the integration
     test. useLayoutEffect (not useEffect) so transition resets and the
     down-hydrate land BEFORE paint: no rendered frame can show a previous
     account's fields under the new one (first-render privacy, #76). */
  const sync = useRef<ReturnType<typeof createIdentitySync> | null>(null);
  if (sync.current === null) {
    const base: LocalIdentity = {
      name: identity.name,
      color: identity.color,
      emoji: identity.emoji,
      avatarUrl: identity.avatarUrl,
    };
    sync.current = createIdentitySync(base, {
      getIdentity,
      setIdentity: updateIdentity,
      adoptUserId: adoptAuthUserId,
      releaseAuthUserId,
      pushProfile: (fields) => {
        void updateProfile(fields).catch(() => {
          // A guest token that hasn't refreshed yet; the next edit retries.
        });
      },
      schedule: (fn, ms) => {
        const t = window.setTimeout(fn, ms);
        return () => window.clearTimeout(t);
      },
    });
  }

  useLayoutEffect(() => {
    sync.current!.onUser(user === undefined ? undefined : user);
  }, [user]);

  useLayoutEffect(() => {
    sync.current!.onLocalEdit();
  }, [identity]);
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
