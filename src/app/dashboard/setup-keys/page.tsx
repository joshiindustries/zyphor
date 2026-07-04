"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, CheckCircle, Loader2 } from "lucide-react";
import { generateRSAKeyPair, exportPublicKeyToJWK } from "@/lib/crypto";

export default function SetupKeysPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "generating" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleGenerateKeys = async () => {
    try {
      setStatus("generating");
      setError(null);

      // 1. Generate RSA-OAEP 4096-bit key pair
      const keyPair = await generateRSAKeyPair();

      // 2. Export Public Key to JWK
      const publicKeyJWK = await exportPublicKeyToJWK(keyPair.publicKey);

      // 3. (Mock) Save Private Key locally (e.g. IndexedDB)
      // In a real app we'd use localforage or native IndexedDB here:
      // await localforage.setItem('zyphor_private_key', keyPair.privateKey);
      
      setStatus("uploading");

      // 4. Upload Public Key to Server
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: crypto.randomUUID(),
          public_key: JSON.stringify(publicKeyJWK)
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
          Your private key will never leave this browser.
        </p>

        {error && (
          <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid #e74c3c", color: "#e74c3c", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {status === "idle" && (
          <button 
            onClick={handleGenerateKeys}
            className="btn btn-primary" 
            style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}
          >
            <Key size={20} /> Generate Keys
          </button>
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
