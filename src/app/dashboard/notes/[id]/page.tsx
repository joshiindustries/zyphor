"use client";

import { useEffect, useState , use } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Share2, Shield, Lock, Unlock, Database } from "lucide-react";
import { importAESKeyFromRaw, base64ToArrayBuffer, generateAESKey, encryptTextWithAES, decryptTextWithAES } from "@/lib/crypto";
import { motion, AnimatePresence } from "framer-motion";

export default function NoteEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [title, setTitle] = useState("Loading...");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [dbPayload, setDbPayload] = useState<any>(null);

  useEffect(() => {
    async function loadNote() {
      setIsDecrypting(true);
      try {
        // 1. Fetch note from server
        const res = await fetch(`/api/notes/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setTitle("Note not found");
            setIsDecrypting(false);
            return;
          }
          throw new Error("Failed to fetch note");
        }
        const data = await res.json();
        const note = data.note;

        // 2. Load AES key from localStorage
        const base64Key = localStorage.getItem(`zyphor_note_key_${params.id}`);
        let key: CryptoKey;
        if (base64Key) {
          const rawBuffer = base64ToArrayBuffer(base64Key);
          key = await importAESKeyFromRaw(rawBuffer);
        } else {
          console.warn("AES key not found locally. Re-generating for demo purposes.");
          key = await generateAESKey();
        }
        setAesKey(key);

        setDbPayload({
          encrypted_title: note.encrypted_title,
          title_iv: note.title_iv,
          encrypted_content: note.encrypted_content,
          content_iv: note.content_iv
        });

        // 3. Decrypt
        if (note.encrypted_title && note.title_iv) {
          const decTitle = await decryptTextWithAES(key, note.title_iv, note.encrypted_title);
          setTitle(decTitle);
        } else {
          setTitle("Untitled Note");
        }

        if (note.encrypted_content && note.content_iv) {
          const decContent = await decryptTextWithAES(key, note.content_iv, note.encrypted_content);
          setContent(decContent);
        } else {
          setContent("");
        }
        
        setIsDecrypting(false);

      } catch (err) {
        console.error("Decryption failed", err);
        setTitle("Error decrypting note");
        setIsDecrypting(false);
      }
    }
    loadNote();
  }, [params.id]);

  const handleSave = async () => {
    if (!aesKey) return;
    setIsSaving(true);
    
    try {
      // 1. Encrypt title and content using the note's AES key
      const encTitle = await encryptTextWithAES(aesKey, title);
      const encContent = await encryptTextWithAES(aesKey, content);

      // 2. Send PATCH to /api/notes/[id]
      const payload = {
        encrypted_title: encTitle.ciphertext,
        title_iv: encTitle.iv,
        encrypted_content: encContent.ciphertext,
        content_iv: encContent.iv
      };

      const res = await fetch(`/api/notes/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save note");

      // Show what the database actually sees
      setDbPayload(payload);
      setIsSaving(false);

    } catch (err) {
      console.error("Encryption failed", err);
      setIsSaving(false);
    }
  };

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
      {/* Header */}
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard/notes" style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
            <ArrowLeft size={18} /> Back
          </Link>
          <div style={{ height: "24px", width: "1px", background: "var(--glass-border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2ecc71" }}>
            <Shield size={16} /> <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>E2E Encrypted</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Share2 size={16} /> Share
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || isDecrypting} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#e67e22" }}>
            {isSaving ? <Lock size={16} /> : <Save size={16} />} 
            {isSaving ? "Encrypting..." : "Save Note"}
          </button>
        </div>
      </header>

      {/* Editor Area */}
      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", maxWidth: "1200px", margin: "0 auto", width: "100%", gap: "2rem" }}>
        
        <div style={{ display: "flex", gap: "2rem", flex: 1 }}>
          <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="wait">
              {isDecrypting ? (
                <motion.div 
                  key="decrypting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", gap: "1rem" }}
                >
                  <Unlock size={32} className="animate-pulse" color="#2ecc71" />
                  <p>Decrypting securely...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: "flex", flexDirection: "column", flex: 1 }}
                >
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ fontSize: "2.5rem", fontWeight: "700", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", marginBottom: "2rem", width: "100%" }}
                    placeholder="Note Title"
                  />
                  
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ flex: 1, fontSize: "1.1rem", lineHeight: "1.6", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", resize: "none", width: "100%" }}
                    placeholder="Start typing securely..."
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Developer Visualizer: What the Server Sees */}
          <AnimatePresence>
            {dbPayload && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid var(--glass-border)", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#3498db", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
                  <Database size={18} />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Server View (Ciphertext)</h3>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  This is what is actually sent to and stored in the PostgreSQL database. The server cannot read your note.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>encrypted_title</span>
                    <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "#e74c3c" }}>
                      {dbPayload.encrypted_title}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>title_iv</span>
                    <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "#95a5a6" }}>
                      {dbPayload.title_iv}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>encrypted_content</span>
                    <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "#e74c3c" }}>
                      {dbPayload.encrypted_content.substring(0, 100)}...
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
