/* ------------------------------------------------------------------
 * LibraryDesk — the /app Library, adapted from `/#/space/crew/knows`
 * (#64c).
 *
 * Same paper-page grammar as HomeDesk: `.room-knows`/`knows-side-paper`
 * wall, `.knows-sheet` panels, `.knows-sec` sections, `.knows-line`
 * bordered tiles with `.knows-why` attribution chips, `.knows-empty` +
 * `.knows-hints` honest states, `.knows-foot` honesty line. Sources are
 * REAL rows from `api.sources.listMine` (owner-scoped) — statuses map
 * to plain words, deleted rows never show, and a missing backend gives
 * the honest "real sources stay on your account" empty instead of
 * fake entries.
 * ------------------------------------------------------------------ */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import "../../../components/room-knows.css";
import "./home-desk.css";

type SourceRow = {
  _id: string;
  title: string;
  mime: string;
  sizeBytes: number;
  status: "failed" | "uploaded" | "parsing" | "indexed" | "deleted";
  error?: string;
  createdAt: number;
};

/* Real source statuses → honest one-word states (never invented). */
export const SOURCE_STATE: Record<SourceRow["status"], string | null> = {
  uploaded: "new — still being read",
  parsing: "being read",
  indexed: "on the shelf",
  failed: "couldn't be read",
  deleted: null, /* deleted rows never display */
};

const SECTIONS: { key: string; title: string; states: SourceRow["status"][] }[] = [
  { key: "reading", title: "still being read", states: ["uploaded", "parsing"] },
  { key: "shelf", title: "on the shelf", states: ["indexed"] },
  { key: "attention", title: "needs attention", states: ["failed"] },
];

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} mb`;
}

function SourceLines({ rows }: { rows: SourceRow[] }) {
  const live = rows.filter((r) => SOURCE_STATE[r.status] != null);
  return (
    <>
      {SECTIONS.map((sec) => {
        const list = live.filter((r) => sec.states.includes(r.status));
        if (!list.length) return null;
        return (
          <section key={sec.key} className="knows-sec" data-testid={`lib-${sec.key}`}>
            <h2>{sec.title}</h2>
            <ul>
              {list.map((row) => (
                <li key={row._id} className="knows-line pna-src" data-testid={`src-${row._id}`}>
                  <span className="knows-words-of">
                    <b className="pna-src-title">{row.title}</b>
                    <small>
                      {row.mime.split("/").pop()} · {size(row.sizeBytes)}
                    </small>
                  </span>
                  <span className="knows-why">
                    <span className="knows-src">
                      <em>{SOURCE_STATE[row.status]}</em>
                      {row.status === "failed" && row.error ? "it didn't parse" : "from your upload"}
                    </span>
                    <span className="knows-src">
                      <em>added</em>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/* Same live-bridge pattern as LiveDataBridge: the query lives here,
   reports rows up via an effect, and renders nothing — so no hook
   ever mounts without the Convex provider. */
function LiveShelf({ onRows }: { onRows: (rows: SourceRow[]) => void }) {
  const rows = useQuery(api.sources.listMine, {});
  useEffect(() => {
    if (rows !== undefined) onRows(rows as SourceRow[]);
  }, [rows, onRows]);
  return null;
}

export function LibraryDesk({
  live = false,
  learnerName,
  onAddMaterial,
}: {
  /** mount the real sources.listMine read */
  live?: boolean;
  learnerName: string;
  onAddMaterial: () => void;
}) {
  /* rows: null = reads off (empty state), undefined = loading. */
  const [rows, setRows] = useState<SourceRow[] | undefined | null>(live ? undefined : null);

  const emptyBlock = (title: string, body: string, hints: string[], cta?: ReactNode) => (
    <div className="knows-empty" role="status">
      <h2>{title}</h2>
      <p>{body}</p>
      <span className="knows-hints" aria-hidden="true">
        {hints.map((h, k) => (
          <i key={h} style={{ "--i": k } as CSSProperties}>{h}</i>
        ))}
      </span>
      {cta}
    </div>
  );

  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="library-desk">
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">{learnerName} · your library</p>
            <h1>the source shelf</h1>
            <p className="knows-sub">
              {rows ? `${rows.length} ` : ""}
              {rows
                ? `source${rows.length === 1 ? "" : "s"} you've uploaded — the desk reads nothing else.`
                : "Uploads land here as the desk reads them — text and PDF, nothing else."}
            </p>
            <div className="pna-desk-ctas">
              <button type="button" className="pn-cta" onClick={onAddMaterial}>
                + add material →
              </button>
            </div>
          </div>
        </header>

        <div className="knows-sheets">
          <div className="knows-sheet is-b pna-lib-sheet">
            {live && <LiveShelf onRows={setRows} />}
            {rows === null ? (
              emptyBlock(
                "your sources stay on your account",
                "the real shelf only shows your own uploads — nothing is seeded here, so it reads as quiet paper rather than borrowed files.",
                ["a pdf", "a text file", "a pasted note"],
                <button type="button" className="pn-cta" onClick={onAddMaterial}>
                  + add material →
                </button>,
              )
            ) : rows === undefined ? (
              <p className="knows-count" role="status">reading the shelf…</p>
            ) : rows.length === 0 ? (
              emptyBlock(
                "the shelf is empty",
                "upload your first source and it lands here with its read status — nothing arrives by itself.",
                ["a pdf", "a text file"],
                <button type="button" className="pn-cta" onClick={onAddMaterial}>
                  + add your first source →
                </button>,
              )
            ) : (
              <SourceLines rows={rows} />
            )}
          </div>
        </div>

        <p className="knows-foot" data-testid="lib-honest">
          It reads only your own uploads — private sources stay yours.
        </p>
      </div>
    </div>
  );
}
