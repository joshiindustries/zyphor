import React, { useMemo } from "react";
import { Flag, CheckCircle, HelpCircle, Eye, EyeOff } from "lucide-react";
import { isAnswered } from "./examState.js";
import { cn } from "../../lib/utils.js";

export const ExamPalette = React.memo(function ExamPalette({
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
  const items = paper?.items || [];
  const notAnsweredVisited = useMemo(
    () => items.filter((it) => visited.has(it.item_id) && !isAnswered(it, mcq, code)).length,
    [items, visited, mcq, code]
  );
  const notVisited = useMemo(
    () => items.filter((it) => !visited.has(it.item_id)).length,
    [items, visited]
  );
  const forReview = useMemo(
    () => items.filter((it) => it.type === "mcq" && mcq[it.item_id]?.review).length,
    [items, mcq]
  );

  const percent = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

  return (
    <aside
      className={cn(
        "palette border-r border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900",
        paletteOpen ? "open" : ""
      )}
      aria-label="Question navigation"
    >
      {/* Progress Card */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 mb-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          <span>Your Progress</span>
          <span className="font-mono text-zyphor-indigo-600 dark:text-zyphor-indigo-400">
            {answeredCount} / {items.length} ({percent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-zyphor-indigo-600 dark:bg-zyphor-indigo-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Sections and Item Grids */}
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
        {sections.map((sec) => {
          const secItems = items.filter((it) => it.section === sec);
          if (!secItems.length) return null;

          return (
            <div key={sec} className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                {sec}
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {secItems.map((it) => {
                  const itemIndex = items.findIndex((x) => x.item_id === it.item_id);
                  const active = itemIndex === index;
                  const answered = isAnswered(it, mcq, code);
                  const isFlagged = it.type === "mcq" && mcq[it.item_id]?.review;
                  const isSeen = visited.has(it.item_id);

                  let btnStyle =
                    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

                  if (answered && isFlagged) {
                    btnStyle =
                      "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200";
                  } else if (answered) {
                    btnStyle =
                      "border-zyphor-indigo-600 bg-zyphor-indigo-600 text-white hover:bg-zyphor-indigo-700 dark:border-zyphor-indigo-500 dark:bg-zyphor-indigo-500";
                  } else if (isFlagged) {
                    btnStyle =
                      "border-amber-400 bg-amber-100/60 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200";
                  } else if (isSeen) {
                    btnStyle =
                      "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
                  }

                  return (
                    <button
                      key={it.item_id}
                      type="button"
                      aria-label={`Question ${it.number}: ${
                        answered ? "Answered" : isSeen ? "Visited unanswered" : "Unvisited"
                      }${isFlagged ? ", marked for review" : ""}`}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-lg border text-xs font-bold transition-all select-none focus:outline-none focus:ring-2 focus:ring-zyphor-indigo-500",
                        btnStyle,
                        active && "ring-2 ring-offset-2 ring-zyphor-indigo-600 font-extrabold shadow-sm"
                      )}
                      onClick={() => {
                        onNavigate(itemIndex);
                        onToggle(false);
                      }}
                    >
                      <span>{it.number}</span>
                      {isFlagged && (
                        <Flag
                          className="absolute -top-1 -right-1 h-3 w-3 fill-amber-500 text-amber-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Palette Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-zyphor-indigo-600" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-amber-400 bg-amber-100" />
          <span>Review ({forReview})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-slate-300 bg-slate-100" />
          <span>Visited ({notAnsweredVisited})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-slate-200 bg-white" />
          <span>Not visited ({notVisited})</span>
        </div>
      </div>
    </aside>
  );
});