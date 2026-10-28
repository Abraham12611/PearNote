/**
 * Issue #6 adversarial privacy tests (engineering/PERMISSIONS.md threat list,
 * delivery/ACCEPTANCE_TESTS.md E20, delivery/SECURITY_PRIVACY.md release tests).
 *
 * Proves the Phase 00.4 guarantee: user A can never retrieve user B's private
 * subjects, sources or source segments — not by guessed ids, not by forged
 * owner fields, and not unauthenticated.
 *
 * Run: npm test
 */
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

// The generated api.d.ts predates these modules (codegen is deployment-gated),
// so reference functions through the generic proxy — same paths the client uses.
const api = anyApi;

// Register only the modules under test; learningAuth is pulled in
// transitively. The _generated entry lets convex-test locate the modules
// root; its files are only loaded lazily when invoked by path.
const modules = import.meta.glob([
  "../convex/{subjects,sources,learningAuth}.ts",
  "../convex/_generated/api.js",
]);

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

type T = ReturnType<typeof convexTest>;

async function setup() {
  const t = convexTest(schema, modules);
  const [aId, bId] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { name: "ada" }),
    await ctx.db.insert("users", { name: "bea" }),
  ]);
  // @convex-dev/auth tokens carry `${userId}|${sessionId}` in the JWT subject.
  const asA = t.withIdentity({ subject: `${aId}|s-a` });
  const asB = t.withIdentity({ subject: `${bId}|s-b` });
  return { t, aId, bId, asA, asB };
}

async function uploadText(t: T, text: string) {
  // _storage rows are system-table writes, so the only way to seed one is a
  // real store() — the mock records the digest base64-encoded where the real
  // backend records hex; register() normalizes either.
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob([text], { type: "text/plain" })),
  );
  const sizeBytes = new TextEncoder().encode(text).byteLength;
  const sha256 = await sha256Hex(text);
  return { storageId, sizeBytes, sha256 };
}

const registerArgs = (u: { storageId: Id<"_storage">; sizeBytes: number; sha256: string }) => ({
  storageId: u.storageId,
  title: "notes.txt",
  mime: "text/plain",
  sizeBytes: u.sizeBytes,
  sha256: u.sha256,
});

/** Assert a rejection carries our structured error code. */
async function denied(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ data: { code } });
}

async function seedSegments(t: T, sourceId: Id<"sources">) {
  return await t.run(async (ctx) => [
    await ctx.db.insert("sourceSegments", {
      sourceId, segmentNo: 1, page: 1, text: "Ada private page one.", kind: "paragraph", createdAt: Date.now(),
    }),
    await ctx.db.insert("sourceSegments", {
      sourceId, segmentNo: 2, page: 2, text: "Ada private page two.", kind: "paragraph", createdAt: Date.now(),
    }),
  ]);
}

describe("subjects", () => {
  test("createManual stamps the caller as owner; guests' subjects start manual_empty", async () => {
    const { asA, aId } = await setup();
    const { subjectId } = await asA.mutation(api.subjects.createManual, { name: "Cell Biology" });
    const row = await asA.run(async (ctx) => ctx.db.get(subjectId));
    expect(row).toMatchObject({ ownerId: aId, name: "Cell Biology", status: "manual_empty" });
  });

  test("listMine returns only the caller's subjects; empty for others and signed-out", async () => {
    const { t, asA, asB } = await setup();
    await asA.mutation(api.subjects.createManual, { name: "Ada subject" });
    expect(await asA.query(api.subjects.listMine)).toHaveLength(1);
    expect(await asB.query(api.subjects.listMine)).toEqual([]);
    expect(await t.query(api.subjects.listMine)).toEqual([]);
  });

  test("get: user B cannot read user A's subject by id — indistinguishable from missing", async () => {
    const { asA, asB } = await setup();
    const { subjectId } = await asA.mutation(api.subjects.createManual, { name: "secret" });
    expect(await asB.query(api.subjects.get, { subjectId })).toBeNull();
    expect(await asA.query(api.subjects.get, { subjectId })).toMatchObject({ name: "secret" });
  });

  test("rename/setStatus: user B cannot mutate user A's subject", async () => {
    const { asA, asB } = await setup();
    const { subjectId } = await asA.mutation(api.subjects.createManual, { name: "mine" });
    await denied(asB.mutation(api.subjects.rename, { subjectId, name: "hijacked" }), "UNAUTHORIZED");
    await denied(asB.mutation(api.subjects.setStatus, { subjectId, status: "archived" }), "UNAUTHORIZED");
    expect(await asA.query(api.subjects.get, { subjectId })).toMatchObject({ name: "mine" });
  });

  test("unauthenticated callers are denied writes, not just reads", async () => {
    const { t, asA } = await setup();
    const { subjectId } = await asA.mutation(api.subjects.createManual, { name: "anon target" });
    await denied(t.mutation(api.subjects.createManual, { name: "anon" }), "UNAUTHORIZED");
    await denied(t.mutation(api.subjects.rename, { subjectId, name: "y" }), "UNAUTHORIZED");
  });
});

describe("sources", () => {
  test("createUploadUrl requires sign-in", async () => {
    const { t, asA } = await setup();
    await denied(t.mutation(api.sources.createUploadUrl), "UNAUTHORIZED");
    expect((await asA.mutation(api.sources.createUploadUrl)).uploadUrl).toContain("http");
  });

  test("register validates mime, checksum format, size and blob existence", async () => {
    const { t, asA } = await setup();
    const up = await uploadText(t, "hello");
    const base = registerArgs(up);
    await denied(t.mutation(api.sources.register, base), "UNAUTHORIZED");
    await denied(asA.mutation(api.sources.register, { ...base, mime: "application/x-msdownload" }), "UNSUPPORTED_SOURCE");
    await denied(asA.mutation(api.sources.register, { ...base, sha256: "zz".repeat(32) }), "INVALID_INPUT");
    await denied(asA.mutation(api.sources.register, { ...base, sizeBytes: -1 }), "INVALID_INPUT");
    await denied(asA.mutation(api.sources.register, { ...base, sha256: "0".repeat(64) }), "INVALID_INPUT");
    // A storageId whose blob is gone behaves like a nonexistent upload.
    const ghost = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["gone"]));
      await ctx.storage.delete(id);
      return id;
    });
    await denied(asA.mutation(api.sources.register, { ...base, storageId: ghost }), "INVALID_INPUT");
  });

  test("register mints an owned row; same bytes dedupe to the same source", async () => {
    const { t, asA, aId } = await setup();
    const up = await uploadText(t, "identical content");
    const first = await asA.mutation(api.sources.register, registerArgs(up));
    const second = await asA.mutation(api.sources.register, { ...registerArgs(up), title: "other name" });
    expect(first.deduplicated).toBe(false);
    expect(second).toMatchObject({ sourceId: first.sourceId, deduplicated: true });
    const row = await asA.run(async (ctx) => ctx.db.get(first.sourceId));
    expect(row).toMatchObject({ ownerId: aId, status: "uploaded" });
  });

  test("a guessed storageId can never be claimed under a different owner", async () => {
    const { t, asA, asB } = await setup();
    const up = await uploadText(t, "bea's file bytes");
    await asB.mutation(api.sources.register, registerArgs(up));
    // A knows B's storageId — claiming it still fails closed.
    await denied(asA.mutation(api.sources.register, registerArgs(up)), "UNAUTHORIZED");
  });

  test("get: metadata + short-lived URL for owner only; null for B and signed-out", async () => {
    const { t, asA, asB } = await setup();
    const up = await uploadText(t, "chapter one");
    const { sourceId } = await asA.mutation(api.sources.register, registerArgs(up));
    const own = await asA.query(api.sources.get, { sourceId });
    expect(own).toMatchObject({ title: "notes.txt", status: "uploaded" });
    expect(own?.url).toContain("http");
    expect(await asB.query(api.sources.get, { sourceId })).toBeNull();
    expect(await t.query(api.sources.get, { sourceId })).toBeNull();
  });

  test("listMine hides other users' sources", async () => {
    const { t, asA, asB } = await setup();
    const up = await uploadText(t, "ada only");
    await asA.mutation(api.sources.register, registerArgs(up));
    expect(await asA.query(api.sources.listMine)).toHaveLength(1);
    expect(await asB.query(api.sources.listMine)).toEqual([]);
  });

  test("segment text is unreachable to anyone but the source owner", async () => {
    const { t, asA, asB } = await setup();
    const up = await uploadText(t, "full document");
    const { sourceId } = await asA.mutation(api.sources.register, registerArgs(up));
    const [segId] = await seedSegments(t, sourceId);

    const own = await asA.query(api.sources.listSegments, { sourceId });
    expect(own.map((s: { text: string }) => s.text)).toEqual([
      "Ada private page one.", "Ada private page two.",
    ]);
    expect(await asA.query(api.sources.getSegment, { segmentId: segId })).toMatchObject({ text: "Ada private page one." });

    // Guessed source id and guessed segment id both fail closed.
    expect(await asB.query(api.sources.listSegments, { sourceId })).toEqual([]);
    expect(await asB.query(api.sources.getSegment, { segmentId: segId })).toBeNull();
    expect(await t.query(api.sources.listSegments, { sourceId })).toEqual([]);
    expect(await t.query(api.sources.getSegment, { segmentId: segId })).toBeNull();
  });

  test("remove is owner-only and hides the source everywhere", async () => {
    const { t, asA, asB } = await setup();
    const up = await uploadText(t, "to be deleted");
    const { sourceId } = await asA.mutation(api.sources.register, registerArgs(up));
    await seedSegments(t, sourceId);
    await denied(asB.mutation(api.sources.remove, { sourceId }), "UNAUTHORIZED");
    await asA.mutation(api.sources.remove, { sourceId });
    expect(await asA.query(api.sources.get, { sourceId })).toBeNull();
    expect(await asA.query(api.sources.listSegments, { sourceId })).toEqual([]);
    expect(await asA.query(api.sources.listMine)).toEqual([]);
  });

  test("re-uploading a deleted own file revives its row and links", async () => {
    const { t, asA } = await setup();
    const up = await uploadText(t, "revive me");
    const first = await asA.mutation(api.sources.register, registerArgs(up));
    await asA.mutation(api.sources.remove, { sourceId: first.sourceId });
    const second = await asA.mutation(api.sources.register, registerArgs(up));
    expect(second).toMatchObject({ sourceId: first.sourceId, deduplicated: true });
    expect(await asA.query(api.sources.get, { sourceId: first.sourceId })).not.toBeNull();
  });
});
