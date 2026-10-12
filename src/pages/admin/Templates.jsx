import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { Badge, Modal, useConfirm, useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

export function SaveTemplate({ examId }) {
  const { cq } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState(""), [visibility, setVisibility] = useState("private"), [busy, setBusy] = useState(false);
  return <details className="card pad" style={{ margin: "16px 0" }}>
    <summary>Save as reusable assessment template</summary>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await api("POST", `/api/zyphor/admin/exams/${examId}/template` + cq(), { name, visibility }); toast("Template saved", "success"); setName(""); }
      catch(e) { toast(e.message, "error"); }
      finally { setBusy(false); }
    }}>
      <label>Template name<input value={name} onChange={e => setName(e.target.value)} required minLength={3} maxLength={255} /></label>
      <label>Sharing<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="private">Private to this college/event</option><option value="public">Shared with all Zyphor assessment admins</option></select></label>
      <p className="small muted">Templates copy questions, answer keys, test cases, paper variants and exam settings. No participants, attempts or results are copied. Shared templates let other admins copy the assessment into their own organization.</p>
      {visibility === "public" && <label><input type="checkbox" required /> I am authorized to share these questions, answer keys and test cases with other organizations.</label>}
      <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save template"}</button>
    </form>
  </details>;
}

export default function Templates() {
  const { collegeId, cq } = useAdmin();
  const navigate = useNavigate(), toast = useToast(), confirm = useConfirm();
  const [rows, setRows] = useState([]), [error, setError] = useState("");
  const [selected, setSelected] = useState(null), [title, setTitle] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState(""), [busy, setBusy] = useState(false);
  const load = () => api("GET", "/api/zyphor/admin/templates" + cq()).then(r => { setRows(r); setError(""); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, [collegeId]);
  return <>
    <h1>Assessment templates</h1>
    <p className="lede">Reuse private assessments or copy a shared template. Every copy starts unpublished with results hidden.</p>
    {error && <p role="alert">{error} <button className="btn" onClick={load}>Retry</button></p>}
    {!rows.length && !error && <p>No templates yet. Open an exam builder and choose “Save as reusable assessment template”.</p>}
    <div className="grid cols-2">{rows.map(row => <article className="card pad" key={row.id}>
      <h3>{row.name} <Badge>{row.visibility === "public" ? "Shared" : "Private"}</Badge></h3>
      <p>{row.questions} questions · {row.duration_minutes} minutes · {row.exam_type}</p>
      <div className="row"><button className="btn primary" onClick={() => { setSelected(row); setTitle(row.name); }}>Use template</button>
        {row.college_id === collegeId && <button className="btn" onClick={async () => {
          if (!await confirm("Remove template", "Remove this template from the catalog? Existing exam copies remain available.", "Remove")) return;
          try { await api("DELETE", `/api/zyphor/admin/templates/${row.id}` + cq()); await load(); }
          catch(e) { toast(e.message, "error"); }
        }}>Remove</button>}
      </div>
    </article>)}</div>
    {selected && <Modal title="Create exam from template" onClose={() => setSelected(null)}>
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true);
        try {
          const r = await api("POST", `/api/zyphor/admin/templates/${selected.id}/use` + cq(), {
            title, start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(), duration_minutes: selected.duration_minutes,
          });
          navigate(`/console/exams/${r.exam_id}`);
        } catch(e) { toast(e.message, "error"); }
        finally { setBusy(false); }
      }}>
        <label>Exam title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} required /></label>
        <label>Starts (your local time)<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required /></label>
        <label>Ends (your local time)<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required /></label>
        <button className="btn primary" disabled={busy}>{busy ? "Copying…" : "Create unpublished exam"}</button>
      </form>
    </Modal>}
  </>;
}
