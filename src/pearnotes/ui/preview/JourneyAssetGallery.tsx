import { JourneyNode } from "../JourneyNode";
import { JourneyDoodle, JourneyNote, JourneySticker } from "../JourneySticker";
import { JOURNEY_STICKERS } from "../journeyAssets";

/* ------------------------------------------------------------------
 * Journey asset pack gallery — every node state × kind plus the full
 * generated sticker set, on the real ink wall. Fixture-only scene:
 * no account data involved, ever.
 * ------------------------------------------------------------------ */

const STATES: {
  label: string;
  props: Parameters<typeof JourneyNode>[0];
}[] = [
  { label: "lesson · default", props: { state: "available", order: 2, label: "Diffusion and osmosis — ready to start" } },
  { label: "lesson · next", props: { state: "available", order: 3, recommended: true, label: "Active transport — next recommended" } },
  { label: "lesson · current", props: { state: "in_progress", progress: 0.45, recommended: true, label: "Diffusion and osmosis — in progress" } },
  { label: "lesson · done", props: { state: "demonstrated", hue: "var(--pn-subject-biology)", label: "The lipid bilayer — demonstrated" } },
  { label: "lesson · review", props: { state: "needs_review", label: "Transport proteins — needs review" } },
  { label: "lesson · locked", props: { state: "locked", label: "Unit 1 quiz — locked", disabled: true } },
  { label: "practice node", props: { kind: "practice", state: "available", label: "Practice — diffusion vs active transport" } },
  { label: "practice · branch", props: { kind: "practice", state: "available", remedial: true, label: "Remedial practice" } },
  { label: "checkpoint node", props: { kind: "checkpoint", state: "available", label: "Unit 1 checkpoint quiz" } },
  { label: "checkpoint · done", props: { kind: "checkpoint", state: "demonstrated", hue: "#6d5acd", label: "Checkpoint — demonstrated" } },
  { label: "loading", props: { loading: true, label: "lesson loading" } },
  { label: "disabled", props: { state: "available", order: 4, disabled: true, label: "not reachable" } },
];

const TRAIL: Parameters<typeof JourneyNode>[0][] = [
  { state: "demonstrated", hue: "var(--pn-subject-biology)", label: "The lipid bilayer — demonstrated" },
  { state: "in_progress", progress: 0.45, recommended: true, label: "Diffusion and osmosis — in progress" },
  { state: "available", order: 3, label: "Active transport — ready to start" },
  { kind: "practice", state: "available", label: "Practice" },
  { kind: "checkpoint", state: "locked", label: "Checkpoint — locked", disabled: true },
];

export function JourneyAssetGallery() {
  return (
    <div className="pnh-assets">
      <span className="pn-fixture-tag">prototype fixture</span>
      <header className="pnh-assets-head">
        <span className="pn-kicker">journey asset pack</span>
        <h1 className="pnh-assets-title">tactile nodes &amp; sticker shelf</h1>
        <p className="pnh-assets-sub">
          SVG + CSS only for nodes — hover, press, reduced-motion and
          every state/kind. Stickers are Flora-generated die-cuts, decor
          only.
        </p>
      </header>

      <section className="pnh-assets-block" aria-label="Node state matrix">
        <h2 className="pn-kicker">node states</h2>
        <div className="pnh-node-grid">
          {STATES.map((item) => (
            <figure key={item.label} className="pnh-node-cell">
              <JourneyNode size="lg" {...item.props} />
              <figcaption>{item.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pnh-assets-block" aria-label="Compact row sizes">
        <h2 className="pn-kicker">compact + trail sizes</h2>
        <div className="pnh-trail-demo">
          {TRAIL.map((node, i) => (
            <div key={i} className="pnh-trail-step" style={{ left: `${10 + i * 18}%`, top: `${[30, 10, 30, 55, 30][i]}%` }}>
              <JourneyNode size="md" {...node} />
            </div>
          ))}
          <svg className="pnh-trail-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M14 50 C 24 40, 24 20, 28 25 C 34 32, 40 45, 46 50 C 52 56, 58 60, 64 68 C 70 76, 76 60, 82 55" />
          </svg>
        </div>
        <div className="pnh-size-row">
          <figure className="pnh-node-cell"><JourneyNode size="sm" state="available" order={2} label="compact node" /><figcaption>sm · compact row</figcaption></figure>
          <figure className="pnh-node-cell"><JourneyNode size="md" state="available" order={2} label="map node" /><figcaption>md · map</figcaption></figure>
          <figure className="pnh-node-cell"><JourneyNode size="lg" state="available" order={2} label="hero node" /><figcaption>lg · hero</figcaption></figure>
        </div>
      </section>

      <section className="pnh-assets-block" aria-label="Generated sticker pack">
        <h2 className="pn-kicker">generated stickers · flora</h2>
        <div className="pnh-sticker-wall">
          {JOURNEY_STICKERS.map((s, i) => (
            <figure key={s.name} className="pnh-node-cell">
              <JourneySticker name={s.name} size={120} rotate={[-4, 3, -2, 5, -3][i % 5]} />
              <figcaption>{s.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pnh-assets-block" aria-label="Doodles and notes">
        <h2 className="pn-kicker">doodles &amp; notes</h2>
        <div className="pnh-doodle-row">
          <JourneyDoodle kind="squiggle" />
          <JourneyDoodle kind="arrow" rotate={-8} />
          <JourneyDoodle kind="sparkle" />
          <JourneyDoodle kind="tape" rotate={-4} />
          <JourneyNote rotate={-2}>nice work!</JourneyNote>
          <JourneyNote tone="lime" rotate={2}>jump in!</JourneyNote>
          <JourneyNote rotate={-4}>small steps, big brains</JourneyNote>
        </div>
      </section>
    </div>
  );
}
