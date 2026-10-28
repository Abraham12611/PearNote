import type { CSSProperties } from "react";
import type { PearSubject, ResumePoint } from "./types";
import { SubjectAvatar } from "./SubjectAvatar";

export interface PearNotesHomeProps {
  learnerName?: string;
  /** real subjects only — a fresh account passes `[]` and gets the honest
   *  first-run desk (S01: "no fake subject"). */
  subjects: PearSubject[];
  /** last real study location (F06); omitted entirely for new accounts */
  resume?: ResumePoint | null;
  /** ribbon marking fixture/mock content */
  fixtureLabel?: string;
  /** Learn affordance → opens the subject picker */
  onLearn?: () => void;
  /** straight into the subject-creation wizard */
  onCreateSubject?: () => void;
  onOpenSubject?: (subjectId: string) => void;
  onResume?: (lessonId: string) => void;
  onOpenLibrary?: () => void;
  onOpenGroups?: () => void;
  onOpenShelf?: () => void;
  onOpenProfile?: () => void;
}

function PearMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="48" cy="48" r="48" fill="#a3c26a" />
      <ellipse cx="48" cy="57" rx="17.5" ry="18" fill="#f5efdf" />
      <ellipse cx="48" cy="35" rx="10.5" ry="12" fill="#f5efdf" />
      <rect x="46" y="14" width="3.6" height="11" rx="1.8" fill="#1d1712" transform="rotate(-9 48 20)" />
      <ellipse cx="57" cy="21" rx="7.5" ry="3.6" fill="#1d1712" transform="rotate(-26 57 21)" />
    </svg>
  );
}

/**
 * S01 — the personal study desk. A first-run account gets a welcoming,
 * honest empty desk: a create invitation, honest placeholders ("your last
 * lesson pins itself here"), and navigation — never seeded subjects,
 * fake achievements or a fabricated "continue studying".
 */
export function PearNotesHome({
  learnerName,
  subjects,
  resume,
  fixtureLabel,
  onLearn,
  onCreateSubject,
  onOpenSubject,
  onResume,
  onOpenLibrary,
  onOpenGroups,
  onOpenShelf,
  onOpenProfile,
}: PearNotesHomeProps) {
  const empty = subjects.length === 0;
  const initial = (learnerName ?? "you").trim().charAt(0).toLowerCase() || "y";

  return (
    <section className="pn-home" aria-label="PearNotes home">
      {fixtureLabel && <span className="pn-fixture-tag">{fixtureLabel}</span>}

      <header className="pn-home-top">
        <span className="pn-brand">
          <PearMark />
          <span className="pn-brand-word">pearnotes</span>
        </span>
        <button
          type="button"
          className="pn-profile-chip"
          onClick={onOpenProfile}
          aria-label="Your profile and settings"
        >
          <span className="pn-face" aria-hidden="true">{initial}</span>
          <span className="pn-profile-name">{learnerName ?? "you"}</span>
        </button>
      </header>

      <div className="pn-home-desk">
        <p className="pn-kicker">{learnerName ? `hey ${learnerName}` : "welcome in"}</p>
        <h1 className="pn-home-title">{empty ? "a fresh desk" : "your desk"}</h1>

        <div className="pn-desk-grid">
          {resume ? (
            <article className="pn-print pn-print-resume">
              <span className="pn-print-kicker">continue studying</span>
              <strong>{resume.lessonTitle}</strong>
              <span className="pn-print-meta">{resume.subjectName}</span>
              <button
                type="button"
                className="pn-cta pn-cta-dark"
                onClick={() => onResume?.(resume.lessonId)}
              >
                resume →
              </button>
            </article>
          ) : (
            <div className="pn-print pn-print-empty" aria-hidden="true">
              <span className="pn-print-kicker">continue studying</span>
              <span>finish a lesson and it pins itself right here</span>
            </div>
          )}

          <section className="pn-desk-subjects" aria-label="your subjects">
            {empty ? (
              <div className="pn-desk-empty">
                <button
                  type="button"
                  className="pn-disc pn-disc-create pn-disc-hero"
                  onClick={onCreateSubject}
                  aria-label="Create your first subject"
                >
                  <span className="pn-disc-plus" aria-hidden="true">+</span>
                </button>
                <div className="pn-desk-empty-copy">
                  <strong>no subjects yet</strong>
                  <p>
                    your own notes and PDFs become a study space on this wall —
                    nothing is made for you before you ask.
                  </p>
                  <button type="button" className="pn-cta" onClick={onLearn}>
                    start learning
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pn-subject-shelf">
                  {subjects.map((subject, i) => (
                    <button
                      key={subject.id}
                      type="button"
                      className="pn-shelf-disc"
                      style={{ "--i": i } as CSSProperties}
                      onClick={() => onOpenSubject?.(subject.id)}
                      aria-label={`Open ${subject.name}`}
                    >
                      <SubjectAvatar avatar={subject.avatar} color={subject.color} size={64} />
                      <span>{subject.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="pn-shelf-disc pn-shelf-create"
                    onClick={onCreateSubject}
                    aria-label="Create a subject"
                  >
                    <span className="pn-disc-plus" aria-hidden="true">+</span>
                    <span>new</span>
                  </button>
                </div>
                <button type="button" className="pn-cta" onClick={onLearn}>
                  learn →
                </button>
              </>
            )}
          </section>

          <div className="pn-shelf-strip" aria-label="trophy shelf">
            <span className="pn-print-kicker">trophy shelf</span>
            <div className="pn-pegs">
              {[0, 1, 2].map((i) => (
                <span key={i} className="pn-peg" aria-hidden="true" />
              ))}
            </div>
            <span className="pn-shelf-hint">earned stickers land here</span>
          </div>
        </div>

        <nav className="pn-home-nav" aria-label="pearnotes navigation">
          <button type="button" className="pn-nav-pill is-learn" onClick={onLearn}>
            <span className="pn-dot" aria-hidden="true" /> learn
          </button>
          <button type="button" className="pn-nav-pill" onClick={onOpenLibrary}>library</button>
          <button type="button" className="pn-nav-pill" onClick={onOpenGroups}>groups</button>
          <button type="button" className="pn-nav-pill" onClick={onOpenShelf}>shelf</button>
        </nav>
      </div>
    </section>
  );
}
