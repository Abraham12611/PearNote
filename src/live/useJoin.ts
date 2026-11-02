import { useCallback, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { maskEmail, sendFailureCopy } from "../../convex/authFlow";
import { verifyFailureCopy } from "../entry/authErrors";

/**
 * "Join" — the emailed six-digit code (convex/otp.ts). Two steps, one card:
 * ask for a code, then type it back.
 *
 * Joining never forks the person. The server patches the email onto the
 * guest's existing row and hands back the same user id, so the name, colour,
 * votes and memberships they already have just keep working (§1: upgrade,
 * don't fork). Nothing here has to migrate anything.
 */
export type JoinStage = "email" | "code" | "done";

/**
 * "Couldn’t send" is NOT proof the address is wrong — the failure taxonomy
 * lives in convex/authFlow.ts (AUTH_AND_ACCOUNT_RELIABILITY.md): provider
 * misconfiguration, send rejection and transport faults all get the same
 * honest retry copy, while rate limits surface the real cooldown. The
 * hook carries the structured `errorCode` alongside the message so the
 * form can answer each category properly.
 */
export function useJoin() {
  const { signIn } = useAuthActions();
  const [stage, setStage] = useState<JoinStage>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const sendCode = useCallback(
    async (value: string) => {
      const address = value.trim().toLowerCase();
      if (!address.includes("@")) {
        setError("that doesn't look like an email");
        return;
      }
      setBusy(true);
      setError(null);
      setErrorCode(null);
      try {
        await signIn("email-otp", { email: address });
        setEmail(address);
        setStage("code");
      } catch (thrown) {
        const copy = sendFailureCopy(thrown);
        setError(copy.message);
        setErrorCode(copy.code);
      } finally {
        setBusy(false);
      }
    },
    [signIn],
  );

  const verify = useCallback(
    async (code: string) => {
      const digits = code.replace(/\D/g, "");
      if (digits.length !== 6) {
        setError("six digits, from the email");
        return false;
      }
      setBusy(true);
      setError(null);
      setErrorCode(null);
      try {
        await signIn("email-otp", { email, code: digits });
        setStage("done");
        return true;
      } catch (thrown) {
        const copy = verifyFailureCopy(thrown);
        setError(copy.message);
        setErrorCode(copy.code);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [email, signIn],
  );

  const restart = useCallback(() => {
    setStage("email");
    setError(null);
    setErrorCode(null);
  }, []);

  /* Google: a redirect round-trip. The page leaves, Google asks, the page
     comes back with ?code= and ConvexAuthProvider finishes the sign-in. We
     hand it our own full URL so the room (and a localhost dev server) is
     where you land. */
  const google = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn("google", { redirectTo: window.location.href });
    } catch {
      setError("google didn't answer. try the code instead?");
      setBusy(false);
    }
  }, [signIn]);

  return {
    stage,
    email,
    maskedEmail: email ? maskEmail(email) : "",
    busy,
    error,
    errorCode,
    sendCode,
    verify,
    restart,
    google,
  };
}

/**
 * Who the visitor is to the backend: a guest, or someone who joined.
 * `undefined` while the query is in flight — callers treat that as "guest",
 * because the canvas renders for everyone either way.
 */
export function useAccount() {
  const user = useQuery(api.auth.currentUser, {});
  return {
    loading: user === undefined,
    joined: user?.isAnonymous === false,
    email: user?.email,
  };
}
