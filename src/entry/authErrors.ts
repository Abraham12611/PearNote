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

/** Signals that really mean "the digits themselves were rejected" —
 *  Convex Auth's Invalid-code ConvexError variants. Anything less
 *  explicit must NOT be reported as a wrong code (review #74). */
const WRONG_CODE_SIGNAL = /invalid.{0,12}code|wrong.{0,12}code|incorrect/i;

function thrownMessage(thrown: unknown): string {
  /* ConvexError carries the real text in `data.message`; plain errors
     keep it in `.message`. Check both — the Error wrapper can be an
     opaque serialization. */
  const data = (thrown as { data?: { message?: unknown } })?.data?.message;
  const parts = [
    thrown instanceof Error ? thrown.message : "",
    typeof data === "string" ? data : "",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Verify-stage failures, honestly classified:
 *
 *  - explicit wrong-code rejections        → CODE_WRONG
 *  - expired / consumed                    → CODE_EXPIRED / CODE_CONSUMED
 *  - rate limit                            → RATE_LIMITED
 *  - provider/network categories           → VERIFY_UNAVAILABLE
 *  - anything unclassified (incl. a network
 *    outage throwing a plain TypeError)    → VERIFY_UNAVAILABLE
 *
 * A failure to CHECK the code can never be reported as the code being
 * wrong — the truthful fallback is "couldn't check right now, retry".
 */
export function verifyFailureCopy(thrown: unknown): JoinError {
  const code = authErrorCode(thrown);
  const message = thrownMessage(thrown);

  if (code === "CODE_EXPIRED" || /expired/i.test(message)) {
    return { code: "CODE_EXPIRED", message: "that code expired. request a new one." };
  }
  if (
    code === "CODE_CONSUMED" ||
    /already.{0,20}(used|consumed)/i.test(message)
  ) {
    return { code: "CODE_CONSUMED", message: "that code was already used. start over." };
  }
  if (code === "RATE_LIMITED") {
    return {
      code: "RATE_LIMITED",
      message: "too many tries for now — give it a few minutes, then try once more.",
    };
  }
  if (
    code === "PROVIDER_UNCONFIGURED" ||
    code === "DELIVERY_UNAVAILABLE" ||
    code === "NETWORK_TIMEOUT"
  ) {
    return {
      code: "VERIFY_UNAVAILABLE",
      message: "couldn't check that code right now — try again in a moment.",
    };
  }
  if (code === "CODE_WRONG" || WRONG_CODE_SIGNAL.test(message)) {
    return { code: "CODE_WRONG", message: "that code didn't work. check all six digits." };
  }
  /* Unclassified — a network drop, an opaque exception, anything we
     cannot positively identify. The code was never checked, so the
     truthful answer is retry, not blame (review #74). */
  return {
    code: "VERIFY_UNAVAILABLE",
    message: "couldn't check that code right now — try again in a moment.",
  };
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
    case "VERIFY_UNAVAILABLE":
      return "your code may be fine — connection trouble, not the digits.";
    default:
      return null;
  }
}
