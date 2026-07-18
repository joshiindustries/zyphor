"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Cloud, Database, HardDrive, Plus, Shield, Star, Trash2 } from "lucide-react";
import { withCsrfHeaders } from "@/lib/csrf-client";

type Provider = "DROPBOX" | "WEBDAV";

type CloudConnection = {
  id: string;
  provider: Provider;
  name: string;
  is_default: boolean;
  details: Record<string, string | boolean>;
};

const providerLabels: Record<Provider, string> = {
  DROPBOX: "Dropbox",
  WEBDAV: "ownCloud / Nextcloud",
};

export default function CloudConnectionsPage() {
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [provider, setProvider] = useState<Provider>("DROPBOX");
  const [name, setName] = useState("Dropbox");
  const [accessToken, setAccessToken] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pathPrefix, setPathPrefix] = useState("Zyphor Vault");
  const [makeDefault, setMakeDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadConnections = async () => {
    const res = await fetch("/api/cloud-connections");
    const data = await res.json();
    if (data.success) setConnections(data.connections || []);
  };

  useEffect(() => {
    loadConnections().catch((err) => {
      console.error(err);
      setError("Could not load cloud connections.");
    });
  }, []);

  useEffect(() => {
    if (!name || name === providerLabels.DROPBOX || name === providerLabels.WEBDAV) {
      setName(providerLabels[provider]);
    }
  }, [provider, name]);

  const resetForm = () => {
    setAccessToken("");
    setEndpoint("");
    setUsername("");
    setPassword("");
    setPathPrefix("Zyphor Vault");
    setMakeDefault(connections.length === 0);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const config = provider === "DROPBOX"
        ? { accessToken, pathPrefix }
        : { endpoint, username, password, pathPrefix };

      const res = await fetch("/api/cloud-connections", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ provider, name, config, is_default: makeDefault }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not save cloud connection.");
      }

      await loadConnections();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not save cloud connection.");
    } finally {
      setLoading(false);
    }
  };

  const setDefaultConnection = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cloud-connections", {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id, is_default: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not update default cloud.");
      await loadConnections();
    } catch (err: any) {
      setError(err.message || "Could not update default cloud.");
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (id: string) => {
    if (!confirm("Remove this cloud connection? Encrypted files already stored there will need this connection to download.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cloud-connections?id=${id}`, {
        method: "DELETE",
        headers: withCsrfHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not remove cloud connection.");
      await loadConnections();
      setMakeDefault(connections.length <= 1);
    } catch (err: any) {
      setError(err.message || "Could not remove cloud connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Cloud size={24} color="var(--accent-blue)" />
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Cloud Connections</h1>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", background: "rgba(46,204,113,0.1)", color: "var(--accent-green)", padding: "0.2rem 0.55rem", borderRadius: "10px", fontWeight: 700 }}>
            <Shield size={13} /> Secrets encrypted
          </span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem", display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "2rem", alignItems: "start" }}>
        <form onSubmit={handleSubmit} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem", fontWeight: 700 }}>Add Storage</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Vault files stay encrypted before they leave this browser.</p>
          </div>

          {error && <div style={{ color: "var(--accent-red)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.9rem" }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {(["DROPBOX", "WEBDAV"] as Provider[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setProvider(option)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: provider === option ? "1px solid var(--accent-blue)" : "1px solid var(--glass-border)", color: "#fff", background: provider === option ? "rgba(52,152,219,0.18)" : "transparent", cursor: "pointer" }}
              >
                {option === "DROPBOX" ? <Database size={16} /> : <HardDrive size={16} />}
                {providerLabels[option]}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Display name
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          {provider === "DROPBOX" ? (
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Dropbox access token
              <input className="input-field" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required />
            </label>
          ) : (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                WebDAV endpoint
                <input className="input-field" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://cloud.example.com/remote.php/dav/files/you" required />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Username
                  <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Password
                  <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
              </div>
            </>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Folder path
            <input className="input-field" value={pathPrefix} onChange={(e) => setPathPrefix(e.target.value)} placeholder="Zyphor Vault" />
          </label>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Make default vault target
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent-blue)" }} />
          </label>

          <button className="btn btn-primary" disabled={loading} type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem" }}>
            <Plus size={16} /> {loading ? "Saving..." : "Add Connection"}
          </button>
        </form>

        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Connected Storage</h2>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{connections.length} connection{connections.length === 1 ? "" : "s"}</span>
          </div>

          {connections.length === 0 ? (
            <div style={{ background: "var(--glass-bg)", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-md)", padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <Cloud size={44} style={{ opacity: 0.45, marginBottom: "1rem" }} />
              <p style={{ margin: 0 }}>Zyphor Cloud is used until you connect Dropbox or WebDAV storage.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {connections.map((connection) => (
                <div key={connection.id} style={{ background: "var(--glass-bg)", border: connection.is_default ? "1px solid var(--accent-blue)" : "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{connection.name}</h3>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{providerLabels[connection.provider]}</p>
                    </div>
                    {connection.is_default && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--accent-blue)", fontSize: "0.78rem", fontWeight: 700 }}><Star size={14} fill="currentColor" /> Default</span>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                    {connection.details.host && <span>{connection.details.host}</span>}
                    {connection.details.username && <span>{connection.details.username}</span>}
                    {connection.details.pathPrefix && <span>{connection.details.pathPrefix}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                    {!connection.is_default && (
                      <button disabled={loading} onClick={() => setDefaultConnection(connection.id)} className="btn btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.5rem" }}>
                        <Check size={15} /> Default
                      </button>
                    )}
                    <button disabled={loading} onClick={() => deleteConnection(connection.id)} className="btn btn-secondary" style={{ padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.35)" }} title="Remove connection">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}