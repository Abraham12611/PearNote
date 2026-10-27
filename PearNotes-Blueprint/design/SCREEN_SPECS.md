# Screen-by-screen interaction specifications

## S01 — Home: the personal study desk

**Purpose:** orientation without a generic dashboard. **Layout:** floating left rail, contextual top-right avatar/profile, personal canvas with `continue studying` print, upcoming exam note, pinned sources, achievements, group invites; anchored bottom dock. **First use:** approachable empty world with a clear `Learn` invitation; no fake subject. **Actions:** Learn, Quick upload, Resume, Library, Groups, Settings. **Data:** last real lesson, owned subjects, upcoming revision, opted-in rewards. **Critical test:** empty account never displays Biology by default.

## S02 — Subject picker modal

**Trigger:** `Learn` rail/button. **Visual:** near-black modal, `pick a subject`, grid of circular 2.5D subject avatars; new user has only dashed circular `+`; existing users have their own discs plus `+`. **Interactions:** keyboard navigation; one selection; selected avatar enlarges slightly and wears lime ring/name label; large `Enter the space`; escape closes; `+` launches wizard. **Empty user CTA:** `create your first subject` not a false disabled `Enter the space`. **Mobile:** 2 columns or horizontal, large tap targets.

## S03 — Create Subject wizard

**Step A:** choose manual or upload. **Step B:** file queue/list or name field. **Step C:** visible extraction/classification statuses with source count and retry. **Step D:** proposed subject cards showing which passages/files belong where; rename, merge, split, move source. **Step E:** selected subject avatar/color; confirm. **Step F:** curriculum status → path; teach first lesson start. **Rule:** no subject creation by model prior to user acceptance when multi-subject classification is proposed. Failed/ambiguous import shows review and retry.

## S04 — Learning path drawer

**Desktop:** right edge, 50–55% viewport; backdrop Home dims/blurs; focus trapped inside modal when open; visible close and back. **Heading:** subject avatar, name, progress and manage menu. **Body:** scrollable illustrated section bands, winding SVG node path with each unit/lesson; distinct current node and optional remedial branch. **Node preview:** title, objectives, estimated activity count, evidence-based progress, source indicator; CTA Start/Resume. **Persistence:** preserve scroll and selected node when leaving lesson then returning. **Mobile:** full-screen page/sheet with native scrolling. **State:** loading/generating/review needed/ready/error.

## S05 — Lesson canvas

**Entrance:** transition from path node to mapped canvas overview (respect reduced motion). **Chrome:** source breadcrumb, Lesson Compass, compact tutor dock, save/sync status. **Canvas zones:** orientation/learning resources, practice, teach-back, saved notes; predefined path is guidance not a hard rail. **Guided mode:** camera follows recommended activity; active object framed/spotlit. **Explore mode:** free pan/zoom/edit with `return to next activity` button. **Focus interaction:** open card in readable detail view; escape returns to same camera. **Exit:** save camera/draft state; return to path. **Accessibility:** alternative linear list view of objects.

## S06 — Source viewer

Displays original uploaded PDF page or text segment adjacent to/over canvas. Supports citation anchor, page number, highlight, link to concept/lesson and back. Distinguish exact source quote from AI paraphrase; unavailable original shows error and blocks misleading citation claim.

## S07 — Pear Tutor

Collapsed in bottom dock. Context chip displays `Biology • Membrane transport • Challenge 2`. Modes: Explain, Hint, Quiz me, Show source, Help me practice. Provide current target object and provenance; show pending state; preview nontrivial actions as a ghost or diff; explicit Accept/Reject. On group room, `@Pear` is scoped to shared room; private tutor is separate.

## S08 — Group HQ & Study Room

**HQ:** member row, announcements, calendar, resources, room cards, global chat. **Study room:** canvas and cursors, editable shared notes, room chat, per-widget threads, invitation control; individual assessment panels private. **Promote:** message→note with attribution and backlink; honor edits/deletions and access restrictions.

## S09 — Profile / settings / achievement shelf

Profile: avatar (original illustrated collection), display name, earned trophies, privacy mode. Settings: account, notifications, theme/accessibility, uploads/AI processing preferences, group invites, data export/delete. Reward screen: XP and streak ledger summaries with transparent criteria, no deceptive mastery equation.

## Screen acceptance cues

Screens must support loading, no-data, bad network, unauthorized, AI unavailable, unsupported content, and user cancel states. Keyboard focus must return to trigger after a modal closes. Back navigation must be predictable even when paths are deep-linked. Source and assessment views must be readable at ordinary text sizes.
