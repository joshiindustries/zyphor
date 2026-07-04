"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, MoreHorizontal, Shield } from "lucide-react";

export default function KanbanBoardPage({ params }: { params: { id: string } }) {
  const [boardTitle, setBoardTitle] = useState("Loading Board...");
  const [columns, setColumns] = useState<any[]>([]);

  useEffect(() => {
    // In a real implementation:
    // 1. Fetch board and tasks from /api/tasks/boards/[id]
    // 2. Decrypt board title and task titles/descriptions locally
    // 3. Set state
    
    // Simulating delay
    const timer = setTimeout(() => {
      setBoardTitle("Project Alpha Launch");
      setColumns([
        {
          id: "col-1",
          name: "To Do",
          tasks: [
            { id: "t1", title: "Write marketing copy" },
            { id: "t2", title: "Finalize logo design" }
          ]
        },
        {
          id: "col-2",
          name: "In Progress",
          tasks: [
            { id: "t3", title: "Develop landing page" }
          ]
        },
        {
          id: "col-3",
          name: "Done",
          tasks: [
            { id: "t4", title: "Setup repository" }
          ]
        }
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [params.id]);

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
      {/* Header */}
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard/tasks" style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <ArrowLeft size={18} /> Back
          </Link>
          <div style={{ height: "24px", width: "1px", background: "var(--glass-border)" }} />
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>{boardTitle}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e74c3c", marginLeft: "1rem" }}>
            <Shield size={16} /> <span style={{ fontSize: "0.75rem", fontWeight: "600" }}>Encrypted</span>
          </div>
        </div>

        <button className="btn btn-primary" style={{ background: "#e74c3c" }}>
          Share Board
        </button>
      </header>

      {/* Kanban Board Area */}
      <div style={{ flex: 1, padding: "2rem", overflowX: "auto", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        {columns.map((col) => (
          <div key={col.id} style={{ minWidth: "300px", maxWidth: "300px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", flexDirection: "column", maxHeight: "100%" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontWeight: "600", fontSize: "1rem" }}>{col.name}</h3>
              <button style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><MoreHorizontal size={16}/></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", flex: 1, marginBottom: "1rem" }}>
              {col.tasks.map((task: any) => (
                <div key={task.id} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "var(--radius-sm)", cursor: "grab" }}>
                  <p style={{ margin: 0, fontSize: "0.95rem" }}>{task.title}</p>
                </div>
              ))}
            </div>

            <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "var(--radius-sm)", width: "100%" }} className="hover:bg-[rgba(255,255,255,0.05)]">
              <Plus size={16} /> Add Task
            </button>

          </div>
        ))}

        {/* Add Column Button */}
        <div style={{ minWidth: "300px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)" }}>
            <Plus size={16} /> Add Column
          </span>
        </div>

      </div>
    </main>
  );
}
