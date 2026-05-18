"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f", color: "#f0f0f5", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ width: "100%", maxWidth: "700px", padding: "2rem", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>Critical application error</h1>
            <p style={{ color: "#9aa0a6", marginBottom: "1rem" }}>
              A critical error occurred while rendering the app shell.
            </p>
            <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
              <code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{error?.message || "Unknown error"}</code>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => reset()} style={{ border: "none", borderRadius: "8px", background: "#3b82f6", color: "white", padding: "0.65rem 1rem", cursor: "pointer" }}>
                Try Again
              </button>
              <Link href="/" style={{ color: "#3b82f6", textDecoration: "none", padding: "0.65rem 1rem", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                Go Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
