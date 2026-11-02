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
import { seedPersona } from "../convex/profiles";
import { createOrUpdateUserInner } from "../convex/auth";

const api = anyApi;
const modules = import.meta.glob(["../convex/{profiles,personas,auth,auth.config,otp,rateLimits,agentmail,firecrawl,inbox,http}.ts", "../convex/emails/*.ts", "../convex/_generated/api.js"]);

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

describe("seedPersona — the sign-in handoff (createOrUpdateUser)", () => {
  test("fresh account gets full catalog identity: name + persona + accent + face", async () => {
    const t = convexTest(schema, modules);
    // Brand-new user with NO fields — the verified-email insert shape.
    const aId = await t.run(async (ctx) => ctx.db.insert("users", { email: "n@example.com" }));
    await t.run((ctx) => seedPersona(ctx.db, aId));
    const u = await t.run(async (ctx) => ctx.db.get(aId));
    expect(PERSONA_IDS).toContain(u!.personaId);
    expect(u!.name).toBe(personaById(u!.personaId!)!.label.toLowerCase());
    expect(u!.color).toBe(personaById(u!.personaId!)!.accent);
    expect(u!.image).toBe(`/avatars/${u!.personaId}.png`);
  });
  test("existing name/photo/color are never overwritten — only absent fields fill", async () => {
    const t2 = convexTest(schema, modules);
    const id = await t2.run(async (ctx) =>
      ctx.db.insert("users", { name: "chosen name", image: "/avatars/kiwi.png", color: "#abcdef" }),
    );
    await t2.run((ctx) => seedPersona(ctx.db, id));
    const u = await t2.run(async (ctx) => ctx.db.get(id));
    expect(u!.name).toBe("chosen name");
    expect(u!.image).toBe("/avatars/kiwi.png");
    expect(u!.color).toBe("#abcdef");
    expect(PERSONA_IDS).toContain(u!.personaId); // persona still assigned
    // Second seed is a complete no-op.
    await t2.run((ctx) => seedPersona(ctx.db, id));
    expect((await t2.run(async (ctx) => ctx.db.get(id)))!.name).toBe("chosen name");
  });
  test("guest-upgrade rows (name already set by the guest) keep their name", async () => {
    const t3 = convexTest(schema, modules);
    // Guest path: getIdentity-written row with an existing display name.
    const id = await t3.run(async (ctx) => ctx.db.insert("users", { name: "juno", isAnonymous: true }));
    await t3.run((ctx) => seedPersona(ctx.db, id));
    expect((await t3.run(async (ctx) => ctx.db.get(id)))!.name).toBe("juno");
  });
});

describe("account-creation defaults — Google/email/guest/returning", () => {
  const google = { existingUserId: null, type: "oauth" as const, provider: { id: "google" },
    profile: { email: "g@x.co", name: "G Name", image: "https://lh3.googleusercontent.com/x" } };
  test("NEW Google user: curated face, NOT the remote Google photo", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) => createOrUpdateUserInner(ctx as never, google));
    await t.run((ctx) => seedPersona(ctx.db, id));
    const u = await t.run(async (ctx) => ctx.db.get(id));
    expect(u!.image).toBe(`/avatars/${u!.personaId}.png`); // illustrated catalog face
    expect(u!.image).not.toContain("googleusercontent");
    expect(u!.name).toBe("g");
  });
  test("NEW verified-email user: full persona identity", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => ctx.db.insert("users", { email: "e@x.co", emailVerificationTime: 1 }));
    await t.run((ctx) => seedPersona(ctx.db, id));
    const u = await t.run(async (ctx) => ctx.db.get(id));
    expect(PERSONA_IDS).toContain(u!.personaId);
    expect(u!.image).toBe(`/avatars/${u!.personaId}.png`);
    expect(u!.name).toBe(personaById(u!.personaId!)!.label.toLowerCase());
  });
  test("guest upgrade + returning account: persona stable, custom face kept", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => ctx.db.insert("users", { name: "rio", isAnonymous: true }));
    await t.run((ctx) => seedPersona(ctx.db, id)); // guest seeded at anonymous sign-in
    const first = (await t.run(async (ctx) => ctx.db.get(id)))!.personaId;
    await t.run(async (ctx) => ctx.db.patch(id, { image: "/avatars/wren.png", isAnonymous: false }));
    await t.run((ctx) => seedPersona(ctx.db, id)); // upgrade sign-in
    await t.run((ctx) => seedPersona(ctx.db, id)); // returning sign-in
    const u = await t.run(async (ctx) => ctx.db.get(id));
    expect(u!.personaId).toBe(first);            // durable
    expect(u!.image).toBe("/avatars/wren.png");   // chosen photo preserved
    expect(u!.name).toBe("rio");
  });
});

describe("legacy auth.updateProfile — unified validation", () => {
  test("malicious/bad writes rejected; valid edits pass", async () => {
    const { asA } = await seed();
    await expect(asA.mutation(api.auth.updateProfile, { color: "javascript:x" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.auth.updateProfile, { image: "https://evil.example/t.png" }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await expect(asA.mutation(api.auth.updateProfile, { name: "x".repeat(41) }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    const r = await asA.mutation(api.auth.updateProfile, { name: "Ada", color: "#a1b2c3", emoji: "🍒", image: "/avatars/wren.png" });
    expect(r).toBeNull();
  });
  test("guest rows are inert — the identity-sync mutation can't write them", async () => {
    const t = convexTest(schema, modules);
    const gId = await t.run(async (ctx) => ctx.db.insert("users", { isAnonymous: true, name: "g" }));
    const r = await t.withIdentity({ subject: `${gId}|s` }).mutation(api.auth.updateProfile, { name: "hax" });
    expect(r).toBeNull();
    expect((await t.run(async (ctx) => ctx.db.get(gId)))!.name).toBe("g");
  });
  test("forged/foreign storage references are rejected — no owner binding exists", async () => {
    const { asA } = await seed();
    for (const forged of [
      "storage:kg2abc123def456",
      "_storage/kg2abc123def456",
      "storage://kg2abc123def456",
      "_storage/../../../../etc",
      " storage:kg2abc",
    ]) {
      await expect(asA.mutation(api.auth.updateProfile, { image: forged }))
        .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
      await expect(asA.mutation(api.profiles.update, { image: forged }))
        .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    }
  });
  test("partially initialized account repaired: persona kept, missing fields filled", async () => {
    const t = convexTest(schema, modules);
    // personaId set, but no name/image/color — the legacy partial state.
    const id = await t.run(async (ctx) => ctx.db.insert("users", { personaId: "wren" }));
    await t.run((ctx) => seedPersona(ctx.db, id));
    const u = await t.run(async (ctx) => ctx.db.get(id));
    expect(u!.personaId).toBe("wren");                     // not re-rolled
    expect(u!.name).toBe("wren");
    expect(u!.color).toBe(personaById("wren")!.accent);
    expect(u!.image).toBe("/avatars/wren.png");
    // Bogus legacy personaId is repaired to a valid catalog persona.
    const bad = await t.run(async (ctx) => ctx.db.insert("users", { personaId: "ghost", name: "x" }));
    await t.run((ctx) => seedPersona(ctx.db, bad));
    const bu = await t.run(async (ctx) => ctx.db.get(bad));
    expect(PERSONA_IDS).toContain(bu!.personaId);
    expect(bu!.name).toBe("x"); // existing name preserved even on repair
  });
});

describe("update precedence — explicit args beat persona auto-swap", () => {
  test("args.image in the same call always wins over the persona face", async () => {
    const { asA } = await seed();
    await asA.mutation(api.profiles.initialize); // juno-face auto-set
    const p = await asA.mutation(api.profiles.update, { personaId: "wren", image: "/avatars/momo.png" });
    expect(p.image).toBe("/avatars/momo.png"); // explicit, NOT wren.png
    expect(p.personaId).toBe("wren");
  });
  test("a deliberately chosen face is preserved across later persona swaps", async () => {
    const { asA } = await seed();
    const init = await asA.mutation(api.profiles.initialize);
    // Pick a face that is NOT the auto-assigned persona's — whatever the hash gave.
    const chosen = PERSONA_IDS.find((id) => `/avatars/${id}.png` !== init.image)!;
    await asA.mutation(api.profiles.update, { image: `/avatars/${chosen}.png` });
    const p = await asA.mutation(api.profiles.update, { personaId: "kiwi" });
    expect(p.image).toBe(`/avatars/${chosen}.png`); // NOT auto-swapped to kiwi.png
    expect(p.personaId).toBe("kiwi");
  });
  test("an auto-assigned face follows a persona swap", async () => {
    const { asA } = await seed();
    const init = await asA.mutation(api.profiles.initialize);
    const p = await asA.mutation(api.profiles.update, { personaId: "clover" });
    // Face was auto-set from the old persona → follows the new one.
    expect(p.image).toBe("/avatars/clover.png");
    expect(init.image).not.toBe("/avatars/clover.png");
  });
});

describe("verified owner-bound avatar upload (#77)", () => {
  test("commitAvatar binds a real image blob → storage marker → resolved URL on read", async () => {
    const { t, asA } = await seed();
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["png"], { type: "image/png" })),
    );
    const p = await asA.mutation(api.profiles.commitAvatar, { storageId });
    expect(p.image).toBe(`storage:${storageId}`);
    const mine = await asA.query(api.profiles.getMine);
    expect(mine?.image).toContain("http"); // resolved signed URL, not the marker
    // Idempotent re-commit by the same owner.
    const again = await asA.mutation(api.profiles.commitAvatar, { storageId });
    expect(again.image).toBe(`storage:${storageId}`);
  });
  test("forged/missing/non-image storage ids rejected; foreign binding refused", async () => {
    const { t, asA, asB } = await seed();
    // Forged id that parses but doesn't exist.
    const forged = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["x"], { type: "image/png" }));
      await ctx.storage.delete(id);
      return id;
    });
    await expect(asA.mutation(api.profiles.commitAvatar, { storageId: forged }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // A binds it → B cannot steal the same storageId.
    const real = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["x"], { type: "image/png" })),
    );
    await asA.mutation(api.profiles.commitAvatar, { storageId: real });
    await expect(asB.mutation(api.profiles.commitAvatar, { storageId: real }))
      .rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    // Raw storage strings still rejected through the update paths.
    await expect(asB.mutation(api.profiles.update, { image: `storage:${real}` }))
      .rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
  });
  test("avatarUploadUrl requires sign-in", async () => {
    const { t, asA } = await seed();
    await expect(t.mutation(api.profiles.avatarUploadUrl)).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
    expect(await asA.mutation(api.profiles.avatarUploadUrl)).toContain("http");
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
