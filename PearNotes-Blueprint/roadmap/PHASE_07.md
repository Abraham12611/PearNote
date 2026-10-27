# Phase 07 — Production, trust and sustainable operations

**Goal:** transform alpha into a secure, accessible, maintainable and financially viable application.

**Warning:** baseline auth, privacy and error handling start Phase 0; this phase *strengthens* them, not postpones them.

## 07.1 Security program

- Threat model, least privilege, backend policy wrappers, storage access, prompt injection defense, rate limits, audit logs and independent pen test.
- User deletion/export and shared-resource revocation with documented retention.

**Exit:** no critical authorization vulnerabilities in third-party review.

## 07.2 Accessibility & localization

- WCAG-informed screen reader/keyboard/contrast testing, captions and alternatives for spatial or timed lessons; mobile/tablet parity.
- Localization, RTL planning and source-language support.

**Exit:** common core flows fully usable without pointer or animation.

## 07.3 Reliability and performance

- Durable imports, queued processing, quotas, idempotent job/reward state, retry/backoff, monitoring, error budgets, backup/restore.
- Large canvas optimization, source library pagination, database index audits, observability.

**Exit:** restore exercise documented; actual performance SLO targets derived from measured traffic.

## 07.4 Economics and billing

- Track model/compute/storage cost per lesson and active learner, rate limits and caching.
- Design optional free/plus/group tiers, payment integration, taxes/refunds and entitlement validation.
- Do not paywall basic accessibility, data export or student-owned content.

**Exit:** plausible unit-economics model and tested payment lifecycle before public billing.

## 07.5 Trust and content governance

- Academic integrity policies, educational source correctness QA, copyright takedown, moderated group sharing, child/student safety if minors served.
- Clear product disclaimers for medicine, law and other high-stakes domains.

**Exit:** incident/report handling and public trust policies published.
