import { useState } from "react";
import { api } from "../../lib/api.js";

export default function QuestionHistory({ kind, questionId }) {
  const [rows, setRows] = useState(null), [error, setError] = useState("");
  async function load(e) {
    if (!e.currentTarget.open) return;
    try { setRows(await api("GET", `/api/zyphor/admin/question-history/${kind}/${questionId}`)); setError(""); }
    catch(e) { setError(e.message); }
  }
  return <details className="card pad-sm" onToggle={load} style={{ marginBottom: 16 }}>
    <summary>Question version history</summary>
    {error && <p role="alert">{error}</p>}
    {rows?.length === 0 && <p className="small muted">History starts with the first edit after this upgrade.</p>}
    {rows?.map(r => <details key={r.version}><summary>Version {r.version} · {new Date(r.created_at).toLocaleString()}</summary>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(r.snapshot, null, 2)}</pre>
    </details>)}
  </details>;
}
