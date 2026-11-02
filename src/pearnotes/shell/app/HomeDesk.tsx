/* ------------------------------------------------------------------
 * HomeDesk — the PearNotes Home, adapted from `/#/space/crew/knows`
 * (Issue #64b).
 *
 * This reuses the knows page's components and grammar verbatim —
 * `.room-knows`/`.knows-scroll`/`.knows-head`/`.knows-sheets`/
 * `.knows-sec`/`.knows-people`/`.knows-empty`/`.knows-hints`/
 * `.knows-foot` from `src/components/room-knows.css` — it is not a new
 * dashboard system. The mapping:
 *
 *   knows-kicker + h1        → "hey <learner>" · "your desk"
 *   knows-total counter      → real subject count (0 → honest copy)
 *   Portrait (knows-people)  → subject faces as die-cut stickers (+ add)
 *   sheet is-a               → continue studying + this week
 *   sheet is-b               → your subjects (source status per tile)
 *   sheet is-c               → recent activity + shelf + friends capsule
 *   knows-empty + hints      → every honest empty state
 *   knows-foot               → the page's honesty line
 *
 * Everything rendered comes from real data or labelled fixtures —
 * nothing invents friends, streaks, events, mastery or finished
 * lessons. Deferred features show honest pending states.
 * ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { inkOn } from "../../../components/RoomKnowsObjects";
import type { PearNotesData, PearSubject, ResumePoint } from "../types";
import "../../../components/room-knows.css";
import "./home-desk.css";

/* A subject as a die-cut sticker — same treatment as .knows-person:
   coloured face + name + one honest status line. */
function SubjectPerson({
  subject,
  i,
  onOpen,
}: {
  subject: PearSubject;
  i: number;
  onOpen: (id: string) => void;
}) {
  const status =
    subject.status === "ready"
      ? null
      : subject.status === "needs_review"
        ? "proposal to review"
        : subject.status === "generating"
          ? "sources being read"
          : subject.status === "needs_material"
            ? "needs a source"
            : "attention";
  return (
    <button
      type="button"
      className="knows-person pna-desk-person"
      style={
        {
          "--i": i,
          "--by": subject.color || undefined,
          "--on": inkOn(subject.color ?? "#f5efdf"),
        } as CSSProperties
      }
      onClick={() => onOpen(subject.id)}
      data-testid={`desk-subject-${subject.id}`}
    >
      <span className="knows-face" aria-hidden="true">
        {subject.name.trim().slice(0, 1)}
      </span>
      <b>{subject.name}</b>
      {status && <em>{status}</em>}
    </button>
  );
}

/* Real source counts for the shelf card — live only, mounted by the
   caller under policy.liveReads; never guesses numbers. listMine has
   no subjectId on its rows, so this reports the account total, not a
   made-up per-subject distribution. */
function SourceStatusLive() {
  const sources = useQuery(api.sources.listMine, {}) ?? null;
  if (!sources?.length) return null;
  const pending = sources.filter(
    (s) => s.status === "uploaded" || s.status === "parsing",
  ).length;
  return (
    <p className="knows-count" role="status">
      {sources.length} {sources.length === 1 ? "source" : "sources"} on the
      shelf{pending ? ` · ${pending} still reading` : ""}
    </p>
  );
}

export function HomeDesk({
  data,
  resume,
  learnerName,
  fixtureLabel,
  liveSources = false,
  onLearn,
  onCreateSubject,
  onOpenSubject,
  onResume,
}: {
  data: PearNotesData;
  resume: ResumePoint | null;
  learnerName: string;
  fixtureLabel?: string | null;
  /** mount the real sources.listMine read inside subject tiles */
  liveSources?: boolean;
  onLearn: () => void;
  onCreateSubject: () => void;
  onOpenSubject: (id: string) => void;
  onResume: (lessonId: string) => void;
}) {
  const subjects = data.status === "ready" ? data.subjects : [];
  const loading = data.status === "loading";

  const honestEmpty = (title: string, body: string, hints: string[], cta?: ReactNode) => (
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
    <div
      className="room-knows knows-side-paper pna-desk"
      data-testid="home-desk"
      data-fixture={fixtureLabel || undefined}
    >
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">hey {learnerName} · the other side of your desk</p>
            <h1>what's on your desk</h1>
            <p className="knows-sub">
              {subjects.length > 0 && (
                <b className="knows-total">{subjects.length}</b>
              )}
              {subjects.length === 1
                ? " subject lives here."
                : subjects.length > 0
                  ? " subjects live here."
                  : "Nothing lives here yet — your first subject starts with a + or the learn button."}
              {fixtureLabel ? ` ${fixtureLabel}` : ""}
            </p>
            <div className="pna-desk-ctas">
              <button type="button" className="pn-cta" onClick={onLearn}>
                learn →
              </button>
              <button type="button" className="knows-back" onClick={onCreateSubject}>
                + new subject
              </button>
            </div>
          </div>
          <div className="knows-group">
            <section className="knows-sec is-who" data-testid="desk-who">
              <h2>your people</h2>
              <p className="knows-count">
                {subjects.length
                  ? `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}`
                  : "just you so far"}
              </p>
              <div className="knows-people">
                {subjects.slice(0, 8).map((s, i) => (
                  <SubjectPerson key={s.id} subject={s} i={i} onOpen={onOpenSubject} />
                ))}
                <button
                  type="button"
                  className="knows-person pna-desk-person is-add"
                  style={{ "--i": subjects.length } as CSSProperties}
                  onClick={onCreateSubject}
                  data-testid="desk-add"
                >
                  <span className="knows-face" aria-hidden="true">+</span>
                  <b>new</b>
                </button>
              </div>
            </section>
          </div>
        </header>

        <div className="knows-sheets">
          {/* is-a · continue + this week */}
          <div className="knows-sheet is-a">
            <section className="knows-sec" data-testid="desk-continue">
              <h2>continue studying</h2>
              {resume ? (
                <button
                  type="button"
                  className="pna-desk-resume"
                  onClick={() => onResume(resume.lessonId)}
                  data-testid="desk-resume"
                >
                  <em>pick up where you left off</em>
                  <strong>{resume.lessonTitle}</strong>
                  <small>{resume.subjectName}</small>
                  <span className="pn-cta">resume →</span>
                </button>
              ) : loading ? (
                <p className="knows-count">checking your desk…</p>
              ) : (
                honestEmpty(
                  "nothing in progress yet",
                  "start a lesson and it lands here, exactly where you left it — no invented progress.",
                  ["a lesson", "a challenge", "a teach-back"],
                  <button type="button" className="pn-cta" onClick={onLearn}>
                    start learning →
                  </button>,
                )
              )}
            </section>
            <section className="knows-sec" data-testid="desk-week">
              <h2>this week</h2>
              {honestEmpty(
                "no study calendar yet",
                "sessions show up here once the backend records them — days, not streaks guessed on the client.",
                ["mon", "wed", "fri"],
              )}
            </section>
          </div>

          {/* is-b · your subjects */}
          <div className="knows-sheet is-b">
            <section className="knows-sec" data-testid="desk-subjects">
              <h2>your subjects</h2>
              {liveSources && <SourceStatusLive />}
              {loading ? (
                <p className="knows-count">checking…</p>
              ) : subjects.length === 0 ? (
                honestEmpty(
                  "the shelf is empty",
                  "subjects you create land here with their own path — nothing is seeded or borrowed from a demo account.",
                  ["a subject", "some sources", "an approved path"],
                  <button type="button" className="pn-cta" onClick={onCreateSubject}>
                    + make your first subject
                  </button>,
                )
              ) : (
                <ul className="pna-desk-subjects">
                  {subjects.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="pna-desk-tile"
                        onClick={() => onOpenSubject(s.id)}
                        data-testid={`desk-tile-${s.id}`}
                      >
                        <SubjectPerson subject={s} i={i} onOpen={onOpenSubject} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* is-c · activity + shelf + friends */}
          <div className="knows-sheet is-c">
            <section className="knows-sec" data-testid="desk-activity">
              <h2>recent activity</h2>
              {honestEmpty(
                "nothing to report yet",
                "uploads, reviews and finished lessons land here with where they came from — the desk reads evidence, not guesses.",
                ["an upload", "a review", "a lesson"],
              )}
            </section>
            <section className="knows-sec" data-testid="desk-shelf">
              <h2>trophy shelf</h2>
              {honestEmpty(
                "no earned stickers yet",
                "stickers land here when real demonstrations earn them — no participation trophies.",
                ["a challenge", "a teach-back", "a checkpoint"],
              )}
            </section>
            <section className="knows-sec" data-testid="desk-friends">
              <h2>friend activity</h2>
              {honestEmpty(
                "deferred",
                "consented friend activity needs an authorised relationships API — until then this stays empty rather than inventing people.",
                [],
              )}
            </section>
          </div>
        </div>

        <p className="knows-foot" data-testid="desk-honest">
          It reads your subjects, sources and lessons — nothing else. Private
          sources stay yours; shared rooms stay separate.
        </p>
      </div>
    </div>
  );
}
