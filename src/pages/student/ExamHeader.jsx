import { useEffect, useRef } from "react";
import { Badge } from "../../components/ui/badge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { ExamTimer } from "../../components/ui/ExamTimer.jsx";
import { SaveIndicator } from "../../components/ui/SaveIndicator.jsx";
import ExamConnectionStatus from "../../components/ExamConnectionStatus.jsx";
import { Menu, FileText, Send, AlertTriangle, ShieldCheck } from "lucide-react";

export function ExamHeader({
  paper,
  deadline,
  left = 0,
  onExpire,
  violations = 0,
  maxViolations = 5,
  heartbeatAt,
  heartbeatError,
  saveLabel,
  saveStatus = "saved",
  user,
  examPaused,
  onTogglePalette,
  onShowInstructions,
  onSubmit,
  submitting,
  paletteOpen,
}) {
  const violationsVariant =
    violations >= maxViolations - 1
      ? "destructive"
      : violations > 0
      ? "warning"
      : "success";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur shadow-xs dark:border-slate-800 dark:bg-slate-900/95">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={onTogglePalette}
          aria-label="Toggle question palette"
          aria-expanded={paletteOpen}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-wider uppercase text-zyphor-indigo-600 dark:text-zyphor-indigo-400">
            Assessment Workspace
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 m-0">
            {paper?.exam?.title}
          </h2>
        </div>
      </div>

      {/* Center: Connection, Save Status, Violations */}
      <div className="hidden md:flex items-center gap-4">
        <ExamConnectionStatus heartbeatAt={heartbeatAt} heartbeatError={heartbeatError} />

        <SaveIndicator status={saveStatus} lastSavedText={saveLabel || "Saved automatically"} />

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{user?.name}</span> · {user?.roll_no}
        </div>

        {violations > 0 ? (
          <Badge variant={violationsVariant} className="gap-1 font-mono">
            <AlertTriangle className="h-3 w-3" />
            {violations}/{maxViolations} violations
          </Badge>
        ) : (
          <Badge variant="success" className="gap-1 font-normal">
            <ShieldCheck className="h-3 w-3" />
            Integrity active
          </Badge>
        )}
      </div>

      {/* Right: Timer, Instructions, and Final Submit */}
      <div className="flex items-center gap-2 sm:gap-3">
        {deadline ? (
          <ExamTimer deadline={deadline} onExpire={onExpire} />
        ) : (
          <div className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 font-semibold text-slate-700">
            {Math.floor(left / 60)}m left
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onShowInstructions}
          className="h-8 text-xs gap-1 hidden sm:inline-flex"
        >
          <FileText className="h-3.5 w-3.5 text-slate-500" />
          Instructions
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={submitting}
          onClick={onSubmit}
          className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Send className="h-3 w-3" />
          Submit Exam
        </Button>
      </div>
    </header>
  );
}

export function ExamPausedBanner() {
  return (
    <div
      className="flex items-center gap-3 bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-inner"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0 animate-bounce" />
      <div>
        <strong>Exam paused by organizers:</strong> Your timer has been suspended and all your answers are safely saved. The exam will resume automatically.
      </div>
    </div>
  );
}