import { useState } from "react";
import { api } from "../../lib/api.js";
import { Markdown } from "../../components/ui.jsx";

export default function LearningAssistant() {
  const [question, setQuestion] = useState("Suggest a study plan for my weakest topics.");
  const [answer, setAnswer] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <section className="card pad" style={{ marginTop: 20 }}>
    <h3>Post-exam learning assistant</h3>
    <p className="small muted">Powered by Ollama on the organizer's laptop. Only released topic scores are used. Your question is processed locally; this service is unavailable during active exams.</p>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(""); setAnswer(null);
      try { setAnswer(await api("POST", "/api/zyphor/student/learning-assistant", { question }, { timeoutMs: 100000 })); }
      catch(e) { setError(e.message); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="learning-question">What would you like to practise?</label>
      <textarea id="learning-question" value={question} onChange={e => setQuestion(e.target.value)} minLength={5} maxLength={1200} required />
      <button className="btn primary" disabled={busy}>{busy ? "Preparing guidance…" : "Ask learning assistant"}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {answer && <div aria-live="polite"><Markdown>{answer.answer}</Markdown><p className="small muted">{answer.notice}</p></div>}
  </section>;
}
