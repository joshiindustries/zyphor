"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, MoreHorizontal, Shield } from "lucide-react";
import { decryptTextWithAES, encryptTextWithAES, base64ToArrayBuffer } from "@/lib/crypto";

export function KanbanClient({ boardId }: { boardId: string }) {
  const [boardTitle, setBoardTitle] = useState("Loading Board...");
  const [columns, setColumns] = useState<any[]>([]);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingToCol, setAddingToCol] = useState<string | null>(null);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await fetch(`/api/tasks/boards/${boardId}`);
        const data = await res.json();
        
        if (!data.success) {
          setBoardTitle("Error loading board");
          return;
        }

        const board = data.board;
        
        // Retrieve key from localStorage
        const base64Key = localStorage.getItem(`zyphor_board_key_${boardId}`);
        if (!base64Key) {
          setBoardTitle("Encrypted Project (Key Missing)");
          setColumns(board.columns || []);
          return;
        }

        const { importAESKeyFromRaw } = await import("@/lib/crypto");
        const rawKey = base64ToArrayBuffer(base64Key);
        const key = await importAESKeyFromRaw(rawKey);
        setAesKey(key);

        if (board.encrypted_title) {
          try {
            const decTitle = await decryptTextWithAES(key, board.encrypted_title);
            setBoardTitle(decTitle);
          } catch (e) {
            setBoardTitle("Decryption Failed");
          }
        } else {
          setBoardTitle("Untitled Project");
        }

        // Decrypt tasks
        const decryptedColumns = await Promise.all(
          (board.columns || []).map(async (col: any) => {
            const decryptedTasks = await Promise.all(
              (col.tasks || []).map(async (task: any) => {
                let decTaskTitle = "Encrypted Task";
                if (task.encrypted_title) {
                  try {
                    decTaskTitle = await decryptTextWithAES(key, task.encrypted_title);
                  } catch (e) {}
                }
                return { ...task, title: decTaskTitle };
              })
            );
            return { ...col, tasks: decryptedTasks };
          })
        );
        
        setColumns(decryptedColumns);
      } catch (err) {
        console.error("Failed to load board", err);
        setBoardTitle("Error");
      }
    };
    loadBoard();
  }, [boardId]);

  const handleAddTask = async (colId: string) => {
    if (!newTaskTitle.trim() || !aesKey) return;
    
    try {
      const encryptedTitle = await encryptTextWithAES(aesKey, newTaskTitle);
      
      const res = await fetch("/api/tasks/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          column_id: colId,
          encrypted_title: encryptedTitle,
          encrypted_description: ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        setColumns(cols => cols.map(col => {
          if (col.id === colId) {
            return {
              ...col,
              tasks: [...(col.tasks || []), { ...data.task, title: newTaskTitle }]
            };
          }
          return col;
        }));
        setNewTaskTitle("");
        setAddingToCol(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
              {col.tasks?.map((task: any) => (
                <div key={task.id} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "var(--radius-sm)", cursor: "grab" }}>
                  <p style={{ margin: 0, fontSize: "0.95rem" }}>{task.title}</p>
                </div>
              ))}
              
              {addingToCol === col.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <input
                    autoFocus
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    style={{ background: "var(--bg-main)", border: "1px solid var(--glass-border)", padding: "0.5rem", borderRadius: "var(--radius-sm)", color: "#fff" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask(col.id);
                      if (e.key === "Escape") setAddingToCol(null);
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }} onClick={() => handleAddTask(col.id)}>Add</button>
                    <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }} onClick={() => setAddingToCol(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {!addingToCol && (
              <button onClick={() => setAddingToCol(col.id)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "var(--radius-sm)", width: "100%" }} className="hover:bg-[rgba(255,255,255,0.05)]">
                <Plus size={16} /> Add Task
              </button>
            )}

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
