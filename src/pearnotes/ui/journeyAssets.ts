/* ------------------------------------------------------------------
 * Journey asset registry — manifest for the Flora-generated sticker
 * pack (public/pearnotes/journey/stickers/) plus deterministic variant
 * picking so decorations rotate instead of going stale.
 *
 * Naming: sticker-<theme>-<slug>-<NN>.png — theme groups are what
 * callers choose from; variants within a theme rotate by seed.
 * ------------------------------------------------------------------ */

export type JourneyStickerTheme =
  | "encouragement"
  | "momentum"
  | "bio"
  | "study"
  | "reward";

export interface JourneyStickerAsset {
  /** stable registry name — what components/tests reference */
  name: string;
  /** file under /pearnotes/journey/stickers/ */
  file: string;
  theme: JourneyStickerTheme;
  /** one-line description for docs/audits (stickers are aria-hidden) */
  motif: string;
}

const DIR = "/pearnotes/journey/stickers";

/** The Phase-00 pack — ten Flora-generated die-cut stickers
 *  (project "PearNotes — Journey Asset Pack", Nano Banana 2.1).
 *  Prompts + licensing notes: docs/phase00/JOURNEY_ASSETS.md §provenance. */
export const JOURNEY_STICKERS: readonly JourneyStickerAsset[] = [
  { name: "you-got-this", file: "sticker-encouragement-you-got-this-01.png", theme: "encouragement", motif: "leaping pear, 'you got this!' banner" },
  { name: "small-steps", file: "sticker-encouragement-small-steps-01.png", theme: "encouragement", motif: "footsteps climbing to a smiling brain" },
  { name: "momentum-arrow", file: "sticker-momentum-arrow-01.png", theme: "momentum", motif: "upward arrow with speed lines" },
  { name: "cell-mascot", file: "sticker-bio-cell-mascot-01.png", theme: "bio", motif: "teal cell with nucleus face" },
  { name: "microscope", file: "sticker-bio-microscope-01.png", theme: "bio", motif: "microscope with sparkles" },
  { name: "dna-helix", file: "sticker-bio-dna-helix-01.png", theme: "bio", motif: "double-helix doodle" },
  { name: "sketchbook", file: "sticker-study-sketchbook-01.png", theme: "study", motif: "open sketchbook, rising doodles" },
  { name: "bright-idea", file: "sticker-study-bright-idea-01.png", theme: "study", motif: "lightbulb in a graduation cap" },
  { name: "nice-work", file: "sticker-reward-nice-work-01.png", theme: "reward", motif: "gold trophy with confetti" },
  { name: "checkpoint-medal", file: "sticker-reward-checkpoint-medal-01.png", theme: "reward", motif: "ribbon medal with checkmark" },
];

export function stickerUrl(asset: JourneyStickerAsset | string): string {
  const found = typeof asset === "string"
    ? JOURNEY_STICKERS.find((s) => s.name === asset)
    : asset;
  return `${DIR}/${found ? found.file : asset}`;
}

/** Deterministic rotation: same seed → same sticker. Pass lessonId,
 *  unitIndex or a date bucket so the wall varies without re-shuffling
 *  every render. */
export function pickSticker(
  theme: JourneyStickerTheme,
  seed: string | number,
): JourneyStickerAsset | undefined {
  const pool = JOURNEY_STICKERS.filter((s) => s.theme === theme);
  if (pool.length === 0) return undefined;
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return pool[Math.abs(hash) % pool.length];
}
