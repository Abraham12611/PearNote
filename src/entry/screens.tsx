/* ------------------------------------------------------------------
 * Shared entry screens — loading slips and recovery pages (E1).
 * Paper-and-ink voice matches the PearNotes chrome (pn-* classes).
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { navigate } from "./location";

/** Full-screen slip while a lazy route or the session check resolves. */
export function EntrySlip({ label }: { label: string }) {
  return (
    <main className="entry-scaffold" data-entry-screen="slip">
      <p className="entry-slip">
        <span className="entry-slip-dot" aria-hidden="true" />
        {label}…
      </p>
    </main>
  );
}

function RecoveryScaffold({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="entry-scaffold" data-entry-screen="recovery">
      <div className="entry-recovery">
        <span className="pn-kicker">{kicker}</span>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Unknown pathname — every way back is a real, deliberate choice. */
export function SiteNotFound({ pathname }: { pathname: string }) {
  return (
    <RecoveryScaffold kicker="lost page" title="that page isn't on the wall">
      <p className="entry-lede">
        <code>{pathname}</code> doesn&apos;t match anything in PearNotes.
      </p>
      <div className="entry-actions">
        <button type="button" className="pn-cta" onClick={() => navigate("/")}>
          back home →
        </button>
        <button
          type="button"
          className="pn-cta-dark"
          onClick={() => navigate("/demo")}
        >
          see the demo
        </button>
      </div>
    </RecoveryScaffold>
  );
}

/**
 * `/app` with no session at all. Not a silent redirect — a clear door:
 * sign in, create the account, or keep exploring the demo. A deliberate
 * "continue as guest" preserves the walk-in product (guest = a real,
 * isolated anonymous account — never seeded).
 */
export function AccountRequired({
  onGuest,
  guestBusy,
}: {
  onGuest: () => void;
  guestBusy: boolean;
}) {
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  return (
    <RecoveryScaffold kicker="locked door" title="this desk is private">
      <p className="entry-lede">
        Your subjects, sources and progress only exist for your own
        account. Pick a door:
      </p>
      <div className="entry-actions">
        <button
          type="button"
          className="pn-cta"
          onClick={() => navigate(`/auth/sign-in?next=${next}`)}
        >
          sign in →
        </button>
        <button
          type="button"
          className="pn-cta"
          onClick={() => navigate(`/auth/sign-up?next=${next}`)}
        >
          create your account
        </button>
        <button
          type="button"
          className="pn-cta-dark"
          onClick={onGuest}
          disabled={guestBusy}
        >
          {guestBusy ? "opening…" : "keep exploring as a guest"}
        </button>
      </div>
      <p className="entry-fine">
        Guests get their own empty desk — nothing is shared, nothing is
        faked. You can turn a guest into an account later without losing
        anything.
      </p>
    </RecoveryScaffold>
  );
}

/** Auth pages on a build with no Convex URL — honest, not a broken form. */
export function BackendMissing() {
  return (
    <div className="entry-recovery entry-inline-note">
      <p className="entry-lede">
        This build isn&apos;t connected to a PearNotes backend, so sign-in
        can&apos;t run here. Set <code>VITE_CONVEX_URL</code> for the
        isolated deployment — see <code>.env.example</code>.
      </p>
    </div>
  );
}

/** Shown where Engineer 2's `PearNotesAppRoutes` would mount until their
 *  PR lands on this branch — an honest hold, never faked app content. */
export function AppShellPending() {
  return (
    <RecoveryScaffold kicker="coming together" title="your desk is being connected">
      <p className="entry-lede">
        The learning app shell lands with the shell-navigation merge. This
        route is already wired — it will open on its own once that ships.
      </p>
      <div className="entry-actions">
        <button type="button" className="pn-cta" onClick={() => navigate("/")}>
          back home →
        </button>
        <button
          type="button"
          className="pn-cta-dark"
          onClick={() => navigate("/demo")}
        >
          see the demo
        </button>
      </div>
    </RecoveryScaffold>
  );
}
