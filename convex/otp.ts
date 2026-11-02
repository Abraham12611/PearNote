// The sign-in code. "Join" is an emailed six-digit number, never a password
// (§1 hard rule: no email+password, ever). Spec: docs/data-model-plan.md §1.
//
// It rides the AgentMail integration the spaces already use, which means no
// new credential to set up and one more real job for a sponsor. It sends from
// `ourspaces@agentmail.to` deliberately: AgentMail's free tier caps at three
// inboxes PER ORG and all three are already spoken for, so this must not
// create one (docs/firecrawl-agentmail-setup.md § Gotchas).
import { Email } from "@convex-dev/auth/providers/Email";
import type { EmailConfig } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { env, type ActionCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { rateLimiter } from "./rateLimits";
import { signInCodeLifetimeMinutes, signInEmail } from "./emails/signIn";
import { classifyOtpSendError, maskEmail } from "./authFlow";

const API = "https://api.agentmail.to/v0";

/** The account-level inbox, not a space's. Never create a fourth. */
const OTP_INBOX_ID = "ourspaces@agentmail.to";

export const OTP_PROVIDER_ID = "email-otp";

/** Six digits from the CSPRNG — this code is the whole credential. */
async function sixDigits() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

// Convex Auth passes `ctx` as a second argument, but Auth.js's type declares
// exactly one parameter (@auth/core/providers/email.d.ts) and convex-auth
// suppresses the mismatch on its own call site. A two-param arrow isn't
// assignable to a one-param type, so the seam gets cast here too.
const sendCode = (async (
  { identifier: email, token }: { identifier: string; token: string },
  ctx: ActionCtx,
) => {
  // Deployment fault → explicit category BEFORE any provider call: without
  // the key every send fails, and the old code surfaced that to the owner
  // as "check the address?" — the exact reported bug's blind spot.
  if (!env.AGENTMAIL_API_KEY) {
    console.error(
      JSON.stringify({ otpSend: "PROVIDER_UNCONFIGURED", reason: "AGENTMAIL_API_KEY unset", to: maskEmail(email) }),
    );
    throw new ConvexError({ code: "PROVIDER_UNCONFIGURED", message: "email provider not configured" });
  }
  await rateLimiter.limit(ctx, "otpSend", {
    key: email.toLowerCase(),
    throws: true,
  });
  try {
    await ctx.runAction(components.agentMail.lib.sendMessage, {
      apiKey: env.AGENTMAIL_API_KEY,
      baseUrl: API,
      inboxId: OTP_INBOX_ID,
      to: [email],
      ...signInEmail(token, env.CONVEX_SITE_URL ?? ""),
      labels: ["otp"],
    });
  } catch (thrown) {
    // Structured category + correlation id for the runbook; masked address
    // only — never the key, token or full email in logs or client errors.
    const { code, operatorHint } = classifyOtpSendError(thrown);
    const corr = crypto.randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({ otpSend: code, hint: operatorHint, corr, to: maskEmail(email) }),
    );
    throw new ConvexError({ code, message: `email send failed [${corr}]` });
  }
}) as unknown as EmailConfig["sendVerificationRequest"];

export const EmailOtp = Email<DataModel>({
  id: OTP_PROVIDER_ID,
  // One value controls the real expiry and the HTML/plain-text email copy.
  maxAge: 60 * signInCodeLifetimeMinutes,
  generateVerificationToken: sixDigits,
  sendVerificationRequest: sendCode,
  // The default `authorize` requires the same email in step 2, which is
  // exactly what makes six digits safe to use. Do NOT pass
  // `authorize: undefined` — that's the magic-link shape, where the token
  // alone is enough, and six digits is guessable in that world.
});
