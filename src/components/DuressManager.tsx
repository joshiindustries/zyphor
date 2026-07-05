"use client";

import { useState, useEffect } from "react";
import { Skull, Loader2, Check } from "lucide-react";

export default function DuressManager() {
  const [hasDuress, setHasDuress] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem("zyphor_duress_hash");
    if (existing) {
      setHasDuress(true);
    }
  }, []);

  const hashPassword = async (pwd: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSetDuress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      alert("Password must be at least 4 characters.");
      return;
    }
    
    setLoading(true);
    try {
      const hexHash = await hashPassword(password);
      localStorage.setItem("zyphor_duress_hash", hexHash);
      setHasDuress(true);
      setSuccessMsg("Duress password set successfully.");
      setPassword("");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to set duress password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuress = () => {
    if (confirm("Are you sure you want to remove the Duress Password?")) {
      localStorage.removeItem("zyphor_duress_hash");
      setHasDuress(false);
    }
  };

  return (
    <div style={{ background: "rgba(255,0,0,0.05)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)" }}>
        <Skull size={20} /> Duress Password (Failsafe)
      </h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.95rem" }}>
        If you are physically forced to unlock your vault, enter this alternate password instead of your Master Password. 
        It will silently trigger Panic Mode, permanently erasing all your data and logging you out.
      </p>

      {hasDuress ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "rgba(231, 76, 60, 0.2)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(231, 76, 60, 0.4)", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)" }}>
            <Check size={18} /> Duress Password is actively armed.
          </div>
          <button className="btn btn-secondary" onClick={handleRemoveDuress} style={{ alignSelf: "flex-start", borderColor: "var(--accent-red)", color: "var(--accent-red)" }}>
            Remove Duress Password
          </button>
        </div>
      ) : (
        <form onSubmit={handleSetDuress} style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input 
              type="password" 
              placeholder="Set Duress Password..." 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="input-field" 
              style={{ flex: 1 }} 
              required 
            />
            <button type="submit" className="btn btn-danger" disabled={loading} style={{ background: "var(--accent-red)", color: "#fff", minWidth: "120px" }}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Arm Failsafe"}
            </button>
          </div>
          {successMsg && <span style={{ color: "var(--accent-green)", fontSize: "0.85rem" }}>{successMsg}</span>}
        </form>
      )}
    </div>
  );
}
