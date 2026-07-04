"use client"

import { useEffect, useState } from "react"
import { Shield, ShieldAlert, Monitor, CheckCircle, AlertTriangle, Key, Clock, Settings, Laptop, Smartphone, Trash2, Link, Upload, Loader2, X } from "lucide-react"

export default function SecurityDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Panic Mode state
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicInput, setPanicInput] = useState("");
  const [panicLoading, setPanicLoading] = useState(false);

  // Link Scanner state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkResult, setLinkResult] = useState<any>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  // File Integrity Checker state
  const [fileHash, setFileHash] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [hashLoading, setHashLoading] = useState(false);

  useEffect(() => {
    fetch("/api/security/dashboard")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || "Failed to load security data.");
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoutSession = async (sessionId: string) => {
    try {
      const res = await fetch("/api/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          activeSessions: prev.activeSessions.filter((s: any) => s.id !== sessionId)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Panic Mode handlers
  const triggerPanic = async () => {
    if (panicInput !== "DELETE EVERYTHING") {
      alert("Please type the exact confirmation string: DELETE EVERYTHING");
      return;
    }
    setPanicLoading(true);
    try {
      const res = await fetch("/api/security/panic", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: panicInput })
      });
      const data = await res.json();
      if (data.success) {
        alert("Panic Mode activated. All your data has been purged and you are now logged out.");
        window.location.reload();
      } else {
        alert(data.error || "Failed to activate Panic Mode.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPanicLoading(false);
      setPanicOpen(false);
      setPanicInput("");
    }
  };

  // Link Scanner handlers
  const scanLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/security/scan-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl })
      });
      const result = await res.json();
      setLinkResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLinkLoading(false);
    }
  };

  // File Integrity Checker handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setHashLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    setFileHash(hashHex);
    setHashLoading(false);
  };

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Loading Security Dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: "2rem", color: "var(--accent-red)" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Existing header and widgets */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Shield size={32} color={data.score >= 80 ? "var(--accent-green)" : data.score >= 50 ? "#f39c12" : "var(--accent-red)"} />
            Security Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Manage your account security, encryption keys, and active sessions.</p>
        </div>
      </header>

      {/* Main grid with existing widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Security Score Widget */}
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>Security Score</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: `8px solid ${data.score >= 80 ? "var(--accent-green)" : data.score >= 50 ? "#f39c12" : "var(--accent-red)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: "800" }}>{data.score}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.checks.map((chk: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: chk.status === "success" ? "var(--accent-green)" : "var(--accent-yellow)" }}>
                  {chk.status === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {chk.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Encryption Status */}
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Key size={20} color="var(--accent-blue)" /> Encryption Status
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Symmetric Encryption</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>For Vault Files &amp; Notes</span>
              </div>
              <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)", padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.85rem", fontWeight: "600" }}>AES-256-GCM</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Asymmetric Encryption</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>For E2EE Chat &amp; Keys</span>
              </div>
              <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)", padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.85rem", fontWeight: "600" }}>ECDH P-256</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-green)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              <CheckCircle size={16} /> Keys Valid and Active
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Monitor size={20} color="var(--accent-purple)" /> Active Sessions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.activeSessions.map((session: any, i: number) => (
              <div key={session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: i === data.activeSessions.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Monitor size={20} />
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: "0.95rem" }}>Web Session</strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Expires: {new Date(session.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", border: "1px solid var(--accent-red)", color: "var(--accent-red)", background: "transparent" }} onClick={() => handleLogoutSession(session.id)}>
                  Logout
                </button>
              </div>
            ))}
            {data.activeSessions.length === 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No active sessions found.</div>
            )}
          </div>
        </div>
      </div>

      {/* New Tools Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        {/* Panic Mode Card */}
        <div style={{ background: "rgba(255,0,0,0.05)", border: "2px solid var(--accent-red)", borderRadius: "var(--radius-md)", padding: "1.5rem", position: "relative" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--accent-red)", marginBottom: "0.5rem" }}>Panic Mode</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Erase all encrypted data, keys, and sessions instantly. This action <b>cannot be undone</b>.</p>
          <button className="btn btn-danger" style={{ background: "var(--accent-red)", color: "#fff" }} onClick={() => setPanicOpen(true)} disabled={panicLoading}>
            {panicLoading ? <Loader2 className="animate-spin" size={16} /> : "Activate Panic Mode"}
          </button>
          {panicOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "var(--bg-main)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "90%", maxWidth: "400px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, color: "var(--accent-red)" }}>Confirm Panic Mode</h4>
                  <button onClick={() => setPanicOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={20} /></button>
                </header>
                <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>Type <code>DELETE EVERYTHING</code> to confirm.</p>
                <input
                  type="text"
                  value={panicInput}
                  onChange={e => setPanicInput(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-secondary" onClick={() => setPanicOpen(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-danger" onClick={triggerPanic} disabled={panicLoading} style={{ flex: 1, background: "var(--accent-red)", color: "#fff" }}>
                    {panicLoading ? <Loader2 className="animate-spin" size={16} /> : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Link Scanner Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>Link Scanner</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Paste a URL to check its safety (HTTPS, status, redirects).</p>
          <form onSubmit={scanLink} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="url" placeholder="https://example.com" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="input-field" style={{ flex: 1 }} required />
            <button type="submit" className="btn btn-primary" disabled={linkLoading} style={{ minWidth: "80px" }}>
              {linkLoading ? <Loader2 className="animate-spin" size={16} /> : "Scan"}
            </button>
          </form>
          {linkResult && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(0,0,0,0.1)", borderRadius: "var(--radius-sm)" }}>
              <p><strong>Result:</strong> {linkResult.safe ? "✅ Safe" : "⚠️ Potentially unsafe"}</p>
              {linkResult.details && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <li>Final URL: {linkResult.details.finalUrl}</li>
                  <li>Status: {linkResult.details.status}</li>
                  <li>Redirects: {linkResult.details.redirects}</li>
                  <li>Protocol: {linkResult.details.protocol}</li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* File Integrity Checker Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>File Integrity Checker</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Select a file to compute its SHA‑256 checksum locally.</p>
          <input type="file" onChange={handleFileSelect} className="input-field" style={{ marginBottom: "1rem" }} />
          {hashLoading && <Loader2 className="animate-spin" size={24} />}
          {fileHash && (
            <div style={{ wordBreak: "break-all", background: "rgba(0,0,0,0.1)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <p><strong>{fileName}</strong></p>
              <p style={{ fontSize: "0.85rem" }}>SHA‑256: {fileHash}</p>
            </div>
          )}
        </div>
      </div>

      {/* Login History */}
      <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", maxHeight: "400px", overflowY: "auto" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={20} color="var(--accent-green)" /> Recent Login History
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data.loginHistory.map((log: any) => (
            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>{log.os || "Unknown OS"} • {log.browser || "Unknown Browser"}</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{log.location || "Unknown Location"} • {new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div>
                {log.status === "SUCCESS" ? (
                  <span style={{ color: "var(--accent-green)", fontSize: "0.85rem", fontWeight: "600" }}>Success</span>
                ) : (
                  <span style={{ color: "var(--accent-red)", fontSize: "0.85rem", fontWeight: "600" }}>Failed</span>
                )}
              </div>
            </div>
          ))}
          {data.loginHistory.length === 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No recent logins found. (This is normal for newly added tracking)</div>
          )}
        </div>
      </div>

      {/* Security Alerts */}
      <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldAlert size={20} color="var(--accent-yellow)" /> Security Alerts
        </h2>
        {data.alerts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.alerts.map((alert: any) => (
              <div key={alert.id} style={{ padding: "1rem", borderRadius: "var(--radius-sm)", borderLeft: `4px solid ${alert.severity === "CRITICAL" ? "var(--accent-red)" : alert.severity === "WARNING" ? "var(--accent-yellow)" : "var(--accent-blue)"}`, background: "rgba(0,0,0,0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong style={{ fontSize: "0.95rem" }}>{alert.type}</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>{alert.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
            <CheckCircle size={32} color="var(--accent-green)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <p>No active security alerts.</p>
            <p style={{ fontSize: "0.85rem" }}>Your account is in good standing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
