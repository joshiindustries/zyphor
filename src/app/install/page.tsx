import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InstallAssistant from "@/components/InstallAssistant";
import SiteFooter from "@/components/SiteFooter";

export default function InstallPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="main-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="Zyphor Logo" style={{ height: "32px", width: "auto" }} />
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor</h1>
        </div>
        <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn btn-secondary" style={{ border: "1px solid var(--glass-border)", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Home
          </Link>
          <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Open App
          </Link>
        </nav>
      </header>
      <InstallAssistant />
      <SiteFooter />
    </main>
  );
}
