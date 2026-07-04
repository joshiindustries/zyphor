"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KanbanSquare, Plus, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { deriveKeyFromPassword, encryptData, decryptData } from "@/lib/crypto";
import { useRouter } from "next/navigation";

export default function BoardsList() {
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [boards, setBoards] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  useEffect(() => {
    const pwd = sessionStorage.getItem("zyphor_vault_pwd");
    if (pwd) {
      // Auto-unlock if we already have the password in session
      setMasterPassword(pwd);
      // Let user click unlock or auto-unlock? Let's make them click unlock for security feel, or auto if we refactor.
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
      
      const validationRes = await fetch("/api/vault/verify");
      const validationData = await validationRes.json();
      
      try {
        await decryptData(validationData.encrypted_validation, key);
      } catch (err) {
        throw new Error("Incorrect master password.");
      }

      setMasterKey(key);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);
      await loadBoards(key);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async (key: CryptoKey) => {
    const res = await fetch("/api/tasks/boards");
    const data = await res.json();
    if (data.success) {
      const decrypted = [];
      for (const b of data.boards) {
        try {
          const title = await decryptData(b.encrypted_title, key);
          decrypted.push({ ...b, title });
        } catch (err) {
          decrypted.push({ ...b, title: "Failed to decrypt" });
        }
      }
      setBoards(decrypted);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey || !newBoardName.trim()) return;
    setLoading(true);
    try {
      const encryptedTitle = await encryptData(newBoardName, masterKey);
      const res = await fetch("/api/tasks/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_title: encryptedTitle })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setNewBoardName("");
        await loadBoards(masterKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!masterKey) {
    return (
      <div style={{ padding: "4rem 2rem", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)" }}>
          <Lock size={48} color="var(--accent-blue)" style={{ margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>Unlock Tasks</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
            Your Kanban boards are End-to-End Encrypted. Enter your Master Vault Password to unlock them.
          </p>

          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              {loading ? "Decrypting..." : "Unlock Boards"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <KanbanSquare size={32} color="var(--accent-blue)" />
            Task Boards
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Lock size={14} /> End-to-End Encrypted Workspace
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} /> New Board
        </button>
      </header>

      {isAdding && (
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", marginBottom: "1rem" }}>
          <form onSubmit={handleCreateBoard} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input 
              type="text" 
              placeholder="Board Name (e.g. Zyphor Roadmap)" 
              className="input-field"
              style={{ flex: 1 }}
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              required
            />
            <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Encrypting..." : "Create Board"}</button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {boards.length === 0 && !isAdding && (
          <div style={{ gridColumn: "1 / -1", padding: "4rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-md)", border: "1px dashed var(--glass-border)" }}>
            <KanbanSquare size={48} color="var(--text-secondary)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>You don't have any boards yet.</p>
            <button className="btn btn-secondary" onClick={() => setIsAdding(true)}>Create Your First Board</button>
          </div>
        )}

        {boards.map(b => (
          <Link key={b.id} href={`/dashboard/tasks/${b.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", height: "100%", transition: "transform 0.2s, border-color 0.2s" }} className="hover:border-blue-500 hover:scale-[1.02]">
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--accent-blue)" }}>{b.title}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                <span>{b._count.columns} Columns</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-green)" }}><CheckCircle size={14} /> E2EE Active</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
