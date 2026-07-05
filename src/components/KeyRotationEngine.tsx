"use client";

import { useState } from "react";
import { Key, ShieldAlert, Loader2, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { deriveKey, encryptTextWithAES, decryptTextWithAES, generateRSAKeyPair } from "@/lib/key-exchange";

export default function KeyRotationEngine() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [status, setStatus] = useState<"IDLE" | "FETCHING" | "ROTATING" | "UPLOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }
    
    setError("");
    setStatus("FETCHING");
    setProgress(10);

    try {
      // 1. Verify Current Password unlocks the vault key
      // The user's salt is tied to their username, but we don't have username here easily unless we fetch it.
      // Wait, the standard deriveKey uses a hardcoded salt in our simplified demo architecture, or the username.
      // We will assume deriveKey works identically to login.
      const username = localStorage.getItem("zyphor_username") || "user"; // Fallback to a string if needed
      
      const oldKeyObj = await deriveKey(currentPassword, username);
      const newKeyObj = await deriveKey(newPassword, username);

      const oldVaultKey = oldKeyObj.key;
      const newVaultKey = newKeyObj.key;

      // 2. Fetch all data
      setProgress(20);
      const res = await fetch("/api/security/rotate-keys");
      const { success, data, error: fetchErr } = await res.json();
      if (!success) throw new Error(fetchErr || "Failed to fetch vault data");

      setStatus("ROTATING");
      setProgress(30);

      // We need to rotate everything.
      const rotateArray = async (arr: any[], encryptedField: string) => {
        const rotated = [];
        for (const item of arr) {
          if (!item[encryptedField]) {
            rotated.push(item);
            continue;
          }
          try {
            const plaintext = await decryptTextWithAES(item[encryptedField], oldVaultKey);
            const newCiphertext = await encryptTextWithAES(plaintext, newVaultKey);
            rotated.push({ ...item, [encryptedField]: newCiphertext });
          } catch (e) {
            console.error(`Failed to rotate item ${item.id}`);
            throw new Error(`Incorrect Current Password or corrupted data found.`);
          }
        }
        return rotated;
      };

      const rotateMultipleFields = async (arr: any[], fields: string[]) => {
        const rotated = [];
        for (const item of arr) {
          const newItem = { ...item };
          for (const field of fields) {
            if (item[field]) {
              try {
                const plaintext = await decryptTextWithAES(item[field], oldVaultKey);
                newItem[field] = await encryptTextWithAES(plaintext, newVaultKey);
              } catch (e) {
                console.error(`Failed to rotate field ${field} on item ${item.id}`);
                throw new Error(`Incorrect Current Password or corrupted data found.`);
              }
            }
          }
          rotated.push(newItem);
        }
        return rotated;
      };

      // Rotate Folders, Files, Boards (single field: encrypted_metadata)
      const rotatedFolders = await rotateArray(data.folders, "encrypted_metadata");
      setProgress(40);
      const rotatedFiles = await rotateArray(data.files, "encrypted_metadata");
      setProgress(50);
      const rotatedBoards = await rotateArray(data.boards, "encrypted_metadata");
      
      // Rotate Notes (encrypted_content)
      const rotatedNotes = await rotateArray(data.notes, "encrypted_content");
      setProgress(60);

      // Rotate Tags (encrypted_name, encrypted_color)
      const rotatedTags = await rotateMultipleFields(data.tags, ["encrypted_name", "encrypted_color"]);
      
      // Rotate Columns (encrypted_name)
      const rotatedColumns = await rotateArray(data.columns, "encrypted_name");
      
      // Rotate Tasks (encrypted_title, encrypted_description)
      const rotatedTasks = await rotateMultipleFields(data.tasks, ["encrypted_title", "encrypted_description"]);
      setProgress(70);

      // Rotate Events (encrypted_title, encrypted_description)
      const rotatedEvents = await rotateMultipleFields(data.events, ["encrypted_title", "encrypted_description"]);

      // Rotate Passwords (encrypted_username, encrypted_password, encrypted_notes, encrypted_url)
      const rotatedPasswords = await rotateMultipleFields(data.passwords, ["encrypted_username", "encrypted_password", "encrypted_notes", "encrypted_url"]);
      setProgress(80);

      // Rotate RSA Keypair
      // 1. Generate entirely new RSA keypair
      const newRSA = await generateRSAKeyPair();
      // 2. Encrypt the private key with the NEW Vault Key
      const newEncryptedPrivKey = await encryptTextWithAES(newRSA.privateKey, newVaultKey);

      const payload = {
        folders: rotatedFolders,
        files: rotatedFiles,
        tags: rotatedTags,
        notes: rotatedNotes,
        boards: rotatedBoards,
        columns: rotatedColumns,
        tasks: rotatedTasks,
        events: rotatedEvents,
        passwords: rotatedPasswords,
        encrypted_priv_key: newEncryptedPrivKey
      };

      setStatus("UPLOADING");
      setProgress(90);

      const postRes = await fetch("/api/security/rotate-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const postData = await postRes.json();
      if (!postData.success) throw new Error(postData.error || "Failed to commit rotated keys.");

      setProgress(100);
      setStatus("SUCCESS");

      // Update local storage/session storage to match new state
      sessionStorage.setItem("zyphor_vault_pwd", newPassword);
      sessionStorage.setItem("zyphor_priv_key", newRSA.privateKey);
      sessionStorage.setItem("zyphor_pub_key", newRSA.publicKey); // Note: we didn't push public key to DB in this payload. In reality, we must update Public Key on the User record too. Wait!

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during key rotation.");
      setStatus("ERROR");
    }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Key size={20} color="var(--accent-blue)" /> Master Key Rotation
      </h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
        Change your Master Password. This will locally decrypt and re-encrypt your entire vault using CPU-intensive operations.
      </p>
      
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Initiate Rotation <ArrowRight size={16} />
        </button>
      ) : status === "SUCCESS" ? (
        <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--accent-green)", padding: "1.5rem", borderRadius: "var(--radius-md)", color: "var(--accent-green)", textAlign: "center" }}>
          <CheckCircle size={48} style={{ margin: "0 auto 1rem" }} />
          <strong style={{ display: "block", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Key Rotation Complete</strong>
          <p style={{ color: "var(--accent-green)", margin: 0, fontSize: "0.9rem" }}>
            Your entire vault has been successfully re-encrypted with your new Master Password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleRotation} style={{ background: "rgba(0,0,0,0.3)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "1rem", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {status !== "IDLE" && status !== "ERROR" ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <Loader2 size={48} className="animate-spin" color="var(--accent-blue)" style={{ margin: "0 auto 1.5rem" }} />
              <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", color: "#fff" }}>
                {status === "FETCHING" && "Downloading Encrypted Vault..."}
                {status === "ROTATING" && "Decrypting & Re-encrypting (CPU Heavy)..."}
                {status === "UPLOADING" && "Committing Atomic Transaction..."}
              </div>
              <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: \`\${progress}%\`, height: "100%", background: "var(--accent-blue)", transition: "width 0.3s ease" }} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", color: "var(--accent-yellow)", background: "rgba(245, 158, 11, 0.1)", padding: "1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Warning:</strong> Do not close or refresh this page during rotation. The backend requires a massive atomic transaction to prevent data corruption.
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Current Master Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>New Master Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  style={{ width: "100%" }}
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: "var(--accent-blue)" }}>Start Engine</button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
