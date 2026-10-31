import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import "./ingestion.css";
import {
  ACCEPTED_MIME,
  IMPORT_STATE_LABEL,
  MAX_SOURCE_BYTES,
  convexErrorCode,
  ingestApi,
  sha256Hex,
  type JobId,
  type ProposalView,
  type SegmentId,
} from "./api";
import type { PearSubject } from "../shell/types";

/* ------------------------------------------------------------------
 * IntakeReview — the real Phase 01 learner flow (Issue #24):
 *
 *   PDF/text file → createUploadUrl → POST blob → sources.register
 *   → learningImport.begin → live getStatus (extracting … needs_review /
 *   failed / awaiting_model) → getProposal → editable review →
 *   learningReview.review (numeric revision, NEEDS_REVIEW/omissions
 *   consent) → persisted draft curriculum summary.
 *
 * No fixtures anywhere on this path. A job only ever belongs to the
 * signed-in owner; missing/foreign ids render "not found" honestly.
 * ------------------------------------------------------------------ */

type UploadPhase =
  | { kind: "idle" }
  | { kind: "busy"; step: string }
  | { kind: "error"; message: string };

function UploadCard({
  busy,
  onFile,
  error,
}: {
  busy: boolean;
  onFile: (f: File) => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="pni-card" aria-labelledby="pni-upload-h">
      <h3 id="pni-upload-h">add material</h3>
      <p className="pni-hint">
        PDF or plain text, up to {Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB.
        Your file is private — only you can read it or its citations.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="pni-file"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="pni-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function StatusCard({ jobId }: { jobId: JobId }) {
  const status = useQuery(ingestApi.learningImport.getStatus, { jobId });
  if (status === undefined) {
    return <section className="pni-card" aria-busy="true">checking the job…</section>;
  }
  if (status === null) {
    return (
      <section className="pni-card" role="alert">
        <strong>job not found</strong>
        <p className="pni-hint">this import isn't visible to your account.</p>
      </section>
    );
  }
  const warn = status.extractionWarnings ?? [];
  return (
    <section className="pni-card" aria-live="polite">
      <div className="pni-status-row">
        <span className={`pni-dot is-${status.state}`} aria-hidden="true" />
        <strong>{IMPORT_STATE_LABEL[status.state] ?? status.state}</strong>
      </div>
      {status.state === "awaiting_model" && (
        <p className="pni-hint">
          your document was read. the model step is gated on explicit
          owner/deployment authorization — nothing is spent automatically.
          check back when it's approved.
        </p>
      )}
      {status.state === "failed" && (
        <p className="pni-error">{status.error ?? "the import failed."}</p>
      )}
      {warn.length > 0 && (
        <ul className="pni-warnings">
          {warn.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CitedSegment({ segmentId }: { segmentId: SegmentId }) {
  const seg = useQuery(ingestApi.sources.getSegment, { segmentId });
  if (!seg) return null;
  return (
    <blockquote className="pni-quote">
      {seg.page != null && <span className="pni-quote-page">p.{seg.page} · </span>}
      “{seg.text.length > 220 ? `${seg.text.slice(0, 220)}…` : seg.text}”
    </blockquote>
  );
}

/** Editable review of one import proposal — approve/reject is a real
 *  `learningReview.review` mutation carrying the numeric revision token. */
function ProposalReview({ jobId }: { jobId: JobId }) {
  const proposalRow = useQuery(ingestApi.learningImport.getProposal, { jobId });
  const review = useMutation(ingestApi.learningReview.review);
  const [renames, setRenames] = useState<Record<number, string>>({});
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  const [acceptOmissions, setAcceptOmissions] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsOmissions, setNeedsOmissions] = useState(false);
  const [done, setDone] = useState<{
    state: "accepted" | "rejected";
    subjectIds: string[];
    curriculumVersionIds: string[];
  } | null>(null);

  if (proposalRow === undefined) return null;
  if (proposalRow === null) {
    return (
      <section className="pni-card">
        <p className="pni-hint">no proposal on this job yet.</p>
      </section>
    );
  }

  const p = proposalRow.proposal as ProposalView;
  const revision = proposalRow.revision;
  const terminal = proposalRow.state === "accepted" || proposalRow.state === "rejected" || done !== null;

  const act = async (action: "approve" | "reject") => {
    setBusy(action);
    setError(null);
    try {
      const res = await review({
        jobId,
        action,
        expectedProposalRevision: revision,
        edits:
          action === "approve"
            ? {
                renameSubjects: Object.entries(renames)
                  .map(([i, name]) => ({ index: Number(i), name }))
                  .filter((r) => r.name.trim().length > 0),
                discardSubjects: [...discarded],
                acceptOmissions: acceptOmissions || undefined,
              }
            : undefined,
      });
      setDone({ state: res.state, subjectIds: res.subjectIds, curriculumVersionIds: res.curriculumVersionIds });
    } catch (e) {
      const { code, message } = convexErrorCode(e);
      if (code === "NEEDS_REVIEW") setNeedsOmissions(true);
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="pni-card pni-review" aria-labelledby="pni-review-h">
      <h3 id="pni-review-h">
        review the proposal <span className="pni-rev">rev {revision}</span>
      </h3>

      {p.warnings.length > 0 && (
        <ul className="pni-warnings">
          {p.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <h4 className="pni-h4">suggested subjects</h4>
      <ul className="pni-subjects">
        {p.suggestedSubjects.map((s, i) => {
          const off = discarded.has(i);
          return (
            <li key={i} className={`pni-subject${off ? " is-discarded" : ""}`}>
              <label className="pni-subject-name">
                <span className="pni-confidence">{s.confidence}</span>
                <input
                  type="text"
                  defaultValue={s.name}
                  disabled={terminal || off}
                  aria-label={`Subject ${i + 1} name`}
                  onChange={(e) => setRenames((r) => ({ ...r, [i]: e.target.value }))}
                />
              </label>
              {s.explanation && <p className="pni-hint">{s.explanation}</p>}
              <p className="pni-hint">{s.segmentIds.length} cited segments</p>
              {!terminal && (
                <button
                  type="button"
                  className="pni-mini"
                  onClick={() =>
                    setDiscarded((d) => {
                      const n = new Set(d);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    })
                  }
                >
                  {off ? "keep" : "discard"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h4 className="pni-h4">concepts ({p.concepts.length})</h4>
      <ul className="pni-concepts">
        {p.concepts.map((c, i) => (
          <li key={i}>
            <strong>{c.label}</strong>
            {c.summary && <p className="pni-hint">{c.summary}</p>}
            {c.evidence.slice(0, 2).map((ev, j) => (
              <CitedSegment key={j} segmentId={ev.segmentId} />
            ))}
          </li>
        ))}
      </ul>

      {p.draftCurriculum && (
        <>
          <h4 className="pni-h4">draft curriculum</h4>
          <ul className="pni-tree">
            {p.draftCurriculum.sections.map((sec, i) => (
              <li key={i}>
                <strong>{sec.title}</strong>
                <ul>
                  {sec.units.map((u, j) => (
                    <li key={j}>
                      {u.title}
                      <ul>
                        {u.lessons.map((l, k) => (
                          <li key={k}>
                            <em>{l.title}</em> — {l.objectives.length} objectives,{" "}
                            {l.sourceSegmentIds.length} citations
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}

      {needsOmissions && (
        <label className="pni-consent">
          <input
            type="checkbox"
            checked={acceptOmissions}
            onChange={(e) => setAcceptOmissions(e.target.checked)}
          />
          some concepts or lessons cite segments outside the kept subjects —
          I'm OK dropping them.
        </label>
      )}

      {error && (
        <p className="pni-error" role="alert">
          {error}
        </p>
      )}

      {done ? (
        <div className="pni-done" role="status">
          {done.state === "accepted" ? (
            <>
              <strong>draft saved — {done.curriculumVersionIds.length} curriculum version(s)</strong>
              <p className="pni-hint">
                {done.subjectIds.length} subject(s) now hold a private draft
                curriculum. nothing is published yet.
              </p>
            </>
          ) : (
            <strong>proposal rejected</strong>
          )}
        </div>
      ) : (
        <div className="pni-actions">
          <button
            type="button"
            className="pn-cta pni-approve"
            disabled={busy !== null || terminal}
            onClick={() => act("approve")}
          >
            {busy === "approve" ? "approving…" : "approve draft"}
          </button>
          <button
            type="button"
            className="pni-reject"
            disabled={busy !== null || terminal}
            onClick={() => act("reject")}
          >
            {busy === "reject" ? "rejecting…" : "reject"}
          </button>
        </div>
      )}
    </section>
  );
}

export function IntakeReview({
  subject,
  onClose,
}: {
  subject: PearSubject | null;
  onClose: () => void;
}) {
  const createUploadUrl = useMutation(ingestApi.sources.createUploadUrl);
  const register = useMutation(ingestApi.sources.register);
  const begin = useMutation(ingestApi.learningImport.begin);
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" });
  const [jobId, setJobId] = useState<JobId | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const onFile = async (file: File) => {
    if (!ACCEPTED_MIME.has(file.type)) {
      setPhase({ kind: "error", message: `unsupported file type: ${file.type || "unknown"} — PDF or .txt only` });
      return;
    }
    if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
      setPhase({ kind: "error", message: "file is empty or over the 25 MB limit" });
      return;
    }
    setPhase({ kind: "busy", step: "uploading" });
    try {
      const { uploadUrl } = await createUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`upload failed (${res.status})`);
      const { storageId } = (await res.json()) as { storageId: string };
      setPhase({ kind: "busy", step: "registering" });
      const { sourceId, deduplicated } = await register({
        storageId: storageId as never,
        title: file.name.slice(0, 200),
        mime: file.type,
        sizeBytes: file.size,
        sha256: await sha256Hex(file),
      });
      setPhase({ kind: "busy", step: "starting import" });
      const job = await begin({ sourceId, idempotencyKey });
      setJobId(job.jobId);
      setPhase({
        kind: deduplicated ? "error" : "idle",
        message: deduplicated ? "already in your library — attached the existing source" : "",
      } as UploadPhase);
      if (deduplicated) setPhase({ kind: "idle" });
    } catch (e) {
      setPhase({ kind: "error", message: convexErrorCode(e).message });
    }
  };

  const status = useQuery(
    ingestApi.learningImport.getStatus,
    jobId ? { jobId } : "skip",
  );

  return (
    <div className="pni-sheet" role="dialog" aria-modal="true" aria-label="Add material">
      <div className="pni-head">
        <div>
          <span className="pn-kicker">sources</span>
          <h3 className="pni-title">{subject?.name ?? "add material"}</h3>
        </div>
        <button type="button" className="pn-icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <UploadCard
        busy={phase.kind === "busy"}
        onFile={onFile}
        error={phase.kind === "error" ? phase.message : null}
      />
      {phase.kind === "busy" && (
        <p className="pni-hint" role="status">{phase.step}…</p>
      )}

      {jobId && <StatusCard jobId={jobId} />}
      {jobId && status?.state === "needs_review" && <ProposalReview jobId={jobId} />}
    </div>
  );
}
