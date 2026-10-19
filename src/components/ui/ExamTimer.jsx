import * as React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils.js";

/**
 * Isolated countdown timer.
 * Runs on its own internal interval to avoid re-rendering parent exam components.
 *
 * @param {number} deadline - Timestamp in ms when the exam ends
 * @param {Function} onExpire - Callback triggered when timer reaches 0
 * @param {string} className - Optional container styling
 */
export function ExamTimer({ deadline, onExpire, className }) {
  const [secondsLeft, setSecondsLeft] = React.useState(() => {
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  const expiredRef = React.useRef(false);

  React.useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n) => String(n).padStart(2, "0");
  const formattedTime =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  const isUrgent = secondsLeft < 300; // < 5 minutes
  const isCritical = secondsLeft < 60; // < 1 minute

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold transition-all select-none border",
        isCritical
          ? "bg-red-50 text-red-700 border-red-300 animate-pulse dark:bg-red-950 dark:text-red-200 dark:border-red-800"
          : isUrgent
          ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
          : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
        className
      )}
      aria-label={`Time remaining: ${formattedTime}`}
      role="timer"
    >
      {isCritical ? (
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      ) : (
        <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
}
