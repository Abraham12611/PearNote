/* ------------------------------------------------------------------
 * SettingsDesk — /app settings on the knows grammar (#64 sprint).
 *
 * Only REAL controls ship here: account overview (real currentUser),
 * profile-edit navigation, and sign-out via Convex auth actions.
 * Privacy/account information is honest text. No switch or row claims
 * behavior that doesn't exist — deferred items read as plain notes.
 * ------------------------------------------------------------------ */

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import "../../../components/room-knows.css";
import "./home-desk.css";

export function SettingsDesk({
  learnerName,
  live = false,
  onOpenProfile,
}: {
  learnerName: string;
  /** mount the real account read */
  live?: boolean;
  onOpenProfile: () => void;
}) {
  if (!live) {
    return (
      <div className="room-knows knows-side-paper pna-desk" data-testid="settings-desk">
        <div className="knows-scroll pna-desk-scroll">
          <header className="knows-head">
            <div className="knows-title">
              <p className="knows-kicker">settings · your account</p>
              <h1>account</h1>
            </div>
          </header>
          <div className="knows-sheets">
            <div className="knows-sheet is-a">
              <div className="knows-empty" role="status">
                <h2>account settings need a session</h2>
                <p>sign-in state, profile editing and sign-out only appear with a real account.</p>
              </div>
            </div>
          </div>
          <p className="knows-foot">Only working controls ship here — anything deferred says so instead of faking it.</p>
        </div>
      </div>
    );
  }
  return <SettingsLive learnerName={learnerName} onOpenProfile={onOpenProfile} />;
}

function SettingsLive({
  learnerName,
  onOpenProfile,
}: {
  learnerName: string;
  onOpenProfile: () => void;
}) {
  const { signOut } = useAuthActions();
  const me = useQuery(api.auth.currentUser, {}) as
    | { userId: string; isAnonymous: boolean; name?: string; email?: string; color?: string; emoji?: string }
    | null
    | undefined;

  const row = (testid: string, label: string, value: string) => (
    <li className="knows-line pna-src" data-testid={testid}>
      <span className="knows-words-of"><b className="pna-src-title">{label}</b></span>
      <span className="knows-why"><span className="knows-src">{value}</span></span>
    </li>
  );

  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="settings-desk">
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">settings · your account</p>
            <h1>account</h1>
            <p className="knows-sub">
              {me === undefined ? "reading your account…" :
               me === null ? "session identity" :
               me.isAnonymous ? "guest account — it still persists" : me.email ?? "signed in"}
            </p>
          </div>
        </header>

        <div className="knows-sheets">
          {/* is-a · account overview + profile */}
          <div className="knows-sheet is-a">
            <section className="knows-sec" data-testid="settings-account">
              <h2>account</h2>
              <ul>
                {row("set-name", "name", me?.name ?? learnerName)}
                {me !== undefined && row("set-auth", "sign-in", me === null ? "session" : me.isAnonymous ? "guest (anonymous)" : me.email ?? "signed in")}
              </ul>
              <button type="button" className="pn-cta" onClick={onOpenProfile} data-testid="set-edit-profile">
                edit profile →
              </button>
            </section>
            <section className="knows-sec" data-testid="settings-session">
              <h2>session</h2>
              <button
                type="button"
                className="knows-back"
                onClick={() => void signOut()}
                data-testid="set-signout"
              >
                sign out
              </button>
            </section>
          </div>

          {/* is-c · privacy + info */}
          <div className="knows-sheet is-c">
            <section className="knows-sec" data-testid="settings-privacy">
              <h2>privacy</h2>
              <ul>
                {row("priv-1", "your subjects & sources", "private — only you see them")}
                {row("priv-2", "your attempts & mastery", "evidence, kept server-side")}
                {row("priv-3", "shared rooms", "separate — opt-in only")}
              </ul>
            </section>
            <section className="knows-sec" data-testid="settings-about">
              <h2>about</h2>
              <ul>
                {row("about-v", "app", "pearnotes · ourspaces heritage")}
              </ul>
            </section>
          </div>
        </div>

        <p className="knows-foot" data-testid="settings-honest">
          Only working controls ship here — anything deferred says so instead of faking it.
        </p>
      </div>
    </div>
  );
}
