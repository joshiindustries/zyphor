import { Markdown } from "../../components/ui.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import CodingPanel from "./CodingPanel.jsx";
import { cn } from "../../lib/utils.js";

export function ExamContent({
  item,
  index,
  totalItems,
  paper,
  mcq,
  code,
  onMcqChange,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  onSubmitCode,
  judge0Enabled,
  judgeLanguages,
  allowedLanguages,
  blockPaste,
  saveLabel,
  onPasteBlocked,
}) {
  const isCoding = item?.type === "coding";

  return (
    <section className={cn("content flex-1 p-4 lg:p-6 overflow-y-auto", isCoding ? "is-coding" : "")}>
      <div className="q-wrap max-w-5xl mx-auto space-y-4">
        {/* Question Header & Points */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zyphor-indigo-600 dark:text-zyphor-indigo-400">
              Question {item?.number} of {totalItems}
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 m-0">
              {item?.section}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" className="font-mono text-xs">
              +{item?.marks} {item?.marks === 1 ? "mark" : "marks"}
            </Badge>
            {item?.type === "mcq" && item.negative_marks > 0 && (
              <Badge variant="destructive" className="font-mono text-xs">
                −{item.negative_marks} if incorrect
              </Badge>
            )}
            {item?.type === "mcq" && item.is_multi && (
              <Badge variant="default" className="text-xs">
                Select all that apply
              </Badge>
            )}
          </div>
        </div>

        {/* Content Body: MCQ or Coding */}
        {item?.type === "mcq" ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed">
              <Markdown>{item.question_text}</Markdown>
            </div>

            <div className="space-y-3 pt-2" role={item.is_multi ? "group" : "radiogroup"} aria-label="Question options">
              {item.options?.map((o, i) => {
                const st = mcq[item.item_id];
                const checked = st?.selected?.includes(o.id) || false;
                const letter = String.fromCharCode(65 + i);

                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex items-start gap-3.5 p-4 rounded-xl border text-sm cursor-pointer transition-all select-none",
                      checked
                        ? "border-zyphor-indigo-600 bg-zyphor-indigo-50/70 text-zyphor-indigo-950 ring-2 ring-zyphor-indigo-600/30 dark:border-zyphor-indigo-500 dark:bg-zyphor-indigo-950/40 dark:text-zyphor-indigo-200"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <input
                      type={item.is_multi ? "checkbox" : "radio"}
                      name={`opt-${item.item_id}`}
                      checked={checked}
                      onChange={(e) => onMcqChange(item, o.id, e.target.checked, item.is_multi)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-zyphor-indigo-600 focus:ring-zyphor-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="font-bold mr-2 text-slate-900 dark:text-slate-100">{letter}.</span>
                      <span className="text-slate-800 dark:text-slate-200">{o.text}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <CodingPanel
            key={item?.item_id}
            item={item}
            state={code[item?.item_id] || { language: allowedLanguages?.[0] || "python", drafts: {} }}
            langs={allowedLanguages}
            blockPaste={blockPaste}
            saveLabel={saveLabel}
            judge0Enabled={judge0Enabled}
            judgeLanguages={judgeLanguages}
            onPasteBlocked={onPasteBlocked}
            onChange={(value) => onCodeChange(item.item_id, value)}
            onLanguageChange={(lang) => onLanguageChange(item.item_id, lang)}
            onRun={(language, value, customInput, languageId) =>
              onRunCode(item.item_id, language, value, customInput, languageId)
            }
            onSubmit={(language, value, languageId) =>
              onSubmitCode(item.item_id, language, value, languageId)
            }
          />
        )}
      </div>
    </section>
  );
}