import { Markdown } from "../../components/ui.jsx";
import CodingPanel from "./CodingPanel.jsx";

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
  const isCoding = item.type === "coding";

  return (
    <section className={"content" + (isCoding ? " is-coding" : "")}>
      <div className="q-wrap">
        <div className="q-head">
          <div>
            <span className="q-num">Question {item.number} / {totalItems}</span>
            <div className="strong" style={{ fontSize: 15, marginTop: 1 }}>{item.section}</div>
          </div>
          <div className="row tight small">
            <Badge color="green">+{item.marks} marks</Badge>
            {item.type === "mcq" && item.negative_marks > 0 && (
              <Badge color="red">−{item.negative_marks} if wrong</Badge>
            )}
            {item.type === "mcq" && item.is_multi && <Badge color="blue">Select all that apply</Badge>}
          </div>
        </div>

        {item.type === "mcq" ? (
          <div className="card">
            <Markdown style={{ fontSize: 15.5, lineHeight: 1.6 }}>{item.question_text}</Markdown>
            <ul className="options">
              {item.options.map((o, i) => {
                const st = mcq[item.item_id];
                const checked = st?.selected?.includes(o.id) || false;
                return (
                  <li key={o.id}>
                    <label className={checked ? "chosen" : ""}>
                      <input
                        type={item.is_multi ? "checkbox" : "radio"}
                        name={`opt-${item.item_id}`}
                        checked={checked}
                        onChange={(e) => onMcqChange(item, o.id, e.target.checked, item.is_multi)}
                      />
                      <span><strong>{String.fromCharCode(65 + i)}.</strong> {o.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <CodingPanel
            key={item.item_id}
            item={item}
            state={code[item.item_id]}
            langs={allowedLanguages}
            blockPaste={blockPaste}
            saveLabel={saveLabel}
            judge0Enabled={judge0Enabled}
            judgeLanguages={judgeLanguages}
            onPasteBlocked={onPasteBlocked}
            onChange={(value) => onCodeChange(item.item_id, value)}
            onLanguageChange={(lang) => onLanguageChange(item.item_id, lang)}
            onRun={(language, value, customInput, languageId) => onRunCode(item.item_id, language, value, customInput, languageId)}
            onSubmit={(language, value, languageId) => onSubmitCode(item.item_id, language, value, languageId)}
          />
        )}
      </div>
    </section>
  );
}