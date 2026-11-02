/* ------------------------------------------------------------------
 * /app pages — the sitemap views the rail routes to (Issue #54).
 *
 * Honesty contract: a view renders real owner-scoped data where a Convex
 * read exists today (Library → `sources.listMine`), and a functional
 * empty state where it doesn't (Groups, Achievements, Settings). Nothing
 * here fabricates content, progress or seeded rows — deferred features
 * say so plainly instead of wearing placeholder data.
 * ------------------------------------------------------------------ */

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
