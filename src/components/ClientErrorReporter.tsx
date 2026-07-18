"use client";

import { useEffect } from "react";
import { withCsrfHeaders } from "@/lib/csrf-client";

function postClientError(payload: Record<string, unknown>) {
  fetch("/api/error-report", {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...payload,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
    keepalive: true,
  }).catch(() => {
    // Avoid recursive reporting loops when the reporter itself cannot send.
  });
}

export default function ClientErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      postClientError({
        message: event.message,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : "window.error",
        stack: event.error?.stack,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      postClientError({
        message: reason instanceof Error ? reason.message : String(reason || "Unhandled promise rejection"),
        source: "unhandledrejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
