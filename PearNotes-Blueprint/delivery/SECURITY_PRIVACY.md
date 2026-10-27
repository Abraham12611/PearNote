# Security, privacy, academic integrity and content governance

## Threat model scope

Assets: personal files/notes, study attempts/mastery, model conversations, account data, group content, rewards, API credits and deployment secrets. Attackers: unauthenticated visitors, malicious group members, compromised user accounts, poisoned PDF/links, accidental developer leaks. High-risk boundary: private source data reaching shared AI/canvas.

## Required controls from Phase 0

1. Per-query/mutation/action backend authorization; explicit group role checks.
2. File type/size scanning, safe parsing, signed storage access, no public source blob bucket by default.
3. Prompt-injection isolation: uploaded materials are untrusted content, never system directions; tool allowlists and approval gates.
4. RAG filter before retrieval, constrained by owner/approved share IDs; no post-generation redaction as only defense.
5. All model secrets server-only, rate limits and per-user quotas, audit of tool writes.
6. Separate production/demo/development accounts and storage.
7. Minimal analytics, avoid logging full student texts, sources or evaluator prompts in shared logs.
8. Account deletion/export, retention and provider processing disclosures for release planning.

## Content & copyright

Verify that source uploads are permitted; user-facing terms should not imply rights over copyrighted textbooks. AI-generated lesson excerpts should be proportionate and source-linked; restrict redistribution of original documents to groups without rights. For YouTube later, use permitted captions and terms-compliant interfaces. Preserve original OurSpaces MIT attribution; inspect independent media license restrictions.

## Educational integrity and safety

Clear distinction between tutoring and doing graded tasks. Hints-first in ongoing assessment, rubric-backed grading, source transparency and an ability to challenge answers. High-stakes medical/pharma/legal content educational-only with appropriate review and disclaimers; no unwarranted advice claims. Younger learners require separate age eligibility, child protection and relevant legal review before launch.

## Moderation / collaboration

Invite expiration, group kick/ban, report and mute features, human moderation path, AI group context restricted to shared data. Data exported from private to group needs explicit preview and consent. On removal/revocation, prohibit further backend reads and document limitations of previously downloaded copies.

## Incident response

Classify severity; disable unsafe features via flags; rotate keys; preserve necessary audit logs without leaking study data; notify impacted users as required; document root cause and regression tests. Practice recovery before broad launch.

## Security release tests

User A attempts B's subject, lesson, source, storage ID, chat thread, tutor memory; unauthorized denied. Group AI asked to quote private learner's notes; refused by retrieval boundary. File contains fake tool instructions; ignores it. Reward mutation called with invented amount; rejects. Invite expired; rejects. Logout and session revocation; queries blocked.
