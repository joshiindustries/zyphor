import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

export default function TeamRegistrations() {
  const { collegeId, cq } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const load = useCallback(() => api("GET", "/api/zyphor/admin/team-registrations" + cq())
    .then(setRows).catch((err) => { toast(err.message, "error"); setRows([]); }), [collegeId]);
  useEffect(() => { load(); }, [load]);
  async function decide(row, decision) {
    try {
      await api("POST", `/api/zyphor/admin/team-registrations/${row.id}/${decision}` + cq());
      toast(decision === "approve" ? "Team registration approved" : "Team registration rejected", "success");
      load();
    } catch (err) { toast(err.message, "error"); }
  }
  return <div className="page"><h1>Team registrations</h1><p className="lede">Review each team’s frozen registration roster.</p>
    {!rows ? <Loading /> : rows.length === 0 ? <p className="muted">No team registrations need approval.</p> :
      <div className="table-wrap"><table><thead><tr><th>Event exam</th><th>Team</th><th>Registered roster</th><th>Submitted</th><th /></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td>{row.exam_title}<div><Badge color="amber">Pending</Badge></div></td><td>{row.team_name}</td>
          <td>{row.roster.map((member) => <div key={member.user_id}>{member.name} <span className="muted small">{member.email}</span></div>)}</td>
          <td>{new Date(row.created_at).toLocaleString()}</td><td className="row tight">
            <button className="btn sm primary" onClick={() => decide(row, "approve")}>Approve</button>
            <button className="btn sm danger" onClick={() => decide(row, "reject")}>Reject</button>
          </td></tr>)}
      </tbody></table></div>}
  </div>;
}
