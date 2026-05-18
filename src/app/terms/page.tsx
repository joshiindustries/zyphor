import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700" }}>Terms of Use</h1>
          <Link href="/" className="btn btn-secondary">Home</Link>
        </div>
      </header>

      <section style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", padding: "2rem", display: "grid", gap: "1rem" }}>
        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>1. Acceptance</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            By accessing or using Zyphor, you agree to these terms and all applicable policies.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>2. Authorized Use</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Users must not misuse the service, attempt unauthorized access, or upload unlawful content.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>3. Intellectual Property</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            The platform, code, and brand assets are proprietary to J Industries and protected by law.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>4. Warranty and Liability</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            The service is provided as-is without guarantees. J Industries is not liable for indirect or consequential damages.
          </p>
        </article>
      </section>
    </main>
  );
}
