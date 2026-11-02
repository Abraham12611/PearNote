# Identity, eight+ persona avatars, cursors, friends and collaborative learning

**Owner decision:** new account is assigned an illustrated profile; original OurSpaces eight-persona visual language is authoritative. Profile is editable; selected look follows the person into cursors, room presence, conversations and social learning. **Status:** specification, not deployed.

## 1. Identity is real user data, not a locally invented demo character

Distinguish four concerns:

| Concern | Source of truth | Used for |
|---|---|---|
| Auth principal / user ID | Convex Auth verified session | ownership, privacy, user relations, access checks |
| Account profile | server-stored user/profile row | display name, avatar asset/custom photo, public-safe identity, cursor color/look, preferences |
| Tab presence | per-tab stable presence ID, separate from account ID | one cursor per open tab, online/presence state |
| Demo persona | fixed local-only "demo learner", no auth session | sample-only display and visual preview; no real persistence |

A user must never become an arbitrary "juno" each time they reload a registered account, nor inherit another user's browser-local `getIdentity()` name after login. Bind profile to verified account ID, including guest upgrade and cross-device sign-in. If device/browser is offline, show cached self portrait only when it belongs to the currently authenticated same owner and is explicitly in sync; never flash another user's data. Profile default assignment occurs on the server or a deterministic one-time user-init mutation with race safety, not on every render.

### First account creation and assignment

1. User signs up via functioning OTP/Gmail or configured Google.
2. Complete verified account exchange. Server checks profile row existing; if absent, transaction selects an initial **personaId** from allowed pack (8 or more), a harmless starter display name, associated cursor accent and fallback, and writes once. Race/idempotent across two devices.
3. User sees native OurSpaces screenshot-11 **welcome identity chooser** ("You're [name]; make it yours"), preselected face from their assignment, optional rename and choose another, Preview cursor; no forced biography form.
4. Clicking Keep my look persists to own account; skip preserves the default; person enters their **empty** Home with no sample subjects/friends/achievements.
5. Profile changes later always preserve existing learning data, attempts and group membership; new avatar propagates to next reactive room/profile event. Auth account may have Google image, but ask/allow overwrite; do not silently override a chosen persona on OAuth re-authentication.

### Randomness and fairness

- At least **eight original PearNotes profiles**. Initial available pack may adapt the legacy set; user explicitly permits Flora-generated replacement/expansion, but style must match current 8 illustrations. For v1: use an indexed curated array and unbiased cryptographic random choice, persisted once. If deterministic identity hash is preferred for retries, document privacy/tradeoffs. Do not generate a new character on every signup.
- **Starter display names:** use neutral creative handles, distinct from actual known OurSpaces example characters/people. Examples for planning: Pippin, Nori, Sol, Tali, Sora, Zuri, Echo, Milo; final copy must be cleared for collisions and localization. Display name editable immediately; avoid promising global uniqueness if the backend does not enforce it.
- Profile photo may be new uploaded photo after valid type/size cropping and content moderation policy. Never publish it to friends/groups without user's visibility choice.
- Assignment must survive sign-out/sign-in, device change and guest-to-registered upgrade; never remap a user because new catalog art was added.

## 2. Original avatar library — keep look and feel

Source: `src/data/avatars.ts` and `public/avatars/` currently list original avatars (including eight visitor names `juno`, `momo`, `pico`, `wren`, `ziggy`, `clover`, `pepper`, `kiwi`). The screenshot-11 chooser uses a round photo/illustrated disc, black dark panel, thick colorful selection ring, optimistic preview and "your photo". Reuse this composition and gestures.

### Art direction for any new persona

- 2D/2.5D illustrated portrait, head-and-shoulders crop and consistent circular safe area; soft textured/plastic sticker finish, cheerful expressive but not gimmicky, same tonal lighting and ink outlines as eight existing avatars.
- Different character appearances, hairstyles, skin tones, outfits, glasses, accessories and backgrounds; no stereotype that assigns STEM to one gender or culture. Distinct cursor color survives in small thumbnail, with sufficient contrast; include shape/label not color alone.
- Transparent or clean cutout only as authored; export optimized consistent square resolutions, e.g. 256/512, and high-res working master. Ensure consistent 32/48/64px legibility, avatar face centered without clipping by rings.
- Curated safe palette includes original vibrant violet, mint, coral, blue, pink, lime and orange backgrounds; mark/cursor styling must not be simply a generic emoji.
- Provide matching mini cursor: colored native outline/pointer or marker bearing the selected persona's initials/tiny face. **Reuse the exact original OurSpaces cursor runtime** and selection mechanics, not a newly drawn generic arrow.
- Optional first eight may remain old illustrations if rights checked; re-generated ones require owner review of the full eight-character family before replacing the shipped pack. No extra Flora spending unless owner approves run/cost.

### Persona selector details

Full settings-style sheet: top "You're [username]" with own face and profile state; editable name field; first row of eight selectable circles (two rows if mobile), live but non-destructive preview when hovering; selected green ring; text "that's you"; option Upload my photo, Reset to starter, Save, Cancel, accessible file input and crop. Save persists owner-scoped profile. Invalid name, upload not allowed, exceeds size, unavailable storage, conflict or disconnected network shows native paper error slip without discarding pending edit.

**Accessibility:** person circles have accessible labels (illustrated character nickname), selected state via aria-pressed/radio, tab/arrow, pointer and screen-reader support; use human-readable alt on owned profile, decorative alt on repeated labels.

## 3. Account profile and privacy

The personal Profile route is a richer persistent version of original settings card. Header offers avatar/name/short tagline, account link status and email (masked by default), achievements, personal learning portfolio and optional group badges. Distinguish "private self", "friends", "group members", and "public" subsets. User can preview their friend-visible profile. Account profile exports never include other people's private study events. Deleting image removes storage ref and cache where possible; older chat messages can show a fallback while keeping authorship.

### Preferences

- Visible name vs optional pronouns/about (never require sensitive personal details).
- Avatar selection / picture; cursor color/look from persona.
- Friend activity visibility: off-by-default until consent. Granular choices: online status, subject studying (not source title), earned badges, study streak, session availability. No default sharing of quiz answers/grades, content excerpts, file names or activity detail.
- Display language and timezone for calendar.
- Study preferences and reduced motion/linear view; account delete/export behind verified action.
- Profile owns own relationships; changing display name is not changing principal ID or historical attempt owner.

## 4. Friends and top-right presence pill

Home mockups 09–10 suggest a top-right overlapping avatar strip; use actual OurSpaces **members presence pill** ancestor and member-card popup with real accepted friend relationships. In a real first-run account, **only self** appears (if product chooses self) plus "invite someone" affordance; do not show three fictional friends or "4 here now". Demo can show Maya/Jules/Sam only under SAMPLE, with interactions resolving local fixture details.

### Clickable friend overview (owner-requested)

Open the capsule via click/Enter. The native popover/sheet displays:
- Heading "Your people", accepted friends grouped as Online, Studying (shared visibility), Recently active and Invited.
- Each row: avatar with native ring, display name, status if consented, optional "reviewed 2 lessons this week" *only if event verifiably shareable*, badges earned with owner's opt-in, mutual group and action Invite to Study Room, Visit permitted profile or Message.
- Friend detail sheet: illustrated larger avatar, public self-written note, verified shared accomplishments, study session join permission and recent activity in digest form; never show hidden grades, mistakes, personal source names or dates of specific documents without consent.
- If no accepted friends: original-style inviting paper "Nobody here yet" and share-invite action, not fabricated face silhouettes.
- Requests accepted/declined with clear states; spam/rate limits/block/report; revoked friend visibility immediately removed.

Click outside/Escape to close; keyboard focus returned; popover doesn't cover activity pill or dock. Tapping avatar in actual group room can open compact member card with permitted actions; private lesson does not fabricate a group.

## 5. Distinguish friends, group members and study peers

**Friend:** reciprocal/approved relationship and activity visibility. **Group member:** can share a group room but is not automatically a friend or recipient of personal subject data. **Room participant:** online presence scoped to room authorization; cursor could be visible even without friend relationship while inside permitted room. **Study buddy:** explicit share or joint session; no implied full file/library access.

### Event and privacy model (proposed)

- `friendRequests`: senderId, recipientId, state, timestamps, cancellation/expiry, anti-abuse.
- `friendships`: bilateral ownership, blocked relationships omitted; no auto acceptance.
- `profileVisibility`: userId, each field's scope, rev/version; any scope removal invalidates queries immediately.
- `activityEvents`: ownerId, type, timestamp, subjectId optional, evidence ref, privacy scope. Friend feed projects only publishable **summary** events.
- `studySessions`: organizerId, member invite IDs, status, scheduling timezone and join rights.
- `roomMembership`: authorization for shared canvas; no implicit access to personal `sourceSegments` or attempts.

These are **planning contracts**, not claims tables exist. Define indexes, pagination, rate limiting and server-side filtering before client feed work. No authorization by client-supplied friend list.

## 6. Groups page and room continuation

Groups landing adapted from original room gallery/dock. Native "make a space" plus, cards for each real group with photo/illustrated disc, membership count, last activity and section: General HQ, Study Room, Brainstorm, Project Lab, Revision Arena (later). A group is not a fork of personal account. Creating a group prompts privacy and link join policy; invitation is bounded, revocable and not guessed.

Inside a room use original `LiveSpace` with original `Rail` and `MemberFace`, chat, threads, cursor, gestures and top-right member row. Native widgets adapt to study: RSVP→session join, Poll→revision poll, list→group study goals, Note→team knowledge, PDF/source→approved shared material. Single- or multi-user editing only follows member role and source permissions; private quiz attempts never become shared when widget is shared.

Owner's specific people-sheet asks for overview of friends' activities and achievements. A group's "crew" capsule instead shows authorized **current group participants** and shared actions; do not overload it with all personal friends or guess active status.

## 7. Cursor and spatial identity contract

- Person-specific account ID is stable; tab-specific presence ID is stable per tab and different from person ID.
- Real room cursor: original shape/outline, chosen persona face/name chip and accent color. Peers can identify whose cursor it is. Presence updates throttled and scoped by room.
- Personal room: optional own cursor display; no fake peers in private lesson. A live user can test cursor in their own preview without spawning a fictitious peer.
- When change avatar or name, preserve active cursor lease and propagate display on next safe reactive update; never reset attempt/session identity.
- Offline: remove stale presence on timeout, don't claim online from a cached profile. Blocked/unfriended users cannot see activity outside existing group permissions.

## 8. Failure and abuse states

| Event | Expected |
|---|---|
| New account created | exactly one persisted default persona, no seeded friend graph |
| Two concurrent signup callbacks | one durable persona/owner profile, not duplicates |
| Guest upgrades to email | retains avatar/name/study history |
| User switches A→B same browser | A face/feed/subject disappears before B mounts; no leakage |
| User uploads custom image | crop and validation, private asset until approved to share |
| Friend removes visibility | summaries disappear on next authorized read; no cached sharing |
| Friend request denied or blocked | request cannot be sent again improperly; safe message |
| Group shared canvas | actual authorized cursors only; owner personal source remains inaccessible |
| Demo opened while signed in | fixed demo persona, no user profile query/mutation |
| Avatar file missing | consistent fallback portrait + recoverable asset warning, no broken cursor |

## 9. Tests and ownership

Visual pair with screenshot 11 and original cursor/dock, account persistence, two accounts across different devices, real Gmail signup, Google signup if configured, one-time assignment across parallel init, custom upload, crop, user name change and cursor update. Permission probes must test friend activity, group membership, revoked shares and private sources. Demo screenshot alone is never acceptance.

**Implementation pointers:** `src/data/avatars.ts`; `src/live/identity.ts`; `src/live/useAuthIdentity.ts`; `src/components/MemberFace.tsx`; `src/components/Rail.tsx`; `src/pages/LiveSpace.tsx`; `convex/auth.ts`; current `src/pearnotes/shell/app/pages.tsx` and `AppRail.tsx`. Profile storage and relation schemas must be designed before real persistence, not improvised in CSS.
