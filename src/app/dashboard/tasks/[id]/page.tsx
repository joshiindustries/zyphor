"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Plus, GripVertical, Trash2 } from "lucide-react";
import { deriveKeyFromPassword, encryptData, decryptData } from "@/lib/crypto";

export default function KanbanBoardPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const boardId = params.id;

  const [masterPassword, setMasterPassword] = useState("");
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [board, setBoard] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);

  // Add Task Modal
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null); // column_id
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  // Drag state
  const [draggingTask, setDraggingTask] = useState<any>(null);

  useEffect(() => {
    const pwd = sessionStorage.getItem("zyphor_vault_pwd");
    if (pwd) {
      setMasterPassword(pwd);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const saltRes = await fetch("/api/vault/salt");
      const saltData = await saltRes.json();
      if (!saltData.success) throw new Error("Vault not initialized.");

      const key = await deriveKeyFromPassword(masterPassword, saltData.salt);
      setMasterKey(key);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);
      await loadBoard(key);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBoard = async (key: CryptoKey) => {
    const res = await fetch(`/api/tasks/boards/${boardId}`);
    const data = await res.json();
    if (data.success) {
      const b = data.board;
      try {
        b.title = await decryptData(b.encrypted_title, key);
      } catch {
        b.title = "Failed to decrypt title";
      }

      // Decrypt tasks
      const cols = b.columns;
      for (const col of cols) {
        for (const task of col.tasks) {
          try {
            task.title = await decryptData(task.encrypted_title, key);
            if (task.encrypted_description) {
              task.description = await decryptData(task.encrypted_description, key);
            }
          } catch {
            task.title = "Encrypted Task";
          }
        }
      }
      setBoard(b);
      setColumns(cols);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey || !isAddingTask || !newTaskTitle.trim()) return;
    
    setLoading(true);
    try {
      const encryptedTitle = await encryptData(newTaskTitle, masterKey);
      const encryptedDesc = newTaskDesc.trim() ? await encryptData(newTaskDesc, masterKey) : null;

      const res = await fetch("/api/tasks/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          column_id: isAddingTask,
          encrypted_title: encryptedTitle,
          encrypted_description: encryptedDesc
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingTask(null);
        setNewTaskTitle("");
        setNewTaskDesc("");
        await loadBoard(masterKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // HTML5 Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, task: any) => {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = "move";
    // We can transfer the task ID, but React state holds the task object anyway
    e.dataTransfer.setData("text/plain", task.id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggingTask || draggingTask.column_id === targetColumnId) {
      setDraggingTask(null);
      return;
    }

    // Optimistic UI Update
    const sourceColIndex = columns.findIndex(c => c.id === draggingTask.column_id);
    const targetColIndex = columns.findIndex(c => c.id === targetColumnId);
    
    if (sourceColIndex !== -1 && targetColIndex !== -1) {
      const newCols = [...columns];
      const taskIndex = newCols[sourceColIndex].tasks.findIndex((t: any) => t.id === draggingTask.id);
      const [taskToMove] = newCols[sourceColIndex].tasks.splice(taskIndex, 1);
      taskToMove.column_id = targetColumnId;
      newCols[targetColIndex].tasks.push(taskToMove);
      setColumns(newCols);

      // Persist
      try {
        await fetch("/api/tasks/items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: taskToMove.id,
            column_id: targetColumnId
          })
        });
      } catch (err) {
        console.error("Failed to move task", err);
        // Reload from server on failure
        if (masterKey) loadBoard(masterKey);
      }
    }
    
    setDraggingTask(null);
  };

  if (!masterKey) {
    return (
      <div style={{ padding: "4rem 2rem", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)" }}>
          <Lock size={48} color="var(--accent-blue)" style={{ margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>Unlock Board</h1>
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
            <input 
              type="password" 
              placeholder="Master Password" 
              value={masterPassword} 
              onChange={e => setMasterPassword(e.target.value)}
              className="input-field" 
              required
            />
            {error && <div style={{ color: "var(--accent-red)", fontSize: "0.9rem" }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "0.75rem" }}>
              {loading ? "Decrypting..." : "Unlock Board"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!board) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading board...</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {board.title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
            <Lock size={12} /> E2EE Active
          </p>
        </div>
        <Link href="/dashboard/tasks" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft size={16} /> All Boards
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", gap: "1.5rem", padding: "2rem", overflowX: "auto", alignItems: "flex-start" }}>
        {columns.map(col => (
          <div 
            key={col.id} 
            style={{ minWidth: "320px", maxWidth: "320px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", maxHeight: "100%" }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "600", fontSize: "1.1rem" }}>
              {col.name}
              <span style={{ fontSize: "0.8rem", background: "var(--glass-border)", padding: "0.2rem 0.6rem", borderRadius: "10px", color: "var(--text-secondary)" }}>
                {col.tasks.length}
              </span>
            </div>
            
            <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {col.tasks.map((task: any) => (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, task)}
                  style={{ 
                    background: "var(--glass-bg)", 
                    border: "1px solid var(--glass-border)", 
                    borderRadius: "var(--radius-sm)", 
                    padding: "1rem",
                    cursor: "grab",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    opacity: draggingTask?.id === task.id ? 0.5 : 1
                  }}
                  className="hover:border-blue-500 transition-colors"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <GripVertical size={16} color="var(--text-secondary)" style={{ marginTop: "0.2rem", cursor: "grab" }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.25rem", wordBreak: "break-word" }}>{task.title}</h4>
                      {task.description && (
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{task.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isAddingTask === col.id ? (
                <form onSubmit={handleCreateTask} style={{ background: "var(--glass-bg)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent-blue)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input type="text" placeholder="Task Title" className="input-field" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required autoFocus />
                  <textarea placeholder="Description (Optional)" className="input-field" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} rows={2} />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddingTask(null)} style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>Save</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingTask(col.id)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: "transparent", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", cursor: "pointer", justifyContent: "center", transition: "border-color 0.2s, color 0.2s" }}
                  className="hover:border-blue-500 hover:text-blue-500"
                >
                  <Plus size={16} /> Add Task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
