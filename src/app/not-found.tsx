import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "650px", padding: "2rem", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
        <SearchX size={52} color="var(--accent-blue)" style={{ marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.75rem" }}>404 - Page Not Found</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          The page you requested does not exist or has been moved.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary">
            Back to Home
          </Link>
          <Link href="/help/errors" className="btn btn-secondary">
            Open Error Center
          </Link>
        </div>
      </div>
    </main>
  );
}
