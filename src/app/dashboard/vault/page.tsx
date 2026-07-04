import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Folder, File, Upload, FolderPlus, Star, Trash2, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Vault</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "var(--accent-purple)", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>Secure Cloud</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <Upload size={16} /> Upload File
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600" }}>
              <Folder size={18} color="var(--accent-blue)" /> My Vault
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Star size={18} color="var(--accent-purple)" /> Favorites
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Trash2 size={18} color="#e74c3c" /> Trash
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>My Vault</h2>
            <button className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderPlus size={16} /> New Folder
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {/* Placeholder Items */}
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <Folder size={48} color="var(--accent-blue)" style={{ marginBottom: "1rem" }} />
              <span style={{ fontWeight: "600" }}>Documents</span>
            </div>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <Folder size={48} color="var(--accent-blue)" style={{ marginBottom: "1rem" }} />
              <span style={{ fontWeight: "600" }}>Images</span>
            </div>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.2s" }} className="hover:scale-105">
              <File size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
              <span style={{ fontWeight: "600", fontSize: "0.9rem", textAlign: "center", wordBreak: "break-all" }}>encrypted_file.dat</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
