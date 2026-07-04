import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Kanban, Plus, Search, CalendarDays, ArrowLeft, Layout } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Tasks</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "#e74c3c", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>E2E Encrypted</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem", background: "#e74c3c" }}>
              <Plus size={16} /> New Board
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600" }}>
              <Layout size={18} color="#e74c3c" /> All Boards
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <CalendarDays size={18} color="var(--accent-purple)" /> Upcoming
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Search size={18} color="var(--accent-blue)" /> Search Tasks
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>All Boards</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {/* Placeholder Board Card */}
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.2s", height: "180px" }} className="hover:scale-105">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ background: "rgba(231,76,60,0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                  <Kanban size={24} color="#e74c3c" />
                </div>
                <h3 style={{ fontWeight: "600", fontSize: "1.1rem", margin: 0, wordBreak: "break-all" }}>Encrypted Project...</h3>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", flex: 1 }}>
                3 Columns • 12 Tasks
              </p>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "auto" }}>Updated Today</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
