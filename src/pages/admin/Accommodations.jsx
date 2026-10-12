import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

export default function Accommodations({ examId }) {
  const { collegeId, cq } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState([]), [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState(""), [minutes, setMinutes] = useState(15);
  const [cameraExempt, setCameraExempt] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const path = `/api/zyphor/admin/exams/${examId}/accommodations`;
  async function load() {
    try {
      const [a, s] = await Promise.all([api("GET", path + cq()), api("GET", "/api/zyphor/admin/students" + cq({ page_size: 500 }))]);
      setRows(a); setStudents(s.items); setError("");
    } catch(e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [examId, collegeId]);
  return <details className="card pad" style={{ margin: "16px 0" }}>
    <summary>Exam accommodations</summary>
    <p className="small muted">Set extra time before a student starts. This extends their server deadline beyond the normal scheduled deadline. Ending the exam manually still submits every attempt.</p>
    {error && <p role="alert">{error} <button className="btn sm" onClick={load}>Retry</button></p>}
    {rows.map(r => <p key={r.student_id}>{r.name} · {r.roll_no}: {r.extra_minutes} extra minutes{r.camera_exempt ? " · camera alternative approved" : ""}</p>)}
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await api("PUT", `${path}/${studentId}` + cq(), { extra_minutes: Number(minutes), camera_exempt: cameraExempt }); await load(); toast("Accommodation saved", "success"); }
      catch(e) { toast(e.message, "error"); }
      finally { setBusy(false); }
    }}>
      <label>Student<select required value={studentId} onChange={e => {
        setStudentId(e.target.value);
        const existing = rows.find(r => String(r.student_id) === e.target.value);
        setMinutes(existing?.extra_minutes ?? 0); setCameraExempt(!!existing?.camera_exempt);
      }}><option value="">Select student</option>
        {students.map(s => <option value={s.id} key={s.id}>{s.roll_no} · {s.name}</option>)}
      </select></label>
      <label>Extra minutes (0 removes extra time)<input required type="number" min={0} max={240} value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
      <label><input type="checkbox" checked={cameraExempt} onChange={e => setCameraExempt(e.target.checked)} /> Approve an alternative to camera monitoring</label>
      <p className="small muted">Arrange an accessible supervision method with this student. Approval exempts camera checks for this exam; the timer, tab and fullscreen rules still apply.</p>
      <button className="btn primary" disabled={busy || !studentId}>{busy ? "Saving…" : "Save accommodation"}</button>
    </form>
  </details>;
}
