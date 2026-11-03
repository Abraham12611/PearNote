/* ------------------------------------------------------------------
 * HomeDesk — the PearNotes Home, the owner-approved "your desk" mockup
 * adapted onto the `/#/space/crew/knows` paper grammar.
 *
 * Every module is data-driven:
 *   continue learning ← resume point (last real attempt)
 *   study session?    ← today's session_items (server rows)
 *   achievements      ← server-issued rows + unseen count
 *   your crew         ← accepted friendships + latest crew message
 *   recent activity   ← activityEvents feed
 *   coming up         ← future studyEvents
 *   subjects discs    ← owned subjects (empty → just the +)
 *   this week's focus ← weeklyFocus checklist
 *   study calendar    ← evidence days + streak
 *   foot bar          ← sync state — "sample board" on demo, "live
 *                       sync · last change" with real data
 *
 * `desk === null` = no desk backend (mock) or a genuinely fresh account:
 * every module renders its honest empty — nothing is invented.
 * ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from "react";
import { MemberFace } from "../../../components/MemberFace";
import { SubjectAvatar } from "../../ui/SubjectAvatar";
import type { SubjectAvatarId } from "../../ui/types";
import type { DeskData, PearNotesData, ResumePoint } from "../types";
import "../../../components/room-knows.css";
import "./home-desk.css";

const INK = "#1d1712";

function ago(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* tiny ink icons for the achievement shelf — same stroke family as the
   dock's commissioned set */
const ACH_ICONS: Record<string, ReactNode> = {
  sprout: <path d="M12 20V9m0 0C12 5 9 3 5 3c0 4 3 6 7 6Zm0 0c0-4 3-6 7-6 0 4-3 6-7 6Z" />,
  star: <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2-5.6-3-5.6 3 1.2-6.2L3 9.5l6.3-.8Z" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />,
  book: <path d="M4 5c3-1.5 6-1.5 8 0v15c-2-1.5-5-1.5-8 0Zm16 0c-3-1.5-6-1.5-8 0v15c2-1.5 5-1.5 8 0Z" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0Zm-4 1h4m8 0h4M12 13v4m-4 3h8m-6-3h4" />,
};

function AchIcon({ icon, tint }: { icon: string; tint?: string }) {
  return (
    <span className="pnd-ach-icon" style={{ "--tint": tint ?? "var(--pn-lime)" } as CSSProperties}>
      <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ACH_ICONS[icon] ?? ACH_ICONS.star}
      </svg>
    </span>
  );
}

function Card({
  title,
  kicker,
  className = "",
  badge,
  testid,
  children,
}: {
  title?: string;
  kicker?: string;
  className?: string;
  badge?: ReactNode;
  testid?: string;
  children: ReactNode;
}) {
  return (
    <section className={`pnd-card ${className}`} data-testid={testid}>
      {(title || badge) && (
        <header className="pnd-card-head">
          {kicker && <span className="pnd-kicker">{kicker}</span>}
          {title && <h2>{title}</h2>}
          {badge}
        </header>
      )}
      {children}
    </section>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="pnd-empty" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      {cta}
    </div>
  );
}

export function HomeDesk({
  data,
  desk,
  resume,
  learnerName,
  fixtureLabel,
  liveSources = false,
  onLearn,
  onCreateSubject,
  onOpenSubject,
  onResume,
  onToggleItem,
}: {
  data: PearNotesData;
  desk?: DeskData | null;
  resume: ResumePoint | null;
  learnerName: string;
  fixtureLabel?: string | null;
  liveSources?: boolean;
  onLearn: () => void;
  onCreateSubject: () => void;
  onOpenSubject: (id: string) => void;
  onResume: (lessonId: string) => void;
  onToggleItem?: (table: "weeklyFocus" | "studyEvents", id: string) => void;
}) {
  const subjects = data.status === "ready" ? data.subjects : [];
  const loading = data.status === "loading";

  /* calendar: this month's day cells (mon-first), dotted by evidence */
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const studied = new Set(desk?.studiedDays ?? []);
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(Date.UTC(year, month, i + 1));
      return d.toISOString().slice(0, 10);
    }),
  ];
  const todayKey = new Date(Date.UTC(year, month, now.getDate())).toISOString().slice(0, 10);
  const lastChange = desk?.activity[0]?.happenedAt;

  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="home-desk" data-fixture={fixtureLabel || undefined}>
      <div className="knows-scroll pna-desk-scroll">
        <header className="pnd-head">
          <div className="pnd-title">
            <p className="knows-kicker">hey {learnerName} · demo learner</p>
            <h1>
              your desk
              <img className="pnd-pear" src="/assets/pearnotes-mark.svg" alt="" aria-hidden="true" />
            </h1>
            <p className="pnd-sub">your learning space — study, track, and keep going</p>
          </div>
          {desk && desk.crew.length > 0 && (
            <div className="pnd-people" data-testid="desk-people">
              <div className="pnd-faces">
                {desk.crew.slice(0, 5).map((m) => (
                  <MemberFace key={m.userId} name={m.name} avatarUrl={m.image} color={m.color ?? "#888"} size="sm" />
                ))}
              </div>
              <span className="pnd-here">{desk.crew.length + 1} in your crew</span>
              <button type="button" className="pnd-pill">+ add</button>
              <button type="button" className="pnd-pill">→ invite</button>
            </div>
          )}
        </header>

        <div className="pnd-grid">
          {/* ---- left column ---------------------------------------- */}
          <div className="pnd-col">
            <Card kicker="continue learning" className="is-continue" testid="desk-continue">
              {resume ? (
                <button type="button" className="pnd-resume" onClick={() => onResume(resume.lessonId)} data-testid="desk-resume">
                  <strong>{resume.lessonTitle}</strong>
                  <small>{resume.subjectName}</small>
                  <span className="pnd-btn">resume →</span>
                </button>
              ) : loading ? (
                <p className="pnd-note">checking your desk…</p>
              ) : (
                <Empty
                  title="nothing in progress yet"
                  body="start a lesson and it lands here, exactly where you left it."
                  cta={<button type="button" className="pnd-btn" onClick={onLearn}>start learning →</button>}
                />
              )}
            </Card>

            <Card title="your subjects" className="is-subjects" testid="desk-subjects">
              {loading ? (
                <p className="pnd-note">checking…</p>
              ) : (
                <div className="pnd-discs">
                  {subjects.map((s) => (
                    <button key={s.id} type="button" className="pnd-disc" style={{ "--by": s.color } as CSSProperties} onClick={() => onOpenSubject(s.id)} data-testid={`desk-subject-${s.id}`}>
                      <SubjectAvatar avatar={s.avatar as SubjectAvatarId} color={s.color} size={56} />
                      <b>{s.name}</b>
                    </button>
                  ))}
                  <button type="button" className="pnd-disc is-new" onClick={onCreateSubject} data-testid="desk-add">
                    <span className="pnd-disc-plus">+</span>
                    <b>new</b>
                  </button>
                </div>
              )}
              {subjects.length === 0 && !loading && (
                <p className="pnd-note">no subjects yet — your first one starts with a + or a source.</p>
              )}
            </Card>

            <Card title="this week's focus" className="is-focus" testid="desk-focus">
              {desk && desk.focus.length > 0 ? (
                <ul className="pnd-checks">
                  {desk.focus.map((f) => (
                    <li key={f.id}>
                      <button type="button" className={`pnd-check ${f.done ? "is-done" : ""}`} onClick={() => onToggleItem?.("weeklyFocus", f.id)} aria-pressed={f.done}>
                        <span className="pnd-box">{f.done ? "✓" : ""}</span>
                        {f.text}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="no focus yet" body="add your first study goal — what do you want done this week?" />
              )}
            </Card>
          </div>

          {/* ---- center column -------------------------------------- */}
          <div className="pnd-col">
            <Card kicker="today" className="is-session" testid="desk-session">
              <h2 className="pnd-session-title">study session?</h2>
              {desk && desk.today.length > 0 ? (
                <>
                  <ul className="pnd-checks">
                    {desk.today.map((t) => (
                      <li key={t.id}>
                        <button type="button" className={`pnd-check ${t.done ? "is-done" : ""}`} onClick={() => onToggleItem?.("studyEvents", t.id)} aria-pressed={t.done}>
                          <span className="pnd-box">{t.done ? "✓" : ""}</span>
                          {t.title}
                          {t.minutes ? <em> — {t.minutes} min</em> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="pnd-btn is-dark" onClick={onLearn}>start focus →</button>
                </>
              ) : (
                <Empty title="nothing scheduled today" body="session items you plan land here — a checklist for today, not a guilt trip." />
              )}
            </Card>

            <Card title="study calendar" kicker="this month" className="is-calendar" testid="desk-calendar">
              <div className="pnd-cal" role="grid" aria-label="study calendar">
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
                  <span key={d} className="pnd-cal-dow">{d}</span>
                ))}
                {cells.map((key, i) => (
                  <span
                    key={key ?? `pad-${i}`}
                    className={`pnd-cal-day ${key && studied.has(key) ? "is-studied" : ""} ${key === todayKey ? "is-today" : ""}`}
                  >
                    {key ? Number(key.slice(8)) : ""}
                  </span>
                ))}
              </div>
              {desk && desk.streakDays > 0 ? (
                <p className="pnd-streak"><b>{desk.streakDays}</b> study days in a row 🎉</p>
              ) : (
                <p className="pnd-note">days fill in when you actually study — no imagined streaks.</p>
              )}
            </Card>
          </div>

          {/* ---- right column ---------------------------------------- */}
          <div className="pnd-col">
            <Card title="achievements" badge={desk && desk.unseenAchievements > 0 ? <span className="pnd-new">{desk.unseenAchievements} new</span> : undefined} className="is-achievements" testid="desk-achievements">
              {desk && desk.achievements.length > 0 ? (
                <ul className="pnd-ach">
                  {desk.achievements.map((a) => (
                    <li key={a.id}>
                      <AchIcon icon={a.icon} tint={a.tint} />
                      <span><b>{a.title}</b><em>{a.detail}</em></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="no earned stickers yet" body="trophies land here when real demonstrations earn them — no participation awards." />
              )}
            </Card>

            <Card title="your crew" className="is-crew" testid="desk-crew">
              {desk && desk.crew.length > 0 ? (
                <>
                  <div className="pnd-faces is-list">
                    {desk.crew.map((m) => (
                      <span key={m.userId} className="pnd-crew-person">
                        <MemberFace name={m.name} avatarUrl={m.image} color={m.color ?? "#888"} size="sm" />
                        <b>{m.name}</b>
                      </span>
                    ))}
                  </div>
                  {desk.crewNote && (
                    <p className="pnd-crew-note"><b>{desk.crewNote.authorName}</b> {desk.crewNote.text}<em>{ago(desk.crewNote.happenedAt)}</em></p>
                  )}
                </>
              ) : (
                <Empty title="just you so far" body="invite friends to study together — nothing is shared until they accept." />
              )}
            </Card>

            <Card title="recent activity" className="is-activity" testid="desk-activity">
              {desk && desk.activity.length > 0 ? (
                <ul className="pnd-feed">
                  {desk.activity.filter((e) => e.kind !== "crew_message").slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <span className="pnd-feed-face" aria-hidden="true">{e.actorName.slice(0, 1).toUpperCase()}</span>
                      <span className="pnd-feed-text"><b>{e.actorName}</b> {e.text}</span>
                      <em>{ago(e.happenedAt)}</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="nothing to report yet" body="uploads, reviews and finished lessons land here — the desk reads evidence, not guesses." />
              )}
            </Card>

            <Card title="coming up" className="is-upcoming" testid="desk-upcoming">
              {desk && desk.upcoming.length > 0 ? (
                <ul className="pnd-coming">
                  {desk.upcoming.map((e) => (
                    <li key={e.id}>
                      <span className="pnd-dot" style={{ "--dot": e.color ?? "#7c5cff" } as CSSProperties} />
                      <span><b>{e.title}</b>{e.subjectName ? <em>{e.subjectName}</em> : null}</span>
                      <time>{dayLabel(e.startTs)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="nothing scheduled" body="quizzes, reviews and group sessions you plan land here." />
              )}
            </Card>
          </div>
        </div>

        <span className="pnd-sticky" aria-hidden="true">keep going! ♡</span>

        <p className="pnd-foot" data-testid="desk-honest">
          <span className="pnd-live-dot" aria-hidden="true" />
          {fixtureLabel
            ? `sample board · pearnotes · your learning world, together`
            : liveSources || desk
              ? `live sync · pearnotes · your learning world, together${lastChange ? ` · last change ${ago(lastChange)}` : ""}`
              : `pearnotes · your learning world, together`}
        </p>
      </div>
    </div>
  );
}
