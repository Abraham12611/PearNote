# Ownership, authorization, consent and AI-scope policy

## Principle

Student private work is private **by default**, including source files, questions answered incorrectly, AI chats, attempts and mastery. Group learning is an explicitly separate scope. Frontend hiding is not access control; every backend query/action must enforce permissions.

## Role matrix

| Resource/action | Personal owner | Group owner | Group member | Invited guest | Anonymous |
|---|---|---|---|---|---|
| Read private source and tutor history | Yes | No, unless same user | No | No | No |
| Edit personal curriculum | Yes | No | No | No | No |
| Read group HQ | If group member | Yes | Yes | Per invite role | No |
| Edit shared widgets | Per space role | Yes | Role-controlled | Usually view only | No |
| Invite/remove group members | Only if own group | Yes | If delegated | No | No |
| Create private→group shared copy | Owner, deliberate | No automatic override | Only their own sources | No | No |
| Read own activity attempts | Yes | No | No | No | No |
| See peer results | Only explicitly shared summary | Authorized aggregate only | Opt-in | No | No |
| AI Tutor access to private sources | Only owner's private tutor | No via group assistant | No via group assistant | No | No |

## Authorization patterns

- Derive `userId` server-side from Convex Auth.
- `assertSubjectOwner(subjectId,userId)`, `assertSourceReadable(sourceId,userId,scope)`, `assertSpacePermission(spaceId,userId,verb)`, `assertGroupRole(groupId,userId,role)` centralized.
- Treat arbitrary user/subject/space IDs and retrieved content as hostile. Never use a client-supplied `ownerId` without authorization.
- Protect file downloads: storage file reference access resolved through backend ownership before generating delivery URL.
- Group RAG scopes require explicit approved source IDs; a model must not discover other users' embeddings by semantic similarity.

## Share-to-group protocol

1. Student selects a lesson artifact/source segment.
2. UI shows exactly which content, citations, any attachments and destination room will be shared.
3. Student confirms. Backend creates a scoped shared copy or reference with owner and permissions.
4. Shared assistant may now read **only the shared version**. Revocation blocks future access, subject to reasonable retention and existing copies/downloads policies.
5. Personal mastery, private tutor history and unrelated source segments are never included automatically.

## AI consent

Display a clear explanation of what model/provider will process uploaded material, handling/retention according to current provider terms, and explicit restrictions for sensitive and copyrighted content. Allow deletion and export paths. Do not use uploads as training data without a separate lawful basis and informed consent.

## Threat scenarios and required tests

- User A passes user B's subjectId to `getPath` → denied.
- User B guesses valid storage ID for user's PDF → denied.
- Group assistant attempts tool retrieval of unshared user source → denied before model context assembly.
- Invite expired/reused → denied.
- Anonymous demo user tries to modify signed-in person's widgets → denied.
- Replayed reward event → no second XP.
- Prompt-injection inside uploaded PDF attempts to instruct backend → data-only, cannot affect tool permissions.
- User leaves group during live session → subscriptions/messages refuse further scoped data.

Refer to [security/privacy](../delivery/SECURITY_PRIVACY.md) for operational requirements.
