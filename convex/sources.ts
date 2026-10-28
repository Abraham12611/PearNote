/**
 * Private source files (Phase 00.4). Spec: learning/INGESTION.md stage 0 and
 * engineering/PERMISSIONS.md.
 *
 * Security posture:
 *  - The blob lives in Convex file storage and is only ever referenced by its
 *    `storageId`; no persistent URL is stored or exposed. `get` returns a
 *    short-lived URL minted per-call, only after the owner check passes.
 *  - `register` verifies the blob's own storage metadata (checksum/size)
 *    server-side — client-claimed sha256/mime/size cannot override it.
 *  - Segment text is reachable only through the parent source's owner check
 *    (learningAuth.ownedSegment). There is no public path to document text.
 *  - Reads fail closed: not-owner is indistinguishable from not-found.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  learnerId,
  ownedSegment,
  ownedSource,
  requireLearnerId,
  requireOwnedSource,
} from "./learningAuth";
import { sourceStatus } from "./tables/learning";
import type { Doc } from "./_generated/dataModel";

const err = (code: string, message: string) => new ConvexError({ code, message });

/**
 * The _storage row's sha256 is hex on the real backend. Normalize in case an
 * environment presents the same digest base64-encoded (the test backend does)
 * so the comparison below always means "claimed digest === stored digest".
 */
function sha256ToHex(digest: string): string {
  if (/^[0-9a-f]{64}$/i.test(digest)) return digest.toLowerCase();
  try {
    const bytes = Uint8Array.from(atob(digest), (c) => c.charCodeAt(0));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return digest.toLowerCase();
  }
}

// INGESTION.md Phase 1 scope: PDF and pasted/plain text only.
const ALLOWED_MIME = new Set(["application/pdf", "text/plain"]);
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const TITLE_MAX = 200;
// Bounded read — replace with cursor pagination when the library view lands.
const MAX_SEGMENTS_PER_QUERY = 500;

const sourceMeta = {
  _id: v.id("sources"),
  title: v.string(),
  mime: v.string(),
  sizeBytes: v.number(),
  sha256: v.string(),
  status: sourceStatus,
  error: v.optional(v.string()),
  createdAt: v.number(),
};

const segmentShape = {
  _id: v.id("sourceSegments"),
  sourceId: v.id("sources"),
  segmentNo: v.number(),
  page: v.optional(v.number()),
  text: v.string(),
  kind: v.optional(
    v.union(
      v.literal("paragraph"),
      v.literal("heading"),
      v.literal("caption"),
      v.literal("formula"),
    ),
  ),
  quoteStart: v.optional(v.number()),
  quoteEnd: v.optional(v.number()),
  createdAt: v.number(),
};

/**
 * Step 1 of upload: a short-lived upload URL for the caller's own file.
 * Creates no source row — `register` does that after the blob lands.
 */
export const createUploadUrl = mutation({
  args: {},
  returns: v.object({ uploadUrl: v.string() }),
  handler: async (ctx) => {
    await requireLearnerId(ctx);
    return { uploadUrl: await ctx.storage.generateUploadUrl() };
  },
});

/**
 * Step 2 of upload: turn an uploaded blob into an owned `sources` row.
 * Checksum/size come from the `_storage` system row Convex computed at
 * upload; the client's claimed values are validated against them, never trusted.
 * Re-registering identical bytes links to the existing row (dedupe hint,
 * INGESTION stage 0 / acceptance E06) rather than making a corrupt duplicate.
 */
export const register = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.string(),
    mime: v.string(),
    sizeBytes: v.number(),
    sha256: v.string(),
  },
  returns: v.object({
    sourceId: v.id("sources"),
    deduplicated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const ownerId = await requireLearnerId(ctx);

    const title = args.title.trim();
    if (title.length === 0 || title.length > TITLE_MAX) {
      throw err("INVALID_INPUT", `title must be 1..${TITLE_MAX} characters`);
    }
    if (!ALLOWED_MIME.has(args.mime)) {
      throw err("UNSUPPORTED_SOURCE", `unsupported source type: ${args.mime}`);
    }
    if (!Number.isFinite(args.sizeBytes) || args.sizeBytes <= 0 || args.sizeBytes > MAX_SOURCE_BYTES) {
      throw err("INVALID_INPUT", `sizeBytes must be in 1..${MAX_SOURCE_BYTES}`);
    }
    if (!/^[0-9a-f]{64}$/i.test(args.sha256)) {
      throw err("INVALID_INPUT", "sha256 must be a 64-digit hex string");
    }

    // Verify against the stored blob's own metadata: the client's claimed
    // checksum and size are checked against the _storage system row Convex
    // computed at upload, never trusted.
    const stored = await ctx.db.system.get("_storage", args.storageId);
    if (stored === null) {
      throw err("INVALID_INPUT", "no uploaded file for this storage id");
    }
    const sha256 = sha256ToHex(stored.sha256);
    if (sha256 !== args.sha256.toLowerCase()) {
      throw err("INVALID_INPUT", "checksum does not match the uploaded file");
    }
    if (stored.size !== args.sizeBytes) {
      throw err("INVALID_INPUT", "size does not match the uploaded file");
    }

    // A blob may only ever belong to the account that first registered it:
    // a second claim on the same storageId — e.g. a guessed or leaked id —
    // is denied outright instead of minting a new owner's window onto the
    // original uploader's bytes (PERMISSIONS.md threat list).
    const claimed = await ctx.db
      .query("sources")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (claimed !== null) {
      if (claimed.ownerId !== ownerId) {
        throw err("UNAUTHORIZED", "no uploaded file for this storage id");
      }
      // Re-uploading a file you previously deleted revives its row, keeping
      // segment/subject links intact rather than forking a second row on the
      // same blob.
      if (claimed.status === "deleted") {
        await ctx.db.patch(claimed._id, { status: "uploaded", updatedAt: Date.now() });
      }
      return { sourceId: claimed._id, deduplicated: true };
    }

    // Same bytes for the same owner: link, don't duplicate.
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_owner_sha", (q) =>
        q.eq("ownerId", ownerId).eq("sha256", sha256),
      )
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .first();
    if (existing !== null) {
      return { sourceId: existing._id, deduplicated: true };
    }

    const now = Date.now();
    const sourceId = await ctx.db.insert("sources", {
      ownerId,
      storageId: args.storageId,
      title,
      mime: args.mime,
      sizeBytes: stored.size,
      sha256,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    });
    return { sourceId, deduplicated: false };
  },
});

/** `sources.listMine` — own source metadata (no URLs). [] when signed out. */
export const listMine = query({
  args: {},
  returns: v.array(v.object(sourceMeta)),
  handler: async (ctx) => {
    const userId = await learnerId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("sources")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return rows
      .filter((s) => s.status !== "deleted")
      .map(({ _id, title, mime, sizeBytes, sha256, status, error, createdAt }) => ({
        _id, title, mime, sizeBytes, sha256, status, error, createdAt,
      }));
  },
});

/**
 * `sources.get` — metadata plus a short-lived download URL, minted only for
 * the owner. The storageId itself never leaves the server.
 */
export const get = query({
  args: { sourceId: v.id("sources") },
  returns: v.union(
    v.object({ ...sourceMeta, url: v.union(v.string(), v.null()) }),
    v.null(),
  ),
  handler: async (ctx, { sourceId }) => {
    const source = await ownedSource(ctx, sourceId);
    if (source === null || source.status === "deleted") return null;
    const url = await ctx.storage.getUrl(source.storageId);
    const { _id, title, mime, sizeBytes, sha256, status, error, createdAt } = source;
    return { _id, title, mime, sizeBytes, sha256, status, error, createdAt, url };
  },
});

// Strip system fields — returns validators reject extras.
const toSegmentShape = (s: Doc<"sourceSegments">) => ({
  _id: s._id,
  sourceId: s.sourceId,
  segmentNo: s.segmentNo,
  page: s.page,
  text: s.text,
  kind: s.kind,
  quoteStart: s.quoteStart,
  quoteEnd: s.quoteEnd,
  createdAt: s.createdAt,
});

/**
 * `sources.listSegments` — the document text, owner only, bounded.
 * Guessed sourceIds return []; the parent ownership check runs before a
 * single character of text is touched.
 */
export const listSegments = query({
  args: { sourceId: v.id("sources") },
  returns: v.array(v.object(segmentShape)),
  handler: async (ctx, { sourceId }) => {
    const source = await ownedSource(ctx, sourceId);
    if (source === null || source.status === "deleted") return [];
    const rows = await ctx.db
      .query("sourceSegments")
      .withIndex("by_source_number", (q) => q.eq("sourceId", sourceId))
      .take(MAX_SEGMENTS_PER_QUERY);
    return rows.map(toSegmentShape);
  },
});

/** `sources.getSegment` — one segment, authorized via its parent source. */
export const getSegment = query({
  args: { segmentId: v.id("sourceSegments") },
  returns: v.union(v.object(segmentShape), v.null()),
  handler: async (ctx, { segmentId }) => {
    const owned = await ownedSegment(ctx, segmentId);
    if (owned === null || owned.source.status === "deleted") return null;
    return toSegmentShape(owned.segment);
  },
});

/**
 * Soft-delete a source. The row is kept for referential integrity
 * (ARCHITECTURE.md lifecycle); blob/segment retention cleanup is a later
 * scheduled job. Reads treat deleted as gone.
 */
export const remove = mutation({
  args: { sourceId: v.id("sources") },
  returns: v.null(),
  handler: async (ctx, { sourceId }) => {
    const source = await requireOwnedSource(ctx, sourceId);
    if (source.status !== "deleted") {
      await ctx.db.patch(sourceId, { status: "deleted", updatedAt: Date.now() });
    }
    return null;
  },
});
