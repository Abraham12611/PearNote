import { useState } from "react";
import { useMutation } from "convex/react";
import { ingestApi, convexErrorCode } from "./api";
import "./ingestion.css";

/** Real subject creation — `subjects.createManual` (Issue #24).
 *  Only mounted inside a Convex provider (live mode). */
export function CreateSubjectSheet({
  open,
  onCreated,
  onClose,
}: {
  open: boolean;
  onCreated: (subjectId: string) => void;
  onClose: () => void;
}) {
  const createManual = useMutation(ingestApi.subjects.createManual);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const { subjectId } = await createManual({ name: trimmed });
      onCreated(subjectId);
    } catch (e) {
      setError(convexErrorCode(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pni-sheet" role="dialog" aria-modal="true" aria-label="New subject">
      <div className="pni-head">
        <div>
          <span className="pn-kicker">new subject</span>
          <h3 className="pni-title">name your subject</h3>
        </div>
        <button type="button" className="pn-icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <section className="pni-card">
        <label className="pni-hint" htmlFor="pni-subject-name">
          this creates a real, private subject on your account — it starts
          empty until you add material.
        </label>
        <input
          id="pni-subject-name"
          className="pni-subject-name"
          style={{ marginTop: 8, width: "100%", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "var(--pn-on-dark)", padding: "8px 10px", font: "inherit", fontWeight: 700 }}
          type="text"
          maxLength={120}
          placeholder="e.g. Cell biology"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
        {error && <p className="pni-error" role="alert">{error}</p>}
        <div className="pni-actions">
          <button
            type="button"
            className="pn-cta pni-approve"
            disabled={busy || !name.trim()}
            onClick={() => void submit()}
          >
            {busy ? "creating…" : "create subject"}
          </button>
        </div>
      </section>
    </div>
  );
}
