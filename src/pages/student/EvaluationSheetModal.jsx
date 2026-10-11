import { useState } from "react";
import { api } from "../../lib/api.js";
import { Badge, Field, Modal, ModalButton, useToast } from "../../components/ui.jsx";

export default function EvaluationSheetModal({ sheet, onClose, onSubmitted }) {
  const toast = useToast();
  const [answers, setAnswers] = useState(sheet.response?.answers || {});
  const submitted = !!sheet.response;

  async function submit() {
    try {
      await api("POST", `/api/zyphor/student/attempts/${sheet.attempt_id}/evaluation-sheet`, { answers });
      toast("Thank you. Your evaluation has been submitted.", "success");
      onSubmitted();
    } catch (err) { toast(err.message, "error", 6000); }
  }

  return <Modal title={sheet.title} wide onClose={onClose} actions={<>
    {submitted ? <Badge color="green">Submitted</Badge> : <ModalButton cls="primary" onClick={submit}>Submit evaluation</ModalButton>}
    <button className="btn" onClick={onClose}>Close</button>
  </>}>
    <p className="small muted">{sheet.exam_title}</p>
    {sheet.instructions && <p>{sheet.instructions}</p>}
    {submitted && <div className="banner" style={{ marginBottom: 16 }}>Submitted {new Date(sheet.response.submitted_at).toLocaleString()}. Your responses are final.</div>}
    {sheet.questions.map((question, index) => <section key={question.id} className="card pad-sm" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>{index + 1}. {question.prompt} {question.required && <span style={{ color: "var(--danger)" }}>*</span>}</h3>
      {question.kind === "rating" ? <fieldset disabled={submitted} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="small muted">Rate from 1 (poor) to 5 (excellent)</legend>
        <div className="row wrap" style={{ gap: 16, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((rating) => <label key={rating} className="row tight">
            <input type="radio" name={question.id} value={rating} required={question.required}
                   checked={Number(answers[question.id]) === rating}
                   onChange={() => setAnswers((current) => ({ ...current, [question.id]: rating }))} /> {rating}
          </label>)}
        </div>
      </fieldset> : <Field hint="Please do not include passwords or other sensitive information.">
        <textarea rows={4} maxLength={4000} required={question.required} disabled={submitted}
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: e.target.value }))} />
        <span className="small muted">{(answers[question.id] || "").length}/4000</span>
      </Field>}
    </section>)}
    <p className="small muted">Your responses are associated with your completed attempt and visible to the event administrators.</p>
  </Modal>;
}
