import { isAnswered } from "./examState.js";

export function ExamPalette({
  paper,
  mcq,
  code,
  index,
  visited,
  sections,
  answeredCount,
  onNavigate,
  onToggle,
  paletteOpen,
}) {
  const notAnsweredVisited = paper.items.filter((it) => visited.has(it.item_id) && !isAnswered(it, mcq, code)).length;
  const notVisited = paper.items.filter((it) => !visited.has(it.item_id)).length;
  const forReview = paper.items.filter((it) => it.type === "mcq" && mcq[it.item_id]?.review).length;

  return (
    <aside className={"palette" + (paletteOpen ? " open" : "")} aria-label="Question navigation">
      <div className="palette-summary">
        <span className="workspace-eyebrow">YOUR PROGRESS</span>
        <strong>{answeredCount}<small> / {paper.items.length} answered</small></strong>
        <progress value={answeredCount} max={paper.items.length} aria-label="Questions answered" />
      </div>
      {sections.map((sec) => (
        <div key={sec}>
          <h4>{sec}</h4>
          <div className="pal-grid">
            {paper.items.map((it, i) => it.section !== sec ? null : (
              <button
                key={it.item_id}
                aria-label={`Question ${it.number}, ${isAnswered(it, mcq, code) ? "answered" : "unanswered"}${it.type === "mcq" && mcq[it.item_id]?.review ? ", marked for review" : ""}`}
                aria-current={i === index ? "step" : undefined}
                className={[
                  "pal-btn",
                  isAnswered(it, mcq, code) ? "answered" : visited.has(it.item_id) ? "visited" : "",
                  it.type === "mcq" && mcq[it.item_id]?.review ? "review" : "",
                  i === index ? "current" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => { onNavigate(i); onToggle(false); }}
              >
                {it.number}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="legend">
        <span style={{ "--c": "var(--success)" }}>Answered ({answeredCount})</span>
        <span style={{ "--c": "var(--danger-soft)" }}>
          Not answered ({notAnsweredVisited})
        </span>
        <span style={{ "--c": "var(--surface-3)" }}>
          Not visited ({notVisited})
        </span>
        <span style={{ "--c": "var(--violet)" }}>
          For review ({forReview})
        </span>
      </div>
    </aside>
  );
}