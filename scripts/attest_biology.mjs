/**
 * Owner attestation helper — Issue #45/#31 release gate.
 * Binds the six classify facts to the REAL Cambridge segments in the
 * OWNER'S OWN account, then triggers the one-call attest+materialize path.
 *
 * Usage (authenticated as the owner who approved the proposal):
 *   VITE_CONVEX_URL=<dev> AUTH_TOKEN=<token> LESSON_ID=<id> node scripts/attest_biology.mjs
 *   (AUTH_TOKEN: from DevTools → Application → cookies/localStorage for the
 *    dev deployment, or printed by the sign-in flow)
 */
import { ConvexHttpClient } from "convex/browser";

const url = process.env.VITE_CONVEX_URL;
const token = process.env.AUTH_TOKEN;
const lessonId = process.env.LESSON_ID;
if (!url || !token || !lessonId) throw new Error("need VITE_CONVEX_URL, AUTH_TOKEN, LESSON_ID");

const client = new ConvexHttpClient(url);
client.setAuth(token);

// The six template facts and required fact terms per item.
const FACTS = [
  { itemId: "f-wall", bucketId: "plant", term: "wall" },
  { itemId: "f-chloroplast", bucketId: "plant", term: "chloroplast" },
  { itemId: "f-bigvac", bucketId: "plant", term: "vacuole" },
  { itemId: "f-membrane", bucketId: "shared", term: "membrane" },
  { itemId: "f-nucleus", bucketId: "shared", term: "nucleus" },
  { itemId: "f-cytoplasm", bucketId: "shared", term: "cytoplasm" },
];

// 1) Read the lesson's OWN approved segments WITH text (owner-scoped).
const segs = await client.query("learningRuntime:getLessonSegments", { lessonId });
if (segs.length === 0) { console.error("no approved segments — approve the proposal first"); process.exit(1); }
console.log(`lesson has ${segs.length} approved segments`);

// 2) Per fact: bind ONLY segments whose text actually contains the term —
//    every cited segment must support it (server re-validates too).
const items = FACTS.map((f) => {
  const hits = segs.filter((sg) => sg.text.toLowerCase().includes(f.term)).map((sg) => sg._id);
  if (hits.length === 0) {
    console.error(`NO segment evidence for ${f.itemId} (${f.term}) — abstain`);
    process.exit(1);
  }
  console.log(`  ${f.itemId} → ${f.bucketId} @ ${hits.length} segment(s)`);
  return { itemId: f.itemId, bucketId: f.bucketId, segmentIds: hits };
});

// 3) One call: attest six facts + schedule materialization.
const r = await client.mutation("learningRuntime:attestClassificationFacts", {
  templateId: "cells_classify_v1",
  lessonId,
  items,
});
console.log("attested:", JSON.stringify(r));
console.log("materializeScoredActivity scheduled → check getLesson for the classify activity");
