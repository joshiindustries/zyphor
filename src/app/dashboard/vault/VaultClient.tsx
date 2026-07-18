"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Folder, File as FileIcon, Upload, Star, Trash2, ArrowLeft, Download, Trash, Loader2, X, Eye, Cloud } from "lucide-react";
import { encryptFile, decryptData } from "@/lib/crypto";
import { withCsrfHeaders } from "@/lib/csrf-client";

export function VaultClient({ initialFiles }: { initialFiles: any[] }) {
  const [files, setFiles] = useState<any[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<"ALL" | "FAVORITES" | "TRASH">("ALL");
  const [cloudConnections, setCloudConnections] = useState<any[]>([]);
  const [selectedStorageTarget, setSelectedStorageTarget] = useState("zyphor");

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ name: string, type: string, url: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const pwd = sessionStorage.getItem("zyphor_vault_pwd");
    if (pwd) setVaultPassword(pwd);
    else {
      const p = prompt("Enter your Vault Master Password to encrypt/decrypt files:");
      if (p) {
        setVaultPassword(p);
        sessionStorage.setItem("zyphor_vault_pwd", p);
      }
    }
  }, []);
  useEffect(() => {
    const loadCloudConnections = async () => {
      try {
        const res = await fetch("/api/cloud-connections");
        const data = await res.json();
        if (data.success) {
          setCloudConnections(data.connections || []);
          const defaultConnection = (data.connections || []).find((connection: any) => connection.is_default);
          if (defaultConnection) setSelectedStorageTarget(defaultConnection.id);
        }
      } catch (err) {
        console.error("Failed to load cloud connections", err);
      }
    };

    loadCloudConnections();
  }, []);

  const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const processUploadQueue = async (fileList: FileList | File[]) => {
    if (!vaultPassword) {
      alert("Vault password required for encryption.");
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length });
    
    let updatedFiles = [...files];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        setUploadProgress({ current: i + 1, total: fileList.length });
        
        // 1. Encrypt File Client-Side
        const { encryptedData, salt, iv } = await encryptFile(file, vaultPassword);
        
        // 2. Upload Encrypted Blob
        const formData = new FormData();
        formData.append("file", encryptedData, file.name + ".enc");
        if (selectedStorageTarget !== "zyphor") {
          formData.append("connectionId", selectedStorageTarget);
        }
        
        const uploadRes = await fetch("/api/vault/upload", {
          method: "POST",
          headers: withCsrfHeaders(),
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error("Upload failed");

        // 3. Save Metadata
        const metadata = {
          name: file.name,
          type: file.type,
          size: file.size,
          salt: arrayBufferToBase64(salt),
          iv: arrayBufferToBase64(iv)
        };

        const metaRes = await fetch("/api/vault/files", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            encrypted_metadata: JSON.stringify(metadata),
            storage_path: uploadData.storage_path
          })
        });

        const metaData = await metaRes.json();
        if (metaData.success) {
          updatedFiles = [metaData.file, ...updatedFiles];
        }
      } catch (err) {
        console.error("Error uploading file:", file.name, err);
      }
    }
    
    setFiles(updatedFiles);
    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processUploadQueue(e.target.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadQueue(e.dataTransfer.files);
    }
  };

  const fetchAndDecryptBlob = async (fileRec: any) => {
    const meta = JSON.parse(fileRec.encrypted_metadata);
    const res = await fetch(`/api/vault/download?fileId=${fileRec.id}`);
    if (!res.ok) throw new Error("File not found on server");
    
    const encryptedBuffer = await res.arrayBuffer();
    const decryptedBlob = await decryptData(
      encryptedBuffer, 
      vaultPassword, 
      meta.salt, 
      meta.iv
    );
    
    return { decryptedBlob, meta };
  };

  const handleDownload = async (fileRec: any) => {
    if (!vaultPassword) return alert("Vault password required for decryption.");
    try {
      const { decryptedBlob, meta } = await fetchAndDecryptBlob(fileRec);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to decrypt and download file.");
    }
  };

  const handlePreview = async (fileRec: any) => {
    if (!vaultPassword) return alert("Vault password required for decryption.");
    try {
      const m = JSON.parse(fileRec.encrypted_metadata);
      setPreviewFile({ name: m.name, type: m.type, url: null });
      setPreviewLoading(true);

      const { decryptedBlob, meta } = await fetchAndDecryptBlob(fileRec);
      
      // We only create an object URL if it's previewable (image, pdf, text)
      // For this demo, let's allow common types
      const url = URL.createObjectURL(decryptedBlob);
      setPreviewFile({ name: meta.name, type: meta.type, url });

    } catch (err) {
      console.error(err);
      alert("Failed to generate preview.");
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleFavorite = async (fileRec: any) => {
    try {
      const res = await fetch(`/api/vault/files/${fileRec.id}/favorite`, {
        method: "PUT",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_favorite: !fileRec.is_favorite })
      });
      const data = await res.json();
      if (data.success) {
        setFiles(files.map(f => f.id === fileRec.id ? data.file : f));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrash = async (fileRec: any) => {
    try {
      const res = await fetch(`/api/vault/files`, {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: fileRec.id, is_trashed: true })
      });
      const data = await res.json();
      if (data.success) {
        setFiles(files.map(f => f.id === fileRec.id ? data.file : f));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (fileRec: any) => {
    try {
      const res = await fetch(`/api/vault/files`, {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: fileRec.id, is_trashed: false })
      });
      const data = await res.json();
      if (data.success) {
        setFiles(files.map(f => f.id === fileRec.id ? data.file : f));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePermanent = async (fileRec: any) => {
    if (!confirm("Are you sure you want to permanently delete this file? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/vault/files?id=${fileRec.id}`, {
        method: "DELETE",
        headers: withCsrfHeaders()
      });
      if (res.ok) {
        setFiles(files.filter(f => f.id !== fileRec.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFiles = files.filter(f => {
    if (currentFilter === "FAVORITES") return f.is_favorite && !f.is_trashed;
    if (currentFilter === "TRASH") return f.is_trashed;
    return !f.is_trashed;
  });

  return (
    <main 
      style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)" }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(16, 185, 129, 0.1)", border: "4px dashed var(--accent-green)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <h2 style={{ fontSize: "2rem", color: "var(--accent-green)", fontWeight: "bold" }}>Drop files to encrypt and upload</h2>
        </div>
      )}

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
            <input 
              type="file" 
              multiple
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading && uploadProgress ? `Encrypting (${uploadProgress.current}/${uploadProgress.total})...` : "Upload Files"}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.03)", marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                <Cloud size={14} /> Storage Target
              </label>
              <select
                value={selectedStorageTarget}
                onChange={(e) => setSelectedStorageTarget(e.target.value)}
                style={{ width: "100%", background: "var(--bg-main)", color: "#fff", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-sm)", padding: "0.5rem" }}
              >
                <option value="zyphor">Zyphor Cloud</option>
                {cloudConnections.map(connection => (
                  <option key={connection.id} value={connection.id}>{connection.name}</option>
                ))}
              </select>
              <Link href="/dashboard/cloud" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.8rem" }}>Manage cloud</Link>
            </div>
            <div onClick={() => setCurrentFilter("ALL")} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: currentFilter === "ALL" ? "rgba(255,255,255,0.1)" : "transparent", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: currentFilter === "ALL" ? "600" : "normal" }}>
              <Folder size={18} color="var(--accent-blue)" /> My Vault
            </div>
            <div onClick={() => setCurrentFilter("FAVORITES")} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: currentFilter === "FAVORITES" ? "rgba(255,255,255,0.1)" : "transparent", borderRadius: "var(--radius-sm)", cursor: "pointer", color: currentFilter === "FAVORITES" ? "#fff" : "var(--text-secondary)" }}>
              <Star size={18} color="var(--accent-purple)" fill={currentFilter === "FAVORITES" ? "var(--accent-purple)" : "none"} /> Favorites
            </div>
            <div onClick={() => setCurrentFilter("TRASH")} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: currentFilter === "TRASH" ? "rgba(255,255,255,0.1)" : "transparent", borderRadius: "var(--radius-sm)", cursor: "pointer", color: currentFilter === "TRASH" ? "#fff" : "var(--text-secondary)" }}>
              <Trash2 size={18} color="#e74c3c" /> Trash
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>{currentFilter === "ALL" ? "My Vault" : currentFilter === "FAVORITES" ? "Favorites" : "Trash"}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {filteredFiles.length === 0 && (
              <p style={{ color: "var(--text-secondary)", gridColumn: "1 / -1" }}>No files found in this view.</p>
            )}
            
            {filteredFiles.map(f => {
              let name = "Unknown File";
              try {
                const m = JSON.parse(f.encrypted_metadata);
                name = m.name;
              } catch(e) {}
              
              return (
                <div key={f.id} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {currentFilter !== "TRASH" && (
                    <button onClick={() => toggleFavorite(f)} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", color: f.is_favorite ? "var(--accent-purple)" : "var(--text-secondary)" }}>
                      <Star size={18} fill={f.is_favorite ? "var(--accent-purple)" : "none"} />
                    </button>
                  )}
                  
                  <div style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }} onClick={() => handlePreview(f)}>
                    <FileIcon size={48} color="var(--text-secondary)" style={{ marginBottom: "1rem" }} />
                    <span style={{ fontWeight: "600", fontSize: "0.9rem", textAlign: "center", wordBreak: "break-all", marginBottom: "1rem", color: "var(--accent-blue)" }}>{name}</span>
                  </div>
                  
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                    {currentFilter === "TRASH" ? (
                      <>
                        <button className="btn btn-secondary" onClick={() => handleRestore(f)} style={{ padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", fontSize: "0.8rem", flex: 1, justifyContent: "center" }} title="Restore">
                          Restore
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleDeletePermanent(f)} style={{ padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", color: "#e74c3c", fontSize: "0.8rem", flex: 1, justifyContent: "center" }} title="Delete Permanently">
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary" onClick={() => handleDownload(f)} style={{ padding: "0.4rem", display: "flex", alignItems: "center" }} title="Download">
                          <Download size={16} />
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleTrash(f)} style={{ padding: "0.4rem", display: "flex", alignItems: "center", color: "#e74c3c" }} title="Trash">
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", flexDirection: "column" }}>
          <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Eye size={20} color="var(--text-secondary)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>{previewFile.name}</h3>
            </div>
            <button onClick={() => {
              if (previewFile.url) URL.revokeObjectURL(previewFile.url);
              setPreviewFile(null);
            }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: "0.5rem" }}>
              <X size={24} />
            </button>
          </header>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            {previewLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
                <Loader2 size={48} className="animate-spin" />
                <span>Decrypting securely in your browser...</span>
              </div>
            ) : previewFile.url ? (
              previewFile.type.startsWith("image/") ? (
                <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--radius-sm)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
              ) : previewFile.type === "application/pdf" ? (
                <iframe src={previewFile.url} style={{ width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: "var(--radius-sm)" }} />
              ) : previewFile.type.startsWith("video/") ? (
                <video src={previewFile.url} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
              ) : previewFile.type.startsWith("audio/") ? (
                <audio src={previewFile.url} controls />
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-md)" }}>
                  <FileIcon size={64} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p style={{ marginBottom: "1.5rem" }}>No preview available for <b>{previewFile.type}</b></p>
                  <a href={previewFile.url} download={previewFile.name} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <Download size={18} /> Download Decrypted File
                  </a>
                </div>
              )
            ) : (
              <div style={{ color: "var(--accent-red)" }}>Failed to preview file.</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
