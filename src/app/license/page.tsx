import Link from "next/link";

export default function LicensePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700" }}>License</h1>
          <Link href="/" className="btn btn-secondary">Home</Link>
        </div>
      </header>

      <section style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", padding: "2rem", display: "grid", gap: "1rem" }}>
        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Copyright</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Copyright (c) 2026 J Industries. All rights reserved.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Proprietary Software</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Zyphor and its associated documentation, code, and brand assets are proprietary and confidential. No
            permission is granted to use, copy, modify, merge, publish, distribute, sublicense, sell, reverse
            engineer, or create derivative works from this software, in whole or in part, without prior written
            permission from J Industries.
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            Unauthorized use, reproduction, or distribution of this software is strictly prohibited.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Disclaimer of Warranties</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            The software is provided &quot;as is&quot;, without warranty of any kind, express or implied, including
            but not limited to the warranties of merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Limitation of Liability</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            In no event shall J Industries or Zyphor be liable for any claim, damages, or other liability, whether
            in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software
            or the use or other dealings in the software.
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            J Industries and Zyphor are not responsible for any theft of data, cyber attacks, unauthorized access,
            data loss, data corruption, or any other security incident, whether caused by third parties, user error,
            system failure, network interruption, or any other circumstance. Users acknowledge that they use Zyphor
            at their own risk and are solely responsible for safeguarding their encryption keys, passwords, accounts,
            and shared content.
          </p>
        </article>

        <article className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-md)" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>Related Policies</h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/terms" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              Terms of Use
            </Link>
            <Link href="/policy" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              Privacy and Cookie Policy
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
