# Infrastructure, environments, build, and release engineering

## Environments

`local` → `dev` → `preview` → `production`: separate Convex deployments; different app secrets and storage. No test data in production unless explicitly marked public sample/demo and allowed by policy. Reserve independent hackathon demo account and data.

## Existing scripts and verification

Public `package.json` reviewed 2026-10-27 includes `dev`, `dev:backend`, `build`, `deploy`, `deploy:convex`. Its `deploy` script referenced an upstream Netlify site ID; remove or replace before using! Pin package lock and run `npm ci` (if lock supports), `npm run build`; add tests/lint as appropriate. Current source has React 19, TypeScript, Vite, Convex and many optional components. Check lockfile/library compatibility, don't blindly upgrade during sprint.

## Environment variables (proposed)

- `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` — environment specific.
- `META_API_KEY` and endpoint/model configuration — **server only**; verify official SDK names/API availability.
- `MODEL_BUDGET_DAILY`, `MAX_UPLOAD_BYTES`, `MAX_PDF_PAGES`, `FEATURE_AUDIO`, `FEATURE_GROUPS`, `FEATURE_REWARDS` — feature controls.
- Auth signing keys and optional OAuth provider secrets as configured for Convex Auth.
- Other upstream `FIRECRAWL_`/`AGENTMAIL_` keys only if those components remain mounted/used; test disabling or replacing first.

## Import job durability

File validation → storage commit → enqueue job → stage transitions persisted. Use retries with exponential backoff for transient provider errors; stop on hard invalid content; support manual reprocessing and cancellation. Job idempotency by user + source hash + explicit import request ID. Separate processing quotas from widget activity quotas.

## Observability

Log request/job ID, stage, model/version, latency, token/credit estimate, schema validation failures, exception class, and provenance count. Do **not** log raw student content or full answers into general application logs. Aggregate import success, time to usable lesson, cost/lesson, RAG cite precision, join/sync failures and reward duplicate prevention.

## Release gates

1. Build/test/typecheck and schema compatibility clean.
2. Authorized user can create subject, generate curriculum and reopen lesson in preview.
3. Private resource denial tests pass.
4. Two-tab collaboration and reconnect smoke pass.
5. No mock seed leaks into new user account.
6. Meta model calls visible with accurate provenance.
7. Demo fallback **clearly labeled seeded cached output** if model outage; no fake live API claim.
8. Restore/rollback strategy and explicit release tag available.

## Cost controls

Set maximum pages per import, cap initial curriculum depth, cache validated generation keyed by source hash/prompt version/model version, throttle repeated tutor requests, use a lower-cost model only when official capabilities allow, and route expensive long jobs to queue. Present estimated cost and processing status to users when material size grows.
