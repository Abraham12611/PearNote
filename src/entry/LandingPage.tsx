/* ------------------------------------------------------------------
 * The PearNotes public landing — Assignment E1.
 *
 * What a stranger sees at `/`: an original page for the product the
 * Blueprint describes — source-grounded spatial learning — not a door
 * dropped onto a workspace. "Get started" opens the deliberate-choice
 * modal; a returning registered visitor gets a straight path back to
 * their desk instead.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { navigate } from "./location";
import { SITE_PATHS } from "./paths";
import { GetStartedModal } from "./GetStartedModal";

const STEPS = [
  {
    n: "01",
    title: "bring a source",
    body: "a PDF, a chapter, pasted notes. Your material is the whole curriculum — nothing is invented.",
  },
  {
    n: "02",
    title: "review the proposal",
    body: "PearNotes suggests subjects and a path. Rename, split, merge — nothing learns itself without your say.",
  },
  {
    n: "03",
    title: "study on the canvas",
    body: "each lesson is a spatial board: source segments, challenges and teach-back, all pinned to your material.",
  },
  {
    n: "04",
    title: "show what you know",
    body: "mastery comes from graded evidence — never from clicks, and never quietly seeded.",
  },
] as const;

const PROMISES = [
  ["grounded", "every claim cites the segment it came from"],
  ["honest", "untracked progress says so — no fake bars"],
  ["yours", "your sources and attempts stay inside your account"],
] as const;

/** The right hero button for who's standing here (live builds only). */
function HeroCta({ onGetStarted }: { onGetStarted: () => void }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.currentUser, {});
  const joined = !isLoading && isAuthenticated && user?.isAnonymous === false;

  if (joined) {
    return (
      <button
        type="button"
        className="pn-cta entry-hero-cta"
        onClick={() => navigate(SITE_PATHS.appRoot)}
      >
        open your desk{user?.name ? `, ${user.name.split(" ")[0]}` : ""} →
      </button>
    );
  }
  return (
    <button type="button" className="pn-cta entry-hero-cta" onClick={onGetStarted}>
      get started →
    </button>
  );
}

export function LandingPage({ live }: { live: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <main className="entry-landing" data-entry-screen="landing">
      <header className="entry-top">
        <span className="entry-mark">
          <span aria-hidden="true">✳</span> PearNotes
        </span>
        <nav className="entry-top-nav">
          <a href="#how-it-works">how it works</a>
          <button type="button" onClick={() => navigate(SITE_PATHS.demoRoot)}>
            demo
          </button>
          <button type="button" onClick={() => navigate(SITE_PATHS.signIn)}>
            sign in
          </button>
          <button type="button" className="pn-cta" onClick={openModal}>
            get started
          </button>
        </nav>
      </header>

      <section className="entry-hero">
        <span className="pn-kicker">spatial learning, grounded in your sources</span>
        <h1>
          Your material becomes a place
          <br />
          you can learn in.
        </h1>
        <p className="entry-lede">
          Upload what you need to learn. PearNotes turns it into a versioned
          path of lessons on a canvas you can touch — every challenge traced
          back to the page it came from.
        </p>
        <div className="entry-actions">
          {live ? (
            <HeroCta onGetStarted={openModal} />
          ) : (
            <button type="button" className="pn-cta entry-hero-cta" onClick={openModal}>
              get started →
            </button>
          )}
          <button
            type="button"
            className="pn-cta-dark"
            onClick={() => navigate(SITE_PATHS.demoRoot)}
          >
            explore the demo
          </button>
        </div>
        <p className="entry-fine">
          the demo runs on labelled sample data — your account stays untouched
        </p>
      </section>

      <section className="entry-steps" id="how-it-works">
        {STEPS.map((step) => (
          <article key={step.n} className="entry-step">
            <span className="entry-step-n" aria-hidden="true">
              {step.n}
            </span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="entry-promises">
        {PROMISES.map(([word, line]) => (
          <p key={word}>
            <strong>{word}.</strong> {line}
          </p>
        ))}
      </section>

      <footer className="entry-footer">
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
