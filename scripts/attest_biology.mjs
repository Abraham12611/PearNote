/**
 * OPERATOR tool — Biology fact evidence review + owner attestation (#45).
 * Requires authentication credentials supplied through your own secure
 * session (AUTH_TOKEN env). Not an in-app owner review surface.
 *
 * Modes:
 *   review (default) — read-only: prints every fact's candidate passages
 *                      (page + full bounded excerpt). Writes nothing.
 *   attest           — interactive: for EACH fact, per-candidate segment
 *                      confirm/reject individually, then a final review of
 *                      all six mappings before a single write.
 * Skipped/unconfirmed facts abstain — no scored activity is created.
 *
 *   VITE_CONVEX_URL=<dev> AUTH_TOKEN=<session> LESSON_ID=<id> \
 *     node scripts/attest_biology.mjs [attest]
 */
import { ConvexHttpClient } from "convex/browser";
import * as readline from "node:readline";

const url = process.env.VITE_CONVEX_URL, token = process.env.AUTH_TOKEN, lessonId = process.env.LESSON_ID;
if (!url || !token || !lessonId) throw new Error("need VITE_CONVEX_URL, AUTH_TOKEN, LESSON_ID");
const client = new ConvexHttpClient(url);
client.setAuth(token);

const FACTS = [
  { itemId: "f-wall", bucketId: "plant", term: "wall", claim: "plant cells have a cellulose cell wall" },
  { itemId: "f-chloroplast", bucketId: "plant", term: "chloroplast", claim: "plant cells contain chloroplasts" },
  { itemId: "f-bigvac", bucketId: "plant", term: "vacuole", claim: "plant cells have a large permanent vacuole" },
  { itemId: "f-membrane", bucketId: "shared", term: "membrane", claim: "both cell types have a membrane" },
  { itemId: "f-nucleus", bucketId: "shared", term: "nucleus", claim: "both cell types have a nucleus" },
  { itemId: "f-cytoplasm", bucketId: "shared", term: "cytoplasm", claim: "both cell types have cytoplasm" },
];

const segs = await client.query("learningRuntime:getLessonSegments", { lessonId });
if (segs.length === 0) { console.error("no approved segments — approve the proposal first"); process.exit(1); }

const mode = process.argv[2] ?? "review";
const rl = mode === "attest" ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
const ask = (q) => new Promise((res) => rl.question(q, res));

const confirmed = [];
for (const f of FACTS) {
  const hits = segs.filter((sg) => sg.text.toLowerCase().includes(f.term));
  console.log(`\n=== ${f.itemId} → bucket "${f.bucketId}" ===\nclaim: ${f.claim}`);
  if (hits.length === 0) { console.log("  NO candidate passage — will abstain"); continue; }
  if (mode !== "attest") {
    for (const sg of hits) console.log(`  p${sg.page ?? "?"} #${sg.segmentNo}: "${sg.text}"`);
    confirmed.push({ itemId: f.itemId, bucketId: f.bucketId, segmentIds: hits.map((h) => h._id) });
    continue;
  }
  // Per-segment confirm: owner reviews EACH candidate excerpt separately —
  // a contradictory passage must NOT be attested just for containing the term.
  const chosen = [];
  for (const sg of hits) {
    console.log(`  p${sg.page ?? "?"} #${sg.segmentNo}:\n  "${sg.text}"`);
    const ans = (await ask(`  cite this segment as support for "${f.claim}"? [y/n] `)).trim().toLowerCase();
    if (ans === "y") chosen.push(sg._id);
  }
  if (chosen.length > 0) confirmed.push({ itemId: f.itemId, bucketId: f.bucketId, segmentIds: chosen });
  else console.log("  no segment confirmed — fact will abstain");
}
rl?.close();

if (mode !== "attest") {
  console.log("\n[review only — nothing written] re-run with 'attest' to confirm per-segment");
  process.exit(0);
}

// Final review of the complete mapping before ANY write.
console.log("\n==== FINAL ATTESTATION REVIEW ====");
for (const c of confirmed) console.log(`  ${c.itemId} → ${c.bucketId} @ ${c.segmentIds.length} seg(s)`);
if (confirmed.length !== 6) { console.error(`${confirmed.length}/6 facts confirmed — abstaining, nothing written`); process.exit(1); }
const final = (await askInteractive("write all six attestations + schedule materialize? [yes/no] ")).trim().toLowerCase();
async function askInteractive(q) { const r = readline.createInterface({ input: process.stdin, output: process.stdout }); const a = await new Promise((res) => r.question(q, res)); r.close(); return a; }
if (final !== "yes") { console.log("aborted — nothing written"); process.exit(0); }

const r = await client.mutation("learningRuntime:attestClassificationFacts", {
  templateId: "cells_classify_v1", lessonId, items: confirmed,
});
console.log("attested:", JSON.stringify(r), "→ materialize scheduled");
