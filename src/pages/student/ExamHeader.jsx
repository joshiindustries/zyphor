import { useEffect, useRef } from "react";
import { Badge, Spinner } from "../../components/ui.jsx";
import { fmtDuration } from "../../lib/format.js";
import ExamConnectionStatus from "../../components/ExamConnectionStatus.jsx";

export function ExamHeader({
  paper,
  left,
  violations,
  maxViolations,
  heartbeatAt,
  heartbeatError,
  saveLabel,
  user,
  examPaused,
  onTogglePalette,
  onShowInstructions,
  onSubmit,
  submitting,
  paletteOpen,
}) {
  const timerClass = left <= 300 ? " low" : left <= 600 ? " warn" : "";
  const violationsColor = violations >= maxViolations - 1 ? "red" : "amber";

  return (
    <div className="exam-head">
      <button className="btn sm menu-toggle" onClick={onTogglePalette} aria-label="Questions" aria-expanded={paletteOpen}>
        ☰
      </button>
      <div className="title"><span className="workspace-eyebrow">ASSESSMENT WORKSPACE</span>{paper.exam.title}</div>
      <ExamConnectionStatus heartbeatAt={heartbeatAt} heartbeatError={heartbeatError} />
      <span className="save-status" role="status" aria-live="polite">{saveLabel || "Answers save automatically"}</span>
      <span className="small muted">{user.name} · {user.roll_no}</span>
      {violations > 0
        ? <Badge color={violationsColor}>⚠ {violations}/{maxViolations} violations</Badge>
        : <Badge color="green">No violations</Badge>}
      <span className={"timer" + timerClass} aria-live="assertive" role="timer">
        {fmtDuration(left)}
      </span>
      <button className="btn sm" onClick={onShowInstructions}>Instructions</button>
      <button className="btn danger solid sm" disabled={submitting} onClick={onSubmit}>Submit exam</button>
    </div>
  );
}

export function ExamPausedBanner() {
  return (
    <div className="banner warn" style={{ margin: "0 0 10px" }} role="alert">
      <div>
        <h3 style={{ margin: 0 }}>Exam paused</h3>
        <span className="small">
          The organizers have paused this exam. Your answers are saved and your time isn't
          running out — just wait, this will resume on its own.
        </span>
      </div>
    </div>
  );
}