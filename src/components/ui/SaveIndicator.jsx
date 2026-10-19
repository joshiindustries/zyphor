import * as React from "react";
import { Check, Loader2, AlertCircle, WifiOff } from "lucide-react";
import { cn } from "../../lib/utils.js";

/**
 * Autosave status indicator.
 *
 * @param {"saved" | "saving" | "retrying" | "error" | "offline"} status
 * @param {string} lastSavedText - e.g. "Saved 10:45 AM"
 * @param {string} className
 */
export function SaveIndicator({ status = "saved", lastSavedText = "Saved", className }) {
  if (status === "saving") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-zyphor-indigo-600 dark:text-zyphor-indigo-400",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === "retrying") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 animate-pulse",
          className
        )}
        role="status"
        aria-live="assertive"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Retrying…</span>
      </div>
    );
  }

  if (status === "offline" || status === "error") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400",
          className
        )}
        role="status"
        aria-live="assertive"
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span>Offline · reconnect to retry</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-zyphor-green-600 dark:text-zyphor-green-400",
        className
      )}
      role="status"
    >
      <Check className="h-3.5 w-3.5" />
      <span>{lastSavedText}</span>
    </div>
  );
}
