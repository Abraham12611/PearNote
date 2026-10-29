# Phase 00.5 — Meta PoC contract (Engineer 4 → Engineer 2 handoff)

**Status:** contract v1, 2026-10-29. Ingestion foundation deployed by Engineer 4
to the *PearNotes development* Convex deployment `keen-marten-701` (reported
`npx convex dev --once` succeeded; functions visible via `convex function-spec`).
The implementation is being integrated into `develop` in PR #27. **Only
`text/plain` extraction is supported server-side. The private Biology PDF
cannot yet be imported through this pipeline. No live Muse call or learner
approval mutation has been verified.** Issue #23's deployment handoff is
complete; production `wooden-rat-386` must remain untouched.

## 1. Verified provider facts

| Fact | Value |
|---|---|
| Provider | **Meta Model API** (owner-confirmed primary, dev.meta.ai) |
| Endpoint | `POST https://api.meta.ai/v1/chat/completions` |
| Auth | `Authorization: Bearer $MODEL_API_KEY` |
| Required env var | **`MODEL_API_KEY`** — Convex server-side env only (`npx convex env set` on dev `keen-marten-701`), never `VITE_*`, Vercel env, or git. NOTE: Vercel env vars are NOT shared with Convex actions. |
| Key provisioning | Owner sets via the Convex dev deployment Environment Variables on `keen-marten-701` |
| PoC model | `muse-spark-1.3` (Standard mode — NOT `-contributor`) |
| Alt model | internal provider swap possible via `MetaProvider`; no silent fallback to Llama/other hosts |
| Official SDK | adapter uses raw `fetch`, matching `convex/nebius.ts` audit style |
| Reachability | `GET https://api.meta.ai/v1/models` and `POST /v1/chat/completions` without a key → HTTP 401 (endpoint live, auth-gated) |
| Credential status | **BLOCKED — awaiting `MODEL_API_KEY` on `keen-marten-701` Convex env** |

Adapter: `convex/metaClient.ts` — typed `MetaChatResult`, 45s timeout,
`no_credential | http | timeout | network | invalid_json` error mapping,
records `model` + `promptVersion` on the job row. Never throws, never logs
the key, never callable from the client (invoked from internal actions only).

## 2. Function surface (actual names, `api.*`/`internal.*`)

| Function | Kind | Args → Returns | Auth |
|---|---|---|---|
| `sources.createUploadUrl` | mutation (existing) | `{}` → `{uploadUrl}` | signed in |
| `sources.register` | mutation (existing) | `storageId,title,mime,sizeBytes,sha256` → `{sourceId,deduplicated}` | signed in, claim-checked |
| `sources.get` | query (existing) | `sourceId` → meta+short-lived url \| null | owner only |
| `sources.listSegments` | query (existing) | `sourceId` → `Segment[]` (≤500) | owner only |
| `learningImport.begin` | mutation | `sourceId, idempotencyKey` → `{jobId, state}` | source owner; idempotent retry returns same job |
| `learningImport.getStatus` | query | `jobId` → `{_id, sourceId, state, error?, createdAt}` \| null | job owner only |
| `learningImport.getProposal` | query | `jobId` → `{_id, state, proposal}` \| null | job owner only |
| `learningImport.recordSegments` | internalMutation | `sourceId, segments[{segmentNo,page?,text,kind?}]` → `segmentIds` | internal only |
| `learningImport.setJobState` | internalMutation | `jobId, state, error?, model?, promptVersion?` | internal only |
| `subjects.createManual/listMine/get/rename/setStatus` | existing | see DATA_AUTH.md | owner |

**Job states** (`importJobs.state`, STATE_AND_EVENTS.md):
`created`/`uploaded` are schema-reserved; this implementation starts an import at
**`extracting`** (persisted and returned) → **`classifying`** → **`needs_review`**
for a validated proposal. Unsupported PDFs, unavailable model credentials and
invalid model outputs can yield **`failed`**, with an error shown to the learner.
`accepted`/`building`/`ready` are reserved until review and materialization are implemented.

**Error codes** (ConvexError `data.code`): `UNAUTHORIZED`, `INVALID_INPUT`,
`UNSUPPORTED_SOURCE`; provider failures map to `needs_review`/`failed` job
states, never silent.

## 3. Proposal shape (validated in `convex/metaProposal.ts`)

```ts
proposal = {
  suggestedSubjects: [{ name, confidence: "high"|"medium"|"low",
                        segmentIds: string[], explanation? }],
  concepts: [{ label, summary?, sourceSegmentIds: string[],
               evidence: [{segmentId, quote}]  // quote = verbatim excerpt }],
  draftCurriculum?: { sections: [{ title, units: [{ title, lessons: [{
                        title, objectives: string[], sourceSegmentIds: string[],
                        evidence: [{segmentId, quote}] }] }] }] },
  warnings: string[]
}
```

Validation pipeline — three gates; failures are explicit `failed` or
`needs_review` states depending on the gate, **never auto-accepted**:
1. `parseProposal` deep shape check (nested nulls, bounds, cardinality caps;
   evidence.segmentId must belong to the unit's sourceSegmentIds).
2. `checkCitations` — every cited segment id exists in *this* job's source.
3. `checkEvidence` — every quote appears verbatim in its cited segment.

HONEST LIMIT: a verbatim quote proves the words exist in the source, NOT that
the generated claim is scientifically correct or entailed. Semantic factual
support is **not yet guaranteed** — it remains `needs_review` for human/
model re-check. Injection text in fields is stored as inert data only.

## 4. Review flow for Engineer 2's intake UI (Issue #24)

1. `sources.createUploadUrl` → POST file → `sources.register` → `sourceId`.
2. **For text/plain only:** `learningImport.begin(sourceId, uuid)` → subscribe to
   `getStatus` for `extracting` → `classifying` → `needs_review` or `failed`.
   **For application/pdf:** current action returns an honest `IMPORT_FAILED`
   (PDF parser not yet integrated). Do not display AI proposal success for PDF.
3. `getProposal` → render suggested subjects, segment evidence, warnings; user edits/approves.
4. Approve/edit mutation is a **future PR** — contract reserved as
   `imports.review({jobId, edits, approval})` → accepted subject ids.
5. The AI import must not create/alter subjects before approval. Separately,
   users may already create their own manual subjects with `subjects.createManual`.

## 5. Local extraction evidence (Cell Biology PDF, kept out of repo)

Owner-supplied `9781107614505_excerpt.pdf` (Cambridge O Level Biology Revision
Guide, Ian J. Burton — 10 pages, selectable text, ~15k chars total):

| Page | Extracted chars | Topic (verified) |
|---|---|---|
| 1 | 2402 | cell structure & organisation |
| 2 | 1412 | cell wall / membrane structures |
| 3–4 | 1370/1639 | observing animal & plant cells |
| 5–8 | 1185/1298/950/1183 | specialised cells: xylem, red blood cells |
| 9 | 1592 | tissues → organs → systems |
| 10 | 2208 | diffusion + examples |

Term hits: diffusion×4, membrane×9, nucleus×8, osmosis×2, specialised×1.
Extracted with pypdf locally — stable `page`/`segmentNo` mapping will port to
the server parser; image-only pages would flag `needs_review`, not fake text.

## 6. Test evidence (all MOCK-labelled; no live calls)

`tests/metaProposal.test.ts` — parse rejects invalid/empty/wrong-shape;
fabricated segment ids rejected; cross-user segment ids rejected;
citation-free concepts flagged; injection stored as data; `begin` idempotent +
owner-scoped; B cannot read A's job; internals not public-callable.
Plus `tests/learning.privacy.test.ts` (14 cases) unchanged.

## 7. Blockers & next steps

- **BLOCKED: `MODEL_API_KEY` absent** — no live model call yet; owner sets it
  as a Convex env var on dev `keen-marten-701`. Endpoint confirmed reachable (401 w/o key).
- Dev-only Convex push performed by Engineer 4 after Issue #23 handoff;
  no production deploy or real model execution reported.
- Server-side PDF parsing (pdfjs-in-action or chunked preprocess) is a
  Phase 01 decision; local extraction here is proof-of-fidelity only.
