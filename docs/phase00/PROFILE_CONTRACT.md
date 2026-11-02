# Profile / persona contract — E2 handoff (Issue #66)

Backend surface (`convex/profiles.ts`, `convex/personas.ts`). All typed,
owner-derived identity — no userId args for writes.

## Functions

| Function | Kind | Returns | Notes |
|---|---|---|---|
| `profiles.getMine` | query | `{userId, personaId?, name?, image?, color?, email?, isAnonymous, initialized} \| null` | Self only. `initialized=false` → show persona chooser. |
| `profiles.initialize` | mutation | same profile shape | Idempotent one-time assignment (deterministic persona from userId hash). Safe to call on every sign-in — repeats replay, never re-roll. Two racing callbacks converge. |
| `profiles.update` | mutation | same profile shape | `{name?, image?, personaId?, color?}` whitelist. personaId must be a catalog id → pulls matching accent unless explicit `color`. Empty/41+ char name, unknown persona, non-hex color → `INVALID_INPUT`. |
| `profiles.getDisplay` | query | `[{userId, personaId?, name?, image?, color?}]` ≤20 ids | **Display-safe only** — no email/isAnonymous/study fields. For people capsule/member faces. Signed-in required. |

## Personas

`convex/personas.ts` exports `PERSONAS` (8): `juno, momo, pico, wren, ziggy,
clover, pepper, kiwi` — each `{id, label, accent}`. Face asset:
`/avatars/<id>.png`. `personaImagePath(id)`, `personaById(id)`,
`defaultPersonaFor(userId)` are pure helpers, importable client-side.

## Semantics for E2's Profile page + people capsule

- **First-run:** call `initialize` once post-auth (idempotent — cheap to
  call on every load). `initialized` flips true; `name`, `image`, `color`,
  `personaId` all populated.
- **Chooser UI:** render the 8 personas from `PERSONAS`; `update({personaId})`
  swaps face + cursor accent in one write (propagates to rooms on next
  reactive read — cursor = `color` + `name` chip as in the original).
- **Capsule:** `getDisplay(userIds)` — the ONLY cross-user read; renders
  name+face+accent. Never shows email or private study data.
- **Registered vs guest:** `isAnonymous` distinguishes; guests can hold a
  persona too (it survives the join upgrade — same users row).
- Learning data is never part of this API — attempts/mastery stay in the
  learning surface.
