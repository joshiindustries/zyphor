import Link from "next/link";
import { AlertCircle, ShieldAlert, SearchX } from "lucide-react";

const cards = [
  {
    title: "General Runtime Error",
    icon: AlertCircle,
    detail:
      "Shown when something unexpected crashes a page. Use the error message shown on-screen to identify the issue and retry.",
    tip: "Open browser console and server logs to inspect the exact stack trace.",
  },
  {
    title: "404 Not Found",
    icon: SearchX,
    detail:
      "Shown when the URL does not match any valid route in this app.",
    tip: "Check URL spelling, then navigate back to Home or Dashboard.",
  },
  {
    title: "Auth / Access Error",
    icon: ShieldAlert,
    detail:
      "Shown when sign-in is required, session expired, or route permissions reject access.",
    tip: "Sign in again and verify account permissions.",
  },
];

export default function ErrorHelpPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700" }}>Error Center</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/" className="btn btn-secondary">Home</Link>
            <Link href="/dashboard" className="btn btn-primary">Dashboard</Link>
          </div>
        </div>
      </header>

      <section style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "2rem" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          This page explains common errors and what they mean.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <Icon size={18} color="var(--accent-blue)" />
                  <h2 style={{ fontSize: "1rem", fontWeight: "600" }}>{card.title}</h2>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{card.detail}</p>
                <p style={{ color: "var(--text-primary)", fontSize: "0.85rem" }}>
                  <strong>Tip:</strong> {card.tip}
                </p>
              </article>
            );
          })}
        </div>

        <div className="glass-panel" style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Quick Links</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/this-path-does-not-exist" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              Test 404 Page
            </Link>
            <Link href="/" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              Go to Main Page
            </Link>
            <Link href="/dashboard" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
