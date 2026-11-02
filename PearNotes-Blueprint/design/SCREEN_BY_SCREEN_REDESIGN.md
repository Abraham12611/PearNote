# PearNotes detailed screen-by-screen UX redesign — original OurSpaces adapted

**Status:** owner-requested design correction, 2026-11-02; SPEC ONLY. Read `OURSPACES_FIDELITY_CONTRACT.md` first. Every component uses an existing OurSpaces ancestor, not generic SaaS primitives. Some social/calendar/reward functions are planned, not built: never present planned actions as working.

## Global information architecture

| Destination | Clean route concept | Source/ancestor | Global chrome |
|---|---|---|---|
| Landing | `/` | inherited `/#/about` editorial layout | branded top nav, authentic product collage, story/footer |
| Get Started | modal over `/` | screenshot 13 original two-tone modal | native modal/backdrop, close, focus management |
| Sign in / Sign up | `/auth/sign-in`, `/auth/sign-up` | same native dialog family; may be deep-link pages | sign-in UI and transparent OTP status |
| Home / Desk | `/app` | `/#/space/crew/knows` adapted | original floating rail, illustrated context, top-right self/friends |
| Learn picker | `/app/learn` | original modal / subject discs | Home behind modal, focus, preserved selection |
| Subject | `/app/subjects/:id` | original space header + right path | persistent native rail and Home context |
| Sources | `/app/subjects/:id/sources` | native paper/attachment/library cards | rail, breadcrumb, document interactions |
| Lesson canvas | `/app/subjects/:id/lessons/:lessonId` | `/#/space/crew` spatial board | breadcrumb upper-left; activity pill lower-left; canvas, tutor/presence |
| Library | `/app/library` | original gallery/wall/kept note cards | rail + filter chips + source sheets |
| Groups | `/app/groups` | original room rail/room HQ/list | rail + owned and joined rooms |
| Shelf | `/app/achievements` | native sticker/pin/shelf widgets | rail + trophy cards, evidence |
| Profile | `/app/profile` | screenshot 11 settings/face chooser | rail + identity panel |
| Settings | `/app/settings` | original settings overlay | rail + categorized sheets/dialogs |
| Demo | `/demo/*?fixtures=1` | SAME visual surfaces as /app | DEMO ribbon, isolated fixture state |

The owner-approved list of seven main rail destinations is Home, Learn, Library, Groups, Shelf, Profile, Settings. Add/plus can be a distinct action in the inherited rail, not an eighth destination. Do not turn long labels into persistent button captions: original dock uses icons with tooltips; adapt with **custom icon art**, not default icon-font glyphs.

## 1. Public landing: an adaptation of original /#/about

### Core spatial composition

Rebuild `src/entry/LandingPage.tsx` based on `src/pages/About.tsx`. The original is a full editorial narrative with authored imagery, colorful cards, expressive type, asymmetry, thick outlined physical elements, real component rhythm, detailed footer and purposeful whitespace. The current sparse text-only black hero + four equal boxes is rejected.

**Above fold at 1440–1720px:** Sticker P at upper-left, sparse consistent navigation and strong Get Started pill upper-right. One expressive three-line claim: study material turns into a world that remembers what you understand. A two-part hero balances confident typography on the left with *meaningful collage* on the right. Collage shows (A) an actual PDF/source sheet with highlighted passage and page number, (B) the same source linked by a string/arrow to an illustrated subject token, (C) a small learn-path segment with 2–3 nodes, (D) a mini canvas with native source, lesson and challenge cards, (E) a tiny source-citation badge. These are authored showcase visuals, not fake app screenshots or false live output. Short animated movement resembles OurSpaces' native collage hover, with reduced-motion static alternative.

**Color/story:** use an inherited black hero with an artful purple or teal visual field, pinned paper, small playful lime and pink motifs. Hero text stays legible; avoid huge unbalanced black void. Some sections use cream stage, others dark canvas and bright illustrated blocks. Take typography, gutters and section boundary grammar from About instead of its literal "Your people" copy.

### Landing section sequence and content

1. **Hero:** claim, subhead, two CTAs ("get started", "look around the demo"), caption explaining demo fixture vs personal data; product collage with visible citation.
2. **Material → understanding:** three-stage collage embedded in original note/photo/board frames: upload a page; approve subject/path; learn with sources; show provenance rather than imply immediate automated completion.
3. **The desk you keep:** screenshot-style native Home composition (warm paper, groups of cards, no fictitious live friend data outside demo). Explain personalized activity, source shelf, achievements and study calendar.
4. **Study, don't just scroll:** connected board objects from original widget shell: source viewer, explain, challenge, teach-back; highlight camera movement and hands-on nature.
5. **Mastery comes from evidence:** tiny challenge response example with a correct/incorrect feedback sticker; no fake personalized prediction. Explain how proposals are consented to after repeated misconceptions.
6. **Friends, when you invite them:** room photo strip / presence pill; clearly opt-in rather than default account friends; point to real shared room.
7. **OurSpaces heritage / built upon:** candid acknowledgement of fork and MIT; owner-controlled uploads and shared material permissions; credible technology block, not sponsor logos without right.
8. **Final invite and real footer:** Get Started, demo, documentation/privacy, attribution and credits in the original About visual grammar.

**Behavior:** anchors scroll; hero CTAs work; returning signed-in user can enter desk; no auto guest creation at /; lazy-load collage media; accessible descriptions and LCP-friendly first image; do not place full auth form within the landing.

### Responsive

At 1280+, editorial split hero with visual collage; at 768–1279, visual stack or overlap with readable text; at ≤767, top nav becomes compact popover, collage becomes a single scrollable focal illustration or compressed semantic sequence, CTA stays visible; text never clipped or horizontal-scrolled.

## 2. Get Started modal — repurpose original welcome dialog

**Ancestor:** two-tone OurSpaces demo/welcome modal in screenshot 13: large art panel to left and content/close panel right, balanced alignment, black capsule CTA. Do not replicate screenshot 02's giant all-lime pill or shortlist stuffed into onboarding.

**Desktop layout:** centered 850–1040px max-width within safe margins, split 40% illustration / 60% content. Rounded 24–30px canvas, one purple/teal scene showing PearNotes cards/avatars on the left, cream paper on right. Close is top right on dark circular control. Headline e.g. "Make a place to learn." small context phrase. One **true primary** "Create your account" black pill with lime tiny arrow; secondary "I have an account" text/pill; third "Explore a sample desk" clearly labelled with Demo tag. No extra 3 subordinate paragraphs per option; concise copy, not stage directions.

**Optional shortlist:** move to an explicit "updates" opt-in below landing or a separate small expanding sheet when waitlist is genuinely relevant. Do not confuse a working account with a waitlist; if registration is live, lead with it exclusively.

**Interaction sequence:** open on click, return focus to Get Started trigger on close, Escape and click outside close except when unsaved input, Tab trapped; navigation closes dialog synchronously and transitions to auth page/modal with safe `next`. No duplicate open dialogs, no body scroll leak, no hidden click-through. Error gets a native paper slip.

## 3. Sign Up / Sign In / OTP / Google

Use same two-tone/modal family across both entry points rather than a separate dark rectangle with small form. A deep link renders the same content within an intentional auth page/shell, not an accidentally clipped popup.

**States:** choose method → enter verified email → sending code → code sent to masked address → enter 6 digits → pending verify → account/profile initialization → desk. Provide "edit address", resend after cooldown, "check spam", clear expiry/recovery with consistent copy. Google only if configured; present as official secondary method styled as black/cream pill, not blank buttons.

**Email form:** name of method "Continue with email (including Gmail)" and clear valid-address input; no implication that only school email works. Input label persists independently from placeholder. Show proper sending spinner and error category. **Any valid Gmail must be allowed** (provider deliverability may fail and must be fixed); do not blame user address for provider exception.

**Privacy:** never display raw OTP, full emails in public logs, or whether an email is registered. Registering from a guest must preserve intended identity and data with server-side ownership; cross-user account switching must remount all private state.

Further diagnostics/operational requirements: `../engineering/AUTH_AND_ACCOUNT_RELIABILITY.md`.

## 4. Original dock adapted for PearNotes

**Do not reuse existing custom `AppRail.tsx` UI unchanged.** Extract a shared `SpaceDock` primitive from the original `Rail.tsx` frame, round icon tile, tooltips, divider, plus, bottom face and live indicator; retain original as a consumer. PearNotes supplies icon buttons and navigation semantics; no photo-thumbnail navigation.

**Seven items:** Home (house), Learn (open book/path/spark), Library (books/saved source), Groups (connected face pair), Shelf (illustrated trophy/sticker), Profile (person), Settings (gear). Icons should be custom 2–3 stroke-width consistent family or ink/cream silhouette, not stock icons of mixed weights. **Active:** original lime tile/outer ring and ink icon; hover reveals tooltip; pending action a small counted sticker, not an active highlight. Readable labels on tooltip and touch-assisted compact variant.

**Hierarchy:** approved Sticker P at head, then seven nav icons (use one scroll section if viewport too short), bright + create-action tile where it does not collide with page action, separator, **current user's illustrated face anchored at bottom**, optional tiny settings cog physically attached. Owner may choose to merge Profile and Settings face actions if seven items crowd; this needs documented approval, not silent removal.

**Context adaptation:** on Home navigation buttons move pages; on subject path same rail stays stable and Learn is current; on lesson it may collapse to dock teaser but breadcrumb/activity pill and return action persist; on group room switch context to group-specific tool affordances without losing global ability to return. Unread badge only if real.

**Interactions:** original Rail hover-lift, matching tooltips, keyboard roving/focus, accessible aria-current and menu names, original animation staggering, correct clipping and shadow. Profile avatar changes everywhere including top-right people and cursors; sign-out cannot retain other account's portrait.

## 5. Home "your desk" — adapt original /knows, not a dashboard

Home is **an authored personal learning room**. Use the /knows warm cream stage, near-black outlined irregular cards, pinned/taped notes, varied widths and physical grouping. At desktop, the original dock sits left; page begins with a short greeting and small subject/identity context. A top-right **avatar-overlap capsule** displays the learner and accepted friends/active group members, with a text count only if grounded in actual relationships/presence. Clicking opens native small people sheet.

### Desktop editorial layout

Use a cohesive "board of learning records" with a dominant **Continue studying** note on upper left (when eligible), **Your subjects** illustrated discs nearby, and an **Upcoming/This week** pinboard; lower sections are staggered cards akin to /knows. Vary width and height; avoid equal SaaS tile grid. Reference screenshots 09–10 as content/composition examples and screenshot 05 as the *actual style source*.

**Modules and exact state behavior:**

| Module | What it displays | Native visual container | Empty/permission state |
|---|---|---|---|
| Greeting + portrait | private display name and profile face | original room heading / face | on unresolved identity show skeleton, never previous account |
| Continue studying | last owned lesson, subject, unit, resume | photographed/taped paper note, original black pill | replaced by "Start with a source"; no fake resume |
| Your subjects | actual user-owned discs and dashed + | original avatar/gallery buttons | just + with encouraging message; no Biology preset |
| This week's focus | self-defined study tasks, completed checkboxes | original todo/checklist widget | blank task template, "add your first study goal" |
| Study calendar | explicit study sessions, reviews and commitments | original calendar/poll note composition | unscheduled date grid, no invented study streak |
| Upcoming | planned reviews, user-entered deadlines, group sessions | stacked paper slips | "nothing scheduled"; source-based suggestions clearly proposals |
| Recent activity | actual private source uploads, attempts, reviews | original /knows "what it has made" timeline/cards | "your activity will appear here" |
| Achievements | server-issued trophies, locked silhouettes with rules | original sticker/shelf framing | show unearned placeholders labelled locked, no fake awards |
| Learning progress | objective/lesson evidence and coverage | original outlined status cards/counters | "untracked" if no objectives; no zero-over-zero bar |
| Friend/crew update | opt-in consented friend highlights | original people capsule + expandable cards | invite friends; hidden by default, not mock Maya |
| Study vibe (optional) | personal theme or ambient controls that work | original media/photo card | omit if playback capability absent |
| Study streak (future) | eligibility-backed active days | original handwritten small badge | no imagined streak; criteria view and pending release label |

### Interaction details

Each card supports native hover/focus reveal, outlined black buttons, click-to-expand or context-menu; actions must lead to a functioning route, inline edit or honest disabled state. No seeded card acts as a real record. The greeting may be from account session (never sessionStorage-only persona when registered). Move and pin personal cards only if actual persistable layout supports it; don't make movement appear saved when not.

**New user:** cream expressive Home with a giant first-source paper invitation, one create subject plus, a deliberately empty sticker shelf and optional explanatory hand-drawn three-step strip. **Returning user:** modules appear from actual data, prioritize Resume and due review; preserve their arrangement; responsiveness turns spatial composition into readable stack.

## 6. Learn subject picker

Click Learn from original dock. Native modal over Home; live account subject circles from owner-scoped query, no seeded subject. Selected subject gets original lime rim, portrait, label, status; dashed + present always. On selection show Enter Learning Path CTA; restore selection and scroll on back. User can create from manually entered name or approved PDF/text proposal; never auto-create subjects from uploaded mixed material. Use existing picker modal and subject discs styling rather than a standalone plain drawer; 2-column small-screen grid and arrow key operation.

**States:** loading/empty/selected/subject awaiting source/curriculum processing/ready/failed/requires review/foreign or deleted. Every one has distinct recovery. No invalid route to undefined fixture lesson.

## 7. Library — the source shelf

**Stage:** original /knows card/paper material, with a left source stack, top folder/filter chips and right preview sheet. Do not show just a default browser list.

**Core segments:** Recently added; Subjects; All sources; Needs review; Failed imports; Archived/deleted (where supported). Each source card: cover/type, title, owning subject(s), extracted page count, imported date, version, status, citation availability; keep confidence/provenance separate from title. Click opens original-page PDF/text reader anchored to page or segment. On file card action menu: open, add to subject, move with approval, rename, retry parsing, remove with confirmation; user cannot mutate a source by visually editing a card label only.

**Intake:** upload/paste text, cap and mime validation, progress slip (queued/extracting/classifying), assign/reassign, review AI proposal, approve/abstain, processing error and retry. Never imply document text was extracted when OCR unsupported. Existing Convex source reads remain scoped; demo uses only static labelled examples, not live uploads. Empty: paper shelf artwork + "Bring your first source" plus native upload pill.

## 8. Groups — learning together, inheriting OurSpaces spaces

**Landing:** native room/gallery slots from original Rail, membership list, people capsule and "start a study room" plus. Sections "Your study groups", "Invitations", "Recent room activity" and "Rooms you can reopen". On no group: one invitation panel with privacy explanation and create/join actions, not generic empty app card.

**Group HQ:** an actual OurSpaces room with presence, chat, polls and paper notes; adapt calendar to study sessions, pinned group resources, tasks, subject-specific shared link and study-room entrance. Shared **only approved** content. Activity from other students is opt-in and explicitly limited; private tests and mistakes stay private.

**Study room:** full original canvas with participant cursors, chat widget threads, drag/resize/edit leases, source/curriculum views only when shared, personal attempts private. Invite link expiry/revocation, member roles, kick/report and reconnect notices. Until backed by real group data, an owner account must not enter preseeded "crew" as their own friends.

## 9. Shelf — achievements and evidence

Styled as a tactile sticker album or pinned trophy shelf from OurSpaces. Top: trophy identity and collection count **earned from server ledger**. Sections: Earned, In progress (with verifiable criteria), Locked / coming later, and share settings. Each trophy reveals provenance and required rule: lesson completion, supported evidence, eligible timestamp, source subject, issue state; unlock does not equal subject mastery. A tiny animation after verified grant, no points for mere view/click. Demo trophies say SAMPLE. On first use, gorgeous empty pegs + explanation; don't pretend the profile has three awards.

## 10. Profile — identity you carry into the space

Original screenshot-11 identity overlay becomes Profile. Header original circular illustrated face + near-black card, editable display name; avatar chooser with eight+ visually consistent personas; custom upload with crop, preview and validation; generated stable default persona; nickname case/uniqueness policy; color/cursor pairing. Tabs "Identity", "Learning", "Achievements", "Friends", "Privacy" (may be grouped as sections). Keep "your photo" and a meaningful "your look" selector. Real identity persisted on account, no local-only promise after login.

Own progress shows verified records and source ownership; public profile reveals only opted-in fields. Profile action "see your cursor in a sample board" uses local-only preview, not a real group cursor. Changes propagate to room avatars and live cursors; back/close stable. See `IDENTITY_FRIENDS_GROUPS.md`.

## 11. Settings — a real OurSpaces control surface

Reuse original dark portrait/settings overlay, add organized paper subsections: Account & email; Appearance/Avatar/Cursor; Study preferences (guided vs explore, reduced motion, reminder cadence); Accessibility (text sizing, contrast, keyboard/linear view); Notifications (in-app/email opt-in); Privacy/Friend activity sharing; Data & exports; AI costs/consent and data-processing status; Sessions/logout; About/attribution. Only ship actionable toggles when backed by persistence. Pending controls display transparent Coming later labels and are not interactive dead switches.

Account deletion/export require confirmation; disconnecting does not discard unsaved answers. The Settings/face button in dock is visually and behaviorally consistent with original; sign-out clears local private state.

## 12. Edge and global screens

- **Loading:** material skeleton/pinned-note shimmer and explicit phase, preserves dock and previous safe context without displaying another account's cache.
- **Not found / unauthorized:** original paper slip with Back to Desk, no ownership leakage.
- **Offline / reconnect:** truthful sync chip, preserve local drafts and retry; never say "live sync" in fixture.
- **Too little data / untracked:** designed empties with upload, add source, create objective; no synthetic progress.
- **Error:** recoverable outlined slip with safe action and diagnostic code; not silent unmounted blank area.
- **Route and modal history:** direct links, Escape, browser back, Home/Subject/Lesson reversal keep selection/scroll/camera when authorized; no hidden redirects to legacy room.
- **Mobile:** dock becomes compact native icon strip or collapsible side capsule; each page stacks cards; modal becomes vertically scrollable original split visual adapted; drawer full-screen; widgets read at ≥16px.
- **Social and authentication:** public landing does not sign in; demo not backed by user session; private app requires explicit auth/guest choice, read/write checks server-side.

## Composition check before acceptance

At 1440×900 and 390×844 capture Landing, Get Started, Sign In, Sign Up, New Account Home, Returning Home, Learn picker, each demo path, Lesson, Library, Groups, Shelf, Profile, Settings, loading/empty/error. Beside each capture the exact OurSpaces ancestor and list its original exported component. Owner must confirm the whole page and interactions—not just buttons or a green CI result.
