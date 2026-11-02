/**
 * Issue #76 — account-switch-safe identity sync: server wins per-field,
 * transitions pass through the tab's neutral base, and the A→logout→B
 * window can never mirror stale fields into B's row.
 */
import { describe, expect, test } from "vitest";
import {
  mayMirrorLocalEdit,
  mergeServerIdentity,
  shouldHydrate,
  type LocalIdentity,
} from "../src/live/identitySync";

const base: LocalIdentity = { name: "juno", color: "#7C5CFF", emoji: "🍒", avatarUrl: "/avatars/juno.png" };
const A = { name: "Ada", color: "#A1A1A1", emoji: "🦉", image: "/avatars/wren.png", personaId: "wren" };
const B = { name: "Bea", color: "#B2B2B2", emoji: "🦊", image: "/avatars/pico.png", personaId: "pico" };

describe("mergeServerIdentity — server wins, base fills only the gaps", () => {
  test("full server profile overrides every adopted field", () => {
    expect(mergeServerIdentity(A, base)).toEqual({
      name: "Ada", color: "#A1A1A1", emoji: "🦉", avatarUrl: "/avatars/wren.png",
    });
  });
  test("missing server fields fall back to BASE, never the previous account", () => {
    // B signed in but B's row only has a name — the rest must be the tab's
    // minted base, NOT A's adopted color/emoji/face.
    const partial = { name: "Bea" };
    const merged = mergeServerIdentity(partial, base);
    expect(merged.name).toBe("Bea");
    expect(merged.color).toBe(base.color);
    expect(merged.emoji).toBe(base.emoji);
    expect(merged.avatarUrl).toBe(base.avatarUrl);
  });
  test("personaId supplies the illustrated face when image is absent", () => {
    const merged = mergeServerIdentity({ name: "New", personaId: "kiwi" }, base);
    expect(merged.avatarUrl).toBe("/avatars/kiwi.png");
    expect(merged.avatarUrl).not.toBe(A.image);
  });
});

describe("transition + mirror gating — the A→logout→B window is locked", () => {
  test("hydrate fires once per joined account; never for guest/null", () => {
    expect(shouldHydrate("b", "a")).toBe(true);   // A → B
    expect(shouldHydrate("b", null)).toBe(true);  // guest → B
    expect(shouldHydrate("b", "b")).toBe(false);  // already hydrated
    expect(shouldHydrate(null, "a")).toBe(false); // signed out
  });
  test("mirror is blocked until the CURRENT account is hydrated", () => {
    // Stale window: joined B but hydratedFor still holds A — a push here
    // would write A's cached fields into B's row.
    expect(mayMirrorLocalEdit({ joinedId: "b", hydratedFor: "a", hasServerProfile: true })).toBe(false);
    // Mid-swap: no profile resolved yet.
    expect(mayMirrorLocalEdit({ joinedId: "b", hydratedFor: "b", hasServerProfile: false })).toBe(false);
    // Guests/visitors never mirror.
    expect(mayMirrorLocalEdit({ joinedId: null, hydratedFor: null, hasServerProfile: true })).toBe(false);
    // Correct case: hydrated B, B's profile present, local edit lands.
    expect(mayMirrorLocalEdit({ joinedId: "b", hydratedFor: "b", hasServerProfile: true })).toBe(true);
  });
  test("rapid switching: each new joinedId re-arms hydration once", () => {
    expect(shouldHydrate("c", "b")).toBe(true);
    expect(shouldHydrate("c", "c")).toBe(false);
  });
});
