import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, qs, homeFor } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { Badge, Brand, Loading, Modal, useToast } from "../components/ui.jsx";

export function MoodleWorkspace({ collegeId }) {
  const { user } = useAuth();
  const toast = useToast();
  const admin = ["super_admin", "college_admin"].includes(user.role);
  const [status, setStatus] = useState(null), [courses, setCourses] = useState([]), [error, setError] = useState("");
  const [busy, setBusy] = useState(null), [catalog, setCatalog] = useState(null), [selected, setSelected] = useState(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const version = ++request.current;
    try {
      const [connection, list] = await Promise.all([api("GET", "/api/zyphor/moodle/status"),
        api("GET", "/api/zyphor/moodle/courses" + qs({ college_id: collegeId }))]);
      if (version === request.current) { setStatus(connection); setCourses(list); setError(""); }
    } catch (e) { if (version === request.current) setError(e.message); }
  }, [collegeId]);
  useEffect(() => { setStatus(null); setCourses([]); load(); return () => { request.current++; }; }, [load]);
  async function openCourse(course) {
    const name = `zyphor_moodle_${Date.now()}`;
    const popup = window.open("about:blank", name);
    if (!popup) { toast("Allow this site's course window and try again.", "error"); return; }
    setBusy(course.id);
    try {
      const launch = await api("POST", `/api/zyphor/moodle/courses/${course.id}/launch`);
      const action = new URL(launch.action);
      if (action.protocol !== "https:" || action.href !== status.moodle_url + "/enrol/lti/login.php") throw new Error("Unexpected Moodle launch address");
      const form = document.createElement("form");
      form.method = "POST"; form.action = action.href; form.target = name;
      for (const [key, value] of Object.entries(launch.fields)) {
        const input = document.createElement("input"); input.type = "hidden"; input.name = key; input.value = String(value); form.appendChild(input);
      }
      document.body.appendChild(form); form.submit(); form.remove();
      popup.opener = null;
    } catch (e) { popup.close(); toast(e.message, "error"); }
    finally { setBusy(null); }
  }
  async function linkCourse(id) {
    setBusy("link");
    try {
      await api("POST", "/api/zyphor/moodle/admin/courses" + qs({ college_id: collegeId }), { moodle_id: id });
      setCatalog(null); await load(); toast("Moodle course linked to this organization", "success");
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy(null); }
  }
  return <>
    <div className="page-head row between wrap"><div><h1>Moodle Learning Hub</h1>
      <p className="lede">Open your courses without another login. Coding exams, proctoring and detailed reports stay in Zyphor.</p></div>
      <button className="btn sm" onClick={load}>Refresh</button></div>
    {error && <p className="card pad" role="alert">{error} <button className="btn sm" onClick={load}>Retry</button></p>}
    {!status && !error ? <Loading /> : status && <>
      <p><Badge color={status.enabled ? "green" : "amber"}>{status.enabled ? "Signed LTI connection" : "Setup required"}</Badge>
        <span className="muted small"> · LTI 1.3 / LTI Advantage</span></p>
      {!status.enabled && <p role="status">{status.message}. Ask your administrator to check the laptop's Moodle connection log.</p>}
      <p className="small muted">Your name and a platform identifier are synchronized to the assigned Moodle course. Your Zyphor password, exam answers and hidden test cases are not sent. Course grades are shown separately from Zyphor assessment marks.</p>
      {user.role === "super_admin" && <button className="btn primary" disabled={!status.enabled || busy !== null} onClick={() =>
        api("GET", "/api/zyphor/moodle/admin/catalog").then(setCatalog).catch(e => toast(e.message, "error"))}>Link a Moodle course</button>}
      {!courses.length && <div className="card pad" style={{ marginTop: 16 }}><h3>No assigned courses</h3>
        <p className="muted">{admin ? "A Superadmin can link a published Moodle course to this organization. Then enroll participants and link Zyphor exams." : "Your organizer will assign Moodle courses here."}</p></div>}
      <div className="grid cols-2" style={{ marginTop: 20 }}>{courses.map(course => <article className="card pad" key={course.id}>
        <Badge>{course.shortname}</Badge><h2>{course.title}</h2>
        {course.result && <p>Moodle course grade: {course.result.score === null ? "Awaiting grading" : `${course.result.score} / ${course.result.maximum}`}
          <span className="small muted"> · {course.result.progress}</span></p>}
        <div className="row wrap"><button className="btn primary" disabled={!status.enabled || busy !== null} onClick={() => openCourse(course)}>
          {busy === course.id ? "Opening…" : "Open Moodle course"}</button>
          {admin && <button className="btn" onClick={() => setSelected(course)}>Manage enrolments & exams</button>}</div>
      </article>)}</div>
    </>}
    {catalog && <Modal title="Link a published Moodle course" onClose={() => setCatalog(null)}>
      <p>Each Moodle course belongs to one Zyphor organization. This does not enroll participants automatically.</p>
      {!catalog.length && <p>No courses are published for LTI access in Moodle.</p>}
      {catalog.map(row => <div className="card pad-sm row between" key={row.id}><span>{row.title} · {row.shortname}</span>
        <button className="btn sm" disabled={busy !== null} onClick={() => linkCourse(row.id)}>Link course</button></div>)}
    </Modal>}
    {selected && <ManageCourse course={selected} collegeId={collegeId} onClose={() => { setSelected(null); load(); }} />}
  </>;
}

function ManageCourse({ course, collegeId, onClose }) {
  const toast = useToast();
  const [roster, setRoster] = useState(null), [ids, setIds] = useState(new Set()), [exams, setExams] = useState([]);
  const [linked, setLinked] = useState([]), [examId, setExamId] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const base = `/api/zyphor/moodle/admin/courses/${course.id}`;
  const load = async () => {
    try {
      const [members, links, available] = await Promise.all([api("GET", base + "/enrollments"), api("GET", base + "/exams"),
        api("GET", "/api/zyphor/admin/exams" + qs({ college_id: collegeId }))]);
      setRoster(members); setIds(new Set(members.filter(m => m.enrolled).map(m => m.id))); setLinked(links); setExams(available); setError("");
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [course.id]);
  async function run(action, message) {
    setBusy(true);
    try { const result = await action(); toast(result?.error || message, result?.error ? "error" : "success"); await load(); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  }
  return <Modal title={`Manage ${course.title}`} wide onClose={onClose}>
    {error && <p role="alert">{error} <button className="btn sm" onClick={load}>Retry</button></p>}
    {!roster ? <Loading /> : <>
      <h3>Course enrolments</h3><p className="small muted">Only selected students receive course access. Saving synchronizes identities and enrolments to Moodle. Background synchronization also handles account changes.</p>
      <div className="row wrap"><button className="btn sm" disabled={busy} onClick={() => setIds(new Set(roster.map(r => r.id)))}>Select all</button>
        <button className="btn sm" disabled={busy} onClick={() => setIds(new Set())}>Clear selection</button><span>{ids.size} selected</span></div>
      <div style={{ maxHeight: 280, overflow: "auto", margin: "12px 0" }}>{roster.map(row => <label key={row.id} style={{ display: "block", padding: 7 }}>
        <input type="checkbox" disabled={busy} checked={ids.has(row.id)} onChange={e => setIds(current => { const next = new Set(current); e.target.checked ? next.add(row.id) : next.delete(row.id); return next; })} /> {row.name} · {row.roll_no}
      </label>)}</div>
      <button className="btn primary" disabled={busy} onClick={() => run(() => api("PUT", base + "/enrollments", { student_ids: [...ids] }, { timeoutMs: 120000 }), "Course roster synchronized")}>Save & synchronize enrolments</button>
      <h3 style={{ marginTop: 24 }}>Zyphor assessments in Moodle</h3>
      <p className="small muted">Assessment links launch Zyphor through signed SSO. Only authorized released grades are sent. Moodle gradebook scores use a 0–100 scale; original marks and detailed reports stay in Zyphor.</p>
      <div className="row wrap"><select aria-label="Assessment to link" value={examId} onChange={e => setExamId(e.target.value)}>
        <option value="">Choose a Zyphor exam</option>{exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select>
        <button className="btn" disabled={busy || !examId} onClick={() => run(() => api("POST", `${base}/exams/${examId}`), "Assessment details synchronized")}>Link / refresh assessment</button></div>
      {linked.map(row => <div className="card pad-sm" style={{ marginTop: 12 }} key={row.exam_id}><strong>{row.title}</strong>
        <p className="small">{row.released ? "Released in Zyphor" : "Results not released"} · Moodle gradebook {row.grades_visible ? "visible" : "hidden"}</p>
        <button className="btn sm" disabled={busy} onClick={() => run(() => api("POST", `/api/zyphor/moodle/admin/exams/${row.exam_id}/sync-results`, null, { timeoutMs: 120000 }), "Grade synchronization checked")}>Sync results / retry</button>
        {row.deliveries.map(delivery => <p className="small muted" key={delivery.attempt_id}>Attempt #{delivery.attempt_id}: {delivery.status}{delivery.last_error ? ` · ${delivery.last_error}` : ""}</p>)}
      </div>)}
    </>}
  </Modal>;
}

export default function MoodlePortal() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]), [eventId, setEventId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (user.role === "coordinator") api("GET", "/api/zyphor/coordinator/events").then(rows => {
      if (active) { setEvents(rows); setEventId(String(rows[0]?.id || "")); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user.role]);
  return <main className="wrap" style={{ maxWidth: 1100, margin: "24px auto", padding: 24 }}>
    <div className="row between wrap" style={{ marginBottom: 20 }}><Brand sub="Learning Hub" /><Link className="btn" to={homeFor(user.role)}>Back to dashboard</Link></div>
    {error && <p role="alert">{error}</p>}
    {user.role === "coordinator" && <label>Assigned event<select value={eventId} onChange={e => setEventId(e.target.value)}>
      {events.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
    {(user.role !== "coordinator" || eventId) && <MoodleWorkspace collegeId={eventId || undefined} />}
  </main>;
}

export function LtiLaunch() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
    window.history.replaceState(null, "", window.location.pathname);
    if (!code) { setError("This launch link is missing or expired. Open the assessment from Moodle again."); return; }
    api("POST", "/api/zyphor/lti/tool/exchange", { code }, { noRedirect: true }).then(result => {
      refresh(result.access_token, result.user); navigate(result.target, { replace: true });
    }).catch(e => setError(e.message));
  }, [refresh, navigate]);
  return <main className="wrap" style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}><h1>Opening your Zyphor assessment</h1>
    {error ? <p role="alert">{error} <Link to="/login">Return to sign in</Link></p> : <Loading label="Verifying Moodle launch…" />}</main>;
}
