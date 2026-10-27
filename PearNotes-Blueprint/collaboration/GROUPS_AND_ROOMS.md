# Groups, shared spaces, live collaboration and project workflows

## Hierarchy

`User` owns private subjects and can join `Group`. `Group` has a mandatory `General HQ` space and optional `Study Room`, `Brainstorm Room`, `Project Lab`, `Revision Arena`, custom room. Group rooms reuse the same spatial canvas engine with type-specific widget catalogs. Creating a group does **not** transfer ownership of personal subject materials.

## Phase 1: exactly one shared study room

Re-use original room invitation, presence, peer cursors, spatial drag locks, room chat and widget threads. Create or enter one verified shared room, add a note, observe sync in two authenticated browser windows, and promote a worthwhile chat explanation into a persisted note. Allow one shared Challenge widget if stable, with responses stored per learner. Don't build simultaneous voice rooms or full group room templates for demo.

## General HQ (Phase 5)

Pinned announcements, group purpose, calendar, upcoming study sessions, task list, links, member status and chat. Can invite others, create specialized rooms, and see recent preserved learning artifacts. Keep OurSpaces room personality: frame-based cluster of social objects and useful shared widgets.

## Study Room

Shared curriculum reference or approved lesson copy, synchronized lesson pointers (optional presenter/follow mode), shared editable notes, group questions, diagrams and debate prompts. One person's mastery does not affect anyone else's grade. Group tutor uses shared corpus only.

## Brainstorm Room

Infinite canvas, free sticky notes, clustering, voting, concept graph, AI-suggested grouping with user approval, pinned decisions with provenance. Support loose exploration and structured outputs without imposing a to-do list.

## Project Lab

Resources, deliverables, task assignments, project milestones, progress artifacts, live discussion, versioned pinned outcomes. AI can draft summary/project outline but cannot silently change member commitments.

## Revision Arena

Opt-in team review games, timed rounds, challenge displays and leaderboard with accessible untimed alternatives. Scores and independent mastery stored separately. Avoid exposure of individual wrong responses without consent.

## Membership, moderation and safety

Roles: owner, moderator, editor/member, guest/viewer. Room kind may narrow permissions. Invite tokens hashed, expiring and limited; remove/ban membership takes effect on next live/backend authorization. Include chat reporting, mute/block and future moderation workflow. No public room listing at launch.

## Live data expectations

Reactive queries and presence from Convex. Peer edits transactional; active gesture leases prevent inconsistent drags. Server controls permissions. Subscriptions must be scoped by membership. Offline/reconnecting indicators truthful, not fake `live` dot. Concurrent edit behavior: if two people edit same rich-text note in later versions, introduce explicit merge/CRDT, don't assume last-write-wins is safe for every editor.

## Acceptance scenario

Two genuine user sessions join a room. User A posts chat and places a note; user B immediately sees it and replies. User A keeps a reply as note with source thread link; both see it. User B attempts access to A's unshared personal PDF and is denied.
