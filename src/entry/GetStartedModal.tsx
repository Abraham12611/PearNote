/* ------------------------------------------------------------------
 * GetStartedModal — Issue #63.
 *
 * An ADAPTATION of the original OurSpaces split editorial dialog —
 * the `demo-waitlist` shell from components/DemoBanner.tsx:
 * illustrated poster on the left (brand, collage, caption), heading +
 * choices on the right, native close. Same classes on purpose; only
 * the caption and the body are PearNotes.
 *
 * Three real ways in, none silent: create an account, sign in, or
 * explore the labelled demo. Waitlist/shortlist enrollment is a
 * separate surface — registration and enrollment never share a dialog
 * (review on #70).
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";
import { navigate } from "./location";
import { SITE_PATHS } from "./paths";

export function GetStartedModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <dialog
      ref={dialog}
      className="demo-waitlist entry-get-started"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="demo-waitlist-layout">
        <div className="demo-poster" aria-hidden="true">
          <div className="demo-poster-brand">
            <img src="/assets/pearnotes-mark.svg" alt="" />
            <span>PearNotes</span>
          </div>
          <div className="demo-poster-collage">
            <div className="demo-poster-paper" />
            <figure className="demo-poster-photo">
              <img src="/assets/stickers/moon-sparkle.png" alt="" />
            </figure>
            <img
              className="demo-poster-sticker"
              src="/assets/stickers/sparkle-burst.png"
              alt=""
            />
          </div>
          <div className="demo-poster-caption">
            <strong>
              Your sources.
              <br />
              Your path.
            </strong>
            <span>A little corner of the syllabus, together.</span>
          </div>
        </div>

        <div className="demo-waitlist-content">
          <div className="demo-waitlist-topline">
            <span className="demo-waitlist-eyebrow">get started</span>
            <button
              className="demo-waitlist-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="demo-waitlist-body entry-door-list">
            <h2>
              make a place
              <br />
              <em>to learn.</em>
            </h2>
            <button
              type="button"
              className="demo-waitlist-submit"
              onClick={() => go(SITE_PATHS.signUp)}
              data-testid="entry-signup"
            >
              create your account <span>↗</span>
            </button>
            <button
              type="button"
              className="demo-waitlist-submit is-quiet"
              onClick={() => go(SITE_PATHS.signIn)}
              data-testid="entry-signin"
            >
              sign in <span>↗</span>
            </button>
            <button
              type="button"
              className="demo-waitlist-submit is-quiet"
              onClick={() => go(SITE_PATHS.demoRoot)}
              data-testid="entry-demo"
            >
              explore the demo <span>↗</span>
            </button>
            <p className="entry-door-note">
              the demo runs on labelled sample data — no account touched
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
