/* ------------------------------------------------------------------
 * DraftPublish — the publish affordance for pre-approve drafts.
 * Since W4, approved proposals materialize `published` directly, so a
 * draft row only exists for versions materialized before that rule (or
 * a validated draft awaiting the owner's say). Renders nothing when
 * the subject has no unpublished versions — no dead chrome.
 * ------------------------------------------------------------------ */
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function DraftPublish({ subjectId }: { subjectId: string }) {
  const drafts = useQuery(api.curricula.listDrafts, {
    subjectId: subjectId as Id<"subjects">,
  });
  const publish = useMutation(api.curricula.publish);
  if (drafts === undefined || drafts.length === 0) return null;
  return (
    <div className="pn-draft-pub" data-testid="draft-publish">
      {drafts.map((d) => (
        <button
          key={d._id}
          type="button"
          className="pn-draft-pub-btn"
          onClick={() => void publish({ subjectId: subjectId as Id<"subjects">, versionId: d._id })}
        >
          publish draft v{d.version} →
        </button>
      ))}
    </div>
  );
}
