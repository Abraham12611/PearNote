/* ------------------------------------------------------------------
 * GetStartedModal — Issue #63.
 *
 * An ADAPTATION of the original OurSpaces split editorial dialog —
 * the `demo-waitlist` shell from components/DemoBanner.tsx:
 * illustrated poster on the left (brand, collage, caption), heading +
 * choices on the right, native close. Same classes on purpose; only
 * the caption and the body are PearNotes.
 *
 * Four real ways in, none silent: create an account, sign in, explore
 * the labelled demo, or leave an email for the shortlist (the existing
 * `waitlist.join` mutation, offered only when the build has a backend).
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { navigate } from "./location";
import { SITE_PATHS } from "./paths";

function ShortlistForm({ onDone }: { onDone: () => void }) {
  const join = useMutation(api.waitlist.join);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await join({ email: email.trim() });
      setSaved(true);
    } catch {
      setError("couldn't save that email — check it and try again?");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <p className="demo-waitlist-body" data-testid="entry-shortlist-done">
        <strong>you&apos;re on the list.</strong>
        <span>we&apos;ll write when accounts open wider.</span>
        <button type="button" className="demo-waitlist-submit" onClick={onDone}>
          close <span>↗</span>
        </button>
      </p>
    );
  }
  return (
    <form className="demo-waitlist-body" onSubmit={submit}>
      <h2>or join the shortlist</h2>
      <p>leave an email — we&apos;ll tell you when your desk opens.</p>
      <div className="entry-shortlist-row">
        <input
          aria-label="email for the shortlist"
          type="email"
          required
          placeholder="you@somewhere.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="demo-waitlist-submit" disabled={busy}>
          {busy ? "saving…" : "save ↗"}
        </button>
      </div>
      {error ? <p className="entry-error">{error}</p> : null}
    </form>
  );
}

export function GetStartedModal({
  open,
  live,
  onClose,
}: {
  open: boolean;
  live: boolean;
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
              <img src="/assets/stickers/ours.png" alt="" />
            </figure>
            <img
              className="demo-poster-sticker"
              src="/assets/stickers/glad-ur-here.png"
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
            <h2>pick a door</h2>
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

          {live ? (
            <ShortlistForm onDone={onClose} />
          ) : (
            <p className="entry-door-note">
              the shortlist opens on builds connected to the backend.
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
