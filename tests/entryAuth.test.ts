import { describe, expect, test } from "vitest";
import { errorHint, verifyFailureCopy } from "../src/entry/authErrors";

const convexErr = (code: string) =>
  Object.assign(new Error("x"), { data: { code, message: "x" } });

describe("verifyFailureCopy — explicit wrong code vs everything else", () => {
  test("explicit wrong-code signals → CODE_WRONG", () => {
    expect(verifyFailureCopy(convexErr("CODE_WRONG")).code).toBe("CODE_WRONG");
    expect(verifyFailureCopy(new Error("Invalid code")).code).toBe("CODE_WRONG");
    expect(
      verifyFailureCopy(Object.assign(new Error("x"), { data: { code: "x", message: "invalid code supplied" } })).code,
    ).toBe("CODE_WRONG");
    expect(verifyFailureCopy(new Error("Invalid code")).message).toContain("six digits");
  });

  test("expired code asks for a new one", () => {
    expect(verifyFailureCopy(convexErr("CODE_EXPIRED"))).toEqual({
      code: "CODE_EXPIRED",
      message: "that code expired. request a new one.",
    });
    expect(verifyFailureCopy(new Error("Code expired")).code).toBe("CODE_EXPIRED");
  });

  test("consumed code restarts the flow", () => {
    expect(verifyFailureCopy(convexErr("CODE_CONSUMED"))).toEqual({
      code: "CODE_CONSUMED",
      message: "that code was already used. start over.",
    });
    expect(verifyFailureCopy(new Error("code already used")).code).toBe("CODE_CONSUMED");
  });

  test("rate limit surfaces a cool-down", () => {
    expect(verifyFailureCopy(convexErr("RATE_LIMITED")).code).toBe("RATE_LIMITED");
  });

  test("backend/provider categories → VERIFY_UNAVAILABLE, never CODE_WRONG", () => {
    for (const code of ["PROVIDER_UNCONFIGURED", "DELIVERY_UNAVAILABLE", "NETWORK_TIMEOUT"] as const) {
      expect(verifyFailureCopy(convexErr(code)).code).toBe("VERIFY_UNAVAILABLE");
    }
  });

  test("network outage / unclassified → truthful retry, NOT code blame", () => {
    for (const e of [
      new TypeError("fetch failed"),
      new Error("socket hangup"),
      "string throw",
      null,
      undefined,
      convexErr("WHATEVER"),
    ]) {
      const r = verifyFailureCopy(e);
      expect(r.code).toBe("VERIFY_UNAVAILABLE");
      expect(r.message).not.toContain("didn't work");
      expect(r.message).toContain("try again");
    }
  });
});

describe("errorHint — category-specific guidance", () => {
  test("rate limit explains the cool-down", () => {
    expect(errorHint("RATE_LIMITED", true)).toContain("cool-down");
  });

  test("delivery categories point at Google when configured", () => {
    for (const code of [
      "PROVIDER_UNCONFIGURED",
      "EMAIL_SEND_REJECTED",
      "DELIVERY_UNAVAILABLE",
      "NETWORK_TIMEOUT",
    ] as const) {
      expect(errorHint(code, true)).toContain("Google");
    }
  });

  test("without Google the demo is the honest alternative", () => {
    expect(errorHint("DELIVERY_UNAVAILABLE", false)).toContain("demo");
  });

  test("verify-unavailable reassures about the code itself", () => {
    expect(errorHint("VERIFY_UNAVAILABLE", true)).toContain("code may be fine");
  });

  test("unknown codes produce no hint", () => {
    expect(errorHint("CODE_WRONG", true)).toBeNull();
    expect(errorHint(null, true)).toBeNull();
  });
});
