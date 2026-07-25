"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base64ToArrayBuffer, decryptTextWithAES, deriveKey } from "@/lib/crypto";

/**
 * Checks if a vault password is in session storage.
 * If not, triggers the modal to ask the user.
 */
export async function requireVaultPassword(
  promptPasswordFn: () => Promise<string | null>
): Promise<string | null> {
  const existing = sessionStorage.getItem("zyphor_vault_pwd");
  if (existing) {
    return existing;
  }
  
  const pwd = await promptPasswordFn();
  if (pwd) {
    // Check for Duress Password silently
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const duressHash = localStorage.getItem("zyphor_duress_hash");
    if (duressHash && hexHash === duressHash) {
      console.warn("DURESS PASSWORD DETECTED. TRIGGERING SILENT PANIC PROTOCOL.");
      try {
        await fetch("/api/security/panic", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "DELETE EVERYTHING" })
        });
      } catch {
        // Ignore errors, we are panicking
      }
      
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/";
      return null;
    }

    sessionStorage.setItem("zyphor_vault_pwd", pwd);
    return pwd;
  }
  
  return null;
}

interface VaultPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pwd: string) => void;
}

type UnlockCredential = {
  id: string;
  type: string;
  label: string | null;
  salt: string;
  verifier: string | null;
  encrypted_secret: string | null;
};

export function VaultPasswordModal({ isOpen, onClose, onSubmit }: VaultPasswordModalProps) {
  const [pwd, setPwd] = useState("");
  const [pin, setPin] = useState("");
  const [pinCredentials, setPinCredentials] = useState<UnlockCredential[]>([]);
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPwd("");
    setPin("");
    setPinError("");
    setLoading(false);

    fetch("/api/vault/unlock-credentials?type=PIN")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setPinCredentials(data.credentials || []);
      })
      .catch(() => setPinCredentials([]));
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    setLoading(true);
    setTimeout(() => {
      onSubmit(pwd);
    }, 300);
  };

  const handlePinUnlock = async () => {
    const credential = pinCredentials.find((item) => item.encrypted_secret);
    if (!credential || !credential.encrypted_secret) return;
    if (!pin) return;

    setLoading(true);
    setPinError("");

    try {
      const key = await deriveKey(pin, new Uint8Array(base64ToArrayBuffer(credential.salt)));
      if (credential.verifier) {
        const verifier = await decryptTextWithAES(key, credential.verifier);
        if (verifier !== "ZYPHOR_UNLOCK_OK") throw new Error("Invalid PIN.");
      }
      const masterPassword = await decryptTextWithAES(key, credential.encrypted_secret);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);
      onSubmit(masterPassword);
    } catch {
      setPinError("PIN unlock failed. Check the PIN or use your master password.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ 
              position: "relative",
              background: "var(--bg-primary)",
              border: "1px solid var(--glass-border)",
              padding: "clamp(1.25rem, 5vw, 2rem)",
              borderRadius: "var(--radius-md)",
              width: "min(440px, 100%)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem", border: "1px solid var(--glass-border)" }}>
                <Lock size={32} color="var(--accent-blue)" />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Unlock Secure Data</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Use your master password or PIN unlock to open secure data in this browser.
              </p>
            </div>

            {pinCredentials.length > 0 && (
              <div style={{ border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", padding: "1rem", marginBottom: "1rem", display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <KeyRound size={16} /> Unlock with PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="Device PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="input-field"
                  style={{ width: "100%", padding: "0.75rem" }}
                />
                {pinError && <p style={{ color: "#ef4444", fontSize: "0.82rem", margin: 0 }}>{pinError}</p>}
                <button type="button" className="btn btn-secondary" onClick={handlePinUnlock} disabled={loading || !pin} style={{ width: "100%", border: "1px solid var(--glass-border)" }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Unlock with PIN"}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="password" placeholder="Master Vault Password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="input-field" style={{ width: "100%", padding: "0.75rem" }} autoFocus required />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Unlock"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
