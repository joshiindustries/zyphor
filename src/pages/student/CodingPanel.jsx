import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { Play, CheckCircle2, XCircle, AlertCircle, Terminal, Clock, Send, Loader2 } from "lucide-react";
import { Markdown } from "../../components/ui.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs.jsx";
import { DEFAULT_CODE, LANG_LABELS } from "./examState.js";
import { cn } from "../../lib/utils.js";

const LANG_EXT = {
  python: python,
  cpp: cpp,
  c: cpp,
  java: java,
  javascript: javascript,
};

function useIsDark() {
  const [dark, setDark] = useState(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute("data-theme");
      setDark(attr ? attr === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function Samples({ tests = [] }) {
  return (
    <div className="space-y-3">
      {tests.map((t, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Sample {i + 1}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input</span>
              <pre className="mt-1 p-2 rounded bg-white font-mono border border-slate-200 overflow-x-auto dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                {t.input || "(empty)"}
              </pre>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Output</span>
              <pre className="mt-1 p-2 rounded bg-white font-mono border border-slate-200 overflow-x-auto dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                {t.output || "(empty)"}
              </pre>
            </div>
          </div>
          {t.explanation && (
            <p className="mt-2 text-slate-500 italic text-[11px] m-0">{t.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RunOutput({ state }) {
  if (!state) return null;

  if (state.kind === "busy") {
    return (
      <div className="flex items-center gap-2 p-4 text-xs font-medium text-zyphor-indigo-600 dark:text-zyphor-indigo-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{state.label}</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Execution Error:</span> {state.message}
        </div>
      </div>
    );
  }

  if (state.kind === "submitted") {
    const r = state.data;
    const allPassed = Boolean(r?.all_passed);
    return (
      <div
        className={cn(
          "rounded-lg border p-4 text-xs shadow-xs",
          allPassed
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
        )}
      >
        <div className="flex items-center gap-2 font-bold text-sm mb-1">
          {allPassed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
          <span>{allPassed ? "All Hidden Test Cases Passed!" : "Partial Submission Accepted"}</span>
        </div>
        <p className="m-0">
          {allPassed
            ? "Your solution passed 100% of the hidden test suite. Full marks awarded."
            : `${r.passed_tests} of ${r.total_tests} hidden tests passed. You can refine your code and re-submit before time expires.`}
        </p>
      </div>
    );
  }

  const r = state.data;
  if (!r) return null;

  if (r.mode === "custom") {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-500 font-mono">
          <span>Execution Output</span>
          <span>{r.time_ms} ms</span>
        </div>
        <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          {r.stdout || "(no standard output)"}
        </pre>
        {r.stderr && (
          <div>
            <span className="font-semibold text-red-600 text-xs">Stderr / Compiler Errors:</span>
            <pre className="mt-1 p-3 rounded-lg bg-red-950/40 text-red-300 font-mono text-xs border border-red-900 overflow-x-auto">
              {r.stderr}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Sample Test Results: <strong>{r.passed}/{r.total} passed</strong>
        </span>
      </div>

      <div className="space-y-2">
        {r.results?.map((t, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {t.passed ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> Fail
                  </Badge>
                )}
                <span className="font-semibold text-slate-700 dark:text-slate-300">Sample {i + 1}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{t.time_ms} ms</span>
            </div>

            {!t.passed && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Expected</span>
                  <pre className="p-1.5 rounded bg-slate-50 border font-mono text-[11px] overflow-x-auto dark:bg-slate-950 dark:border-slate-800">
                    {t.expected}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Your Output</span>
                  <pre className="p-1.5 rounded bg-slate-50 border font-mono text-[11px] overflow-x-auto dark:bg-slate-950 dark:border-slate-800">
                    {t.actual}
                  </pre>
                </div>
              </div>
            )}

            {t.stderr && (
              <pre className="mt-2 p-2 rounded bg-red-950/20 text-red-600 font-mono text-[11px] border border-red-200 dark:border-red-900 dark:text-red-400 overflow-x-auto">
                {t.stderr}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CodingPanel({
  item,
  state,
  langs = [],
  blockPaste,
  onChange,
  onLanguageChange,
  onRun,
  onSubmit,
  onPasteBlocked,
  saveLabel,
  judge0Enabled = false,
  judgeLanguages = [],
}) {
  const dark = useIsDark();
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const pasteRef = useRef(onPasteBlocked);
  pasteRef.current = onPasteBlocked;

  const language = state.language;
  const languageIds = judgeLanguages.filter((row) => row.alias === language);
  const languageId = languageIds[0]?.id;
  const value = state.drafts[language] ?? item.starter_code?.[language] ?? DEFAULT_CODE[language] ?? "";

  const extensions = useMemo(() => {
    const ext = [(LANG_EXT[language] || python)()];
    if (blockPaste) {
      ext.push(
        EditorView.domEventHandlers({
          paste: (e) => {
            e.preventDefault();
            pasteRef.current?.();
            return true;
          },
          drop: (e) => {
            e.preventDefault();
            return true;
          },
        })
      );
    }
    return ext;
  }, [language, blockPaste]);

  const run = useCallback(
    async (submit) => {
      if (!value.trim()) {
        setOut({ kind: "error", message: "Write some code before executing." });
        return;
      }
      setBusy(true);
      setOut({ kind: "busy", label: submit ? "Executing against hidden test cases…" : "Running sample tests…" });
      try {
        const data = submit
          ? await onSubmit(language, value, languageId)
          : await onRun(language, value, useCustom ? customInput : null, languageId);
        setOut({ kind: submit ? "submitted" : "ran", data });
      } catch (err) {
        setOut({ kind: "error", message: err.message });
      } finally {
        setBusy(false);
      }
    },
    [value, language, languageId, useCustom, customInput, onRun, onSubmit]
  );

  const grade = state.result;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Column: Problem Description & Specifications */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-y-auto max-h-[calc(100vh-140px)] shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">{item.title}</h2>
          <Badge variant="outline" className="capitalize">
            {item.difficulty}
          </Badge>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          <Markdown>{item.statement}</Markdown>
        </div>

        {item.input_format && (
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Input Format</h4>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <Markdown>{item.input_format}</Markdown>
            </div>
          </div>
        )}

        {item.output_format && (
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Output Format</h4>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <Markdown>{item.output_format}</Markdown>
            </div>
          </div>
        )}

        {item.constraints && (
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Constraints</h4>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <Markdown>{item.constraints}</Markdown>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Sample Test Cases</h4>
          <Samples tests={item.sample_tests} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Time limit: {item.time_limit_seconds}s · {item.hidden_test_count} hidden test cases
          </span>
        </div>
      </div>

      {/* Right Column: Code Editor & Execution Results */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-500" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="text-xs font-semibold py-1 px-2.5 rounded-md border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-zyphor-indigo-500"
            >
              {(judge0Enabled
                ? [...new Set(judgeLanguages.map((x) => x.alias).filter((x) => langs.includes(x)))]
                : langs
              ).map((l) => (
                <option key={l} value={l}>
                  {judge0Enabled
                    ? judgeLanguages.find((x) => x.alias === l)?.name || LANG_LABELS[l] || l
                    : LANG_LABELS[l] || l}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400 font-medium">{saveLabel}</div>
        </div>

        {/* CodeMirror Editor Area */}
        <div className="flex-1 min-h-[340px] max-h-[460px] overflow-hidden">
          <CodeMirror
            value={value}
            height="100%"
            theme={dark ? githubDark : githubLight}
            extensions={extensions}
            onChange={onChange}
            basicSetup={{
              lineNumbers: true,
              autocompletion: false,
              highlightActiveLine: true,
              bracketMatching: true,
            }}
          />
        </div>

        {/* Custom Input Drawer & Test Runner */}
        <div className="border-t border-slate-200 p-4 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded border-slate-300 text-zyphor-indigo-600 focus:ring-zyphor-indigo-500"
              />
              <span>Provide Custom Input</span>
            </label>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy || (judge0Enabled && !languageId)}
                onClick={() => run(false)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Play className="h-3.5 w-3.5 text-slate-600" />
                Run Code
              </Button>

              <Button
                variant="success"
                size="sm"
                disabled={busy || (judge0Enabled && !languageId)}
                onClick={() => run(true)}
                className="gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Solution
              </Button>
            </div>
          </div>

          {useCustom && (
            <textarea
              rows={3}
              placeholder="Enter stdin for your program here..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-zyphor-indigo-500"
            />
          )}

          {/* Execution Results */}
          <div className="pt-2">
            <RunOutput state={out} />
          </div>
        </div>
      </div>
    </div>
  );
}
