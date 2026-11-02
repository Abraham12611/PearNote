# Reliable Gmail/email OTP, Google OAuth and account onboarding

**Priority:** P0 release blocker. **Reported by owner, 2026-11-02:** a valid Gmail address entered on the PearNotes sign-up page produces **"couldn't send that. check the address?"**. **Status:** root cause NOT YET VERIFIED; this document specifies diagnosis and implementation acceptance rather than pretending production email has been fixed.

## The observed error does not establish an invalid Gmail address

The current client path is `src/entry/AuthPages.tsx` → `src/live/useJoin.ts` → `signIn("email-otp", {email})`. The latter normalizes with trim/lowercase and sends; `sendFailureMessage` handles only `data.kind === "RateLimited"`, then maps **all other thrown errors** to `"couldn't send that. check the address?"`. Accordingly the message can mean provider failure, missing secret, denied sender, timeout, callback failure or unexpected application error. Do not tell the owner to change a valid Gmail address as if that explains the incident.

### Auth pipeline actually present in repository

- `convex/auth.ts` registers Anonymous, `EmailOtp` and conditionally Google. It includes guest upgrade and verified Google email linking.
- `convex/otp.ts` uses `Email` provider, 6-digit token, 20-minute lifetime, rate limiter `otpSend` by normalized email, then `components.agentMail.lib.sendMessage` via `https://api.agentmail.to/v0`.
- **Sender/inbox is currently hard-coded `ourspaces@agentmail.to`**, inherited from OurSpaces. API key comes from `env.AGENTMAIL_API_KEY`, site URL for email imagery from `env.CONVEX_SITE_URL`.
- `convex/emails/signIn.ts` contains inherited "OurSpaces" subjects/body/header image and user-visible wording; must be updated to PearNotes in same approved brand material.
- Google provider is registered only if **both** `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` exist; UI checks `api.auth.signInOptions` before showing button. No credentials means do not claim Google sign-in is available.
- Callback `convex/auth.ts` uses `SITE_URL` or specified redirect and a localhost exception. This logic needs security review and configured production/preview origins.

**Important:** inspecting code cannot identify current server environment values, AgentMail send logs, sender verification, Gmail spam/reject reasons, authentication logs or whether the failure occurs before/after provider send. Do not claim a configuration or Gmail deliverability fix until one is observed.

## P0 diagnostic runbook (isolated deployment ONLY)

1. **Record exact build/deployment**: URL, frontend Git SHA, `VITE_CONVEX_URL` target, Convex dev deployment ID. Confirm backend is the intended isolated PearNotes instance, not the inherited OurSpaces or production.
2. **Reproduce safely** with one valid owned Gmail inbox; log the timestamp and generated request correlation ID—not the full address or code. Confirm form validation passed and whether `signIn("email-otp")` action rejected.
3. **Inspect Convex function logs** for corresponding sign-in/auth action, `otpSend` limiter event and AgentMail component action. Add structured internal error category if logs currently insufficient.
4. **Check prerequisites without disclosing values:** `AGENTMAIL_API_KEY` set and authorized; sender inbox exists and belongs to allowed workspace; provider not exhausted/rate-limited; `CONVEX_SITE_URL` resolves to correct public email image host; correct auth components mounted/deployed.
5. **Inspect provider response** (success/failure, request ID, HTTP status/class, quota/policy). Do not log key, token or raw response PII in client-visible errors; distinguish provider pending from delivered.
6. **Inspect Gmail receipt** in Inbox/Spam/All Mail and sender policy (SPF/DKIM/DMARC if using custom domain), latency and bounce data. API send success is *not* guaranteed inbox delivery. A shared `agentmail.to` inbox may have deliverability/reputation constraints.
7. **Verify end-to-end OTP:** request code → actual email arrives → 6-digit code accepted within max age → account created → exact same owner session/personal data → profile assigned once → reload and sign-in again. Test wrong/expired/reused code and resend throttling.
8. **Check other providers:** one non-Gmail mailbox for differential diagnosis (if available and authorized); Google redirect round trip only with configured provider keys and allowlisted origins. This prevents mislabeling all failures as Gmail-only.
9. **Confirm rate limits:** one user's retry must not lock out everyone; auto retry limited; cooldown shown. Do not brute force email delivery during tests. Use existing mock/fake transport for automated tests, a small explicit real-send smoke for acceptance.
10. **Record a redacted issue outcome:** verified cause, safe fix, deploy SHA, log/request IDs, mailbox receipt time, tests and screenshot; if unresolved, P0 remains open and signup CTA must provide transparent degraded state rather than false promise.

## Client-visible failure taxonomy

The server produces safe stable codes. No exception string is passed verbatim to all visitors; generic response does not reveal registered-email existence. Suggested contracts:

| Code/state | User-visible copy | Action |
|---|---|---|
| `INVALID_ADDRESS` | "That email address doesn't look right. Check it and try again." | Edit |
| `RATE_LIMITED` | "Too many codes for now. Try again in X min." | Countdown; don't spam requests |
| `DELIVERY_UNAVAILABLE` | "We couldn't send your code right now. Your address may be fine. Try again shortly." | Retry with bounded backoff, optional support |
| `PROVIDER_UNCONFIGURED` | Public same as delivery unavailable; server logs explicit deployment fault | Operator repair; no misleading active sign-up |
| `EMAIL_SEND_REJECTED` | Safe delivery unavailable; show support ID | Operator investigate policy/quota |
| `NETWORK_TIMEOUT` | "Connection interrupted. Check whether the email arrived before requesting another." | Check inbox and retry |
| `CODE_SENT` | "We sent a code to [masked email]. Check Inbox and Spam." | 6-digit entry |
| `CODE_WRONG` | "That code didn't work. Check all six digits." | Retry within limit |
| `CODE_EXPIRED` | "That code expired. Request a new one." | Request again |
| `CODE_CONSUMED` | "That code was already used. Start again." | Restart securely |
| `OAUTH_UNAVAILABLE` | "Google sign-in isn't available right now. Continue with email." | Alternative |
| `OAUTH_DENIED` | "Google sign-in was cancelled or couldn't finish." | Retry/OTP |
| `SESSION_PENDING` | "Verifying your account…" | Loading with no redirect loop |
| `ACCOUNT_READY` | "Welcome. Your desk is ready." | Enter truly empty account |

These codes are **proposed**; exact Convex Auth exceptions can differ, so map server/client errors after inspecting actual error object shapes. Rate-limit retry-after units must be verified. Diagnostic detail stays server-side with correlation IDs, not UI.

## Registration & sign-in UX (native original OurSpaces)

- Public site/modal inherits original two-tone collage dialog, black main pill, consistent fields and headings; see `../design/SCREEN_BY_SCREEN_REDESIGN.md`.
- Unified authentication endpoint but distinct contextual copy: "Create your place to learn" and "Welcome back." Both accept any valid email, including Gmail, not only educational domains. OTP is the same secure method, no password.
- Show Google button **only when properly configured**; do not hide a failing feature behind an empty box. Explain email route continues to work if Google is unavailable.
- Email entry is real input with accessible label/autocomplete, inline safe validation, keyboard submit, disabled while sending, no duplicate calls. Avoid placeholder only "you@somewhere.edu" suggesting .edu restriction.
- On sent code, mask address or show only to self while input remains private; six explicit digits in accessible group; paste handling, autofill/one-time-code, resend after server cooldown and change address.
- Keep modal dimensions within viewport, focus trap and focus restoration, scroll-lock; auth route deep links must work after page reload.
- Show output states: waiting for email, provider slow, email not delivered, verifying, expired, signed in, account upgrade, server outage. Never display "check the address" for unrelated failures.

## Source/backend contracts and owner boundary

### Signing in with an existing verified email
- Return the previously linked user ID; do not create a new study identity.
- On token swap, clear stale account A client cache before showing account B. Key app subtree by authenticated user ID.
- Preserve user avatar and cursor across sign-out, device login and profile changes.
- Email normalization allowed for comparison but guard Unicode/alias assumptions; do not merge user records by **unverified** email string.

### Guest upgrade to registered account
- Guest chooses register; create an email request/stub without assigning claimed address to guest before verifying code.
- On actual verification, server merges/upgrades safely, retains personal notes/curriculum and existing avatar where intended, and doesn't duplicate attempts/subjects.
- Google login should link only verified provider email with safe account-resolution semantics and anti-race constraints.

### First-time personalization
- Exactly one stable illustrated persona assigned on first confirmed owner account as specified `../design/IDENTITY_FRIENDS_GROUPS.md`.
- The profile is not a pre-created subject, imported document or false demo record. User may edit on entry or later.
- User should land on beautifully designed but **empty** real Home with first source invitation.

## Email branding and deliverability requirements

Current auth email file's OurSpaces wording is a visible rebrand bug. Replace subject, body, accessible image alt and link text with PearNotes. Use approved Sticker P and dedicated PearNotes image asset (do not hotlink a relative frontend path in email; email images require absolute HTTPS). Preserve inline CSS fallbacks and meaningful plaintext. Sender address must be verified/authorized; if unchanged temporarily, explicitly disclose from-address provenance and avoid impersonation. Do not select a new paid email provider or register a domain without owner approval.

If using AgentMail after investigation: verify API and sender permissions, quotas, logging, SPF/DKIM conditions and bounce/suppression policy. Never hardcode secret in code, logs or frontend. Prefer an isolated test mailbox for workflow smoke, then owner's Gmail for controlled acceptance.

## Google OAuth technical checklist

1. Configured `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in correct isolated environment (do not print them).
2. Exact Google OAuth allowed redirect/callback URLs, provider domain and `SITE_URL` for preview/production contexts.
3. Enforce relative internal `next` allowlist; reject backslashes, network-path forms, control characters, alternate origins and path normalization tricks. Reconsider strict host matching for OAuth redirect, not broad `startsWith(site)` alone, and don't permit arbitrary external destinations.
4. Link only a verified email; no cross-account collision or identity duplication. Repeat Google login on a different device and compare stable user ID.
5. Sign out fully; changing accounts rekeys all private reads/caches; personal learning data never appears until owner authenticated.
6. Clear cancellation/provider failure with alternative OTP and no stuck redirect loop.
7. Mobile popup/redirect restrictions handled; use ordinary redirect where reliable, not an invisible blocked popup.
8. Google logo and OAuth branding must comply with provider rules; can use native dialog button styling but not misleading icon.

## Automated, integration and owner acceptance evidence

**Unit tests:** `sendFailureMessage` not misclassifying provider failures as invalid Gmail, per-error mapping and retry-after; email normalizer; proper form stages; resend throttling; safe next redirect; provider availability; idempotent persona init; cross-account remount.

**Backend tests:** unauthorized/foreign identity, guest upgrade, two concurrent verified sign-ins, email stub lifecycle, invalid/expired/replayed OTP, rate-limit behavior, Google verified linkage, ownership preservation. No live request in unit tests.

**Isolated deployment E2E:** actually receive code in user-controlled Gmail; submit correct code; enter desk; name/avatar persisted; reload; sign out; sign back in on second device; no prior account leaks; test Google independently if keys configured. Save redacted logs and screenshot.

**P0 exit gate:** no shipping/release until owned Gmail or equivalent consumer email real OTP flow has been proved on target deployment. Source and UI redesign alone cannot close this blocker.

**Files to inspect:** `src/live/useJoin.ts`, `src/entry/AuthPages.tsx`, `src/entry/GetStartedModal.tsx`, `convex/otp.ts`, `convex/emails/signIn.ts`, `convex/auth.ts`, `convex/auth.config.ts` and backend environment/runtime logs. No Convex production push and no third-party paid integration change without explicit authorization.
