"use client";

import { useState } from "react";
import Link from "next/link";
import { Kanban, Plus } from "lucide-react";
import { generateAESKey, encryptTextWithAES } from "@/lib/crypto";
import { useRouter } from "next/navigation";

export function BoardsClient({ initialBoards }: { initialBoards: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateBoard = async () => {
    setLoading(true);
    try {
      // 1. Generate AES key for board
      const aesKey = await generateAESKey();
      
      // 2. Encrypt default title
      const encryptedPayload = await encryptTextWithAES(aesKey, "New Project");

      // 3. Save to backend
      const res = await fetch("/api/tasks/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_title: encryptedPayload })
      });

      if (!res.ok) throw new Error("Failed to create board");
      const data = await res.json();

      // 4. Temporarily store key in localStorage
      const { exportAESKeyToRaw, arrayBufferToBase64 } = await import("@/lib/crypto");
      const rawKey = await exportAESKeyToRaw(aesKey);
      localStorage.setItem(`zyphor_board_key_${data.board.id}`, arrayBufferToBase64(rawKey));

      router.push(`/dashboard/tasks/${data.board.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button className="btn btn-primary" onClick={handleCreateBoard} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={16} /> {loading ? "Creating..." : "New Board"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {initialBoards.map(board => (
          <Link href={`/dashboard/tasks/${board.id}`} key={board.id} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", cursor: "pointer", height: "180px", transition: "transform 0.2s" }} className="hover:scale-105">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ background: "rgba(231,76,60,0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                  <Kanban size={24} color="#e74c3c" />
                </div>
                <h3 style={{ fontWeight: "600", fontSize: "1.1rem", margin: 0, wordBreak: "break-all" }}>Encrypted Project</h3>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", flex: 1 }}>
                {board.columns?.length || 0} Columns • {board.columns?.reduce((acc: number, col: any) => acc + (col.tasks?.length || 0), 0)} Tasks
              </p>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "auto" }}>
                {new Date(board.updated_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
        {initialBoards.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>No boards found. Create your first encrypted project!</p>
        )}
      </div>
    </>
  );
}
