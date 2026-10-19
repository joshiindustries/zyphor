import { Button } from "../../components/ui/button.jsx";
import { ChevronLeft, ChevronRight, RotateCcw, Bookmark, Check } from "lucide-react";

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
  const itemMcq = item ? mcq[item.item_id] : null;
  const isReview = itemMcq?.review;

  return (
    <footer className="sticky bottom-0 z-30 flex items-center justify-between border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
      {/* Left Action Group: Previous, Clear, Review */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => {
            saveCode(false);
            onNavigate(index - 1);
          }}
          className="gap-1 text-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {item?.type === "mcq" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearResponse(item.item_id)}
              className="gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Selection
            </Button>

            <Button
              variant={isReview ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleReview(item.item_id)}
              className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700"
            >
              <Bookmark className="h-3.5 w-3.5" />
              {isReview ? "Unflag Review" : "Flag for Review"}
            </Button>
          </>
        )}
      </div>

      {/* Right Action: Next / Save */}
      <div>
        <Button
          size="sm"
          onClick={() => {
            saveCode(false);
            if (!isLast) onNavigate(index + 1);
            else toast("All answers saved. You can review or submit your exam.", "info", 2500);
          }}
          className="gap-1.5 text-xs font-semibold px-5 shadow-xs"
        >
          <span>{isLast ? "Save & Review" : "Save & Next"}</span>
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </footer>
  );
}