/* ------------------------------------------------------------------
 * ProfileDesk — /app profile, knows grammar + real E4 profile APIs.
 *
 * Reads  api.profiles.getMine     (query) — the caller's own row
 * Calls api.profiles.initialize  (mutation) — one-time persona assign
 * Calls api.profiles.update      (mutation) — name / personaId / color
 *
 * Eight curated personas render as the original die-cut people stickers
 * (.knows-person + .knows-face); picking one persists personaId + its
 * matching cursor accent. Custom photos stay OFF (deferred for the
 * security contract) — image only accepts curated /avatars/<id>.png.
 * ------------------------------------------------------------------ */

import { useEffect, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PERSONAS } from "../../../../convex/personas";
import { inkOn } from "../../../components/RoomKnowsObjects";
import "../../../components/room-knows.css";
import "./home-desk.css";

type Profile = {
  userId: string;
  personaId?: string;
  name?: string;
  image?: string;
  color?: string;
  email?: string;
  isAnonymous: boolean;
  initialized: boolean;
};

export function ProfileDesk({ learnerName, live = false }: { learnerName: string; live?: boolean }) {
  if (!live) {
    return (
      <div className="room-knows knows-side-paper pna-desk" data-testid="profile-desk">
        <div className="knows-scroll pna-desk-scroll">
          <header className="knows-head">
            <div className="knows-title">
              <p className="knows-kicker">profile · how you appear</p>
              <h1>this is you</h1>
            </div>
          </header>
          <div className="knows-sheets">
            <div className="knows-sheet is-a">
              <div className="knows-empty" role="status">
                <h2>profiles live on a signed-in account</h2>
                <p>in a live session your username, persona face and name edits persist across reloads and sign-ins.</p>
              </div>
            </div>
          </div>
          <p className="knows-foot">Demo sessions never read or write a real profile.</p>
        </div>
      </div>
    );
  }
  return <ProfileDeskLive learnerName={learnerName} />;
}

function ProfileDeskLive({ learnerName }: { learnerName: string }) {
  const me = useQuery(api.profiles.getMine, {}) as Profile | null | undefined;
  const initialize = useMutation(api.profiles.initialize);
  const update = useMutation(api.profiles.update);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);

  /* one-time durable assignment — replays idempotently */
  useEffect(() => {
    if (me && !me.initialized) void initialize().catch(() => undefined);
  }, [me?.initialized, me !== null, initialize]);
  useEffect(() => { if (me?.name) setDraft(me.name); }, [me?.name]);

  const list = PERSONAS;
  const save = async (patch: Record<string, string>, msg: string) => {
    setState("saving");
    try {
      await update(patch);
      setState("saved");
      setNote(msg);
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setNote("couldn't save — try again");
    }
  };

  const pick = (id: string, label: string, accent: string) =>
    save({ personaId: id, color: accent }, `now looking like ${label.toLowerCase()}`);
  const saveName = () =>
    draft.trim() && save({ name: draft.trim().slice(0, 40) }, "name saved");

  const busy = state === "saving";
  const shown = me === undefined ? learnerName : (me?.name ?? learnerName);
  const color = me?.color ?? "#7c5cff";

  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="profile-desk">
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">profile · how you appear</p>
            <h1>this is you</h1>
            <p className="knows-sub">
              {me === undefined
                ? "reading your profile…"
                : me === null
                  ? "sign in to keep a profile"
                  : me.isAnonymous
                    ? "guest account — everything still persists to your own identity"
                    : me.email ?? "account"}
            </p>
            {note && (
              <p className="knows-count" role="status" data-testid="profile-note">
                {state === "saving" ? "saving…" : note}
              </p>
            )}
          </div>
        </header>

        <div className="knows-sheets">
          {/* is-a · current look + name */}
          <div className="knows-sheet is-a">
            <section className="knows-sec" data-testid="profile-you">
              <h2>your look</h2>
              <div className="knows-person pna-profile-face-card" style={{ "--by": color, "--on": inkOn(color) } as CSSProperties}>
                {me?.image ? (
                  <img className="knows-face pna-face-img" src={me.image} alt={shown} />
                ) : (
                  <span className="knows-face" aria-hidden="true">
                    {shown.trim().slice(0, 1)}
                  </span>
                )}
                <b>{shown}</b>
                <em>{me?.isAnonymous ? "guest" : "member"}</em>
              </div>
            </section>
            <section className="knows-sec" data-testid="profile-name">
              <h2>display name</h2>
              <form
                className="knows-tell"
                onSubmit={(e) => { e.preventDefault(); void saveName(); }}
              >
                <input
                  value={draft}
                  maxLength={40}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="display name"
                  data-testid="profile-name-input"
                />
                <button type="submit" disabled={busy || !draft.trim() || draft.trim() === me?.name} data-testid="profile-name-save">
                  {busy ? "…" : "save"}
                </button>
              </form>
            </section>
          </div>

          {/* is-b · personas */}
          <div className="knows-sheet is-b">
            <section className="knows-sec" data-testid="profile-personas">
              <h2>pick your face</h2>
              <p className="knows-count">eight personas — the cursor accent follows the one you pick</p>
              <div className="knows-people">
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`knows-person pna-desk-person ${me?.personaId === p.id ? "is-picked" : ""}`}
                    style={{ "--i": i, "--by": p.accent, "--on": inkOn(p.accent) } as CSSProperties}
                    onClick={() => pick(p.id, p.label, p.accent)}
                    aria-pressed={me?.personaId === p.id}
                    data-testid={`persona-${p.id}`}
                  >
                    <img className="knows-face pna-face-img" src={`/avatars/${p.id}.png`} alt={p.label} />
                    <b>{p.label}</b>
                    {me?.personaId === p.id && <em>yours</em>}
                  </button>
                ))}
              </div>
              <p className="knows-count">custom photo uploads are off for now — the security contract lands first.</p>
            </section>
          </div>
        </div>

        <p className="knows-foot" data-testid="profile-honest">
          Saved to your own account — persists across reloads and sign-ins.
        </p>
      </div>
    </div>
  );
}
