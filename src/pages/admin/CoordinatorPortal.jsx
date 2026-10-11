import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";
import { Stat, useAdmin } from "./context.jsx";

const POLL_MS = 6000;
const ALERT_TYPES = new Set(["no_face", "multiple_faces", "camera_denied", "camera_interrupted", "model_error"]);

function participant(row) {
  return row.participant_name || `Participant #${row.student_id}`;
}

function time(value) {
  return value ? new Date(value).toLocaleTimeString() : "—";
}

export default function CoordinatorPortal() {
  const { isSuper, collegeId } = useAdmin();
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const path = isSuper ? "/api/zyphor/integrations/super/exams" : "/api/zyphor/admin/exams";
    api("GET", path).then((rows) => {
      if (!active) return;
      const choices = rows.map((e) => ({ id: e.id, title: e.title, college: e.college || "" }));
      setExams(choices);
      setExamId((current) => current && choices.some((e) => String(e.id) === String(current)) ? current : String(choices[0]?.id || ""));
    }).catch((err) => { if (active) toast(err.message, "error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isSuper, collegeId, toast]);

  const refresh = useCallback(async () => {
    if (!examId) { setSessions([]); setAlerts([]); setLoadError(""); return; }
    try {
      const [live, records] = await Promise.all([
        api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring/sessions`),
        api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring`),
      ]);
      setSessions(live);
      setAlerts(records.filter((r) => ALERT_TYPES.has(r.type)).slice(0, 100));
      setUpdatedAt(new Date());
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Couldn't load live monitoring data. This exam may not be assigned for monitoring.");
      setSessions([]);
      setAlerts([]);
    }
  }, [examId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const exam = useMemo(() => exams.find((e) => String(e.id) === String(examId)), [exams, examId]);
  const needsAttention = sessions.filter((s) => s.camera_status === "interrupted" || s.status_stale).length;

  if (loading) return <Loading />;
  return <div>
    <div className="page-head row between wrap">
      <div><h1>Coordinator Portal</h1><p className="lede">Live participant presence and proctoring alerts. Refreshes every 6 seconds.</p></div>
      <button className="btn sm" onClick={refresh}>Refresh now</button>
    </div>
    <section className="card">
      <div className="row between wrap">
        <label className="field"><span>Exam / event</span><select value={examId} onChange={(e) => setExamId(e.target.value)}>
          {!exams.length && <option value="">No exams available</option>}
          {exams.map((e) => <option key={e.id} value={e.id}>{e.title}{e.college ? ` · ${e.college}` : ""}</option>)}
        </select></label>
        <div className="small muted">{updatedAt ? `Updated ${time(updatedAt)}` : "Waiting for live data"} · Polling every 6s</div>
      </div>
      {!exams.length && <p className="muted">No exams are available in your admin scope.</p>}
      {loadError && <p style={{ color: "var(--danger)", marginTop: 14 }}>{loadError}</p>}
      {exam && <div className="row wrap" style={{ gap: 12, marginTop: 16 }}>
        <Stat label="Participants in progress" value={sessions.length} />
        <Stat label="Needs attention" value={needsAttention} tone={needsAttention ? "red" : "green"} />
        <Stat label="Recent alerts" value={alerts.length} tone={alerts.length ? "amber" : "green"} />
      </div>}
    </section>

    {exam && <>
      <section className="card"><h2>Participants live now</h2>
        {!sessions.length ? <p className="muted">No active participants for this exam.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Participant</th><th>Attempt</th><th>Camera</th><th>Last camera signal</th><th>Last exam heartbeat</th></tr></thead>
          <tbody>{sessions.map((s) => <tr key={s.attempt_id}>
            <td><strong>{participant(s)}</strong>{s.roll_no && <div className="small muted">{s.roll_no}</div>}</td>
            <td>#{s.attempt_id}</td>
            <td><Badge color={s.camera_status === "monitoring" || s.camera_status === "ready" ? "green" : s.camera_status === "interrupted" || s.status_stale ? "red" : "amber"}>{s.status_stale ? "Stale" : s.camera_status}</Badge></td>
            <td>{time(s.last_signal_at)}</td><td>{time(s.last_heartbeat_at)}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <section className="card"><h2>Live alerts</h2>
        {!alerts.length ? <p className="muted">No participant alerts recorded for this exam.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Alert</th><th>Participant</th><th>Attempt</th><th>Time</th><th>Details</th></tr></thead>
          <tbody>{alerts.map((a) => <tr key={a.id}>
            <td><Badge color="red">{a.type.replaceAll("_", " ")}</Badge></td>
            <td><strong>{participant(a)}</strong>{a.roll_no && <div className="small muted">{a.roll_no}</div>}</td>
            <td>#{a.attempt_id}</td><td>{new Date(a.created_at).toLocaleString()}</td>
            <td>{Object.entries(a.details || {}).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "—"}</td>
          </tr>)}</tbody>
        </table></div>}
        <p className="small muted">Alerts are participant-device signals and can be inaccurate. Use them as prompts for human review, not automatic misconduct findings.</p>
      </section>
    </>}
  </div>;
}
