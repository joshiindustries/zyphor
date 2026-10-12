import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api.js";
import { Badge, Loading, Modal, Progress, useToast } from "../../components/ui.jsx";
import LearningAssistant from "./LearningAssistant.jsx";

function Profile({ data }) {
  return <>
    <p className="muted">{data.verification}</p>
    <h3>{data.name}</h3>
    <p className="small">{data.note}</p>
    <h3>Assessment progress</h3>
    {!data.results.length && <p>No released assessments yet.</p>}
    {data.results.map(r => <article className="card pad-sm" key={r.attempt_id} style={{ marginBottom: 8 }}>
      <strong>{r.exam}</strong> <Badge color={r.passed ? "green" : "amber"}>{r.passed ? "Passed" : "Completed"}</Badge>
      <p>{r.score} / {r.maximum} · {r.percentage}% · {new Date(r.completed_at).toLocaleDateString()}</p>
    </article>)}
    <h3>Topic performance</h3>
    {data.topics.map(t => <div key={t.topic} className="section-bar"><strong>{t.topic}</strong><Progress value={Math.max(0, t.score)} max={t.maximum} /><span>{t.percentage}% · {t.questions} questions</span></div>)}
    {!!data.strengths.length && <p><strong>Strengths:</strong> {data.strengths.join(", ")}</p>}
    {!!data.practice_recommendations.length && <><h3>Practice recommendations</h3><ul>{data.practice_recommendations.map(p => <li key={p.topic}>{p.suggestion} <span className="muted">Based on {p.based_on_questions} assessed questions.</span></li>)}</ul></>}
  </>;
}

export default function SkillPassport({ onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null), [error, setError] = useState(""), [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api("GET", "/api/zyphor/student/skill-passport").then(d => { setData(d); setError(""); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  async function share(enable) {
    setBusy(true);
    try {
      if (enable) {
        const r = await api("POST", "/api/zyphor/student/skill-passport/share");
        const base = new URL(import.meta.env.BASE_URL, window.location.origin);
        setUrl(new URL(`passport/${r.token}`, base).href);
      } else { await api("DELETE", "/api/zyphor/student/skill-passport/share"); setUrl(""); }
      await load();
    } catch(e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  }
  return <Modal title="Zyphor Skill Passport" wide onClose={onClose}>
    {error ? <p role="alert">{error} <button className="btn" onClick={load}>Retry</button></p> : !data ? <Loading /> : <>
      <Profile data={data} />
      {!!data.results.length && <LearningAssistant />}
      <h3>Student-controlled sharing</h3>
      <p className="small muted">Anyone with your link can view your name and released assessment results for 30 days. Creating a new link invalidates the previous one. Recalled results disappear automatically.</p>
      <div className="row wrap"><button className="btn primary" disabled={busy} onClick={() => share(true)}>Create sharing link</button>
        {data.sharing_expires_at && <button className="btn" disabled={busy} onClick={() => share(false)}>Revoke sharing</button>}</div>
      {data.sharing_expires_at && <p className="small">Sharing expires {new Date(data.sharing_expires_at).toLocaleString()}</p>}
      {url && <label>Copy your profile link<input readOnly value={url} onFocus={e => e.target.select()} /></label>}
    </>}
  </Modal>;
}

export function PublicSkillPassport() {
  const { token } = useParams();
  const [data, setData] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("GET", `/api/zyphor/public/skill-passport/${encodeURIComponent(token)}`).then(d => { if(active) setData(d); }).catch(e => { if(active) setError(e.message); });
    return () => { active = false; };
  }, [token]);
  return <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
    <h1>Zyphor Skill Passport</h1>
    {error ? <p role="alert">This profile is unavailable, expired, or revoked.</p> : data ? <Profile data={data} /> : <Loading />}
  </main>;
}
