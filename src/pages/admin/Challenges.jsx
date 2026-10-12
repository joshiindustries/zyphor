import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

function Review({ row, onReview }) {
  const [decision, setDecision] = useState("rejected");
  const [resolution, setResolution] = useState("");
  const [marks, setMarks] = useState("");
  const [busy, setBusy] = useState(false);
  return <article className="card pad-sm" style={{ marginTop: 10 }}>
    <strong>{row.student_name} · {row.roll_no} · Question ID {row.item_id}</strong> <Badge>{row.status}</Badge>
    <p style={{ whiteSpace: "pre-wrap" }}>{row.reason}</p>
    {row.status === "pending" ? <form onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await onReview(row.id, { decision, resolution, awarded_marks: decision === "accepted" ? Number(marks) : null }); }
      finally { setBusy(false); }
    }}>
      <label>Decision<select value={decision} onChange={e => setDecision(e.target.value)}><option value="rejected">Reject</option><option value="accepted">Accept and update marks</option></select></label>
      {decision === "accepted" && <label>New question marks<input type="number" step="0.01" required value={marks} onChange={e => setMarks(e.target.value)} /></label>}
      <label>Reason for decision<textarea required minLength={10} maxLength={3000} value={resolution} onChange={e => setResolution(e.target.value)} /></label>
      <p className="small muted">This decision is final and audited. Accepted marks apply to this participant only. Review the attempt before changing marks.</p>
      <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Record decision"}</button>
    </form> : <p>{row.resolution} · Marks {row.previous_marks} → {row.awarded_marks}</p>}
  </article>;
}

export default function Challenges({ examId, onChanged }) {
  const { collegeId, cq } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const load = () => api("GET", `/api/zyphor/admin/exams/${examId}/challenges` + cq()).then(r => { setRows(r); setError(""); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, [examId, collegeId]);
  async function review(id, body) {
    try {
      await api("PUT", `/api/zyphor/admin/challenges/${id}/review` + cq(), body);
      toast("Review recorded; totals recalculated", "success"); await load(); onChanged?.();
    } catch (e) { toast(e.message, "error"); }
  }
  return <details className="card pad" style={{ margin: "20px 0" }}>
    <summary>Question challenges · {rows.filter(r => r.status === "pending").length} pending</summary>
    {error && <p role="alert">{error} <button className="btn sm" onClick={load}>Retry</button></p>}
    {!error && !rows.length && <p className="muted">No challenges submitted.</p>}
    {rows.map(row => <Review key={row.id} row={row} onReview={review} />)}
  </details>;
}
