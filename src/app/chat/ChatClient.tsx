"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Lock, Send } from "lucide-react";
import { encryptMessage } from "@/lib/key-exchange";

export default function ChatClient({ sessionUser, initialConversations }: { sessionUser: any, initialConversations: any[] }) {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);

  // When a conversation is selected
  useEffect(() => {
    if (!activeConvId) return;
    
    const fetchMessages = async () => {
      const res = await fetch(`/api/chat/messages?conversationId=${activeConvId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    };

    const fetchKey = async () => {
      const activeConv = initialConversations.find((c: any) => c.id === activeConvId);
      if (!activeConv) return;
      const otherUserId = activeConv.user1_id === sessionUser.id ? activeConv.user2_id : activeConv.user1_id;
      
      const res = await fetch(`/api/keys?userId=${otherUserId}`);
      const data = await res.json();
      if (data.success) {
        setRecipientPublicKey(data.public_key);
      } else {
        setRecipientPublicKey(null);
      }
    };

    fetchMessages();
    fetchKey();
  }, [activeConvId, initialConversations, sessionUser.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || !recipientPublicKey) return;

    setLoading(true);
    try {
      // 1. Encrypt message for recipient
      const encryptedPayload = await encryptMessage(inputText, recipientPublicKey);
      
      // 2. Send to server
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          encrypted_content: encryptedPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.message]);
        setInputText("");
      }
    } catch (error) {
      console.error("Failed to send encrypted message", error);
    } finally {
      setLoading(false);
    }
  };

  const activeConv = initialConversations.find((c: any) => c.id === activeConvId);
  const activeUser = activeConv ? (activeConv.user1_id === sessionUser.id ? activeConv.user2 : activeConv.user1) : null;

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Chat</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "var(--accent-blue)", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>E2EE</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "320px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Conversations</h2>
            <button className="btn btn-primary" style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} title="New Chat">
              <Plus size={16} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {initialConversations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                <MessageSquare size={24} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <p style={{ fontSize: "0.9rem" }}>No conversations yet.</p>
              </div>
            ) : (
              initialConversations.map((conv: any) => {
                const otherUser = conv.user1_id === sessionUser.id ? conv.user2 : conv.user1;
                const isActive = conv.id === activeConvId;
                return (
                  <div 
                    key={conv.id} 
                    onClick={() => setActiveConvId(conv.id)}
                    style={{ 
                      display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", 
                      borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background 0.2s",
                      background: isActive ? "rgba(255,255,255,0.1)" : "transparent"
                    }} 
                    className="hover:bg-glass"
                  >
                    {otherUser.avatar ? (
                      <img src={otherUser.avatar} alt="Avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600" }}>
                        {otherUser.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <h4 style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{otherUser.name || "Unknown"}</h4>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>Encrypted messages...</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-main)", position: "relative" }}>
          {!activeConvId ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", padding: "2rem", textAlign: "center" }}>
              <Lock size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Zyphor Secure Chat</h2>
              <p style={{ maxWidth: "400px", lineHeight: "1.5" }}>Select a conversation to start messaging. All messages are end-to-end encrypted with a zero-knowledge architecture.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "1rem 2rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(0,0,0,0.1)" }}>
                {activeUser?.avatar ? (
                  <img src={activeUser.avatar} alt="Avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600" }}>
                    {activeUser?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{activeUser?.name}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Lock size={12} /> {recipientPublicKey ? "E2EE Active" : "Key Not Found (Cannot send messages)"}
                  </span>
                </div>
              </div>

              {/* Messages Feed */}
              <div style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "auto", marginBottom: "auto" }}>
                    No messages yet. Send a secure message!
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === sessionUser.id;
                    return (
                      <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                        <div style={{ 
                          background: isMe ? "var(--accent-blue)" : "rgba(255,255,255,0.1)",
                          padding: "0.75rem 1rem",
                          borderRadius: "1rem",
                          borderBottomRightRadius: isMe ? "0.25rem" : "1rem",
                          borderBottomLeftRadius: isMe ? "1rem" : "0.25rem",
                        }}>
                          {/* Simulated decryption for the demo since the local private key isn't implemented in indexedDB yet */}
                          <p style={{ margin: 0, wordBreak: "break-all", fontSize: "0.95rem", color: isMe ? "#fff" : "inherit" }}>
                            {isMe ? "You sent an encrypted message" : "Encrypted message received"}
                          </p>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginTop: "0.25rem", textAlign: isMe ? "right" : "left" }}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer */}
              <div style={{ padding: "1.5rem 2rem", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)" }}>
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a secure message..."
                    className="input-field"
                    style={{ flex: 1, borderRadius: "2rem", padding: "0.75rem 1.5rem" }}
                    disabled={!recipientPublicKey || loading}
                  />
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: "50%", padding: "0", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }} disabled={!inputText.trim() || !recipientPublicKey || loading}>
                    <Send size={20} style={{ marginLeft: "2px" }} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
