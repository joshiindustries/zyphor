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
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>4. Data Security Disclaimer</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            While Zyphor is designed with end-to-end encryption and security best practices, no system can guarantee
            absolute protection against all threats. J Industries and Zyphor are not responsible for any theft of
            data, cyber attacks, unauthorized access, data loss, data corruption, or any other security incident,
            whether caused by third parties, user error, system failure, network interruption, or any other
            circumstance.
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            You are solely responsible for maintaining the confidentiality of your encryption keys, passwords, and
            account credentials. If you lose your encryption key or password, your encrypted data may be permanently
            unrecoverable.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>5. Contact</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            For legal or policy requests, contact J Industries support through your official business channel.
          </p>
        </article>
      </section>
    </main>
  );
}
