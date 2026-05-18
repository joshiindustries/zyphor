import Link from "next/link";

export default function PolicyPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700" }}>Privacy and Cookie Policy</h1>
          <Link href="/" className="btn btn-secondary">Home</Link>
        </div>
      </header>

      <section style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", padding: "2rem", display: "grid", gap: "1rem" }}>
        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>1. Information We Process</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            We process account data, transfer metadata, and security logs required to operate secure file sharing.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>2. Cookies</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            We use essential cookies for authentication, session continuity, and platform security. The cookie consent
            banner appears on first visit and acceptance is remembered.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>3. Security and Logs</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Security-related logs may include IP and account references for abuse prevention and auditability. Access to
            private logs is restricted to authorized operators.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>4. Contact</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            For legal or policy requests, contact J Industries support through your official business channel.
          </p>
        </article>
      </section>
    </main>
  );
}
