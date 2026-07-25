"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Search, ShieldAlert, Copy, CheckCircle, Lock, RefreshCw, AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";
import { deriveKey, encryptTextWithAES, decryptTextWithAES } from "@/lib/crypto";
import TOTPDisplay from "@/components/TOTPDisplay";
import { withCsrfHeaders } from "@/lib/csrf-client";

export default function PasswordsDashboard() {
  const [masterPassword, setMasterPassword] = useState("");
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Stats
  const [healthStats, setHealthStats] = useState({ total: 0, weak: 0, reused: 0 });

  // Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: "", username: "", password: "", url: "", notes: "", totpSecret: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem("zyphor_master_key");
    if (cached) {
      // In a real app, you would export the raw key securely. For this demo, we re-derive it if needed or just use the password.
      // We will force them to enter it again for safety if they refresh, unless we store the password (unsafe) or raw key material.
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Fetch the user's salt
      const saltRes = await fetch("/api/vault/salt");
      const saltData = await saltRes.json();
      if (!saltData.success) throw new Error("Vault not initialized. Go to Vault first.");

      // 2. Derive key
      const key = await deriveKey(masterPassword, saltData.salt);
      
      // 3. Test decrypting the validation check
      const validationRes = await fetch("/api/vault/verify");
      const validationData = await validationRes.json();
      
      try {
        await decryptTextWithAES(key, validationData.encrypted_validation);
      } catch (err) {
        throw new Error("Incorrect master password.");
      }

      setMasterKey(key);
      await loadPasswords(key);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPasswords = async (key: CryptoKey) => {
    const res = await fetch("/api/passwords");
    const data = await res.json();
    if (data.success) {
      const decrypted = [];
      for (const p of data.passwords) {
        try {
          const dec = await decryptTextWithAES(key, p.encrypted_data);
          const parsed = JSON.parse(dec);
          decrypted.push({ id: p.id, ...parsed, created_at: p.created_at });
        } catch (err) {
          console.error("Failed to decrypt a password", err);
        }
      }
      setPasswords(decrypted);
      calculateHealth(decrypted);
    }
  };

  const calculateHealth = (pwdList: any[]) => {
    let weak = 0;
    let reused = 0;
    const seen = new Set<string>();

    for (const p of pwdList) {
      if (p.password.length < 8) weak++;
      
      if (seen.has(p.password)) reused++;
      else seen.add(p.password);
    }

    setHealthStats({ total: pwdList.length, weak, reused });
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd = "";
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewEntry({ ...newEntry, password: pwd });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey || !newEntry.title || !newEntry.password) return;
    setLoading(true);

    try {
      const payload = JSON.stringify(newEntry);
      const encryptedData = await encryptTextWithAES(masterKey, payload);

      const res = await fetch("/api/passwords", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ encrypted_data: encryptedData })
      });

      if (res.ok) {
        setIsAdding(false);
        setNewEntry({ title: "", username: "", password: "", url: "", notes: "", totpSecret: "" });
        await loadPasswords(masterKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!masterKey) return;
    if (!confirm("Delete this password?")) return;
    
    await fetch(`/api/passwords/${id}`, { method: "DELETE", headers: withCsrfHeaders() });
    await loadPasswords(masterKey);
  };

  const handleResetAll = async () => {
    if (!masterKey) return;
    if (!confirm("Clear all saved password-manager entries for this account? Your login password will not be changed.")) return;

    await fetch("/api/passwords", { method: "DELETE", headers: withCsrfHeaders() });
    setPasswords([]);
    calculateHealth([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, clear clipboard after 60s
  };

  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname;
    } catch {
      return null;
    }
  };

  if (!masterKey) {
    return (
      <div style={{ padding: "4rem 2rem", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)" }}>
          <Lock size={48} color="var(--accent-blue)" style={{ margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>Unlock Password Manager</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
            Your passwords are End-to-End Encrypted. Enter your Master Vault Password to decrypt them locally.
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
              {loading ? "Decrypting..." : "Unlock Passwords"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = passwords.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Key size={32} color="var(--accent-blue)" />
            Password Manager
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            End-to-End Encrypted. Zero-Knowledge.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={handleResetAll} style={{ display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--accent-red)" }}>
            <Trash2 size={18} /> Clear All
          </button>
          <button className="btn btn-primary" onClick={() => setIsAdding(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} /> Add Password
          </button>
        </div>
      </header>

      {/* Health Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={24} color="var(--accent-green)" />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "1.5rem", fontWeight: "700" }}>{healthStats.total}</strong>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Passwords</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: healthStats.weak > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} color={healthStats.weak > 0 ? "var(--accent-red)" : "var(--accent-green)"} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "1.5rem", fontWeight: "700" }}>{healthStats.weak}</strong>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Weak Passwords</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: healthStats.reused > 0 ? "rgba(243, 156, 18, 0.1)" : "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={24} color={healthStats.reused > 0 ? "var(--accent-yellow)" : "var(--accent-green)"} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "1.5rem", fontWeight: "700" }}>{healthStats.reused}</strong>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Reused Passwords</span>
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search passwords (decrypted locally)..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", color: "#fff", outline: "none" }}
          />
        </div>
        
        <div>
          {filtered.map(p => {
            const domain = getDomain(p.url);
            return (
              <div key={p.id} style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "1.5rem" }} className="hover:bg-[rgba(255,255,255,0.02)]">
                {/* Website Icon */}
                <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-sm)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {domain ? (
                    <img src={`https://logo.clearbit.com/${domain}`} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <Key size={24} color="#000" />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.25rem" }}>{p.title}</h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: p.totpSecret ? "0.5rem" : "0" }}>{p.username}</div>
                  {p.totpSecret && <TOTPDisplay secret={p.totpSecret} />}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(p.username)} title="Copy Username" style={{ padding: "0.5rem" }}>
                    <Copy size={16} /> User
                  </button>
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(p.password)} title="Copy Password" style={{ padding: "0.5rem" }}>
                    <Copy size={16} /> Pass
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleDelete(p.id)} title="Delete" style={{ padding: "0.5rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.2)" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Key size={48} style={{ margin: "0 auto 1rem", opacity: 0.2 }} />
              <p>No passwords found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Password Modal */}
      {isAdding && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(10px)" }}>
          <div style={{ background: "var(--bg-main)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", width: "100%", maxWidth: "500px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Add Password</h2>
            
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input className="input-field" placeholder="Title (e.g. Netflix)" value={newEntry.title} onChange={e => setNewEntry({...newEntry, title: e.target.value})} required />
              <input className="input-field" placeholder="Website URL (e.g. netflix.com)" value={newEntry.url} onChange={e => setNewEntry({...newEntry, url: e.target.value})} />
              <input className="input-field" placeholder="Username / Email" value={newEntry.username} onChange={e => setNewEntry({...newEntry, username: e.target.value})} required />
              
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input className="input-field" type={showPassword ? "text" : "password"} placeholder="Password" value={newEntry.password} onChange={e => setNewEntry({...newEntry, password: e.target.value})} required style={{ width: "100%" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="button" className="btn btn-secondary" onClick={generatePassword}>Generate</button>
              </div>

              <textarea className="input-field" placeholder="Notes (Optional)" value={newEntry.notes} onChange={e => setNewEntry({...newEntry, notes: e.target.value})} style={{ minHeight: "80px", resize: "vertical" }} />
              
              <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Two-Factor Authentication (Optional)</h4>
                <input className="input-field" placeholder="TOTP Secret / Setup Key (Base32)" value={newEntry.totpSecret} onChange={e => setNewEntry({...newEntry, totpSecret: e.target.value})} style={{ width: "100%" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Encrypted"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
