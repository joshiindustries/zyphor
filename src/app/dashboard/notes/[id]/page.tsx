"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Share2, Shield, Lock, Unlock, Database, Edit3, Eye, Bold, Italic, Code, List, Table, Image as ImageIcon } from "lucide-react";
import { base64ToArrayBuffer, deriveKey, encryptTextWithAES, decryptTextWithAES } from "@/lib/crypto";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { requireVaultPassword, VaultPasswordModal } from "@/lib/vault-password";
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function NoteEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [title, setTitle] = useState("Loading...");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [dbPayload, setDbPayload] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Vault Password Modal State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultModalResolve, setVaultModalResolve] = useState<(val: string | null) => void>(() => () => {});

  const handlePromptPassword = () => {
    return new Promise<string | null>((resolve) => {
      setVaultModalResolve(() => resolve);
      setIsVaultModalOpen(true);
    });
  };

  const handleVaultModalSubmit = (password: string) => {
    setIsVaultModalOpen(false);
    vaultModalResolve(password);
  };

  const handleVaultModalCancel = () => {
    setIsVaultModalOpen(false);
    vaultModalResolve(null);
  };

  useEffect(() => {
    async function loadNote() {
      setIsDecrypting(true);
      
      const pwd = await requireVaultPassword(handlePromptPassword);
      if (!pwd) {
        setIsDecrypting(false);
        return;
      }

      try {
        const saltRes = await fetch("/api/vault/salt");
        const saltData = await saltRes.json();
        if (!saltData.success) throw new Error("Vault not initialized.");
        const salt = new Uint8Array(base64ToArrayBuffer(saltData.salt));
        
        const key = await deriveKey(pwd, salt);
        setAesKey(key);

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

        setDbPayload({
          encrypted_title: note.encrypted_title,
          encrypted_content: note.encrypted_content,
        });

        if (note.encrypted_title) {
          try {
            const decTitle = await decryptTextWithAES(key, note.encrypted_title);
            setTitle(decTitle);
          } catch {
            setTitle("Error decrypting title");
          }
        } else {
          setTitle("Untitled Note");
        }

        if (note.encrypted_content) {
          try {
            const decContent = await decryptTextWithAES(key, note.encrypted_content);
            setContent(decContent);
          } catch {
            setContent("");
          }
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
        encrypted_title: encTitle,
        encrypted_content: encContent
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

  const insertFormatting = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    setContent(newText);
    
    // Reset focus after rendering
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
      <VaultPasswordModal
        isOpen={isVaultModalOpen}
        onClose={handleVaultModalCancel}
        onSubmit={handleVaultModalSubmit}
      />
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
      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", maxWidth: "1400px", margin: "0 auto", width: "100%", gap: "2rem" }}>
        
        <div style={{ display: "flex", gap: "2rem", flex: 1 }}>
          <div style={{ flex: 2, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              {isDecrypting ? (
                <motion.div 
                  key="decrypting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", gap: "1rem", padding: "2rem" }}
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
                  {/* Editor Header / Toolbar */}
                  <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    
                    {/* Formatting Toolbar */}
                    {!isPreview && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => insertFormatting("**", "**")} title="Bold" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><Bold size={16} /></button>
                        <button onClick={() => insertFormatting("*", "*")} title="Italic" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><Italic size={16} /></button>
                        <div style={{ width: "1px", height: "24px", background: "var(--glass-border)", margin: "0 0.5rem" }} />
                        <button onClick={() => insertFormatting("- ")} title="Bulleted List" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><List size={16} /></button>
                        <button onClick={() => insertFormatting("- [ ] ")} title="Checklist" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><ChecklistIcon size={16} /></button>
                        <div style={{ width: "1px", height: "24px", background: "var(--glass-border)", margin: "0 0.5rem" }} />
                        <button onClick={() => insertFormatting("```\n", "\n```")} title="Code Block" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><Code size={16} /></button>
                        <button onClick={() => insertFormatting("\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n")} title="Table" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><Table size={16} /></button>
                        <button onClick={() => insertFormatting("![Image Alt Text](url_here)")} title="Image" style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem", borderRadius: "4px" }} className="hover-bg-glass"><ImageIcon size={16} /></button>
                      </div>
                    )}
                    {isPreview && <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Previewing Markdown</div>}

                    {/* Mode Toggle */}
                    <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)", padding: "0.25rem" }}>
                      <button 
                        onClick={() => setIsPreview(false)}
                        style={{ padding: "0.5rem 1rem", border: "none", background: !isPreview ? "rgba(255,255,255,0.1)" : "transparent", color: !isPreview ? "var(--text-main)" : "var(--text-secondary)", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500", transition: "all 0.2s" }}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => setIsPreview(true)}
                        style={{ padding: "0.5rem 1rem", border: "none", background: isPreview ? "rgba(255,255,255,0.1)" : "transparent", color: isPreview ? "var(--text-main)" : "var(--text-secondary)", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "500", transition: "all 0.2s" }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ padding: "2rem 2rem 0 2rem" }}>
                      <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ fontSize: "2.5rem", fontWeight: "700", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", marginBottom: "1rem", width: "100%" }}
                        placeholder="Note Title"
                      />
                    </div>
                    
                    <div style={{ flex: 1, padding: "0 2rem 2rem 2rem", overflowY: "auto", position: "relative" }}>
                      {!isPreview ? (
                        <textarea 
                          ref={textareaRef}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          style={{ width: "100%", height: "100%", fontSize: "1.1rem", lineHeight: "1.6", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", resize: "none", fontFamily: "monospace" }}
                          placeholder="Start typing securely using Markdown..."
                        />
                      ) : (
                        <div className="markdown-preview" style={{ color: "var(--text-main)", lineHeight: "1.7", fontSize: "1.1rem" }}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={className} style={{ background: "rgba(255,255,255,0.1)", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.9em" }} {...props}>
                                    {children}
                                  </code>
                                )
                              },
                              table({children}) {
                                return <div style={{ overflowX: "auto", marginBottom: "1rem" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table></div>
                              },
                              th({children}) {
                                return <th style={{ borderBottom: "2px solid var(--glass-border)", padding: "0.75rem", textAlign: "left", background: "rgba(255,255,255,0.05)" }}>{children}</th>
                              },
                              td({children}) {
                                return <td style={{ borderBottom: "1px solid var(--glass-border)", padding: "0.75rem" }}>{children}</td>
                              },
                              img({src, alt}) {
                                return <img src={src} alt={alt} style={{ maxWidth: "100%", borderRadius: "8px", margin: "1rem 0" }} />
                              }
                            }}
                          >
                            {content || "*Nothing to preview yet.*"}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
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
                style={{ flex: 1, maxWidth: "400px", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid var(--glass-border)", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#3498db", marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
                  <Database size={18} />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Server View (Ciphertext)</h3>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  This is what is actually sent to and stored in the PostgreSQL database. The server cannot read your markdown note.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>encrypted_title (includes IV)</span>
                    <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "#e74c3c" }}>
                      {dbPayload.encrypted_title}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>encrypted_content (includes IV)</span>
                    <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all", fontFamily: "monospace", color: "#e74c3c" }}>
                      {dbPayload.encrypted_content.substring(0, 150)}...
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Simple style block for markdown elements that react-markdown doesn't style inline easily */}
      <style dangerouslySetInnerHTML={{__html: `
        .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--text-main);
        }
        .markdown-preview p {
          margin-bottom: 1rem;
        }
        .markdown-preview ul, .markdown-preview ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        .markdown-preview li {
          margin-bottom: 0.25rem;
        }
        .markdown-preview input[type="checkbox"] {
          margin-right: 0.5rem;
        }
        .markdown-preview blockquote {
          border-left: 4px solid var(--accent-purple);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.02);
          padding: 1rem;
          border-radius: 4px;
        }
        .hover-bg-glass:hover {
          background: rgba(255,255,255,0.1) !important;
        }
      `}} />
    </main>
  );
}

function ChecklistIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

