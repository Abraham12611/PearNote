# Visual assets, subject avatars, illustrations and branding system

## Brand principle

PearNotes should **inherit the personality, not impersonate the brand**, of OurSpaces. Design original PearNotes mark, type lockup and new illustrated subject characters while respecting the upstream MIT license and separate third-party assets. Existing `pearnotes.app` ownership is not a legal trademark clearance.

## Subject avatar pack (first version)

Produce a visually consistent circular/2.5D icon family for **Science, Mathematics, Biology, Physics, Chemistry, Medicine, Pharmacy, Computer Science, History, Literature, Languages, Economics, Art, Engineering, General Studies** and an `Unknown / Custom` fallback. These are *available choices*, **not default created subjects**. Student may choose any avatar independent of AI category, upload custom image later after content safety check.

## Selection behavior

In the `pick a subject` modal, each actual user subject appears as a large circular image with strong identity background. On hover/focus it lifts slightly; on select it grows, receives the lime ring and name label. Dashed plus remains visible after any number of subjects. Keyboard screen reader label `Create a subject` / `Select Biology` includes real content status.

## Initial reward/trophy art

Create original illustrated `First Chapter`, `Deep Thinker`, `Study Buddy`, `Cell Explorer Chest`, `Explorer`, `Comeback`. Export high-resolution masters then optimized PNG/WebP/SVG assets. Trophies fit the material metaphor: little die-cut sticker, enamel pin, folded paper, specimen badge, or tiny chest; avoid generic stock icons in final hero shots.

## Asset lifecycle

For every asset track filename, author/provider, prompt or creation method, license, attribution need, content category, dimensions, optimized sizes and usage screens. Support dark/light context variants. Use ordinary CSS/SVG path nodes for learning journeys rather than depending on image generation for every lesson.

## Visual QA

At 1440×900, 1024×768 and 390×844 verify subject portraits are consistent, text labels fit, selection ring contrasts and images load without layout shift. On slow network show matching illustrated fallback. For screen reader users, an avatar's subject name carries meaning rather than image alt alone.
