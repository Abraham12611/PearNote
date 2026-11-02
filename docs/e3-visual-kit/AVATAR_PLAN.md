# E3 · Persona avatar + cursor plan

**Decision per `IDENTITY_FRIENDS_GROUPS.md` §1–2:** the original illustrated language is authoritative. The shipped eight-persona set is kept as the default pack; any Flora-regenerated family replaces it **only after owner review of all eight together**.

## Current cast (exists — zero cost path)

`public/avatars/` holds 28 portraits; `VISITOR_AVATAR_NAMES` in `src/data/avatars.ts` names the canonical eight. Style = soft 3D clay/plasticine head-and-shoulders, mono background matched to outfit color, expressive friendly face.

| Persona | Asset | Cursor accent (`IDENTITY_COLORS`) | Distinctive read at 32px |
|---|---|---|---|
| juno | `/avatars/juno.png` | `#7C5CFF` violet | curly hair, glasses, violet set |
| momo | `/avatars/momo.png` | `#E63DA8` pink | pink bg/outfit |
| pico | `/avatars/pico.png` | `#FF7A3D` orange | beanie, mustache, orange set |
| wren | `/avatars/wren.png` | `#3D6EFF` blue | wavy hair, blue set |
| ziggy | `/avatars/ziggy.png` | `#13B8A6` teal | teal set |
| clover | `/avatars/clover.png` | `#C6F750` lime | lime set |
| pepper | `/avatars/pepper.png` | `#FFB020` amber | amber set |
| kiwi | `/avatars/kiwi.png` | `#FF3B5C` red | red set |

## Assignment rules (from spec, restated for handoff)

- Server assigns one persona once (idempotent/race-safe); user may re-pick in the screenshot-11 chooser; assignment survives devices/guest-upgrade; never remapped when art is added.
- Starter handles are neutral (Pippin/Nori/Sol/Tali/Sora/Zuri/Echo/Milo cleared later); display name editable; persona ≠ auth principal.
- Chooser: circles + lime selection ring, "that's you", Upload my photo (cropped/moderated), Reset, Save — all owner-scoped persistence.

## Cursor contract (no cursor redesign)

- Reuse the native OurSpaces cursor runtime (`src/live/*`, `MemberFace.tsx`): original pointer shape + **face chip + accent color** from the persona row above.
- Each persona ships a cursor face variant: 32/48/64px crops of the portrait (face-centered, upper-third eyes). Persona bg color = chip accent, so the chip reads without the portrait at small size.
- Preview cursor in settings shows *own* persona locally — never a fabricated peer.

## Export spec per persona

`persona-<name>.png` master ≥512² + 256/96 optimized + `persona-<name>-cursor-64.png` face chip; documented seed/prompt/model/run in `brand-proposals-e3/PROPOSAL.md`-style provenance; human review for likeness/stereotypes before any swap.

## If the owner elects regeneration/expansion (+2 slots for a 10-persona pack)

Two candidate personas must match the existing cast exactly: clay finish, centered head-shoulders, eyes upper-third, bg≈outfit monochrome, distinct accents (proposed `#8B5CF6`-adjacent violet-lilac family is taken — suggest deep **forest green** and **sky/cyan** variants to keep accent distinctness). Batch A in `FLORA_PROPOSAL.md` covers this as an optional line.
