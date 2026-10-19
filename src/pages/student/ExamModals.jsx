import { Modal, Spinner, Badge, Markdown } from "../../components/ui.jsx";
import { isAnswered } from "./examState.js";

export function FullscreenOverlay({
  violations,
  maxViol,
  onReturn,
  toast,
}) {
  return (
    <div className="overlay">
      <div className="box">
        <h2>⚠ You left fullscreen</h2>
        <p>This has been recorded as a violation (<strong>{violations}/{maxViol}</strong>). Your timer is still running.</p>
        <p>Return to fullscreen to continue your exam.</p>
        <button className="btn primary" onClick={async () => {
          try { await onReturn(); }
          catch { toast("Fullscreen was blocked by the browser. Try again.", "error"); }
        }}>Return to fullscreen</button>
      </div>
    </div>
  );
}

export function ViolationWarningModal({
  warning,
  maxViol,
  onClose,
  VIOLATION_TEXT,
}) {
  if (!warning) return null;
  return (
    <Modal title="Warning: violation recorded" narrow onClose={onClose}
           actions={<button className="btn primary" onClick={onClose}>I understand</button>}>
      <p><strong>{VIOLATION_TEXT[warning.type] || warning.type}.</strong></p>
      <p>
        This has been recorded and reported to the organizers.{" "}
        {warning.left > 0 && (
          <>
            <strong>{warning.left}</strong> more violation{warning.left === 1 ? "" : "s"} and your
            exam will be submitted automatically.
          </>
        )}
      </p>
    </Modal>
  );
}

export function InstructionsModal({
  show,
  instructions,
  violations,
  maxViol,
  onClose,
}) {
  if (!show) return null;
  return (
    <Modal title="Instructions" onClose={onClose}>
      <Markdown>{instructions || "No additional instructions."}</Markdown>
      <p className="muted small">Violations so far: {violations} of {maxViol} allowed.</p>
    </Modal>
  );
}

export function SubmitConfirmModal({
  paper,
  mcq,
  code,
  submitting,
  onCancel,
  onConfirm,
}) {
  const items = paper.items;
  const answered = items.filter((it) => isAnswered(it, mcq, code)).length;
  const review = items.filter((it) => it.type === "mcq" && mcq[it.item_id]?.review).length;
  const ungraded = items.filter(
    (it) => it.type === "coding" && isAnswered(it, mcq, code) && !code[it.item_id]?.result
  ).length;

  return (
    <Modal
      title="Submit exam?"
      onClose={onCancel}
      actions={
        <>
          <button className="btn" onClick={onCancel} disabled={submitting}>Keep working</button>
          <button className="btn danger solid" onClick={onConfirm} disabled={submitting}>
            {submitting ? <><Spinner /> Submitting</> : "Submit exam"}
          </button>
        </>
      }
    >
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Section</th><th className="num">Answered</th><th className="num">Not answered</th></tr></thead>
          <tbody>
            {paper.sections.map((sec) => {
              const its = items.filter((i) => i.section === sec);
              const a = its.filter((it) => isAnswered(it, mcq, code)).length;
              return (
                <tr key={sec}><td>{sec}</td><td className="num">{a}</td><td className="num">{its.length - a}</td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>{answered} of {items.length} answered{review ? ` · ${review} marked for review` : ""}.</p>
      {ungraded > 0 && (
        <p className="small" style={{ color: "var(--warning)" }}>
          {ungraded} coding answer(s) were not submitted with "Submit code". They will be graded
          automatically now.
        </p>
      )}
      <p><strong>You can't change your answers after submitting.</strong></p>
    </Modal>
  );
}