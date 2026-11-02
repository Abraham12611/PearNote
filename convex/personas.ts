/**
 * The eight illustrated personas (design/IDENTITY_FRIENDS_GROUPS.md §2):
 * the original visitor set — juno, momo, pico, wren, ziggy, clover,
 * pepper, kiwi. Each carries the display name and the cursor accent the
 * account starts with; the face itself is `/avatars/<id>.png`.
 * Pure data — safe to import from client and server alike.
 */
export const PERSONAS = [
  { id: "juno", label: "Juno", accent: "#7853ff" },
  { id: "momo", label: "Momo", accent: "#ff7ab8" },
  { id: "pico", label: "Pico", accent: "#3ec97f" },
  { id: "wren", label: "Wren", accent: "#4aa3ff" },
  { id: "ziggy", label: "Ziggy", accent: "#ffb020" },
  { id: "clover", label: "Clover", accent: "#2fb8a6" },
  { id: "pepper", label: "Pepper", accent: "#ff5c48" },
  { id: "kiwi", label: "Kiwi", accent: "#8fd13f" },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

export const PERSONA_IDS: readonly string[] = PERSONAS.map((p) => p.id);

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id);

export const personaImagePath = (id: PersonaId) => `/avatars/${id}.png`;

/** Stable assignment: hash the user id → index. Deterministic, durable and
 * idempotent — the same account always lands on the same starter persona. */
export function defaultPersonaFor(userId: string): (typeof PERSONAS)[number] {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return PERSONAS[Math.abs(h) % PERSONAS.length];
}
