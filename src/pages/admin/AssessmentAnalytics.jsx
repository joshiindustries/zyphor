import { useEffect, useState } from "react";
import { api, download } from "../../lib/api.js";
import { useAdmin } from "./context.jsx";
import { useToast } from "../../components/ui.jsx";

export default function AssessmentAnalytics({ examId }) {
  const { collegeId, cq } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    api("GET", `/api/zyphor/admin/exams/${examId}/analytics` + cq())
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [examId, collegeId, retry]);
  const exportData = kind => download(`/api/zyphor/admin/exams/${examId}/analytics/export` + cq({ kind }),
    `zyphor_${examId}_${kind}.csv`).catch(e => toast(e.message, "error"));
  return <details className="card pad assessment-analytics" style={{ marginBottom: 20 }}>
    <summary><strong>Assessment analytics</strong><span className="muted small"> · Scores, topics and question review</span></summary>
    {error ? <div role="alert"><p>{error}</p><button className="btn sm" onClick={() => setRetry(n => n + 1)}>Retry analytics</button></div>
      : !data ? <p role="status">Loading analytics…</p> : <>
        <p className="muted small">{data.note}</p>
        <p><strong>{data.completed}</strong> completed · Mean {data.average_percentage ?? "—"}% · Median {data.median_percentage ?? "—"}%</p>
        {!data.completed && <p>No completed attempts yet. Statistics appear after submissions.</p>}
        {data.zero_maximum_attempts > 0 && <p role="status">{data.zero_maximum_attempts} attempts with no available marks are excluded from percentage statistics.</p>}
        <h3>Score distribution</h3>
        <div className="analytics-distribution">
          {data.distribution.map(bin => <div key={bin.range} className="analytics-bin">
            <span className="small">{bin.range}</span>
            <meter min="0" max={Math.max(1, data.completed)} value={bin.count} aria-label={`${bin.range}: ${bin.count} participants`} />
            <strong>{bin.count}</strong>
          </div>)}
        </div>
        <div className="row tight" style={{ margin: "16px 0" }}>
          {[["questions", "Question CSV"], ["topics", "Topic CSV"], ["distribution", "Distribution CSV"]].map(([kind, label]) =>
            <button className="btn sm" key={kind} onClick={() => exportData(kind)}>{label}</button>)}
        </div>
        <h3>Topic performance</h3>
        <div className="table-wrap"><table><caption className="sr-only">Topic performance across completed papers</caption>
          <thead><tr><th>Topic / section</th><th>Answered / presented</th><th>Marks / available</th><th>Performance</th></tr></thead>
          <tbody>{data.topics.map(row => <tr key={JSON.stringify([row.section, row.topic])}>
            <td>{row.topic}<div className="small muted">{row.section}</div></td><td>{row.answered} / {row.presented}</td>
            <td>{row.score} / {row.maximum}</td><td>{row.percentage === null ? "—" : `${row.percentage}%`}</td>
          </tr>)}</tbody>
        </table></div>
        <h3>Question review</h3>
        <p className="muted small">A sample of fewer than 20 participants is flagged as insufficient. Low or high full-mark rates suggest questions to review; they are not automatic quality judgments.</p>
        <div className="table-wrap"><table><caption className="sr-only">Question statistics for the actual paper variants received</caption>
          <thead><tr><th>Question</th><th>Topic</th><th>Presented</th><th>Unanswered</th><th>Average marks</th><th>Full marks</th><th>Review signal</th></tr></thead>
          <tbody>{data.questions.map(row => <tr key={row.item_id}>
            <td>#{row.item_id}<div className="small muted">{row.type} · {row.difficulty}{row.set_id ? ` · Set ${row.set_id}` : " · Common"}</div></td>
            <td>{row.topic}</td><td>{row.presented}</td><td>{row.unanswered}</td>
            <td>{row.average_marks ?? "—"} / {row.maximum}</td><td>{row.full_marks_percentage === null ? "—" : `${row.full_marks_percentage}%`}</td>
            <td>{row.review_signal.replaceAll("_", " ")}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
  </details>;
}
