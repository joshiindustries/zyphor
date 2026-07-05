"use client";

import { useState, useEffect } from "react";
import { Shield, Trash2, Key, Clock, Box } from "lucide-react";
import { decryptMessage } from "@/lib/key-exchange";

export default function ZyphorDropInbox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrops();
  }, []);

  const fetchDrops = async () => {
    try {
      const res = await fetch("/api/drop/messages");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        decryptAll(data.messages);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch drop inbox.");
    } finally {
      setLoading(false);
    }
  };

  const decryptAll = async (msgs: any[]) => {
    const privKeyPem = sessionStorage.getItem("zyphor_priv_key");
    if (!privKeyPem) {
      // Missing private key, maybe user refreshed and needs to re-unlock
      return;
    }

    const decrypted: Record<string, any> = {};
    for (const msg of msgs) {
      try {
        const plaintext = await decryptMessage(msg.encrypted_content, privKeyPem);
        decrypted[msg.id] = JSON.parse(plaintext);
      } catch (err) {
        console.error("Failed to decrypt drop", err);
        decrypted[msg.id] = { error: "Decryption Failed. Private key mismatch?" };
      }
    }
    setDecryptedMessages(decrypted);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/drop/messages?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const privKeyPresent = typeof window !== 'undefined' ? !!sessionStorage.getItem("zyphor_priv_key") : false;

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 0.5rem 0" }}>
            <Box size={32} color="var(--accent-blue)" /> Drop Inbox
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>View and manage anonymous end-to-end encrypted messages.</p>
        </div>
        {!privKeyPresent && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
            <Key size={16} /> Private Key Locked. Please re-login to decrypt.
          </div>
        )}
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>Loading Drop Inbox...</div>
      ) : error ? (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "1.5rem", borderRadius: "var(--radius-md)", color: "var(--accent-red)" }}>
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "6rem 2rem", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", color: "var(--text-secondary)" }}>
          <Box size={64} style={{ opacity: 0.2, margin: "0 auto 1.5rem" }} />
          <h3 style={{ fontSize: "1.25rem", color: "#fff", marginBottom: "0.5rem" }}>Your Inbox is Empty</h3>
          <p>Share your Zyphor Drop link to receive anonymous encrypted messages.</p>
          <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", display: "inline-block", marginTop: "1rem", fontFamily: "monospace", color: "var(--accent-blue)", border: "1px dashed var(--glass-border)" }}>
            zyphor.app/drop/your-username
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.map(msg => {
            const dec = decryptedMessages[msg.id];
            
            return (
              <div key={msg.id} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "4px", background: "var(--accent-blue)" }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={20} color="var(--accent-blue)" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600", color: "#fff" }}>Anonymous Sender</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                        <Clock size={12} /> {new Date(msg.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={() => handleDelete(msg.id)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid transparent", color: "var(--accent-red)", padding: "0.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all 0.2s" }} className="hover:border-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "1rem", lineHeight: 1.6, color: "#fff", whiteSpace: "pre-wrap" }}>
                  {dec ? (
                    dec.error ? (
                      <span style={{ color: "var(--accent-red)" }}>{dec.error}</span>
                    ) : (
                      dec.text
                    )
                  ) : (
                    <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Decrypting payload...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
