/**
 * Issue #66 — durable persona/profile tests: one-time assignment is
 * idempotent and race-safe, edits are whitelist-validated, cross-user
 * reads are display-safe only.
 */
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { PERSONA_IDS, personaById } from "../convex/personas";

const api = anyApi;
const modules = import.meta.glob(["../convex/{profiles,personas}.ts", "../convex/_generated/api.js"]);

async function seed() {
  const t = convexTest(schema, modules);
  const [aId, bId] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { name: "ada" }),
    await ctx.db.insert("users", { name: "bea" }),
  ]);
  return { t, aId, bId, asA: t.withIdentity({ subject: `${aId}|s` }), asB: t.withIdentity({ subject: `${bId}|s` }) };
}

describe("profiles.initialize — one-time durable assignment", () => {
  test("assigns a catalog persona + matching accent + image once, then replays it", async () => {
    const { t, asA } = await seed();
    const first = await asA.mutation(api.profiles.initialize);
    expect(PERSONA_IDS).toContain(first.personaId);
    expect(first.initialized).toBe(true);
    expect(first.color).toBe(personaById(first.personaId!)!.accent);
    expect(first.image).toBe(`/avatars/${first.personaId}.png`);
    // Replay: identical persona, no re-roll, no duplicate writes.
    const again = await asA.mutation(api.profiles.initialize);
    expect(again.personaId).toBe(first.personaId);
    const rows = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(rows).toHaveLength(2); // a + b only — no phantom rows
  });
  test("two racing initializations converge to one durable persona", async () => {
    const { asA } = await seed();
    const [r1, r2] = await Promise.all([
      asA.mutation(api.profiles.initialize),
      asA.mutation(api.profiles.initialize),
    ]);
    expect(r1.personaId).toBe(r2.personaId);
  });
  test("never overwrites a chosen name/photo on replay", async () => {
    const { asA } = await seed();
    await asA.mutation(api.profiles.initialize);
    await asA.mutation(api.profiles.update, { name: "custom learner" });
    const again = await asA.mutation(api.profiles.initialize);
    expect(again.name).toBe("custom learner");
  });
  test("unauthenticated cannot initialize", async () => {
    const { t } = await seed();
    await expect(t.mutation(api.profiles.initialize)).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
});

describe("profiles.update — whitelisted edits", () => {
  test("name/photo edits persist; persona change pulls matching accent", async () => {
    const { asA } = await seed();
    await asA.mutation(api.profiles.initialize);
    const p = await asA.mutation(api.profiles.update, { name: "Ada L.", image: "/avatars/pico.png" });
    expect(p.name).toBe("Ada L.");
    expect(p.image).toBe("/avatars/pico.png");
    const p2 = await asA.mutation(api.profiles.update, { personaId: "wren" });
    expect(p2.personaId).toBe("wren");
    expect(p2.color).toBe(personaById("wren")!.accent);
    // explicit color overrides the persona accent
    const p3 = await asA.mutation(api.profiles.update, { personaId: "kiwi", color: "#123456" });
    expect(p3.color).toBe("#123456");
  });
  test("rejects bad name, bad persona, bad color; never clears required data", async () => {
    const { asA } = await seed();
    await asA.mutation(api.profiles.initialize);
    await expect(asA.mutation(api.profiles.update, { name: " " })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.profiles.update, { name: "x".repeat(41) })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.profiles.update, { personaId: "nope" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.profiles.update, { color: "red" })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // Color bypass: personaId + bad color must ALSO be rejected (review).
    await expect(asA.mutation(api.profiles.update, { personaId: "wren", color: "red" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // Arbitrary image URLs are rejected — catalog avatar paths only.
    await expect(asA.mutation(api.profiles.update, { image: "https://evil.example/track.png" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.profiles.update, { image: "/avatars/ghost.png" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    const ok = await asA.mutation(api.profiles.update, { image: "/avatars/wren.png" });
    expect(ok.image).toBe("/avatars/wren.png");
  });
});

describe("owner-scoped privacy", () => {
  test("getMine is self-only; getDisplay exposes no email/flags/study data", async () => {
    const { t, asA, asB, aId, bId } = await seed();
    await asA.mutation(api.profiles.initialize);
    const mine = await asA.query(api.profiles.getMine);
    expect(mine?.userId).toBe(aId);
    // SELF-ONLY: B's request for A's id returns nothing — foreign ids are
    // invisible, indistinguishable from missing.
    const display = await asB.query(api.profiles.getDisplay, { userIds: [aId, bId] });
    expect(display).toHaveLength(1);
    expect(display[0].userId).toBe(bId);
    const allowed = new Set(["userId", "personaId", "name", "image", "color"]);
    for (const row of display) {
      for (const k of Object.keys(row)) expect(allowed.has(k)).toBe(true);
      expect(row).not.toHaveProperty("email");
      expect(row).not.toHaveProperty("isAnonymous");
    }
    // Signed-out callers get nothing at all.
    expect(await t.query(api.profiles.getMine)).toBeNull();
    await expect(t.query(api.profiles.getDisplay, { userIds: [aId] })).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
});
