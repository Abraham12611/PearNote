/* ------------------------------------------------------------------
 * Auth error presentation (Issue #63 follow-up).
 *
 * Pure mapping between E4's categorized OTP contract
 * (convex/authFlow.ts, merged #68) and what the auth screens say —
 * kept React-free so vitest can prove every category. Codes come from
 * `authErrorCode` on the thrown error, never guessed.
 * ------------------------------------------------------------------ */

import { authErrorCode } from "../../convex/authFlow";

export type JoinError = { code: string; message: string };

/**
 * Verify-stage failures: a categorized server code wins when present;
 * otherwise the taxonomy's safe CODE_WRONG copy
 * (AUTH_AND_ACCOUNT_RELIABILITY.md) — never "check the address"-style
 * blame, never an exception string verbatim.
 */
export function verifyFailureCopy(thrown: unknown): JoinError {
  const code = authErrorCode(thrown);
  if (code === "CODE_EXPIRED" || code === "CODE_CONSUMED") {
    return {
      code,
      message:
        code === "CODE_EXPIRED"
          ? "that code expired. request a new one."
          : "that code was already used. start over.",
    };
  }
  return { code: "CODE_WRONG", message: "that code didn't work. check all six digits." };
}

/**
 * Category-specific guidance rendered under the error line:
 * rate limits explain the cool-down, delivery-side categories say the
 * address is probably fine and point at the working alternative.
 */
export function errorHint(errorCode: string | null, googleAvailable: boolean): string | null {
  switch (errorCode) {
    case "RATE_LIMITED":
      return "that's a cool-down — wait it out, then send one code.";
    case "PROVIDER_UNCONFIGURED":
    case "EMAIL_SEND_REJECTED":
    case "DELIVERY_UNAVAILABLE":
    case "NETWORK_TIMEOUT":
      return googleAvailable
        ? "or continue with Google — that route doesn't use email."
        : "the labelled demo stays open while email is down.";
    default:
      return null;
  }
}
