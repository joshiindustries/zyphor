import * as React from "react";
import { Flag } from "lucide-react";
import { cn } from "../../lib/utils.js";

/**
 * Question navigation palette with clear states and keyboard navigation.
 *
 * @param {Array} items - Question items list
 * @param {number} currentIndex - Currently selected item index (0-based)
 * @param {Function} onSelect - Callback when a question is clicked
 * @param {Function} isAnswered - (item) => boolean
 * @param {Function} isFlagged - (item) => boolean
 * @param {Function} isVisited - (item) => boolean
 */
export const QuestionPalette = React.memo(function QuestionPalette({
  items = [],
  currentIndex = 0,
  onSelect,
  isAnswered,
  isFlagged,
  isVisited,
  className,
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 border-b border-slate-200 pb-2 dark:border-slate-800">
        <span>Questions ({items.length})</span>
      </div>

      <div
        className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto pr-1"
        role="navigation"
        aria-label="Question palette"
      >
        {items.map((item, idx) => {
          const active = idx === currentIndex;
          const answered = isAnswered?.(item);
          const flagged = isFlagged?.(item);
          const visited = isVisited?.(item);

          let stateClass =
            "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

          if (answered && flagged) {
            stateClass =
              "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200";
          } else if (answered) {
            stateClass =
              "border-zyphor-indigo-600 bg-zyphor-indigo-600 text-white hover:bg-zyphor-indigo-700 dark:border-zyphor-indigo-500 dark:bg-zyphor-indigo-500";
          } else if (flagged) {
            stateClass =
              "border-amber-400 bg-amber-100/60 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200";
          } else if (visited) {
            stateClass =
              "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
          }

          const statusLabel = [
            `Question ${idx + 1}`,
            active ? "Current" : null,
            answered ? "Answered" : "Unanswered",
            flagged ? "Flagged for review" : null,
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={item.item_id || idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={cn(
                "relative flex h-10 w-full items-center justify-center rounded-lg border text-sm font-semibold transition-all select-none focus:outline-none focus:ring-2 focus:ring-zyphor-indigo-500",
                stateClass,
                active && "ring-2 ring-offset-2 ring-zyphor-indigo-600 font-bold shadow-sm"
              )}
              aria-label={statusLabel}
              aria-current={active ? "true" : undefined}
            >
              <span>{idx + 1}</span>
              {flagged && (
                <Flag
                  className={cn(
                    "absolute -top-1 -right-1 h-3 w-3 fill-amber-500 text-amber-500",
                    answered && !flagged && "text-white"
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Palette Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-zyphor-indigo-600" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100" />
          <span>Flagged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100" />
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-200 bg-white" />
          <span>Not visited</span>
        </div>
      </div>
    </div>
  );
});
