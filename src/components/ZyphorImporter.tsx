"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { deriveKey, decryptTextWithAES, encryptTextWithAES, base64ToArrayBuffer } from "@/lib/crypto";

export default function ZyphorImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
      setSuccess(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setProgressMsg("Reading backup file...");

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.metadata || !backup.metadata.user || !backup.data) {
        throw new Error("Invalid Zyphor Backup file format.");
      }

      const oldSaltBase64 = backup.metadata.user.vault_salt;
      if (!oldSaltBase64) {
        throw new Error("Backup file is missing cryptographic salt metadata.");
      }

      const oldPassword = prompt("Enter the Master Vault Password that was used AT THE TIME this backup was created:");
      if (!oldPassword) throw new Error("Import cancelled. Password is required to decrypt backup.");

      const currentPassword = prompt("Enter your CURRENT Master Vault Password for this account to re-encrypt the data:");
      if (!currentPassword) throw new Error("Import cancelled. Current password is required.");

      setProgressMsg("Deriving cryptographic keys...");
      
      // 1. Old Key
      const oldSalt = new Uint8Array(base64ToArrayBuffer(oldSaltBase64));
      const oldKey = await deriveKey(oldPassword, oldSalt);

      // 2. New Key
      const currentSaltRes = await fetch("/api/vault/salt");
      const currentSaltData = await currentSaltRes.json();
      if (!currentSaltData.success) throw new Error("Current account vault is not initialized.");
      
      const currentSalt = new Uint8Array(base64ToArrayBuffer(currentSaltData.salt));
      const newKey = await deriveKey(currentPassword, currentSalt);

      const payload = { notes: [] as any[], tasks: [] as any[], passwords: [] as any[] };

      // Process Notes
      setProgressMsg("Decrypting & Re-encrypting Notes...");
      for (const n of backup.data.notes || []) {
        try {
          const plainTitle = await decryptTextWithAES(oldKey, n.encrypted_title);
          const plainContent = n.encrypted_content ? await decryptTextWithAES(oldKey, n.encrypted_content) : "";
          
          payload.notes.push({
            encrypted_title: await encryptTextWithAES(newKey, plainTitle),
            encrypted_content: await encryptTextWithAES(newKey, plainContent),
            is_pinned: n.is_pinned
          });
        } catch (err) {
          console.warn("Failed to migrate a note", err);
        }
      }

      // Process Tasks
      setProgressMsg("Decrypting & Re-encrypting Tasks...");
      for (const t of backup.data.tasks || []) {
        try {
          const plainTitle = await decryptTextWithAES(oldKey, t.encrypted_title);
          const plainDesc = t.encrypted_description ? await decryptTextWithAES(oldKey, t.encrypted_description) : "";
          const plainCol = t.encrypted_column_id ? await decryptTextWithAES(oldKey, t.encrypted_column_id) : "";
          
          payload.tasks.push({
            encrypted_title: await encryptTextWithAES(newKey, plainTitle),
            encrypted_description: await encryptTextWithAES(newKey, plainDesc),
            encrypted_column_id: await encryptTextWithAES(newKey, plainCol)
          });
        } catch (err) {
          console.warn("Failed to migrate a task", err);
        }
      }

      // Process Passwords
      setProgressMsg("Decrypting & Re-encrypting Passwords...");
      for (const p of backup.data.passwords || []) {
        try {
          const plainData = await decryptTextWithAES(oldKey, p.encrypted_data);
          payload.passwords.push({
            encrypted_data: await encryptTextWithAES(newKey, plainData)
          });
        } catch (err) {
          console.warn("Failed to migrate a password", err);
        }
      }

      setProgressMsg("Uploading to server...");
      const importRes = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const importData = await importRes.json();
      if (!importData.success) throw new Error(importData.error || "Import failed on server.");

      setSuccess(true);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process backup file.");
    } finally {
      setLoading(false);
      setProgressMsg("");
    }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Upload size={20} color="var(--accent-green)" /> Zyphor Importer
      </h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
        Restore your data from a Zyphor Takeout backup file. We will decrypt your old data locally and re-encrypt it for this account.
      </p>

      {success ? (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-green)" }}>
          <CheckCircle size={18} /> Import completed successfully!
        </div>
      ) : (
        <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input 
            type="file" 
            accept=".json"
            onChange={handleFileChange}
            className="input-field" 
            style={{ width: "100%", padding: "0.5rem" }}
          />
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)", fontSize: "0.85rem" }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          {progressMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-blue)", fontSize: "0.85rem" }}>
              <Loader2 size={14} className="animate-spin" /> {progressMsg}
            </div>
          )}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !file} 
            style={{ background: "var(--accent-green)", color: "#fff", border: "none" }}
          >
            {loading ? "Processing..." : "Import Data"}
          </button>
        </form>
      )}
    </div>
  );
}
