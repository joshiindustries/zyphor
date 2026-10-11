import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { Badge, Field, Loading, useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

const initialSheet = {
  title: "Exam evaluation",
  instructions: "Please share your feedback about this exam. Ratings range from 1 (poor) to 5 (excellent).",
  questions: [
    { id: "clarity", prompt: "The exam instructions and questions were clear.", kind: "rating", required: true },
    { id: "difficulty", prompt: "How would you rate the overall difficulty?", kind: "rating", required: true },
    { id: "organization", prompt: "The exam was well organized.", kind: "rating", required: true },
    { id: "comments", prompt: "What could be improved for future exams?", kind: "text", required: false },
  ],
};

export default function EvaluationSheetAdmin() {
  const { examId } = useParams();
  const { cq, isSuper, org } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialSheet);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canApprove = !isSuper && org?.org_type === "event";
  const path = `/api/zyphor/admin/exams/${examId}/evaluation-sheet`;

  const load = useCallback(async () => {
    try {
      const value = await api("GET", path + cq());
      setData(value);
      setForm(value.sheet ? {
        title: value.sheet.title,
        instructions: value.sheet.instructions || "",
        questions: value.sheet.questions || [],
      } : initialSheet);
      setError("");
    } catch (err) { setError(err.message); }
  }, [path, cq]);

  useEffect(() => { load(); }, [load]);

  function changeQuestion(index, changes) {
    setForm((current) => ({ ...current, questions: current.questions.map((q, i) => i === index ? { ...q, ...changes } : q) }));
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await api("PUT", path + cq(), form);
      setData(saved);
      toast("Evaluation sheet saved as a draft. Event Admin approval is required before students can access it.", "success", 6000);
    } catch (err) { toast(err.message, "error", 6000); }
    finally { setBusy(false); }
  }

  async function setApproval(approved) {
    setBusy(true);
    try {
      setData(await api("PUT", `${path}/approval` + cq(), { approved }));
      toast(approved ? "Evaluation sheet approved and released to completed participants" : "Evaluation sheet approval revoked", "success");
    } catch (err) { toast(err.message, "error", 6000); }
    finally { setBusy(false); }
  }

  if (!data && !error) return <Loading />;
  return <div>
    <div className="page-head"><h1>Post-exam evaluation</h1><p className="lede">Create a feedback sheet for completed participants. Students can access it only after Event Admin approval.</p></div>
    {error && <div className="card" style={{ color: "var(--danger)" }}>{error}</div>}
    {data && <>
      <section className="card">
        <div className="row between wrap">
          <div><h2 style={{ marginBottom: 6 }}>Publication status</h2>
            {data.sheet?.is_approved
              ? <Badge color="green">Approved · visible to completed participants</Badge>
              : <Badge color="amber">Draft · hidden from students</Badge>}
            {!!data.responses.length && <p className="small muted">{data.responses.length} participant response(s). The sheet is locked against edits after the first response.</p>}
          </div>
          <div className="row tight wrap">
            <button className="btn primary" onClick={save} disabled={busy || !!data.responses.length}>Save draft</button>
            {canApprove && data.sheet && <button className={`btn ${data.sheet.is_approved ? "danger" : "primary"}`} onClick={() => setApproval(!data.sheet.is_approved)} disabled={busy}>
              {data.sheet.is_approved ? "Revoke approval" : "Approve & release"}
            </button>}
          </div>
        </div>
        {!canApprove && <p className="small muted">Only the Event Admin can approve or revoke publication. Super Admins and college admins can prepare the draft.</p>}
      </section>

      <section className="card">
        <Field label="Sheet title"><input value={form.title} maxLength={255} disabled={!!data.responses.length} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Instructions"><textarea rows={3} maxLength={2000} value={form.instructions} disabled={!!data.responses.length} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
        <div className="row between wrap"><h2>Questions ({form.questions.length}/20)</h2>
          <button className="btn sm" disabled={form.questions.length >= 20 || !!data.responses.length} onClick={() => setForm({ ...form, questions: [...form.questions, { id: `q-${crypto.randomUUID()}`, prompt: "", kind: "rating", required: true }] })}>Add question</button>
        </div>
        {form.questions.map((question, index) => <div className="card pad-sm" key={question.id} style={{ marginBottom: 10 }}>
          <div className="row between wrap"><strong>Question {index + 1}</strong>
            <div className="row tight">
              <select value={question.kind} disabled={!!data.responses.length} onChange={(e) => changeQuestion(index, { kind: e.target.value })}>
                <option value="rating">Rating 1–5</option><option value="text">Written response</option>
              </select>
              <label className="row small"><input type="checkbox" checked={question.required} disabled={!!data.responses.length} onChange={(e) => changeQuestion(index, { required: e.target.checked })} /> Required</label>
              <button className="btn danger sm" disabled={form.questions.length <= 1 || !!data.responses.length} onClick={() => setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) })}>Remove</button>
            </div>
          </div>
          <Field label="Prompt"><input value={question.prompt} maxLength={500} disabled={!!data.responses.length} onChange={(e) => changeQuestion(index, { prompt: e.target.value })} /></Field>
        </div>)}
        {!!data.responses.length && <p className="small muted">Questions are locked once participants respond so their answers remain tied to the original sheet.</p>}
      </section>

      <section className="card"><h2>Participant responses ({data.responses.length})</h2>
        {!data.responses.length ? <p className="muted">No responses yet. Identified responses will appear here after students submit.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Participant</th><th>Roll / team ID</th><th>Submitted</th><th>Answers</th></tr></thead>
          <tbody>{data.responses.map((response) => <tr key={response.attempt_id}>
            <td>{response.participant_name}</td><td>{response.roll_no || "—"}</td><td>{new Date(response.submitted_at).toLocaleString()}</td>
            <td>{form.questions.map((q) => <div key={q.id} className="small"><strong>{q.prompt}</strong>: {response.answers[q.id] ?? "—"}{q.kind === "rating" && response.answers[q.id] != null ? "/5" : ""}</div>)}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </>}
  </div>;
}
