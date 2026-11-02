/* ------------------------------------------------------------------
 * GroupsDesk — /app groups on the knows grammar (#64 sprint).
 *
 * Honest group state: real shared rooms you own or were invited into
 * come from `api.spaces.listMine` (the same read the original rail's
 * "yours" section uses) — each renders as a .knows-person sticker and
 * opens that room via the external nav. PearNotes-native study groups
 * don't exist yet, so join/friend features stay honest pending states.
 * No fabricated members or activity.
 * ------------------------------------------------------------------ */

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { inkOn } from "../../../components/RoomKnowsObjects";
import type { CSSProperties } from "react";
import "../../../components/room-knows.css";
import "./home-desk.css";

type Space = { _id: string; slug?: string; name: string; color?: string; icon?: string; isOwner?: boolean };

function MyRooms({ onOpen }: { onOpen: (slug: string) => void }) {
  const mine = useQuery(api.spaces.listMine, {}) as Space[] | undefined;
  if (!mine?.length) return null;
  return (
    <section className="knows-sec" data-testid="groups-mine">
      <h2>your shared rooms</h2>
      <p className="knows-count">{mine.length} room{mine.length === 1 ? "" : "s"}</p>
      <div className="knows-people">
        {mine.map((s, i) => (
          <button
            key={s._id}
            type="button"
            className="knows-person pna-desk-person"
            style={{ "--i": i, "--by": s.color ?? "#7c5cff", "--on": inkOn(s.color ?? "#7c5cff") } as CSSProperties}
            onClick={() => s.slug && onOpen(s.slug)}
            data-testid={`room-${s.slug}`}
          >
            <span className="knows-face" aria-hidden="true">{s.icon ?? s.name.slice(0, 1)}</span>
            <b>{s.name}</b>
            {s.isOwner && <em>yours</em>}
          </button>
        ))}
      </div>
    </section>
  );
}

export function GroupsDesk({
  learnerName,
  live = false,
  onOpenSpace,
  onOpenSpaces,
}: {
  learnerName: string;
  /** mount the real shared-rooms read */
  live?: boolean;
  onOpenSpace: (slug: string) => void;
  onOpenSpaces: () => void;
}) {
  return (
    <div className="room-knows knows-side-paper pna-desk" data-testid="groups-desk">
      <div className="knows-scroll pna-desk-scroll">
        <header className="knows-head">
          <div className="knows-title">
            <p className="knows-kicker">{learnerName} · study together</p>
            <h1>groups & rooms</h1>
            <p className="knows-sub">
              PearNotes study groups are still being built — your shared
              OurSpaces rooms are real and open from here.
            </p>
            <div className="pna-desk-ctas">
              <button type="button" className="pn-cta" onClick={onOpenSpaces}>
                open shared spaces ↗
              </button>
            </div>
          </div>
        </header>

        <div className="knows-sheets">
          <div className="knows-sheet is-b">
            {live ? <MyRooms onOpen={onOpenSpace} /> : (
              <div className="knows-empty" role="status">
                <h2>your rooms live in the shared app</h2>
                <p>real rooms you own or joined show up there — open them through the shared spaces.</p>
                <button type="button" className="pn-cta" onClick={onOpenSpaces}>
                  open shared spaces ↗
                </button>
              </div>
            )}
          </div>
          <div className="knows-sheet is-c">
            <section className="knows-sec" data-testid="groups-study">
              <h2>PearNotes study groups</h2>
              <div className="knows-empty" role="status">
                <h2>not built yet</h2>
                <p>consented group learning needs an authorized relationship API — until then nothing here invents people or activity.</p>
                <span className="knows-hints" aria-hidden="true">
                  {["invite a friend", "a shared path", "group practice"].map((h, k) => (
                    <i key={h} style={{ "--i": k } as CSSProperties}>{h}</i>
                  ))}
                </span>
              </div>
            </section>
          </div>
        </div>

        <p className="knows-foot" data-testid="groups-honest">
          Your private subjects and sources stay yours unless you explicitly share them.
        </p>
      </div>
    </div>
  );
}
