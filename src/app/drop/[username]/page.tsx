"use client";

import { useState, useEffect } from "react";
import { Lock, Send, Shield, AlertTriangle, CheckCircle, Flame } from "lucide-react";
import Link from "next/link";
import { encryptMessage } from "@/lib/key-exchange";

export default function ZyphorDropPage({ params }: { params: { username: string } }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchKey() {
      try {
        const res = await fetch(`/api/keys?username=${params.username}`);
        const data = await res.json();
        if (data.success && data.public_key) {
          setPublicKey(data.public_key);
        } else {
          setError("User not found or has not enabled Zyphor Drop.");
        }
      } catch (err) {
        setError("Failed to connect to Zyphor network.");
      } finally {
        setLoading(false);
      }
    }
    fetchKey();
  }, [params.username]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !publicKey) return;

    setIsSending(true);
    try {
      // Create payload object
      const payloadObj = {
        text: message,
        timestamp: Date.now()
      };
      
      const plaintextPayload = JSON.stringify(payloadObj);

      // Perform local encryption with the recipient's public key
      const encryptedContent = await encryptMessage(plaintextPayload, publicKey);

      const res = await fetch("/api/drop/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: params.username,
          encrypted_content: encryptedContent
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setMessage("");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send message securely.");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "var(--bg-main)", color: "#fff" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid var(--accent-blue)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-main)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>Zyphor Drop</h1>
          <span style={{ fontSize: "0.75rem", background: "var(--accent-red)", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600" }}>ANONYMOUS</span>
        </div>
        <Link href="/" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "1px solid var(--glass-border)", background: "transparent", color: "#fff", textDecoration: "none" }}>
          Get Zyphor
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "600px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", padding: "2.5rem", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "64px", height: "64px", background: "var(--accent-blue)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}>
              <Shield size={32} color="#fff" />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>Drop for @{params.username}</h2>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
              Send an anonymous, end-to-end encrypted message.
            </p>
          </div>

          {error ? (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "1.5rem", borderRadius: "var(--radius-md)", color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "1rem" }}>
              <AlertTriangle size={24} />
              <div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Error</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : success ? (
            <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--accent-green)", padding: "2rem", borderRadius: "var(--radius-md)", color: "var(--accent-green)", textAlign: "center" }}>
              <CheckCircle size={48} style={{ margin: "0 auto 1rem" }} />
              <strong style={{ display: "block", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Message Sent Securely</strong>
              <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem 0", fontSize: "0.9rem" }}>
                Your message has been encrypted with @{params.username}'s public key and delivered. Only they can read it.
              </p>
              <button onClick={() => setSuccess(false)} className="btn btn-primary" style={{ padding: "0.75rem 2rem", background: "var(--accent-green)", color: "#000", border: "none" }}>
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "1.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <Lock size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
                <div>
                  <strong>Zero-Knowledge Guarantee:</strong> This message will be encrypted in your browser before it reaches our servers. Zyphor cannot read your message or identify you.
                </div>
              </div>

              <form onSubmit={handleSend}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your secret message here..."
                  rows={6}
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "var(--radius-md)", color: "#fff", fontSize: "1rem", outline: "none", resize: "none", marginBottom: "1.5rem" }}
                  required
                />
                
                <button type="submit" disabled={isSending || !message.trim()} className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "linear-gradient(to right, var(--accent-blue), var(--accent-purple))", border: "none" }}>
                  {isSending ? (
                    <div style={{ width: "20px", height: "20px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <>
                      <Send size={18} /> Encrypt & Drop
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </main>
  );
}
