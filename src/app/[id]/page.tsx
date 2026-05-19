"use client";

import { useEffect, useState } from "react";
import { decryptData } from "@/lib/crypto";
import { Lock, Download, ShieldCheck, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { withCsrfHeaders } from "@/lib/csrf-client";

export default function DownloadPage() {
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [allowSave, setAllowSave] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);
  
  const { data: session, status } = useSession();
  const routeParams = useParams<{ id: string }>();
  const linkId = (Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id) ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!linkId) return;
    if (status === "authenticated" && searchParams.get("save") === "true" && !saved) {
      fetch("/api/links/save", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ linkId })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setSaved(true);
          router.replace(`/${linkId}`); // Clean URL
        }
      });
    }
  }, [status, searchParams, linkId, saved, router]);

  useEffect(() => {
    // Check for password in URL hash
    if (typeof window !== "undefined" && window.location.hash) {
      const hashPassword = window.location.hash.substring(1);
      if (hashPassword) setPassword(hashPassword);
    }
  }, []);

  useEffect(() => {
    if (!linkId) {
      setError("Invalid link.");
      setLoading(false);
      return;
    }
    // Fetch link metadata
    fetch(`/api/download/${linkId}`)
      .then(async (res) => ({ status: res.status, data: await res.json() }))
      .then(({ status, data }) => {
        if (status === 401 && data?.authRequired) {
          setRequiresAuth(true);
          setError(data.error || "Please sign in to access this transfer.");
          setFiles([]);
          setLoading(false);
          return;
        }

        setRequiresAuth(false);
        if (data.error) {
          setError(data.error);
        } else {
          setFiles(data.files || []);
          setAllowSave(data.allowSave !== 0 && data.allowSave !== false);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch link details.");
        setLoading(false);
      });
  }, [linkId, status]);

  const handleDownload = async (file: any) => {
    if (!linkId) {
      setError("Invalid link.");
      return;
    }
    if (!password) {
      setError("Password is required to decrypt the file.");
      return;
    }
    
    setDecrypting(true);
    setError("");
    
    try {
      // Fetch encrypted file stream
      const response = await fetch(`/api/download/${linkId}?fileId=${file.id}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to download file stream.");
      }
      
      const buffer = await response.arrayBuffer();
      
      // Decrypt locally
      const decryptedBlob = await decryptData(buffer, password, file.salt, file.iv);
      
      // Trigger download
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Decryption failed. Incorrect password or corrupted file.");
      console.error(err);
    } finally {
      setDecrypting(false);
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>Loading, please wait...</div>;

  if (requiresAuth && status !== "authenticated") {
    const callbackUrl = `/login?callbackUrl=/${linkId}`;
    return (
      <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
        <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", padding: "2rem", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
          <Lock color="var(--accent-blue)" size={40} style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Sign-In Required</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            {error || "This transfer requires an authenticated account before download."}
          </p>
          <Link href={callbackUrl} className="btn btn-primary" style={{ display: "inline-flex" }}>
            Log in to continue
          </Link>
        </div>
      </main>
    );
  }

  if (error && files.length === 0) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", flexDirection: "column", gap: "1rem" }}>
      <AlertCircle color="#ff4444" size={48} />
      <h2 style={{ fontSize: "1.5rem" }}>{error}</h2>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      


      {!session && status !== "loading" && allowSave && (
        <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid var(--accent-blue)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", width: "100%", maxWidth: "500px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            Want to save this file to your dashboard? <Link href={`/login?callbackUrl=/${linkId}?save=true`} style={{ color: "var(--accent-blue)", fontWeight: "bold", textDecoration: "none" }}>Sign in now</Link>
          </p>
        </div>
      )}

      {saved && (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", width: "100%", maxWidth: "500px", textAlign: "center", color: "#10b981" }}>
          <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>File saved to your dashboard!</p>
        </div>
      )}

      <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "2.5rem", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
        <ShieldCheck color="var(--accent-blue)" size={48} style={{ margin: "0 auto 1.5rem auto" }} />
        <h2 className="title-gradient" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>Secure Download</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{files.length} file(s) shared with you. Enter the password to decrypt.</p>

        {error && <div style={{ color: "#ff4444", marginBottom: "1rem", fontSize: "0.9rem", background: "rgba(255, 0, 0, 0.1)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>{error}</div>}

        <div style={{ textAlign: "left", marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Decryption Password</label>
          <div style={{ position: "relative" }}>
            <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} size={18} />
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter the secure password" 
              className="input-field" 
              style={{ paddingLeft: "3rem" }} 
            />
          </div>
        </div>

        {session && !saved && status === "authenticated" && allowSave && (
          <div style={{ marginBottom: "2rem" }}>
            <button 
              onClick={() => {
                fetch("/api/links/save", {
                  method: "POST",
                  headers: withCsrfHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({ linkId })
                }).then(res => res.json()).then(data => {
                  if (data.success) {
                    setSaved(true);
                  }
                });
              }}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--accent-blue)", background: "rgba(59, 130, 246, 0.1)", color: "var(--accent-blue)" }}
            >
              <ShieldCheck size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
              Save to my Vault
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {files.map(file => (
            <div key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontWeight: "600", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{file.name}</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => handleDownload(file)} 
                disabled={decrypting}
                className="btn btn-primary" 
                style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
              >
                {decrypting ? "Decrypting..." : <><Download size={16} /> Download</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
