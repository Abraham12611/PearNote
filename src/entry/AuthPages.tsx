/* ------------------------------------------------------------------
 * /auth/sign-in and /auth/sign-up — Assignment E1.
 *
 * One flow serves both pages — the emailed six-digit code IS the
 * account system (join upgrades the guest row rather than forking it,
 * convex/auth.ts). Only the voice differs. Google appears only when
 * `api.auth.signInOptions` says the deployment has credentials.
 *
 * `?next=` carries the destination; after a code verifies we navigate
 * by full-page load — the same deliberate reload JoinForm documents:
 * signIn swaps the stored token and a fresh load re-reads it, so every
 * downstream query is simply correct.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeSlots } from "../components/CodeSlots";
import { useJoin } from "../live/useJoin";
import { navigate } from "./location";
import { safeNextPath, SITE_PATHS } from "./paths";
import { BackendMissing } from "./screens";

export function AuthScreen({
  kind,
  live,
  search,
}: {
  kind: "sign-in" | "sign-up";
  live: boolean;
  search: string;
}) {
  const next =
    safeNextPath(new URLSearchParams(search).get("next")) ??
    SITE_PATHS.appRoot;
  const signingUp = kind === "sign-up";

  return (
    <main className="entry-scaffold entry-auth" data-entry-screen={kind}>
      <div className="entry-auth-card">
        <button
          type="button"
          className="entry-back"
          onClick={() => navigate(SITE_PATHS.landing)}
        >
          ‹ PearNotes
        </button>
        <span className="pn-kicker">
          {signingUp ? "start learning" : "welcome back"}
        </span>
        <h1>{signingUp ? "create your account" : "sign in"}</h1>
        <p className="entry-lede">
          {signingUp
            ? "an emailed code is the whole password — six digits, no form to remember."
            : "same code as always — we'll email you six digits."}
        </p>
        {live ? <AuthForm kind={kind} next={next} /> : <BackendMissing />}
        <p className="entry-fine">
          {signingUp ? (
            <>
              been here before?{" "}
              <button
                type="button"
                onClick={() =>
                  navigate(`${SITE_PATHS.signIn}?next=${encodeURIComponent(next)}`)
                }
              >
                sign in instead
              </button>
            </>
          ) : (
            <>
              new to PearNotes?{" "}
              <button
                type="button"
                onClick={() =>
                  navigate(`${SITE_PATHS.signUp}?next=${encodeURIComponent(next)}`)
                }
              >
                create an account
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

/** The real form — mounted only inside ConvexAuthProvider (live). */
function AuthForm({ kind, next }: { kind: "sign-in" | "sign-up"; next: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const user = useQuery(api.auth.currentUser, {});
  const options = useQuery(api.auth.signInOptions, {});
  const { stage, email, busy, error, sendCode, verify, restart } = useJoin();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  /* Already joined → the form's job is done. Anonymous guests stay: for
     them this page upgrades the guest row, which is the point. */
  const joined =
    !isLoading && isAuthenticated && user?.isAnonymous === false;
  useEffect(() => {
    if (joined) navigate(next, { replace: true });
  }, [joined, next]);

  /* Each stage gets an empty field — same reason as JoinForm: the email
     you just typed would otherwise sit inside the code slots. */
  useEffect(() => {
    setDraft("");
  }, [stage]);

  async function google() {
    setGoogleError(null);
    try {
      /* redirect straight to the destination — the provider completes
         the exchange when it lands. */
      await signIn("google", {
        redirectTo: `${window.location.origin}${next}`,
      });
    } catch {
      setGoogleError("google didn't answer — try the code instead?");
    }
  }

  async function submitCode(code: string) {
    if (await verify(code)) {
      /* A reload, deliberately — JoinForm documents why: signIn swaps
         the stored token, and a fresh load re-reads it so the live
         client stops answering as the old identity. */
      window.location.href = next;
    }
  }

  if (joined) {
    return <p className="entry-lede">taking you to your desk…</p>;
  }

  if (stage === "code") {
    return (
      <form
        className="entry-auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCode(draft);
        }}
      >
        <p className="entry-lede">
          six numbers, on their way to <strong>{email}</strong>.
        </p>
        <CodeSlots
          value={draft}
          onChange={setDraft}
          onComplete={(code) => void submitCode(code)}
          disabled={busy}
        />
        {error ? <p className="entry-error">{error}</p> : null}
        <button type="button" className="entry-back" onClick={restart}>
          ‹ use a different email
        </button>
      </form>
    );
  }

  return (
    <div className="entry-auth-form">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode(draft);
        }}
      >
        <label htmlFor="auth-email">
          {kind === "sign-up" ? "your email" : "the email you joined with"}
        </label>
        <div className="entry-shortlist-row">
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@somewhere.edu"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="pn-cta" disabled={busy}>
            {busy ? "sending…" : "send the code"}
          </button>
        </div>
        {error ? <p className="entry-error">{error}</p> : null}
      </form>
      {options?.google ? (
        <button
          type="button"
          className="pn-cta-dark entry-google"
          onClick={() => void google()}
          disabled={busy}
        >
          continue with Google
        </button>
      ) : null}
      {googleError ? <p className="entry-error">{googleError}</p> : null}
    </div>
  );
}
