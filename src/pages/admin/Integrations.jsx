import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";
import { Loading, useToast } from "../../components/ui.jsx";

function editorLanguage(name) {
  const value = name.toLowerCase();
  if (value.includes("python")) return "python";
  if (value.includes("javascript") || value.includes("node.js")) return "javascript";
  if (value.includes("java")) return "java";
  if (value.includes("c++") || value.includes("gnu c++")) return "cpp";
  if (value === "c" || value.startsWith("c ") || value.includes("gnu c")) return "c";
  return null;
}

export default function Integrations() {
  const { user } = useAuth();
  const isSuper = user.role === "super_admin";
  const toast = useToast();
  const [platform, setPlatform] = useState(null);
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminIds, setAdminIds] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState(null);
  const [monitoring, setMonitoring] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [global, list] = await Promise.all([
        isSuper ? api("GET", "/api/zyphor/integrations/platform") : Promise.resolve(null),
        isSuper ? api("GET", "/api/zyphor/integrations/super/exams") : api("GET", "/api/zyphor/admin/exams"),
      ]);
      setPlatform(global);
      setExams(list.map((e) => ({ id: e.id, title: e.title, college: e.college || "", allowed: e.allowed_languages || ["python", "cpp", "c", "java", "javascript"] })));
    } catch (err) { toast(err.message, "error"); }
  }, [isSuper, toast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!examId) { setCfg(null); return; }
    let active = true;
    Promise.all([
      api("GET", `/api/zyphor/integrations/exams/${examId}/config`),
      isSuper ? api("GET", `/api/zyphor/integrations/exams/${examId}/admins`) : Promise.resolve([]),
    ]).then(([c, a]) => {
      if (!active) return;
      setCfg(c); setAdmins(a); setAdminIds(c.authorized_admin_ids || []); setSelectedLangs(null);
      if (c.judge0_authorized) api("GET", `/api/zyphor/integrations/exams/${examId}/available-languages`)
        .then((rows) => { if (active) setLanguages(rows); }).catch(() => setLanguages([]));
      else setLanguages([]);
      api("GET", `/api/zyphor/integrations/audit?exam_id=${examId}`).then((rows) => { if (active) setAuditRows(rows); }).catch(() => setAuditRows([]));
      api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring`).then((rows) => { if (active) setMonitoring(rows); }).catch(() => setMonitoring([]));
      api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring/sessions`).then((rows) => { if (active) setActiveSessions(rows); }).catch(() => setActiveSessions([]));
      api("GET", `/api/zyphor/integrations/exams/${examId}/judge-submissions`).then((rows) => { if (active) setSubmissions(rows); }).catch(() => setSubmissions([]));
    }).catch((err) => { if (active) { setCfg(null); toast(err.message, "error"); } });
    return () => { active = false; };
  }, [examId, isSuper, toast]);

  async function savePlatform() {
    setBusy(true);
    try { setPlatform(await api("PUT", "/api/zyphor/integrations/platform", platform)); toast("Platform switches saved", "success"); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function saveAuth() {
    setBusy(true);
    try {
      await api("PUT", `/api/zyphor/integrations/exams/${examId}/authorization`, {
        mediapipe_authorized: cfg.mediapipe_authorized,
        judge0_authorized: cfg.judge0_authorized,
        authorized_admin_ids: adminIds,
      });
      toast("Event authorization saved", "success");
    } catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function saveConfig() {
    setBusy(true);
    try {
      const next = await api("PUT", `/api/zyphor/integrations/exams/${examId}/config`, {
        mediapipe_enabled: cfg.mediapipe_enabled,
        mediapipe_no_face_seconds: cfg.mediapipe_policy?.no_face_seconds || 10,
        mediapipe_multi_face_seconds: cfg.mediapipe_policy?.multi_face_seconds || 3,
        mediapipe_warning_limit: cfg.mediapipe_policy?.warning_limit || 3,
        mediapipe_privacy_policy_url: cfg.mediapipe_policy?.privacy_policy_url || "",
        judge0_enabled: cfg.judge0_enabled,
        judge0_languages: selectedLangs ?? (cfg.judge0_languages || []),
        cpu_time_limit: cfg.cpu_time_limit || 5,
        memory_limit_kb: cfg.memory_limit_kb || 128000,
        retention_days: cfg.retention_days || 30,
        max_runs_per_student: cfg.max_runs_per_student || 100,
      });
      setCfg(next); toast("Event settings saved", "success");
    } catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function clearMonitoring() {
    if (!window.confirm("Delete all stored MediaPipe monitoring events for this exam? This cannot be undone.")) return;
    try {
      await api("DELETE", `/api/zyphor/integrations/exams/${examId}/monitoring`);
      setMonitoring([]); toast("Monitoring records deleted", "success");
    } catch (err) { toast(err.message, "error"); }
  }
  async function refreshSessions() {
    try { setActiveSessions(await api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring/sessions`)); }
    catch (err) { toast(err.message, "error"); }
  }

  if (isSuper && !platform) return <Loading />;
  return <div className="page">
    <div className="page-head"><h1>Integrations</h1><p className="lede">Super Admin authorization and per-exam settings for local face monitoring and Judge0 execution.</p></div>
    {isSuper && <section className="card">
      <h2>Platform controls</h2>
      <label className="check"><input type="checkbox" checked={platform.mediapipe_enabled} onChange={(e) => setPlatform({ ...platform, mediapipe_enabled: e.target.checked })} /> MediaPipe platform switch <span className="muted small">{platform.mediapipe_configured ? "browser integration available" : "disabled by server environment"}</span></label>
      <label className="check"><input type="checkbox" checked={platform.judge0_enabled} onChange={(e) => setPlatform({ ...platform, judge0_enabled: e.target.checked })} /> Judge0 platform switch <span className="muted small">{platform.judge0_configured ? platform.judge0_healthy ? "service healthy" : "service unavailable" : "configure JUDGE0_BASE_URL and enable in backend environment"}</span></label>
      <p className="small muted">Authorized exams: MediaPipe {platform.mediapipe_authorized_exams} · Judge0 {platform.judge0_authorized_exams} · monitoring records {platform.monitoring_records} · Judge0 submissions {platform.judge0_submissions}</p>
      <button className="btn primary" disabled={busy} onClick={savePlatform}>Save platform controls</button>
    </section>}
    <section className="card">
      <h2>Exam authorization and settings</h2>
      <label>Exam<select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">Select exam</option>{exams.map((e) => <option key={e.id} value={e.id}>#{e.id} · {e.title}{e.college ? ` · ${e.college}` : ""}</option>)}</select></label>
      {!exams.length && <p className="muted">No exams found. Create an exam first.</p>}
      {cfg && <>
        <div className="grid cols-2" style={{ marginTop: 16 }}>
          {isSuper ? <>
            <label className="check"><input type="checkbox" checked={cfg.mediapipe_authorized} onChange={(e) => setCfg({ ...cfg, mediapipe_authorized: e.target.checked })} />Authorize MediaPipe for this exam</label>
            <label className="check"><input type="checkbox" checked={cfg.judge0_authorized} onChange={(e) => setCfg({ ...cfg, judge0_authorized: e.target.checked })} />Authorize Judge0 for this exam</label>
            <label>Authorized Event Admins<select multiple value={adminIds.map(String)} onChange={(e) => setAdminIds([...e.target.selectedOptions].map((o) => Number(o.value)))}>{admins.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.email}</option>)}</select><span className="small muted">Select the admins allowed to configure these exam integrations.</span></label>
            <button className="btn" onClick={saveAuth} disabled={busy}>Save authorization</button>
          </> : null}
          <label className="check"><input type="checkbox" checked={cfg.mediapipe_enabled} disabled={!cfg.mediapipe_available} onChange={(e) => setCfg({ ...cfg, mediapipe_enabled: e.target.checked })} />Enable local face monitoring <span className="small muted">{cfg.mediapipe_available ? "available" : "Super Admin authorization required"}</span></label>
          <div><label className="check"><input type="checkbox" checked={cfg.judge0_enabled} disabled={!cfg.judge0_available} onChange={(e) => setCfg({ ...cfg, judge0_enabled: e.target.checked })} />Enable Judge0 compiler <span className="small muted">{cfg.judge0_available ? "available" : "Super Admin authorization and service configuration required"}</span></label></div>
        </div>
        {cfg.mediapipe_available && <div className="grid cols-3">
          <label>No face threshold (seconds)<input type="number" min="3" max="120" value={cfg.mediapipe_policy?.no_face_seconds || 10} onChange={(e) => setCfg({ ...cfg, mediapipe_policy: { ...cfg.mediapipe_policy, no_face_seconds: Number(e.target.value) } })} /></label>
          <label>Multiple face threshold (seconds)<input type="number" min="1" max="30" value={cfg.mediapipe_policy?.multi_face_seconds || 3} onChange={(e) => setCfg({ ...cfg, mediapipe_policy: { ...cfg.mediapipe_policy, multi_face_seconds: Number(e.target.value) } })} /></label>
          <label>Warning threshold<input type="number" min="1" max="10" value={cfg.mediapipe_policy?.warning_limit || 3} onChange={(e) => setCfg({ ...cfg, mediapipe_policy: { ...cfg.mediapipe_policy, warning_limit: Number(e.target.value) } })} /></label>
          <label>Monitoring retention (days)<input type="number" min="1" max="365" value={cfg.retention_days || 30} onChange={(e) => setCfg({ ...cfg, retention_days: Number(e.target.value) })} /></label>
          <label>HTTPS privacy policy URL<input type="url" placeholder="https://example.org/privacy" value={cfg.mediapipe_policy?.privacy_policy_url || ""} onChange={(e) => setCfg({ ...cfg, mediapipe_policy: { ...cfg.mediapipe_policy, privacy_policy_url: e.target.value } })} /></label>
        </div>}
        {cfg.judge0_available && <>
          <label>Judge0 languages<select multiple value={(selectedLangs ?? (cfg.judge0_languages || [])).map(String)} onChange={(e) => setSelectedLangs([...e.target.selectedOptions].map((o) => Number(o.value)))}>{languages.filter((l) => { const alias = editorLanguage(l.name); return alias && (exams.find((e) => String(e.id) === examId)?.allowed || []).includes(alias); }).map((l) => <option key={l.id} value={l.id}>{l.name} · #{l.id}</option>)}</select><span className="small muted">The current Zyphor code editor supports Python, C, C++, Java, and JavaScript.</span></label>
          <div className="grid cols-2"><label>CPU time (seconds)<input type="number" min="1" max="10" value={cfg.cpu_time_limit} onChange={(e) => setCfg({ ...cfg, cpu_time_limit: Number(e.target.value) })} /></label><label>Memory limit (KB)<input type="number" min="32768" max="512000" value={cfg.memory_limit_kb} onChange={(e) => setCfg({ ...cfg, memory_limit_kb: Number(e.target.value) })} /></label></div>
          <label>Maximum Judge0 runs per student attempt<input type="number" min="10" max="1000" value={cfg.max_runs_per_student || 100} onChange={(e) => setCfg({ ...cfg, max_runs_per_student: Number(e.target.value) })} /></label>
        </>}
        <button className="btn primary" disabled={busy} onClick={saveConfig}>Save exam settings</button>
      </>}
    </section>
    {examId && <section className="card"><h2>Review history</h2>
      <div className="row between"><h3>Active monitoring sessions ({activeSessions.length})</h3><button className="btn sm" onClick={refreshSessions}>Refresh status</button></div>
      {!activeSessions.length ? <p className="muted">No active exam attempts.</p> : <div className="table-wrap"><table><thead><tr><th>Attempt</th><th>Participant ID</th><th>Camera signal</th><th>Last signal</th></tr></thead><tbody>{activeSessions.map((s) => <tr key={s.attempt_id}><td>{s.attempt_id}</td><td>{s.student_id}</td><td>{s.camera_status}{s.status_stale ? " · stale" : ""}</td><td>{s.last_signal_at ? new Date(s.last_signal_at).toLocaleString() : "No signal received"}</td></tr>)}</tbody></table></div>}
      <h3>Monitoring alerts ({monitoring.length})</h3>
      {monitoring.length > 0 && <button className="btn danger sm" onClick={clearMonitoring}>Delete monitoring records</button>}
      {!monitoring.length ? <p className="muted">No accessible alerts.</p> : <div className="table-wrap"><table><thead><tr><th>Type</th><th>Attempt</th><th>Participant ID</th><th>Time</th><th>Signal</th></tr></thead><tbody>{monitoring.slice(0, 30).map((m) => <tr key={m.id}><td>{m.type}</td><td>{m.attempt_id}</td><td>{m.student_id}</td><td>{new Date(m.created_at).toLocaleString()}</td><td>{JSON.stringify(m.details)}</td></tr>)}</tbody></table></div>}
      <h3>Judge0 submissions ({submissions.length})</h3>
      {!submissions.length ? <p className="muted">No accessible submissions.</p> : <details><summary>Show latest source submissions</summary>{submissions.slice(0, 30).map((s) => <details key={s.id}><summary>Submission #{s.id} · participant {s.student_id} · item {s.item_id} · {new Date(s.created_at).toLocaleString()}</summary><pre>{s.source_code}</pre><pre>{JSON.stringify(s.result)}</pre></details>)}</details>}
      <h3>Integration audit ({auditRows.length})</h3>
      {!auditRows.length ? <p className="muted">No audit entries.</p> : <ul>{auditRows.slice(0, 30).map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.action} · actor {a.actor_id ?? "system"} · {JSON.stringify(a.details)}</li>)}</ul>}
    </section>}
    <section className="card"><h2>Important notes</h2><p>Face alerts are browser-generated, can be forged or mistaken, and never automatically disqualify a student. The current application has no Coordinator role or coordinator-to-exam assignment model. Monitoring access is currently limited to authorized Super/Event Admins.</p><p>Judge0 runs only when configured on the backend. Use an isolated Judge0 deployment with network restrictions and resource limits; Zyphor does not host an execution sandbox here.</p></section>
  </div>;
}
