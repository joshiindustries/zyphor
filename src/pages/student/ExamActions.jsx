import { useToast } from "../../components/ui.jsx";

export function ExamActions({
  index,
  totalItems,
  item,
  mcq,
  paper,
  code,
  onNavigate,
  onClearResponse,
  onToggleReview,
  onSaveNext,
  saveCode,
  toast,
}) {
  const isLast = index === totalItems - 1;
  const itemMcq = mcq[item.item_id];
  const isReview = itemMcq?.review;

  return (
    <div className="q-actions">
      <div className="row tight">
        <button className="btn" disabled={index === 0} onClick={() => { saveCode(false); onNavigate(index - 1); }}>‹ Previous</button>
        {item.type === "mcq" && (
          <>
            <button className="btn" onClick={() => onClearResponse(item.item_id)}>Clear response</button>
            <button className="btn" onClick={() => onToggleReview(item.item_id)}>
              {isReview ? "Unmark review" : "Mark for review & next"}
            </button>
          </>
        )}
      </div>
      <button className="btn primary" onClick={() => {
        saveCode(false);
        if (!isLast) onNavigate(index + 1);
        else toast("Save requested. Check the save status above.", "info", 2500);
      }}>
        {isLast ? "Save" : "Save & next ›"}
      </button>
    </div>
  );
}