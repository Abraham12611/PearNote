/**
 * Widget gallery — fixture-only preview for the four learning widgets.
 *
 * `widget-board` arranges them like a real lesson canvas; the per-widget
 * scenes isolate states. Everything runs through `createFixturePort` —
 * deterministic, labelled, nothing persisted.
 */
import { useState } from "react";
import { ChallengeCard } from "../ChallengeCard";
import { LessonCardWidget } from "../LessonCardWidget";
import { SourceViewerWidget } from "../SourceViewerWidget";
import { TeachBackWidget } from "../TeachBackWidget";
import {
  createFixturePort,
  createFixtureRuntime,
  FIXTURE_CLASSIFY_SPEC,
  FIXTURE_ENVELOPES,
  FIXTURE_LESSON_CARD_SPEC,
  FIXTURE_MC_SPEC,
  FIXTURE_SEGMENTS,
  FIXTURE_TEACHBACK_SPEC,
  WIDGET_FIXTURE_LABEL,
} from "../fixtures";
import type { SourceRef } from "../types";
import { LessonBoard } from "../LessonBoard";

const HERO = "/pearnotes/learning/cells-hero-plant-vs-animal-01.png";
const CELL_STICKER = "/pearnotes/journey/stickers/sticker-bio-cell-mascot-01.png";
const MEDAL_STICKER = "/pearnotes/journey/stickers/sticker-reward-nice-work-01.png";

export type WidgetSceneId =
  | "widget-board"
  | "widget-challenge"
  | "widget-lesson"
  | "widget-source"
  | "widget-teachback"
  | "widget-live"
  | "widget-pending";

function Kicker({ children }: { children: string }) {
  return <span className="pn-kicker">{children}</span>;
}

export function WidgetGallery({ scene }: { scene: WidgetSceneId }) {
  // One port per mount; `?fail=1` makes the first submit error for the
  // error-keeps-answer demo.
  const [port] = useState(() =>
    createFixturePort({
      failNext: new URLSearchParams(window.location.search).get("fail") === "1",
      latencyMs: 350,
    }),
  );
  const [openRef, setOpenRef] = useState<SourceRef | null>(null);
  const onOpenSource = (ref: SourceRef) => setOpenRef(ref);

  const card = (
    <LessonCardWidget
      envelope={FIXTURE_ENVELOPES.lessonCard}
      spec={FIXTURE_LESSON_CARD_SPEC as never}
      port={port}
      fixtureLabel={WIDGET_FIXTURE_LABEL}
      heroImageUrl={HERO}
      heroImageAlt="cartoon plant cell and animal cell side by side"
      onOpenSource={onOpenSource}
    />
  );
  const challenge = (
    <ChallengeCard
      envelope={FIXTURE_ENVELOPES.classify}
      spec={FIXTURE_CLASSIFY_SPEC}
      port={port}
      fixtureLabel={WIDGET_FIXTURE_LABEL}
      onOpenSource={onOpenSource}
    />
  );
  const mcChallenge = (
    <ChallengeCard
      envelope={FIXTURE_ENVELOPES.multipleChoice}
      spec={FIXTURE_MC_SPEC}
      port={port}
      fixtureLabel={WIDGET_FIXTURE_LABEL}
      onOpenSource={onOpenSource}
    />
  );
  const teachback = (
    <TeachBackWidget
      envelope={FIXTURE_ENVELOPES.teachBack}
      spec={FIXTURE_TEACHBACK_SPEC as never}
      port={port}
      fixtureLabel={WIDGET_FIXTURE_LABEL}
      onOpenSource={onOpenSource}
    />
  );
  const source = (
    <SourceViewerWidget
      sourceRef={{
        sourceId: "fixture-src-cells-excerpt",
        segmentId: FIXTURE_SEGMENTS[1].segmentId,
        page: 1,
      }}
      port={port}
      fixtureLabel={WIDGET_FIXTURE_LABEL}
      onOpenDocument={(id, page) => alert(`[fixture] open document ${id} p.${page}`)}
      onBack={() => setOpenRef(null)}
    />
  );

  if (scene === "widget-challenge") {
    return (
      <div className="pnlw-stage">
        <div className="pnlw-stage-head">
          <Kicker>widget · challenge — classify</Kicker>
          <p>drag, tap-tap, or keyboard (focus chip → enter → focus tray → enter). submit sorts a typed attempt; fixture grader marks it.</p>
        </div>
        <div className="pnlw-single">{challenge}</div>
        <div className="pnlw-single pnlw-single-narrow">{mcChallenge}</div>
      </div>
    );
  }

  if (scene === "widget-lesson") {
    return (
      <div className="pnlw-stage">
        <div className="pnlw-stage-head">
          <Kicker>widget · lesson card</Kicker>
          <p>select body text to get an “ask about this” action; “read it bigger” opens a focus-trapped reader; citations open the source viewer.</p>
        </div>
        <div className="pnlw-single">{card}</div>
        {openRef && (
          <div className="pnlw-single pnlw-single-narrow">
            <SourceViewerWidget sourceRef={openRef} port={port} fixtureLabel={WIDGET_FIXTURE_LABEL} onBack={() => setOpenRef(null)} />
          </div>
        )}
      </div>
    );
  }

  if (scene === "widget-source") {
    const statuses = ["missing", "forbidden", "deleted"] as const;
    return (
      <div className="pnlw-stage">
        <div className="pnlw-stage-head">
          <Kicker>widget · source viewer — all states</Kicker>
          <p>literal excerpts only; missing/forbidden/deleted each render an honest state — no invented quotes.</p>
        </div>
        <div className="pnlw-grid">
          {source}
          {statuses.map((status) => (
            <SourceViewerWidget
              key={status}
              sourceRef={{
                sourceId: "fixture-src-cells-excerpt",
                segmentId: `fixture-seg-${status}`,
                page: 2,
              }}
              port={createFixturePort({
                latencyMs: 250,
                segmentStatusOverrides: { [`fixture-seg-${status}`]: status },
              })}
              fixtureLabel={WIDGET_FIXTURE_LABEL}
            />
          ))}
        </div>
      </div>
    );
  }

  if (scene === "widget-teachback") {
    return (
      <div className="pnlw-stage">
        <div className="pnlw-stage-head">
          <Kicker>widget · teach-back</Kicker>
          <p>type ≥40 chars, submit → rubric coverage + missing pieces. fluency ≠ pass; fixture feedback is labelled.</p>
        </div>
        <div className="pnlw-single pnlw-single-narrow">{teachback}</div>
      </div>
    );
  }

  /* widget-live — the SAME LessonBoard the live runtime mounts, fed by the
     fixture runtime. `?ghost=1` seeds a proposed practice ghost. */
  if (scene === "widget-live" || scene === "widget-pending") {
    return <LiveBoardDemo pending={scene === "widget-pending"} />;
  }

  /* widget-board — all four on a spatial lesson board */
  return (
    <div className="pnlw-board-wrap">
      <div className="pnlw-board-head">
        <Kicker>lesson board · plant vs animal cells</Kicker>
        <h1>sort the cell kit</h1>
        <p>
          fixture lesson rendered from validated specs — citation chips open the
          source excerpt inline. drag chips into trays, or keyboard: focus chip →
          enter picks up → tab to tray → enter drops.
        </p>
      </div>

      <div className="pnlw-board">
        <img className="pnlw-board-sticker pnlw-bs-1" src={CELL_STICKER} alt="" aria-hidden="true" />
        <img className="pnlw-board-sticker pnlw-bs-2" src={MEDAL_STICKER} alt="" aria-hidden="true" />

        <span className="pnlw-board-zone" style={{ top: "4%", left: "3%" }} aria-hidden="true">
          orient
        </span>
        <span className="pnlw-board-zone" style={{ top: "4%", left: "54%" }} aria-hidden="true">
          practice
        </span>
        <span className="pnlw-board-zone" style={{ top: "58%", left: "3%" }} aria-hidden="true">
          explain
        </span>
        <span className="pnlw-board-zone" style={{ top: "58%", left: "54%" }} aria-hidden="true">
          source
        </span>

        <div className="pnlw-slot pnlw-slot-card">{card}</div>
        <div className="pnlw-slot pnlw-slot-challenge">{challenge}</div>
        <div className="pnlw-slot pnlw-slot-teach">{teachback}</div>
        <div className="pnlw-slot pnlw-slot-source">
          {openRef ? (
            <SourceViewerWidget
              sourceRef={openRef}
              port={port}
              fixtureLabel={WIDGET_FIXTURE_LABEL}
              onBack={() => setOpenRef(null)}
            />
          ) : (
            <div className="pnlw pnlw-source-hint">
              <Kicker>source excerpt</Kicker>
              <p>tap a “source · p.N ↗” chip on any card to pin the literal excerpt here.</p>
              <button
                type="button"
                className="pnlw-btn"
                onClick={() =>
                  setOpenRef({
                    sourceId: "fixture-src-cells-excerpt",
                    segmentId: FIXTURE_SEGMENTS[1].segmentId,
                    page: 1,
                  })
                }
              >
                show p.1 excerpt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fixture-twin of the live board: identical props, deterministic port. */
function LiveBoardDemo({ pending }: { pending: boolean }) {
  const [rt] = useState(() =>
    createFixtureRuntime({
      withProposal: new URLSearchParams(window.location.search).get("ghost") === "1",
    }),
  );
  const [, setTick] = useState(0);
  if (pending) rt.lesson.activities = [];

  return (
    <div className="pnlw-stage">
      <div className="pnlw-stage-head">
        <Kicker>widgets · live board contract (fixture twin)</Kicker>
        <p>
          exactly what <code>LiveLessonBoard</code> renders — same props, fixture
          port. two wrong sorts → a practice ghost appears (demo:
          ?ghost=1); accepting it materializes a real activity card.
        </p>
      </div>
      <LessonBoard
        lesson={rt.lesson}
        port={rt.port}
        practice={rt.proposals}
        fixtureLabel={WIDGET_FIXTURE_LABEL}
        onReviewPractice={async (id, action) => {
          await rt.port.reviewPractice?.(id, action);
          setTick((t) => t + 1);
        }}
      />
    </div>
  );
}
