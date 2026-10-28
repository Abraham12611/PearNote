# Scoped sharing — social study model proposal

**Status: PROPOSAL, awaiting owner decision.** Authored by Engineer 4 for the
"friends studying with you" task. Not yet ratified spec — on adoption, move the
accepted parts into the files referenced below and record the decision in
`delivery/DECISIONS_RISKS.md`.

Grounding: `engineering/PERMISSIONS.md` (private-by-default, share-to-group
protocol), `collaboration/GROUPS_AND_ROOMS.md` (D04: one shared study room in
Phase 1), `design/FLOWS.md` F08 (shared board, private answers),
`engineering/DATA_MODEL.md` (deferred `groups`/`invites` tables), and the
implemented Phase 00.4 learning schema (`convex/tables/learning.ts`).

---

## 1. Recommendation in one paragraph

**V1 shares lessons, nothing bigger.** One role dimension: **participant**
(study buddy) and **viewer**. A share creates or joins a **shared lesson
space** — a real canvas room generated from the lesson, distinct from the
owner's private lesson canvas. All social signals ("2 studying with you", "3
friends completed this") are computed **per shared lesson, over invited
members only**, as aggregates — never raw attempts. Your "friends" are not a
social graph you maintain; they are *the union of people connected to your
shares*. There is no "share my account" and no global presence.

---

## 2. Share-scope evaluation

| Scope | What it would mean | Verdict |
|---|---|---|
| **Space** (room) | Grant access to a generic canvas room | **Not a sharing model — it's a container.** Rooms already exist; what matters is *which learning content* the room is bound to. Inviting someone into an unbound room is the OurSpaces mechanic, not a study grant. |
| **Subject** | Grant all current + future lessons, sources, path | **Too broad for V1.** Violates "avoid share-everything defaults"; future lessons would silently inherit access (revocation surprise). Also exposes the subject's source links, which pulls source-privacy questions into scope. Revisit in Phase 02 as an explicit *bundle* gesture. |
| **Unit** | Grant a bundle of lessons | **Marginal.** A unit is a useful middle tier later, but in V1 it doubles the grant-resolution logic for one extra click's convenience. Defer with subject. |
| **Lesson** | Grant one shared study board + signals | **V1.** The lesson is already the atomic social unit in the mockups ("studying this with you"). It maps 1:1 to a canvas space, bounds exposure to exactly one board's content, and makes revocation obvious. |
| **Source / segment** | Grant the underlying document | **Not a share scope at all.** Sources back lessons via `subjectSources`; a friend sees *citations rendered in the shared lesson*, not the document. Keep source sharing inside the future share-to-group copy protocol. |

### Why lesson granularity is the privacy-safe minimum

A share answers "may this person open *this board* and have their presence and
completion signals visible to *these invited people*?" The lesson is the
smallest unit that is simultaneously (a) a complete study context, (b) a
canvas boundary for presence/chat, and (c) coarse enough that one invite is a
meaningful gesture rather than micromanagement.

---

## 3. Roles

V1 has **two roles plus implicit owner**. Fewer than three keeps the matrix
auditable; more can come later.

| Role | Open shared lesson canvas | Live presence + room chat + widget threads | Own private attempts/notes on the board | Counted in "studying with you" / completion signals | Edit lesson spec / curriculum |
|---|---|---|---|---|---|
| **owner** (sharer) | yes | yes | yes | chooses per-member | yes (own private copy only) |
| **participant** ("study buddy") | yes | yes | yes | yes, if opted in at accept | no |
| **viewer** | yes | read chat, no posting | yes | no — invisible to counters | no |
| **collaborator** (deferred) | — | — | — | — | would edit content — needs spec versioning + approval flow; Phase 02+ |

Design notes:

- **Attempts and private notes are always per-user and private**, regardless of
  role — this is already true in the schema (`attempts.userId`,
  F08: "each person's assessment answer is private even if the challenge
  object is shared"). A viewer's attempts are private too; the role only
  controls social visibility and interaction rights.
- **Viewer invisibility**: a viewer does not appear in presence dots or
  social counters. This is the audit/observe role — useful for "show my
  sibling what I'm studying" without turning it into a social event.
- No `admin`/`moderator` in V1: the owner revokes; participants can leave.
  Moderation arrives with group rooms (GROUPS_AND_ROOMS.md §Membership).

---

## 4. The two artifacts behind every lesson share

Each share instantiates two server-side objects:

1. **A shared lesson space** — a real `spaces` row (reusing the existing
   room machinery: presence, cursors, chat, widget locks) with
   `kind: "shared_lesson"` and `lessonId` set. Created lazily on first
   accepted invite. The owner's *private* lesson canvas (`lessons.canvasSpaceId`)
   is untouched — sharing never mutates the owner's board.
2. **Share grants** — rows recording who may enter and in what role.

Sharing a lesson does **not** copy the lesson spec: the shared space renders
the same published `LessonSpec` by reference. When the spec publishes a new
version, the shared board updates in place; per-learner attempts stay pinned
to the `activityRevision` they answered (existing invariant).

### Why a separate shared space (not access to the owner's canvas)

- The owner's canvas may hold their private notes and layout — those never
  leave the private space.
- Presence isolation falls out of the room model for free: cursors/chat exist
  only inside the shared space.
- Revocation is a membership deletion on the shared space — the owner's own
  study surface is never affected.

---

## 5. Privacy rules (the contract)

1. **Private stays private by construction, not by filter.** A friend never
   queries the owner's `sources`/`sourceSegments`, `attempts`, `mastery`,
   private lesson canvas, or tutor threads. Shared content is rendered from
   the *published spec and citation excerpts delivered into the shared space*,
   not by granting read on the underlying rows. Guessed IDs continue to fail
   closed (the Phase 00.4 tests already prove this shape).
2. **Signals are aggregate-only.** Members can learn "you're here", "N friends
   completed", "N on this now". They cannot read each other's responses,
   scores, or mistakes — the backend answers counts/state booleans, never
   attempt payloads.
3. **Opt-in progress visibility.** Accepting an invite asks: *"Show your
   progress on this lesson to the people studying it with you?"*
   (`shareProgress: boolean` on the grant). Declining → you study fully but
   never appear in that lesson's counters. Presence dots for a live session
   are still shown while you're in the room (that's the room mechanic, not a
   progress signal); viewers are exempt from both.
4. **No ambient network.** There is no friends list and no global "who's
   online". A user only ever sees members of shared spaces they themselves
   belong to. "Your study network" in settings is literally your grant list —
   inspectable and revocable.
5. **Invite ≠ access.** An invite token grants the *ability to accept*, not
   entry. Tokens are hashed, single-scope, expiring, and bound to one role.
6. **Revocation fails closed.** On revoke: membership row is deleted; the
   member's queries/subscriptions return nothing on the next check; presence
   expires by TTL; the shared space's chat history becomes unreadable to them
   (history retention for remaining members is a documented limitation, same
   as SECURITY_PRIVACY.md's downloaded-copies caveat).
7. **Content rights.** Source excerpts visible in a shared lesson are
   proportionate citations under the grounding contract — not the document.
   The share UI must not imply rights to redistribute the owner's materials.

---

## 6. Social signals — where the UI strings come from

All three mockup strings are derivable from two tables' member rows, scoped to
one shared lesson, for one viewer who is themselves a member:

| UI string | Data | Query |
|---|---|---|
| "2 friends are on this now" | `presence` rows in the shared lesson space, TTL-fresh | count distinct `userId` in the shared space's live presence, excluding self, excluding viewers |
| "2 studying with you" | presence across **all shared lesson spaces the viewer belongs to** | count of members currently present in any shared space in that set (path/home level signal) |
| "3 friends completed this" | `sharedProgress` rows for the lesson | count members (excluding self, participants only, `shareProgress: true`) whose state is `completed` |

`sharedProgress` is a small **derived** table — the only social-signal table —
written server-side from verified evidence (attempt evaluated → lesson
completion rule met), never from client clicks:

```
sharedProgress { sharedSpaceId, userId, state: started|completed,
                 lastActiveAt, completedAt? }
  indexes: by_space, by_space_user, by_user
```

- One row per member per shared space — the grant's `shareProgress` flag gates
  whether a row is *written* at all. Opt-out users produce no rows.
- It deliberately records **state and timestamps, never scores or answers**.
- "Completed" = the lesson's existing completion definition (required
  activities evaluated — LESSON_RUNTIME.md), not self-report.
- Friends-of-friends expansion, streak comparisons, leaderboards: out of V1.
  Revision Arena (GROUPS_AND_ROOMS.md) owns competitive surfaces later.

---

## 7. Data model changes (additive)

Three new tables + two additive columns. No existing table is rewritten.

### New table: `shares`

```
shares {
  lessonId:      Id<"lessons">
  sharedSpaceId: Id<"spaces">      // the shared board this grant enters
  ownerId:       Id<"users">       // sharer (server-derived)
  userId:        Id<"users">       // grantee (set at accept)
  role:          "viewer" | "participant"
  shareProgress: boolean           // grantee's progress-visibility consent
  status:        "active" | "revoked" | "left"
  invitedAt, acceptedAt, revokedAt?
}
indexes: by_lesson, by_space, by_space_user (unique), by_user, by_owner
```

### New table: `shareInvites`

```
shareInvites {
  lessonId:  Id<"lessons">
  tokenHash: string                // invite tokens hashed, never stored raw
  role:      "viewer" | "participant"
  createdBy: Id<"users">
  expiresAt: number
  maxUses:   number                // V1 default 1; a link is per-person
  uses:      number
  revokedAt?: number
}
indexes: by_token (on tokenHash), by_lesson
```

### New table: `sharedProgress` (§6)

### Additive columns on existing `spaces` (owner-approval required — `convex/tables/rooms.ts` is Engineer 1/2 territory)

```
spaces += { kind?: "shared_lesson" | "personal_lesson" | ... ,
            lessonId?: Id<"lessons"> }
```

Both optional, defaulting unset → every existing room is untouched. The
DATA_MODEL.md "Existing canvas and groups" row already anticipates `kind` and
`lessonId` — this proposal asks to land the minimal subset.

### Deliberately not modeled in V1

- `groups`, `groupMembers`, `invites` (group-scoped) — the Phase 02/05 group
  model absorbs these shares: a `shares` row's `sharedSpaceId` can later point
  into a group's Study Room without migration.
- Subject/unit grants — expressible later as `scope` on `shares` if the table
  uses `{lessonId}` now and graduates to a `scopeType` field when a second
  scope ships. Recommendation: **add `scopeType: "lesson"` now** — one cheap
  literal that prevents a future migration.
- Friend/block lists — network is derived from grants (§5.4).

---

## 8. API / permission model

| Function | Type | Contract | Authz |
|---|---|---|---|
| `shares.createInvite` | mutation | `lessonId, role, maxUses?` → `{inviteToken}` | caller owns the subject containing the lesson |
| `shares.accept` | mutation | `token` → `{sharedSpaceId}` | valid, unexpired, under maxUses token; creates grant + (first use) shared space |
| `shares.revoke` | mutation | `shareId` → `null` | grant owner; deletes grant + member row |
| `shares.leave` | mutation | `shareId` → `null` | grantee themselves |
| `shares.listForLesson` | query | `lessonId` → grants | owner only |
| `sharedLessons.listMine` | query | `{}` → shared spaces I can enter | member-of or owner-of |
| `social.lessonSignals` | query | `lessonId` → `{activeNow, friendsCompleted}` | member of that lesson's shared space |
| `social.networkPresence` | query | `{}` → `{studyingWithYou, friendsHereBySpace}` | any member; aggregate counts only |
| `internal.recordProgress` | internalMutation | `sharedSpaceId, userId, state` | called from attempt-evaluation path only |

Authorization reuses `learningAuth.ts`: `requireOwnedSubject(subjectId)`
resolves the lesson's subject chain once; `assertShareMember(spaceId,userId)`
is the new gate for every shared-space read, mirroring the existing
fail-closed pattern. Every social query runs the membership check **before**
reading counts — non-members get `null`, never numbers.

Adversarial tests to add (same harness as `tests/learning.privacy.test.ts`):
invitee of lesson A cannot read lesson B's shared space; revoked member's
subscription returns empty; forged `userId` in accept is impossible (no such
arg); a viewer never appears in counters; an opt-out participant produces no
`sharedProgress` row; expired/overused token denied; non-member cannot read
social counters even with a valid `sharedSpaceId`.

---

## 9. Product flows

### F-S1 — Invite a friend to a lesson

1. Owner on path drawer → lesson node → `study together` → sheet lists the
   lesson title, **exactly what will be shared** (the board, chat, your
   live presence, your completion signal), and what stays private (your
   notes, your source files, your answers).
2. Choose role (`study buddy` default / `viewer`) → `copy invite link` →
   tokenized URL `#/study/<token>` (hashed server-side, 7-day expiry, 1 use).
3. Friend opens link → sees what they're joining + the progress-consent
   question → accept → shared lesson space opens; owner sees them land.

### F-S2 — Invite a friend to a subject (not in V1)

For V1 the button doesn't exist at subject level. When it ships, model it as
a **bundle creator**: "invite to these N lessons in this subject" producing N
lesson grants in one gesture — never a moving grant that silently covers
future lessons. Show the full lesson list before confirming.

### F-S3 — Revoke access

Owner → shared lesson → member list → `remove` → grant `revoked`, member row
deleted, next backend check denies; their presence dot fades by TTL (a few
seconds). The removed person's own attempts/notes remain theirs (in their
account), but lose access to the shared board. UI confirms scope:
"removes Sam from *Photosynthesis basics* only".

### F-S4 — Choose whether a lesson board is shared

Default: every lesson is private; `study together` off until first invite.
Owner can `stop sharing` → revokes all grants on that lesson's space (bulk,
listed explicitly) → space archived for remaining members after a grace note.
Re-inviting later starts a fresh shared space or reactivates the archived one
(owner choice in UI; data model supports either via `status`).

### F-S5 — Choose whether private notes stay private

Not a toggle: private notes are **structurally personal** — they live on the
user's own layer of a board. In V1 the shared lesson contains only shared
objects; a member's own annotations on the shared board carry
`visibility: personal` (a `widgets` flag already anticipated in DATA_MODEL.md)
and are filtered before render for everyone else. When note-promotion arrives
(CHAT_AND_THREADS.md), promotion is the explicit "make this shared" gesture —
preview shows exactly what text crosses.

---

## 10. Risks and complexity notes

| Risk | Mitigation |
|---|---|
| **Grant-resolution complexity grows** if subject/unit scopes land carelessly | V1 is single-scope; add `scopeType` literal now so later scopes are additive rows, not a migration |
| **Shared spec drift**: owner edits lesson while friends study it | Shared space references the published spec; new versions apply atomically; attempts pin `activityRevision` (existing invariant) |
| **Signal leakage**: aggregates can still narrow to 1 member | Counts are the point of the feature — but only ever over *your invited* set; opt-out exists; viewers invisible |
| **Revocation vs live subscriptions** | membership check inside every query (fail closed); presence TTL; no cached client-side allowlist |
| **Invite link forwarding** | maxUses=1 default, expiry, owner-visible accept event, revoke anytime |
| **Abuse/harassment** in shared rooms | invite-only (no discovery), leave anytime, owner removal; report/mute lands with group rooms |
| **`spaces` column additions cross file ownership** | escalate to coordinator: two optional fields on `spaces`; alternative is a parallel `sharedSpaces` table — parallel table is *worse* (two canvases to reason about) |
| **Deriving "friends" surprises users** | expose the network explicitly: settings shows "people you study with" = your grants, one-tap revoke |
| **Scope creep toward a social graph** | the doc's core rule: signals come from shares, never a friend list. If a friend-list feature is wanted later, it's a *new* explicit relation, not a widening of shares |

---

## 11. V1 cut summary

**Ship:** lesson-scoped shares; `viewer` + `participant` roles; hashed expiring
single-use invites; shared lesson space per lesson; per-member
`shareProgress` consent; `sharedProgress` aggregate table; the three social
strings; revoke/leave/stop-sharing flows; adversarial tests above.

**Defer:** subject/unit scope (bundle UI), `collaborator` role, groups &
General HQ, shared-source access, friend lists, leaderboards, note promotion
into shared boards, group AI over shared corpus.

**Decisions needed from owner/coordinator:**

1. Two optional columns on `spaces` (`kind`, `lessonId`) — crosses
   `convex/tables/rooms.ts` ownership. Approve or instruct parallel table.
2. `shareProgress` default on accept — recommended **opt-in** (off until
   chosen), most privacy-faithful reading of the mockups' spirit.
3. Invite token UX: per-person single-use links vs. reusable room link —
   recommended single-use V1.
4. Whether "study together" lands in Phase 01 as implemented surface or
   remains prototype-only until 00.5/pipeline lands.
