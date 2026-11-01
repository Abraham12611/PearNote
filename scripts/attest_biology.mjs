/**
 * Owner evidence REVIEW for Biology attestation — Issue #45.
 * READ-ONLY BY DEFAULT: prints each classify fact and the approved
 * passages (page + text) that may support it. NOTHING is written.
 *
 * Run `attest` for the interactive per-fact confirmation: for every one
 * of the six facts you see the candidate passage and must explicitly
 * confirm the bucket assignment (y) or skip (n). Skipped facts are
 * NEVER attested and will abstain from scoring.
 *
 * Must be run inside the owner's authenticated Convex session — supply
 * credentials only through your own secure sign-in (see AUTH_TOKEN
 * env expected by the Convex client used for dev validation). Do NOT
 * share or paste credentials anywhere public.
 *
 *   VITE_CONVEX_URL=<dev> AUTH_TOKEN=<session> LESSON_ID=<id> \
 *     node scripts/attest_biology.mjs            # review only
 *   ... node scripts/attest_biology.mjs attest   # interactive confirm
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
const confirmed = [];
for (const f of FACTS) {
  const hits = segs.filter((sg) => sg.text.toLowerCase().includes(f.term));
  console.log(`\n=== ${f.itemId} → bucket "${f.bucketId}" ===`);
  console.log(`claim: ${f.claim}`);
  if (hits.length === 0) { console.log("  NO candidate passage found — will abstain"); continue; }
  for (const sg of hits) {
    console.log(`  p${sg.page ?? "?"} seg#${sg.segmentNo}: "${sg.text.slice(0, 220)}"`);
  }
  if (mode === "attest") {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await new Promise((res) => rl.question(`  confirm this fact→bucket is supported by the passage(s)? [y/n] `, res));
    rl.close();
    if (ans.trim().toLowerCase() === "y") confirmed.push({ itemId: f.itemId, bucketId: f.bucketId, segmentIds: hits.map((h) => h._id) });
    else console.log("  skipped — will abstain");
  } else {
    confirmed.push({ itemId: f.itemId, bucketId: f.bucketId, segmentIds: hits.map((h) => h._id) });
  }
}

if (mode !== "attest") {
  console.log("\n[review only — nothing written] re-run with 'attest' to confirm each fact interactively");
  process.exit(0);
}
if (confirmed.length !== 6) { console.error(`only ${confirmed.length}/6 confirmed — abstaining, nothing written`); process.exit(1); }
const r = await client.mutation("learningRuntime:attestClassificationFacts", {
  templateId: "cells_classify_v1", lessonId, items: confirmed,
});
console.log("attested:", JSON.stringify(r), "→ materialize scheduled");
