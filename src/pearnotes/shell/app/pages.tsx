/* ------------------------------------------------------------------
 * /app pages — the sitemap views the rail routes to (Issue #54).
 *
 * Honesty contract: a view renders real owner-scoped data where a Convex
 * read exists today (Library → `sources.listMine`), and a functional
 * empty state where it doesn't (Groups, Achievements, Settings). Nothing
 * here fabricates content, progress or seeded rows — deferred features
 * say so plainly instead of wearing placeholder data.
 * ------------------------------------------------------------------ */
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/* ---- shared scaffold ------------------------------------------------ */

export function PageScaffold({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="pna-page" aria-label={title}>
      <p className="pn-kicker">{kicker}</p>
      <h1 className="pna-page-title">{title}</h1>
      {lede && <p className="pna-page-lede">{lede}</p>}
      {children}
    </section>
  );
}

export function LoadingSlip({ label }: { label: string }) {
  return (
    <section className="pna-page" aria-label={label}>
      <p className="pn-kicker">{label}</p>
      <div className="pn-slip" role="status">
        <strong>pinning things up…</strong>
        <span>checking who's at this desk and what's on the wall.</span>
      </div>
    </section>
  );
}

export function UnauthorizedPage() {
  return (
    <PageScaffold
      kicker="locked door"
      title="this desk is private"
      lede="sign in first — your subjects, sources and progress only exist for your own account."
    />
  );
}

export function NotFoundPage({
  path,
  onHome,
}: {
  path: string;
  onHome: () => void;
}) {
  return (
    <PageScaffold kicker="lost page" title="that page isn't on the wall">
      <p className="pna-page-lede">
        <code>{path}</code> doesn't match anything in PearNotes.
      </p>
      <button type="button" className="pn-cta" onClick={onHome}>
        back to the desk →
      </button>
    </PageScaffold>
  );
}

/* ---- library --------------------------------------------------------- */

/* ---- deferred-but-honest pages --------------------------------------- */

export function GroupsPage({ onOpenSpaces }: { onOpenSpaces: () => void }) {
  return (
    <PageScaffold
      kicker="groups"
      title="study together"
      lede="PearNotes group rooms are still being built. For now, shared spatial rooms live in the OurSpaces side of the app."
    >
      <div className="pna-empty">
        <strong>no PearNotes groups yet</strong>
        <p>
          when group spaces land you'll create or join them here — your
          private subjects and sources stay yours unless you explicitly
          share them.
        </p>
      </div>
      <button type="button" className="pn-cta" onClick={onOpenSpaces}>
        open shared spaces ↗
      </button>
    </PageScaffold>
  );
}

/** Real account row — `api.auth.currentUser` (ACCOUNT_SESSION_CONTRACT
 *  §1): `isAnonymous` is the only honest guest discriminator. */
function LiveProfile({ learnerName }: { learnerName?: string }) {
  const me = useQuery(api.auth.currentUser, {});
  if (me === undefined) {
    return (
      <p className="pna-hint" role="status">
        reading your account…
      </p>
    );
  }
  const name = me?.name ?? learnerName ?? "you";
  const initial = name.trim().charAt(0).toLowerCase() || "y";
  return (
    <div className="pna-profile">
      <span className="pn-face pna-profile-face" aria-hidden="true">
        {me?.emoji ?? initial}
      </span>
      <div>
        <strong>{name}</strong>
        <p className="pna-hint">
          {me?.isAnonymous
            ? "guest account — everything you make stays private to you. Join with email to keep it across devices."
            : me?.email
              ? `signed in as ${me.email}`
              : "signed in"}
        </p>
      </div>
    </div>
  );
}

export function ProfilePage({
  learnerName,
  live,
}: {
  learnerName?: string;
  live: boolean;
}) {
  const initial = (learnerName ?? "you").trim().charAt(0).toLowerCase() || "y";
  return (
    <PageScaffold kicker="profile" title={learnerName ?? "you"}>
      {live ? (
        <LiveProfile learnerName={learnerName} />
      ) : (
        <div className="pna-profile">
          <span className="pn-face pna-profile-face" aria-hidden="true">
            {initial}
          </span>
          <div>
            <strong>{learnerName ?? "you"}</strong>
            <p className="pna-hint">
              display name and avatar come from your session identity;
              account details load against the live backend.
            </p>
          </div>
        </div>
      )}
    </PageScaffold>
  );
}

export function SettingsPage() {
  return (
    <PageScaffold
      kicker="settings"
      title="settings"
      lede="account, privacy and preference controls land here as their backends arrive — the sections below are the real roadmap, not hidden switches."
    >
      <ul className="pna-settings-list">
        <li className="pna-setting">
          <strong>account &amp; access</strong>
          <span className="pna-setting-state">sign-in is handled at the app entry</span>
        </li>
        <li className="pna-setting">
          <strong>privacy</strong>
          <span className="pna-setting-state">
            your subjects, sources and attempts are already private to you
          </span>
        </li>
        <li className="pna-setting">
          <strong>notifications &amp; preferences</strong>
          <span className="pna-setting-state">not available yet</span>
        </li>
      </ul>
    </PageScaffold>
  );
}
