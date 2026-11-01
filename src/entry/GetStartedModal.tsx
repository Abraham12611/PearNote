/* ------------------------------------------------------------------
 * GetStartedModal — the deliberate-choice door (Assignment E1).
 *
 * Four real ways in, none silent: create an account, sign in, explore
 * the labelled demo, or leave an email for the shortlist. The shortlist
 * is the existing `waitlist.join` mutation — offered only when the
 * build actually has a backend, and honest when it doesn't.
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
      <p className="entry-shortlist-done">
        you&apos;re on the list — we&apos;ll write when accounts open wider.{" "}
        <button type="button" onClick={onDone}>
          close
        </button>
      </p>
    );
  }
  return (
    <form className="entry-shortlist" onSubmit={submit}>
      <label htmlFor="shortlist-email">join the shortlist</label>
      <div className="entry-shortlist-row">
        <input
          id="shortlist-email"
          type="email"
          required
          placeholder="you@somewhere.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="pn-cta-dark" disabled={busy}>
          {busy ? "saving…" : "save"}
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
      className="entry-modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="entry-modal-card">
        <span className="pn-kicker">start with PearNotes</span>
        <h2>pick a door</h2>
        <div className="entry-modal-options">
          <button
            type="button"
            className="pn-cta"
            onClick={() => go(SITE_PATHS.signUp)}
          >
            create your account
            <small>your own desk — empty until you add a source</small>
          </button>
          <button
            type="button"
            className="pn-cta-dark"
            onClick={() => go(SITE_PATHS.signIn)}
          >
            sign in
            <small>you&apos;ve been here before</small>
          </button>
          <button
            type="button"
            className="pn-cta-dark"
            onClick={() => go(SITE_PATHS.demoRoot)}
          >
            explore the demo
            <small>labelled sample data — no account touched</small>
          </button>
        </div>
        {live ? (
          <ShortlistForm onDone={onClose} />
        ) : (
          <p className="entry-fine">
            the shortlist opens on builds connected to the backend.
          </p>
        )}
        <button type="button" className="pn-close" onClick={onClose}>
          close
        </button>
      </div>
    </dialog>
  );
}
