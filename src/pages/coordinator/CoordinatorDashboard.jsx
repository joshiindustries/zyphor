import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";
import { Badge, Brand, Loading, ThemeToggle, useToast } from "../../components/ui.jsx";
import { Link } from "react-router-dom";

const time = (value) => value ? new Date(value).toLocaleString() : "—";

export default function CoordinatorDashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [monitorError, setMonitorError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    api("GET", "/api/zyphor/coordinator/events").then((rows) => {
      setEvents(rows);
      setEventId(String(rows[0]?.id || ""));
    }).catch((err) => toast(err.message, "error")).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!eventId) { setExams([]); setExamId(""); return; }
    api("GET", `/api/zyphor/coordinator/events/${eventId}/exams`).then((rows) => {
      setExams(rows);
      setExamId((current) => rows.some((exam) => String(exam.id) === current) ? current : String(rows[0]?.id || ""));
    }).catch((err) => toast(err.message, "error"));
  }, [eventId, toast]);

  const refresh = useCallback(async () => {
    if (!examId) { setSessions([]); setAlerts([]); return; }
    try {
      const [active, records] = await Promise.all([
        api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring/sessions`),
        api("GET", `/api/zyphor/integrations/exams/${examId}/monitoring`),
      ]);
      setMonitorError("");
      setUpdatedAt(new Date());
      setSessions(active);
      setAlerts(records.filter((row) => ["no_face", "multiple_faces", "camera_denied", "camera_interrupted", "model_error"].includes(row.type)).slice(0, 100));
    } catch (err) { setMonitorError(err.message); }
  }, [examId, toast]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 6000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) return <div className="pre-start"><Loading /></div>;
  const attention = sessions.filter((row) => row.camera_status === "interrupted" || row.status_stale).length;
  const matches = (row) => `${row.participant_name || ""} ${row.roll_no || ""}`.toLowerCase().includes(filter.toLowerCase());
  return <div className="shell">
    <aside className="sidebar"><Brand sub="Event Coordinator" /><Link className="btn" to="/moodle">Moodle Learning Hub</Link><div className="sidebar-foot">
      <div className="row between"><span className="tiny faint">{user.name}</span><div className="row tight"><ThemeToggle /><button className="btn ghost sm" onClick={logout}>Sign out</button></div></div>
    </div></aside>
    <main className="main">
      <div className="page-head row between wrap"><div><h1>Coordinator dashboard</h1><p className="lede">Live participants and proctoring alerts for your assigned events.</p></div><button className="btn sm" onClick={refresh}>Refresh</button></div>
      <section className="card"><div className="row wrap">
        <label className="field"><span>Assigned event</span><select value={eventId} onChange={(e) => setEventId(e.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.name} ({event.code})</option>)}</select></label>
        <label className="field"><span>Exam</span><select value={examId} onChange={(e) => setExamId(e.target.value)}>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
      </div>{!events.length && <p className="muted">No event has been assigned to your account. Contact a Super Admin.</p>}
        {events.length > 0 && !exams.length && <p className="muted">No exams exist for this event yet.</p>}
        <div className="row wrap" style={{ gap: 12, marginTop: 12 }}>
          <div className="stat"><div className="label">Participants live</div><div className="value">{sessions.length}</div></div>
          <div className="stat"><div className="label">Needs attention</div><div className="value">{attention}</div></div>
          <div className="stat"><div className="label">Recent alerts</div><div className="value">{alerts.length}</div></div>
        </div>
      </section>
      <div className="monitor-filters"><input aria-label="Search participants" placeholder="Search name or roll number…" value={filter} onChange={(e) => setFilter(e.target.value)} /><span className="refresh-status" role="status">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()} · refreshes every 6 seconds` : "Waiting for participant data"}</span></div>
      {monitorError && <div className="banner warn" role="alert"><div><strong>Live monitoring could not refresh</strong><p>{monitorError}. Displayed data may be out of date.</p></div><button className="btn" onClick={refresh}>Retry now</button></div>}
      <section className="card"><h2>Live participants</h2>{!sessions.length ? <p className="muted">No active participants.</p> : <div className="table-wrap"><table><thead><tr><th>Participant</th><th>Attempt</th><th>Camera</th><th>Last signal</th><th>Heartbeat</th></tr></thead><tbody>{sessions.filter(matches).map((row) => <tr key={row.attempt_id}><td>{row.participant_name}<div className="small muted">{row.roll_no}</div></td><td>#{row.attempt_id}</td><td><Badge color={row.camera_status === "monitoring" || row.camera_status === "ready" ? "green" : "amber"}>{row.status_stale ? "Stale" : row.camera_status}</Badge></td><td>{time(row.last_signal_at)}</td><td>{time(row.last_heartbeat_at)}</td></tr>)}</tbody></table></div>}</section>
      <section className="card"><h2>Recent alerts</h2>{!alerts.length ? <p className="muted">No alerts recorded for this exam.</p> : <div className="table-wrap"><table><thead><tr><th>Alert</th><th>Participant</th><th>Time</th><th>Details</th></tr></thead><tbody>{alerts.filter(matches).map((row) => <tr key={row.id}><td><Badge color="amber">{row.type.replaceAll("_", " ")}</Badge></td><td>{row.participant_name}<div className="small muted">{row.roll_no}</div></td><td>{time(row.created_at)}</td><td>{Object.entries(row.details || {}).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}</td></tr>)}</tbody></table></div>}<p className="small muted">Participant-device signals can be inaccurate; use them to guide human review.</p></section>
    </main>
  </div>;
}
