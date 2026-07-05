import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Star, Trash2, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { NewNoteButton } from "./NewNoteButton";
import { NoteGrid } from "./NoteGrid";
import { NotesClient } from "./NotesClient";

export default async function NotesPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const notes = await prisma.note.findMany({
    where: { user_id: sessionUser.id },
    orderBy: { updated_at: "desc" }
  });

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Notes</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "#e67e22", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>E2E Encrypted</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <NewNoteButton />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600" }}>
              <FileText size={18} color="#e67e22" /> All Notes
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Star size={18} color="var(--accent-purple)" /> Pinned
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Trash2 size={18} color="#e74c3c" /> Trash
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>All Notes</h2>
          </div>

          <NotesClient initialNotes={notes as any} />
        </div>
      </div>
    </main>
  );
}
