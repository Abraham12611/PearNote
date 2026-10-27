# Chat, threaded conversations, promotion and tutor separation

## Existing foundation

Original OurSpaces stores room-wide and widget-attached messages, with promotion from conversation into persistent note objects. `GlobalChatPanel`, `WidgetThreadDock`, and messages table are natural reuse targets. Validate current code behavior before changing IDs or message relation conventions.

## Three channels

1. **Room chat:** social/planning conversation visible to authorized group members in General HQ or specialized room.
2. **Widget threads:** tightly scoped discussion about a diagram, source, challenge, note, or research link. Store widget/thread identity with backlinks and access checks.
3. **Personal Pear Tutor:** private model conversation with current subject+lesson+selected object context and personal source retrieval. Absolutely no access from group channel by default.

A fourth, later channel is `@Pear` in group chat, invoking group facilitator with **shared-only** knowledge. Its output is labeled AI-assisted.

## Promote a conversation into a knowledge object

User selects message(s) → `keep as note` / `turn into concept` / `make practice question` (later) → preview authored summary with message IDs, participants and source permissions → accept → persist typed widget with thread backlink and attribution → fly/land animation on canvas. For a single message, preserve exact quote where permissible. Do not fabricate speaker statements.

## Quote, edit, delete behavior

If original message removed, saved derived notes retain a provenance state (`source removed`) or follow retention rules; don't leak deleted private content via AI summary. Editing a note shouldn't rewrite original chat. Only authorized users can create/edit promotion objects in that room.

## Chat input and notifications

Maintain existing floating bottom/chat panel style, not a permanent giant right sidebar. Support mentions, notification muting, unread counts and contextual replies. Disable AI assistant auto-interjection; people explicitly invoke it. For group study, provide `summarize what's important` on request and allow human confirmation before pinning results.

## Privacy tests

A personal tutor question doesn't appear in room chat; shared tutor doesn't search personal history; nonmembers cannot query room thread IDs; invitation expires; a message promotion cannot publish an attached unshared file by accident.
