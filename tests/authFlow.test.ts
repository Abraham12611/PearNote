/**
 * Issue #60 — auth-flow helper tests. Pure functions only; no live
 * provider calls. Proves the Gmail-OTP failure can no longer be reported
 * to the owner as "check the address?" and that OAuth redirects are
 * strictly origin-locked.
 */
import { describe, expect, test } from "vitest";
import {
  authErrorCode,
  classifyOtpSendError,
  maskEmail,
  safeOAuthRedirect,
  sendFailureCopy,
} from "../convex/authFlow";
import { signInEmail } from "../convex/emails/signIn";

const convexErr = (code: string, message = "x") =>
  Object.assign(new Error(message), { data: { code, message } });

describe("sendFailureCopy — no failure is mislabeled 'check the address'", () => {
  test("rate limit surfaces real cooldown", () => {
    const r = sendFailureCopy({ data: { kind: "RateLimited", retryAfter: 7 * 60 * 1000 } });
    expect(r.code).toBe("RATE_LIMITED");
    expect(r.message).toContain("7 min");
  });
  test("provider/config failures get honest retry copy, never blame the address", () => {
    for (const code of ["PROVIDER_UNCONFIGURED", "EMAIL_SEND_REJECTED", "DELIVERY_UNAVAILABLE", "NETWORK_TIMEOUT"] as const) {
      const r = sendFailureCopy(convexErr(code));
      expect(r.code).toBe(code);
      expect(r.message).toContain("your address may be fine");
      expect(r.message).not.toContain("check the address");
    }
  });
  test("unclassified errors degrade to safe delivery copy", () => {
    const r = sendFailureCopy(new Error("socket hangup"));
    expect(r.code).toBe("DELIVERY_UNAVAILABLE");
    expect(r.message).not.toContain("check the address");
  });
  test("authErrorCode reads ConvexError-shaped data", () => {
    expect(authErrorCode(convexErr("PROVIDER_UNCONFIGURED"))).toBe("PROVIDER_UNCONFIGURED");
    expect(authErrorCode(new Error("plain"))).toBeUndefined();
  });
});

describe("classifyOtpSendError — provider HTTP class → safe category", () => {
  const agentMailErr = (status: number) =>
    new Error(`AgentMail /inboxes/x/messages/send → ${status}: {"error":"nope"}`);
  test("401/403/404 = provider/sender configuration fault", () => {
    for (const s of [401, 403, 404]) {
      expect(classifyOtpSendError(agentMailErr(s)).code).toBe("PROVIDER_UNCONFIGURED");
    }
  });
  test("429/4xx = send rejected", () => {
    expect(classifyOtpSendError(agentMailErr(429)).code).toBe("EMAIL_SEND_REJECTED");
    expect(classifyOtpSendError(agentMailErr(422)).code).toBe("EMAIL_SEND_REJECTED");
  });
  test("5xx = delivery unavailable; fetch abort = transport", () => {
    expect(classifyOtpSendError(agentMailErr(503)).code).toBe("DELIVERY_UNAVAILABLE");
    expect(classifyOtpSendError(new TypeError("fetch failed: ECONNRESET")).code).toBe("NETWORK_TIMEOUT");
    expect(classifyOtpSendError(new Error("weird")).code).toBe("DELIVERY_UNAVAILABLE");
  });
});

describe("safeOAuthRedirect — strict origin, no prefix smuggling", () => {
  const site = "https://pearnotes.example";
  test("same-origin and relative targets allowed", () => {
    expect(safeOAuthRedirect(`${site}/app`, site)).toBe(`${site}/app`);
    expect(safeOAuthRedirect("/app", site)).toBe(`${site}/app`);
    expect(safeOAuthRedirect("?joined=1", site)).toBe(`${site}?joined=1`);
  });
  test("subdomain/prefix tricks rejected", () => {
    for (const bad of [
      `${site}.evil.com/`,
      `${site}.example.evil.com/cb`,
      "https://evil.com/",
      `${site}@evil.com/`,
      "javascript:alert(1)",
      `${site}/cb\\@evil.com`,
      `${site}/cb\n@evil.com`,
      "//evil.com/x",
    ]) {
      expect(safeOAuthRedirect(bad, site)).toBe(site);
    }
  });
  test("production origin denies ALL localhost redirects — dev exception is site-scoped", () => {
    for (const bad of [
      "http://localhost:5173/app",
      "http://127.0.0.1:5173/",
      "http://0.0.0.0:8080/",
      "http://localhost.evil.com/",
      "https://localhost:5173/",
    ]) {
      expect(safeOAuthRedirect(bad, site)).toBe(site);
      expect(safeOAuthRedirect(bad, "https://app.pearnotes.example")).toBe("https://app.pearnotes.example");
    }
  });
  test("loopback dev site allows localhost http; unset site too", () => {
    expect(safeOAuthRedirect("http://localhost:5173/app", "http://localhost:3000")).toBe("http://localhost:5173/app");
    expect(safeOAuthRedirect("http://127.0.0.1:5173/", "http://localhost:3000")).toBe("http://127.0.0.1:5173/");
    expect(safeOAuthRedirect("http://localhost:5173/app", "")).toBe("http://localhost:5173/app");
    // Even on a dev site, https localhost and lookalikes stay out.
    expect(safeOAuthRedirect("https://localhost:5173/", "http://localhost:3000")).toBe("http://localhost:3000");
    expect(safeOAuthRedirect("http://localhost.evil.com/", "http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("maskEmail + PearNotes email copy", () => {
  test("maskEmail never reveals the full address", () => {
    expect(maskEmail("owner.name@gmail.com")).toBe("o***@gmail.com");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
  });
  test("sign-in email is PearNotes-branded, absolute-https image, real code", () => {
    const m = signInEmail("123456", "https://pearnotes.example/");
    expect(m.subject).toContain("PearNotes");
    expect(m.subject).toContain("123456");
    expect(m.subject).not.toContain("OurSpaces");
    expect(m.text).toContain("PearNotes");
    expect(m.html).toContain('alt="PearNotes"');
    expect(m.html).not.toContain("OurSpaces");
    expect(m.html).toContain("https://pearnotes.example/assets/email/signin-header.png");
    expect(m.html).toContain("Expires in 20 minutes");
  });
});
