import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, Loading, useToast } from "../../components/ui.jsx";
import { useAdmin } from "./context.jsx";

const COLORS = { sent: "green", pending: "amber", sending: "amber", failed: "red", delivery_unknown: "red", abandoned: "red", cancelled: "muted" };

export default function EmailDeliveries() {
  const { collegeId, cq } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [reasons, setReasons] = useState({});
  const load = useCallback(() => api("GET", "/api/zyphor/admin/email-deliveries" + cq())
    .then((data) => setRows(data.deliveries)).catch((err) => { toast(err.message, "error"); setRows([]); }), [collegeId]);
  useEffect(() => { load(); }, [load]);
  async function review(row, decision) {
    const reason = (reasons[row.id] || "").trim();
    if (reason.length < 8) { toast("Add a review note of at least 8 characters", "error"); return; }
    if (decision === "retry" && row.status === "delivery_unknown"
        && !window.confirm("The SMTP server may already have accepted this message. Retrying can send a duplicate. Continue?")) return;
    try {
      await api("POST", `/api/zyphor/admin/email-deliveries/${row.id}/review` + cq(), { decision, reason });
      toast("Delivery reviewed", "success"); await load();
    } catch (err) { toast(err.message, "error"); }
  }
  return <div className="page"><h1>Email delivery queue</h1>
    <p className="lede">Review ambiguous SMTP outcomes before choosing whether to retry.</p>
    {!rows ? <Loading /> : rows.length === 0 ? <p className="muted">No email deliveries recorded.</p> :
      <div className="table-wrap"><table><thead><tr><th>Type</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Last error</th><th>Review</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.kind}</td><td>{row.recipient}</td>
          <td><Badge color={COLORS[row.status] || "muted"}>{row.status}</Badge></td><td>{row.attempt_count}</td><td>{row.last_error || "—"}</td>
          <td>{["delivery_unknown", "failed"].includes(row.status) ? <div style={{ minWidth: 250 }}>
            <input aria-label={`Review note for delivery ${row.id}`} minLength="8" maxLength="500" placeholder="Why this decision?"
              value={reasons[row.id] || ""} onChange={(e) => setReasons((all) => ({ ...all, [row.id]: e.target.value }))} />
            <div className="row tight" style={{ marginTop: 5 }}>
              {row.status === "delivery_unknown" && <button className="btn sm" onClick={() => review(row, "mark_sent")}>Mark sent</button>}
              <button className="btn sm primary" onClick={() => review(row, "retry")}>Retry</button>
              <button className="btn sm danger" onClick={() => review(row, "abandon")}>Abandon</button>
            </div>
          </div> : "—"}</td>
        </tr>)}</tbody></table></div>}
  </div>;
}
