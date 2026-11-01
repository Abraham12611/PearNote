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

const SOURCE_STATE_LABEL: Record<string, string> = {
  uploaded: "uploaded",
  parsing: "being read",
  indexed: "in your library",
  failed: "couldn't be read",
};

function formatBytes(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

/** Real owner-scoped rows — `sources.listMine` only returns the signed-in
 *  learner's own uploads; deleted rows never arrive. */
function LiveSourceList() {
  const rows = useQuery(api.sources.listMine, {});
  if (rows === undefined) {
    return (
      <p className="pna-hint" role="status">
        checking your shelf…
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="pna-empty">
        <strong>nothing on the shelf yet</strong>
        <p>
          PDFs and text you add to a subject are pinned here — private to
          your account, cited back to the pages they came from.
        </p>
      </div>
    );
  }
  return (
    <ul className="pna-source-list">
      {rows.map((row) => (
        <li key={row._id} className="pna-source">
          <span className="pna-source-kind" aria-hidden="true">
            {row.mime === "application/pdf" ? "pdf" : "txt"}
          </span>
          <span className="pna-source-body">
            <strong>{row.title}</strong>
            <span className="pna-source-meta">
              {formatBytes(row.sizeBytes)} ·{" "}
              {SOURCE_STATE_LABEL[row.status] ?? row.status}
              {row.status === "failed" && row.error ? ` — ${row.error}` : ""}
            </span>
          </span>
          <time className="pna-source-date" dateTime={new Date(row.createdAt).toISOString()}>
            {new Date(row.createdAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function LibraryPage({
  live,
  onAddMaterial,
}: {
  /** Convex provider mounted — the real list renders. */
  live: boolean;
  onAddMaterial: () => void;
}) {
  return (
    <PageScaffold
      kicker="library"
      title="your sources"
      lede="every document you've added, with its extraction status. Uploads start from a subject so their citations land in the right place."
    >
      {live ? (
        <LiveSourceList />
      ) : (
        <div className="pna-empty">
          <strong>the shelf needs a live connection</strong>
          <p>
            your real source list only loads against the backend — nothing
            is shown here instead of it.
          </p>
        </div>
      )}
      <button type="button" className="pn-cta" onClick={onAddMaterial}>
        add material to a subject →
      </button>
    </PageScaffold>
  );
}

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

export function AchievementsPage() {
  return (
    <PageScaffold
      kicker="trophy shelf"
      title="your shelf"
      lede="stickers and milestones you earn show up here — only after a real attempt verifies them, never before."
    >
      <div className="pn-shelf-strip pna-shelf" aria-label="empty trophy shelf">
        <div className="pn-pegs">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="pn-peg" aria-hidden="true" />
          ))}
        </div>
        <span className="pn-shelf-hint">
          nothing earned yet — finish a lesson and this shelf fills itself
        </span>
      </div>
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
