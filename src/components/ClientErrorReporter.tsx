"use client";

import { useEffect } from "react";
import { withCsrfHeaders } from "@/lib/csrf-client";

const REPORT_ENDPOINT = "/api/error-report";

function isReporterUrl(value: unknown): boolean {
  return typeof value === "string" && value.includes(REPORT_ENDPOINT);
}

function postClientError(payload: Record<string, unknown>) {
  fetch(REPORT_ENDPOINT, {
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

function getResourceSource(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null;
  return (
    target.getAttribute("src") ||
    target.getAttribute("href") ||
    target.getAttribute("poster") ||
    target.tagName.toLowerCase()
  );
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

    const handleResourceError = (event: Event) => {
      if (event instanceof ErrorEvent) return;
      const source = getResourceSource(event.target);
      if (!source || isReporterUrl(source)) return;

      postClientError({
        message: "Resource failed to load",
        source,
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

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const response = await originalFetch(input, init);
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (!isReporterUrl(requestUrl) && response.status >= 500) {
          postClientError({
            message: `HTTP ${response.status} ${response.statusText || "request failed"}`,
            source: requestUrl,
            status: response.status,
            statusText: response.statusText,
          });
        }

        return response;
      } catch (error) {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (!isReporterUrl(requestUrl)) {
          postClientError({
            message: error instanceof Error ? error.message : "Network request failed",
            source: requestUrl,
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
        throw error;
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("error", handleResourceError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError);
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}