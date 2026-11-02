/* ------------------------------------------------------------------
 * ShelfDesk — the /app achievements "shelf", adapted from
 * `/#/space/crew/knows` (#64c).
 *
 * Same paper grammar as HomeDesk/LibraryDesk: `.knows-sheet` panels,
 * `.knows-sec` sections, `.knows-empty` + `.knows-hints` for every
 * deferred/honest state. There is no backend achievements contract
 * yet — the shelf therefore shows truthful empty states with what a
 * real demonstration would have to earn, never fabricated badges,
 * counts or streaks.
 * ------------------------------------------------------------------ */

import type { CSSProperties } from "react";
import "../../../components/room-knows.css";
import "./home-desk.css";

/* What a sticker would have to be earned by — the honest hint set,
   matching the real activity kinds on the lesson canvas. */
const EARNED_BY = ["a challenge", "a teach-back", "a checkpoint", "a practice set"];

export function ShelfDesk({
  learnerName,
  onLearn,
}: {
  learnerName: string;
  onLearn: () => void;
}) {
  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="shelf-desk">
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">{learnerName} · the trophy shelf</p>
            <h1>earned marks</h1>
            <p className="knows-sub">
              Stickers land here when a real demonstration earns them — the
              shelf reads evidence, never participation.
            </p>
            <div className="pna-desk-ctas">
              <button type="button" className="pn-cta" onClick={onLearn}>
                go learn →
              </button>
            </div>
          </div>
        </header>

        <div className="knows-sheets">
          <div className="knows-sheet is-b pna-shelf-sheet">
            <section className="knows-sec" data-testid="shelf-earned">
              <h2>your stickers</h2>
              <div className="knows-empty" role="status">
                <h2>the shelf is empty</h2>
                <p>
                  nothing has been earned yet — when a demonstration lands on
                  a real path, its sticker lands here too. No counts, no
                  streaks, no fake badges.
                </p>
                <span className="knows-hints" aria-hidden="true">
                  {EARNED_BY.map((h, k) => (
                    <i key={h} style={{ "--i": k } as CSSProperties}>{h}</i>
                  ))}
                </span>
                <button type="button" className="pn-cta" onClick={onLearn}>
                  start a lesson →
                </button>
              </div>
            </section>
          </div>
        </div>

        <p className="knows-foot" data-testid="shelf-honest">
          Marks come only from verified demonstrations — the shelf keeps
          nothing you didn't earn.
        </p>
      </div>
    </div>
  );
}
