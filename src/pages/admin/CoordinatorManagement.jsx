import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";

export default function CoordinatorManagement() {
  const toast = useToast();
  const [colleges, setColleges] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [collegeId, setCollegeId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      const [orgs, people] = await Promise.all([
        api("GET", "/api/zyphor/super/colleges"), api("GET", "/api/zyphor/super/coordinators"),
      ]);
      setColleges(orgs); setCoordinators(people);
      setCollegeId((current) => orgs.some((row) => String(row.id) === current) ? current : String(orgs[0]?.id || ""));
    } catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }, [toast]);

  const loadAssignments = useCallback(async () => {
    if (!collegeId) { setAssignments([]); setAccounts([]); return; }
    try {
      const [assigned, admins] = await Promise.all([
        api("GET", `/api/zyphor/super/colleges/${collegeId}/assignments`),
        api("GET", `/api/zyphor/super/colleges/${collegeId}/admins`),
      ]);
      setAssignments(assigned);
      setAccounts([...admins.map((row) => ({ ...row, role: "college_admin" })), ...coordinators]);
    } catch (err) { toast(err.message, "error"); }
  }, [collegeId, coordinators, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  async function createCoordinator(event) {
    event.preventDefault();
    try {
      const created = await api("POST", "/api/zyphor/super/coordinators", form);
      toast(`Coordinator created. Temporary password: ${created.temporary_password}`, "success", 12000);
      setForm({ name: "", email: "", password: "" }); await load();
    } catch (err) { toast(err.message, "error"); }
  }

  async function assign(event) {
    event.preventDefault();
    try {
      await api("POST", `/api/zyphor/super/colleges/${collegeId}/assignments`, { user_id: Number(userId) });
      setUserId(""); await loadAssignments(); toast("Event assignment added", "success");
    } catch (err) { toast(err.message, "error"); }
  }

  async function revoke(person) {
    try {
      await api("DELETE", `/api/zyphor/super/colleges/${collegeId}/assignments/${person.user_id}`);
      await loadAssignments(); toast("Event assignment revoked", "success");
    } catch (err) { toast(err.message, "error"); }
  }

  if (busy) return <Loading />;
  const eligible = accounts.filter((row) => !assignments.some((a) => a.user_id === row.id));
  return <div>
    <div className="page-head"><h1>Coordinator access</h1><p className="lede">Create coordinator accounts and manage explicit event assignments.</p></div>
    <section className="card"><h2>Create coordinator</h2><form className="grid cols-3" onSubmit={createCoordinator}>
      <label className="field"><span>Name</span><input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="field"><span>Temporary password (optional)</span><input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <button className="btn primary" type="submit">Create account</button>
    </form></section>
    <section className="card"><h2>Assign access</h2><form className="row wrap" onSubmit={assign}>
      <label className="field"><span>Event</span><select required value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>{colleges.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}</select></label>
      <label className="field"><span>Admin or coordinator</span><select required value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select account</option>{eligible.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.email} · {row.role.replace("_", " ")}</option>)}</select></label>
      <button className="btn" type="submit" disabled={!eligible.length || !collegeId}>Assign event</button>
    </form>
    <h3 style={{ marginTop: 20 }}>Assigned accounts</h3>{!assignments.length ? <p className="muted">No explicit assignments.</p> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned</th><th /></tr></thead><tbody>{assignments.map((row) => <tr key={row.user_id}><td>{row.name}</td><td>{row.email}</td><td><Badge>{row.role.replace("_", " ")}</Badge></td><td>{row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : "—"}</td><td>{row.primary_assignment ? <span className="small muted">Required for account</span> : <button className="btn sm danger" onClick={() => revoke(row)}>Revoke</button>}</td></tr>)}</tbody></table></div>}</section>
    <section className="card"><h2>Coordinator accounts</h2>{!coordinators.length ? <p className="muted">No coordinator accounts yet.</p> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Events</th><th>Status</th></tr></thead><tbody>{coordinators.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.assignments.map((a) => a.college_name).join(", ") || "Unassigned"}</td><td>{row.is_active ? "Active" : "Disabled"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
