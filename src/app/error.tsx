"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "700px", padding: "2rem", borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <AlertTriangle color="#f59e0b" size={28} />
          <h1 style={{ fontSize: "1.6rem", fontWeight: "700" }}>Something went wrong</h1>
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          An unexpected error occurred while loading this page.
        </p>
        <div style={{ background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "1rem", marginBottom: "1.25rem" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem", fontSize: "0.85rem" }}>Error Details</p>
          <code style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-primary)" }}>
            {error?.message || "Unknown error"}
          </code>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => reset()} className="btn btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go Home
          </Link>
          <Link href="/help/errors" className="btn btn-secondary">
            Open Error Center
          </Link>
        </div>
      </div>
    </main>
  );
}
