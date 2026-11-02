/* ------------------------------------------------------------------
 * The PearNotes public landing — Issue #63.
 *
 * An ADAPTATION of the original OurSpaces editorial page
 * (src/pages/About.tsx) — same layout grammar: brand bar, hero copy
 * beside an illustrated board collage, native black/text buttons,
 * section headings with a leaning subtitle, three "way" cards and a
 * room-coloured footer strip. `about-*` classes are reused on purpose
 * so the page stays in the original material family; only the words
 * and the board's payload are PearNotes.
 *
 * Copy tells the real loop: source upload → approved learning path →
 * interactive lesson → evidence-based progress. Nothing signs the
 * visitor in.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { navigate } from "./location";
import { SITE_PATHS } from "./paths";
import { GetStartedModal } from "./GetStartedModal";

/* The steps the page explains — the actual product loop, in order. */
const WAYS = [
  {
    mark: "↗",
    color: "var(--color-couple)",
    title: "Upload what you need to learn.",
    body: "A PDF, a chapter, pasted notes. Your source is the whole curriculum — PearNotes never invents one.",
    note: "the upload, the paste, the page",
  },
  {
    mark: "✳",
    color: "var(--color-crew)",
    title: "Approve the path it proposes.",
    body: "You review suggested subjects, sections and lessons — rename, split, merge — before anything becomes your curriculum.",
    note: "your call, every time",
  },
  {
    mark: "◔",
    color: "var(--color-trip)",
    title: "Study it on a living canvas.",
    body: "Each lesson is a board: source segments, challenges and teach-back pinned where your hands can reach them.",
    note: "the lesson, the source, the board",
  },
  {
    mark: "✓",
    color: "var(--color-couple)",
    title: "Show proof, not clicks.",
    body: "Progress comes from graded evidence against your material — and untracked means untracked, never a fake bar.",
    note: "evidence you can open",
  },
] as const;

/* Hero collage — the About board preview's grammar (frame, labelled
   board, photo, note, sticker) carrying PearNotes' payload: a lesson
   board mid-study. Illustrative, like the original birthday board. */
function LessonBoardPreview() {
  return (
    <div className="about-preview" aria-hidden="true">
      <div className="about-board-frame">
        <div className="about-board entry-lesson-board">
          <span className="about-board-label">
            your first lesson <span>✳</span>
          </span>
          <div className="entry-board-source about-note">
            <strong>your source</strong>
            <span>page 14 — highlighted</span>
          </div>
          <figure className="about-photo entry-board-photo">
            <img src="/assets/stickers/ours.png" alt="" />
          </figure>
          <div className="about-preview-poll entry-board-path">
            <span className="entry-path-node" />
            <span className="entry-path-node" />
            <span className="entry-path-node is-next" />
          </div>
          <img
            className="about-cake"
            src="/assets/stickers/glad-ur-here.png"
            alt=""
          />
          <span className="about-board-tag">a lesson worth keeping.</span>
        </div>
      </div>
    </div>
  );
}

/** The right hero button for who's standing here (live builds only). */
function HeroCta({ onGetStarted }: { onGetStarted: () => void }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.currentUser, {});
  const joined = !isLoading && isAuthenticated && user?.isAnonymous === false;

  if (joined) {
    return (
      <button
        type="button"
        className="about-button"
        onClick={() => navigate(SITE_PATHS.appRoot)}
      >
        open your desk{user?.name ? `, ${user.name.split(" ")[0]}` : ""} <span>↗</span>
      </button>
    );
  }
  return (
    <button type="button" className="about-button" onClick={onGetStarted}>
      get started <span>↗</span>
    </button>
  );
}

export function LandingPage({ live }: { live: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <main className="about-page entry-landing" data-entry-screen="landing">
      <nav className="about-bar about-wrap">
        <button
          type="button"
          className="about-brand entry-brand"
          onClick={() => navigate(SITE_PATHS.landing)}
        >
          <img src="/assets/pearnotes-mark.svg" alt="" /> PearNotes
        </button>
        <button
          type="button"
          className="about-back entry-back-link"
          onClick={() => navigate(SITE_PATHS.demoRoot)}
        >
          <span>↗</span> explore the demo
        </button>
      </nav>

      <header className="about-hero about-wrap">
        <div className="about-hero-copy">
          <p className="about-intro">learn from your own sources.</p>
          <p className="about-lede">
            PearNotes turns the material you upload into a learning path
            on a spatial canvas — and keeps every claim pinned to the
            page it came from.
          </p>
          <div className="about-hero-actions">
            {live ? (
              <HeroCta onGetStarted={openModal} />
            ) : (
              <button type="button" className="about-button" onClick={openModal}>
                get started <span>↗</span>
              </button>
            )}
            <button
              type="button"
              className="about-text-button"
              onClick={() => navigate(SITE_PATHS.demoRoot)}
            >
              see the demo <span>↓</span>
            </button>
          </div>
          <p className="about-invitation">
            Upload. Approve the path. Study the board. Show the proof.
          </p>
        </div>
        <LessonBoardPreview />
      </header>

      <section className="about-how about-wrap">
        <div className="about-how-heading">
          <h2>
            How a source
            <br />
            becomes a skill.
          </h2>
          <p>
            Four moves, all yours.
            <br />
            Nothing is seeded, nothing is faked.
          </p>
        </div>
        <div className="about-ways">
          {WAYS.map((way) => (
            <div key={way.title} className="about-way">
              <span
                className="about-way-mark"
                style={{ "--way-color": way.color } as React.CSSProperties}
              >
                {way.mark}
              </span>
              <div>
                <h3>{way.title}</h3>
                <p>{way.body}</p>
                <span className="about-way-note">{way.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-made about-wrap">
        <div className="about-section-heading">
          <h2>
            Yours,
            <br />
            not ours.
          </h2>
          <p>
            Sources, attempts and progress stay inside your account —
            grounded, private and honestly reported.
          </p>
        </div>
        <div className="entry-promises">
          <span className="entry-promise">every claim cites a segment</span>
          <span className="entry-promise">untracked says so</span>
          <span className="entry-promise">your data stays yours</span>
        </div>
      </section>

      <footer className="entry-about-footer about-wrap">
        <p>
          PearNotes grows out of the MIT-licensed{" "}
          <a href="https://ourspaces.io" rel="noreferrer">
            OurSpaces
          </a>{" "}
          canvas — © Thomas Nguyen, full attribution in the repo&apos;s
          LICENSE.
        </p>
      </footer>

      <GetStartedModal
        open={modalOpen}
        live={live}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}
