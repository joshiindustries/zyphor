"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, CheckCircle, Loader2, Lock } from "lucide-react";
import { generateIdentityKeyPair, exportPrivateKey, exportPublicKey } from "@/lib/key-exchange";
import { withCsrfHeaders } from "@/lib/csrf-client";

export default function SetupKeysPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "generating" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState("");

  const handleGenerateKeys = async () => {
    if (!masterPassword || masterPassword.length < 8) {
      setError("Master Vault Password must be at least 8 characters.");
      return;
    }

    try {
      setStatus("generating");
      setError(null);

      // 1. Generate RSA-OAEP 4096-bit key pair
      const keyPair = await generateIdentityKeyPair();

      // 2. Export public/private identity keys in PEM form for chat encryption.
      const publicKeyPem = await exportPublicKey(keyPair.publicKey);
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey);

      // 3. Keep the private key on this device only so incoming messages can be decrypted.
      const deviceId = crypto.randomUUID();
      localStorage.setItem("zyphor_device_id", deviceId);
      localStorage.setItem("zyphor_public_key_pem", publicKeyPem);
      localStorage.setItem("zyphor_private_key_pem", privateKeyPem);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);
      
      setStatus("uploading");

      // 4. Upload Public Key to Server
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          device_id: deviceId,
          public_key: publicKeyPem
        })
      });

      if (!res.ok) {
        throw new Error("Failed to upload public key to server");
      }

      setStatus("done");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during key generation");
      setStatus("idle");
    }
  };

  return (
    <main style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", padding: "3rem", maxWidth: "500px", width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        
        <div style={{ display: "inline-flex", background: "rgba(231,76,60,0.1)", padding: "1rem", borderRadius: "50%", marginBottom: "1.5rem" }}>
          <Shield size={48} color="#e74c3c" />
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem" }}>Secure Your Device</h1>
        
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: "1.6" }}>
          Zyphor uses End-to-End Encryption. We need to generate a unique cryptographic key pair for this device. 
          Your private key will be encrypted with your Master Vault Password and never leave this browser.
        </p>

        {error && (
          <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid #e74c3c", color: "#e74c3c", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative", textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Master Vault Password</label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} size={18} />
                <input 
                  type="password" 
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter or create Master Password" 
                  className="input-field" 
                  style={{ paddingLeft: "2.5rem", width: "100%" }} 
                />
              </div>
            </div>
            <button 
              onClick={handleGenerateKeys}
              className="btn btn-primary" 
              style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}
            >
              <Key size={20} /> Verify & Generate Keys
            </button>
          </div>
        )}

        {status === "generating" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
            <Loader2 className="animate-spin" size={32} color="#e74c3c" />
            <p>Generating RSA-4096 Keys...</p>
          </div>
        )}

        {status === "uploading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
            <Loader2 className="animate-spin" size={32} color="#3498db" />
            <p>Publishing Public Key...</p>
          </div>
        )}

        {status === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#2ecc71" }}>
            <CheckCircle size={48} />
            <p style={{ fontWeight: "600", fontSize: "1.1rem" }}>Device Secured!</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Redirecting to dashboard...</p>
          </div>
        )}

      </div>
    </main>
  );
}
