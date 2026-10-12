import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, useToast } from "../../components/ui.jsx";

export default function QuestionChallenges({ attemptId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [itemId, setItemId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/api/zyphor/student/attempts/${attemptId}/challenges`;
  const load = () => api("GET", path).then(d => { setData(d); setError(""); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, [attemptId]);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      await api("POST", path, { item_id: Number(itemId), reason });
      setReason(""); setItemId(""); await load(); toast("Challenge sent for review", "success");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  }
  return <section className="card pad" style={{ marginTop: 20 }}>
    <h3>Question challenges</h3>
    <p className="small muted">Request a review of a question or its awarded marks. An authorized exam admin reviews your request.</p>
    {error && <p role="alert">{error} <button className="btn sm" onClick={load}>Retry</button></p>}
    {data && <>
      {data.challenges.map(c => <div key={c.id} className="card pad-sm" style={{ marginBottom: 8 }}>
        <strong>Question {data.questions.find(q => q.item_id === c.item_id)?.number}</strong> <Badge>{c.status}</Badge>
        <p style={{ whiteSpace: "pre-wrap" }}>{c.reason}</p>
        {c.resolution && <p><strong>Decision:</strong> {c.resolution} · Marks: {c.previous_marks} → {c.awarded_marks}</p>}
      </div>)}
      <form onSubmit={submit}>
        <label htmlFor="challenge-question">Question</label>
        <select id="challenge-question" required value={itemId} onChange={e => setItemId(e.target.value)}>
          <option value="">Select a question</option>
          {data.questions.filter(q => !data.challenges.some(c => c.item_id === q.item_id)).map(q =>
            <option key={q.item_id} value={q.item_id}>Question {q.number} · {q.section}</option>)}
        </select>
        <label htmlFor="challenge-reason">Reason for review</label>
        <textarea id="challenge-reason" required minLength={10} maxLength={3000} value={reason} onChange={e => setReason(e.target.value)} />
        <button className="btn primary" disabled={busy || !itemId}>{busy ? "Sending…" : "Request re-evaluation"}</button>
      </form>
    </>}
  </section>;
}
