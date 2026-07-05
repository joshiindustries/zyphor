"use client";

import React, { useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        // Silently wipe the DB
        await fetch("/api/security/panic", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "DELETE EVERYTHING" })
        });
      } catch (e) {
        // Ignore errors, we are panicking
      }
      
      // Clear local memory
      sessionStorage.clear();
      localStorage.clear();
      
      // Force reload to log them out instantly
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

export function VaultPasswordModal({ isOpen, onClose, onSubmit }: VaultPasswordModalProps) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPwd("");
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    setLoading(true);
    // Slight delay to simulate security processing and allow UI to update
    setTimeout(() => {
      onSubmit(pwd);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }}
          />
          
          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ 
              position: "relative",
              background: "var(--bg-main)",
              border: "1px solid var(--glass-border)",
              padding: "2rem",
              borderRadius: "var(--radius-lg)",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "50%", marginBottom: "1rem", border: "1px solid var(--glass-border)" }}>
                <Lock size={32} color="var(--accent-blue)" />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Unlock Vault</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Enter your Master Vault Password to decrypt your data in memory.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="password"
                placeholder="Master Vault Password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="input-field"
                style={{ width: "100%", padding: "0.75rem" }}
                autoFocus
                required
              />
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
