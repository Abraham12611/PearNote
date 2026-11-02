import { describe, expect, test } from "vitest";
import { errorHint, verifyFailureCopy } from "../src/entry/authErrors";

const convexErr = (code: string) =>
  Object.assign(new Error("x"), { data: { code, message: "x" } });

describe("verifyFailureCopy — E4 categories honoured, never address blame", () => {
  test("expired code asks for a new one", () => {
    expect(verifyFailureCopy(convexErr("CODE_EXPIRED"))).toEqual({
      code: "CODE_EXPIRED",
      message: "that code expired. request a new one.",
    });
  });

  test("consumed code restarts the flow", () => {
    expect(verifyFailureCopy(convexErr("CODE_CONSUMED"))).toEqual({
      code: "CODE_CONSUMED",
      message: "that code was already used. start over.",
    });
  });

  test("unclassified or code-less failures get safe CODE_WRONG copy", () => {
    expect(verifyFailureCopy(convexErr("WHATEVER")).code).toBe("CODE_WRONG");
    expect(verifyFailureCopy(new Error("plain boom")).code).toBe("CODE_WRONG");
    expect(verifyFailureCopy(new Error("boom")).message).not.toContain("boom");
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

  test("unknown codes produce no hint", () => {
    expect(errorHint("CODE_WRONG", true)).toBeNull();
    expect(errorHint(null, true)).toBeNull();
  });
});
