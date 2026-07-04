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
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Zyphor is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether
            express or implied. J Industries does not guarantee uninterrupted, error-free, or fully secure operation
            of the platform.
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            <strong>Limitation of Liability:</strong> J Industries and Zyphor are not responsible for any theft of
            data, cyber attacks, unauthorized access, data loss, data corruption, or any other security incident,
            whether caused by third parties, user error, system failure, network interruption, or any other
            circumstance. To the fullest extent permitted by law, J Industries and Zyphor shall not be liable for
            any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of
            the service. You use Zyphor at your own risk and are solely responsible for safeguarding your encryption
            keys, passwords, accounts, and shared content.
          </p>
        </article>
      </section>
    </main>
  );
}
