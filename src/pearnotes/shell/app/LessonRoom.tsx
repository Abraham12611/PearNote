/* ------------------------------------------------------------------
 * LessonRoom (W5) — a lesson IS an inherited OurSpaces room.
 *
 * `learningRuntime.getLessonSpace` / `demo.getLessonSpace` resolve the
 * room provisioned at publish (`lessons.canvasSpaceId`); the real
 * `LiveSpacePage` mounts inside the lesson shell — pan/zoom, drag,
 * action pill, activity rail and cursors are the inherited runtime, not
 * a new canvas. While the lookup is in flight (or the lesson predates
 * provisioning) the existing board keeps rendering — no blank frame.
 * ------------------------------------------------------------------ */
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LiveSpacePage } from "../../../pages/LiveSpace";
import "./lesson-room.css";

export function LessonRoom({
  lessonId,
  demoMode,
  children,
}: {
  lessonId: string;
  demoMode: boolean;
  /** Rendered while the room lookup is in flight and whenever the
   *  lesson has no provisioned room — the existing board, unchanged. */
  children: ReactNode;
}) {
  const space = useQuery(
    demoMode ? api.demo.getLessonSpace : api.learningRuntime.getLessonSpace,
    { lessonId: lessonId as Id<"lessons"> },
  );
  if (space === undefined || space === null) return <>{children}</>;
  return (
    <div className="pn-lesson-room" data-testid="lesson-room">
      <LiveSpacePage slug={space.slug} />
    </div>
  );
}
