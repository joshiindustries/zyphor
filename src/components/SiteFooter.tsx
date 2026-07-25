import Link from "next/link";
import AppVersionLabel from "@/components/AppVersionLabel";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        width: "100%",
        marginTop: "2rem",
        borderTop: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        padding: "1rem 2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Copyright (c) {year} J Industries. All rights reserved.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
            <AppVersionLabel />
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/policy" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            Policy
          </Link>
          <Link href="/terms" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            Terms
          </Link>
          <Link href="/license" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            License
          </Link>
          <Link href="/help/errors" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            Error Center
          </Link>
          <Link href="/this-path-does-not-exist" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            Test 404
          </Link>
          <Link href="/" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.85rem" }}>
            Home
          </Link>
        </div>
      </div>
    </footer>
  );
}
