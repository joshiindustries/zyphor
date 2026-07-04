"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Lock, Send, Users } from "lucide-react";
import { encryptMessage, decryptMessage } from "@/lib/key-exchange";

export default function ChatClient({ 
  sessionUser, 
  initialConversations,
  initialGroups = []
}: { 
  sessionUser: any, 
  initialConversations: any[],
  initialGroups?: any[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"dm" | "group" | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);

  const [activeCall, setActiveCall] = useState<any>(null);

  // DM Creation State
  const [isCreatingDM, setIsCreatingDM] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [dmSearchResults, setDmSearchResults] = useState<any[]>([]);

  // Group Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<any[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<any[]>([]);

  // User Search effect
  useEffect(() => {
    const searchUsers = async (query: string, setter: (val: any[]) => void) => {
      if (!query || query.length < 3) {
        setter([]);
        return;
      }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setter(data.users);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const timer = setTimeout(() => {
      if (isCreatingDM) searchUsers(dmSearchQuery, setDmSearchResults);
      if (isCreatingGroup) searchUsers(groupSearchQuery, setGroupSearchResults);
    }, 300);

    return () => clearTimeout(timer);
  }, [dmSearchQuery, groupSearchQuery, isCreatingDM, isCreatingGroup]);

  useEffect(() => {
    // Poll for active calls
    const fetchActiveCalls = async () => {
      try {
        const res = await fetch("/api/calls");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.calls.length > 0) {
            // Find a call where we are NOT the caller
            const incoming = data.calls.find((c: any) => c.caller_id !== sessionUser.id && c.status === "RINGING");
            setActiveCall(incoming || null);
          } else {
            setActiveCall(null);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchActiveCalls();
    const callInterval = setInterval(fetchActiveCalls, 3000);
    return () => clearInterval(callInterval);
  }, [sessionUser.id]);

  useEffect(() => {
    if (!activeId) return;
    
    const fetchMessages = async () => {
      let url = "";
      if (activeType === "dm") url = `/api/chat/messages?conversationId=${activeId}`;
      else url = `/api/groups/messages?groupId=${activeId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    };

    const fetchKey = async () => {
      if (activeType === "group") return; // Group keys are handled differently
      const activeConv = initialConversations.find((c: any) => c.id === activeId);
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

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeId, activeType, initialConversations, sessionUser.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeId) return;

    setLoading(true);
    try {
      if (activeType === "dm") {
        if (!recipientPublicKey) throw new Error("Missing recipient public key");
        const encryptedPayload = await encryptMessage(inputText, recipientPublicKey);
        
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeId,
            encrypted_content: encryptedPayload
          })
        });

        const data = await res.json();
        if (data.success) {
          setMessages([...messages, data.message]);
          setInputText("");
        }
      } else {
        // Group Chat Encryption
        // In reality, you'd encrypt with the symmetric Group Key
        const encryptedPayload = "ENC_GROUP:" + btoa(inputText); // Mock
        
        const res = await fetch("/api/groups/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: activeId,
            encrypted_content: encryptedPayload
          })
        });

        const data = await res.json();
        if (data.success) {
          setMessages([...messages, data.message]);
          setInputText("");
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;
    
    setLoading(true);
    try {
      // Fetch public keys for selected members to mock the group key sharing
      const members = [{ user_id: sessionUser.id, encrypted_key: "MOCK_KEY" }];
      
      for (const member of selectedGroupMembers) {
        members.push({ user_id: member.id, encrypted_key: "MOCK_KEY_FOR_" + member.id });
      }
      
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          members
        })
      });
      
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveContext = () => {
    if (activeType === "dm") {
      const conv = initialConversations.find(c => c.id === activeId);
      if (!conv) return null;
      return {
        name: conv.user1_id === sessionUser.id ? conv.user2.name : conv.user1.name,
        subtitle: "Direct Message",
        icon: <MessageSquare size={20} color="var(--text-secondary)" />
      };
    } else if (activeType === "group") {
      const grp = initialGroups.find(g => g.id === activeId);
      if (!grp) return null;
      return {
        name: grp.name,
        subtitle: `${grp.members.length} members`,
        icon: <Users size={20} color="var(--text-secondary)" />
      };
    }
    return null;
  };

  const ctx = getActiveContext();

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {activeCall && (
        <div style={{ background: "var(--accent-green)", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Video size={24} />
            <div>
              <strong style={{ display: "block" }}>Incoming Video Call</strong>
              <span style={{ fontSize: "0.85rem" }}>from {activeCall.caller.name}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ background: "rgba(0,0,0,0.2)", border: "none", color: "#fff" }} onClick={async () => {
              // Decline
              await fetch("/api/calls", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ call_id: activeCall.id, status: "ENDED" })
              });
              setActiveCall(null);
            }}>Decline</button>
            <Link href={`/chat/call/${activeCall.id}`} className="btn btn-primary" style={{ background: "#fff", color: "var(--accent-green)" }}>
              Accept
            </Link>
          </div>
        </div>
      )}

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
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Chats</h2>
            <button className="btn btn-primary" style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setIsCreatingGroup(!isCreatingGroup)}>
              <Plus size={16} />
            </button>
          </div>

          {isCreatingGroup && (
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.05)" }}>
              <input 
                type="text" 
                placeholder="Group Name" 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "#fff", marginBottom: "0.5rem", fontSize: "0.85rem" }}
              />
              <input 
                type="text" 
                placeholder="Search users to add..." 
                value={groupSearchQuery} 
                onChange={e => setGroupSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "#fff", marginBottom: "0.5rem", fontSize: "0.85rem" }}
              />
              {groupSearchResults.filter(u => !selectedGroupMembers.find(m => m.id === u.id)).map(u => (
                <div 
                  key={u.id} 
                  style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)", marginBottom: "0.25rem" }}
                  onClick={() => setSelectedGroupMembers([...selectedGroupMembers, u])}
                >
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold" }}>{u.name.charAt(0)}</div>
                  <div style={{ fontSize: "0.85rem", flex: 1 }}>{u.name}</div>
                  <Plus size={14} />
                </div>
              ))}
              
              {selectedGroupMembers.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem", marginTop: "0.5rem" }}>
                  {selectedGroupMembers.map(u => (
                    <span key={u.id} style={{ fontSize: "0.75rem", background: "var(--accent-purple)", padding: "0.2rem 0.5rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      {u.name} <button style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0 }} onClick={() => setSelectedGroupMembers(selectedGroupMembers.filter(m => m.id !== u.id))}>×</button>
                    </span>
                  ))}
                </div>
              )}
              
              <button className="btn btn-primary" style={{ width: "100%", padding: "0.5rem" }} onClick={handleCreateGroup} disabled={selectedGroupMembers.length === 0 || !newGroupName.trim()}>Create Group</button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>Direct Messages</h3>
                <button style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => setIsCreatingDM(!isCreatingDM)}>
                  <Plus size={14} />
                </button>
              </div>
              
              {isCreatingDM && (
                <div style={{ padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem" }}>
                  <input 
                    type="text" 
                    placeholder="Search username/email..." 
                    value={dmSearchQuery} 
                    onChange={e => setDmSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "#fff", marginBottom: "0.5rem", fontSize: "0.85rem" }}
                  />
                  {dmSearchResults.map(u => (
                    <div 
                      key={u.id} 
                      style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)" }}
                      onClick={async () => {
                        const res = await fetch("/api/chat", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ target_user_id: u.id })
                        });
                        if (res.ok) window.location.reload();
                      }}
                    >
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold" }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{u.name}</div>
                        {u.username && <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>@{u.username}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {initialConversations.map(conv => {
                const otherUser = conv.user1_id === sessionUser.id ? conv.user2 : conv.user1;
                return (
                  <div key={conv.id} onClick={() => { setActiveId(conv.id); setActiveType("dm"); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", borderRadius: "var(--radius-md)", cursor: "pointer", background: activeId === conv.id ? "rgba(255,255,255,0.1)" : "transparent" }} className="hover:bg-[rgba(255,255,255,0.05)]">
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "1.2rem" }}>
                      {otherUser.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>{otherUser.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <h3 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.5rem", letterSpacing: "1px" }}>Groups</h3>
              {initialGroups.map(grp => (
                <div key={grp.id} onClick={() => { setActiveId(grp.id); setActiveType("group"); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", borderRadius: "var(--radius-md)", cursor: "pointer", background: activeId === grp.id ? "rgba(255,255,255,0.1)" : "transparent" }} className="hover:bg-[rgba(255,255,255,0.05)]">
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "1.2rem" }}>
                    <Users size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>{grp.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.4)" }}>
          {activeId && ctx ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {ctx.icon}
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>{ctx.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      <Lock size={12} /> {ctx.subtitle} (End-to-End Encrypted)
                    </div>
                  </div>
                </div>
                
                {activeType === "dm" && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "0.5rem 1rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/calls", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ conversation_id: activeId })
                        });
                        const data = await res.json();
                        if (data.success && data.call) {
                          window.location.href = `/chat/call/${data.call.id}`;
                        } else {
                          alert(data.error || "Failed to initiate call");
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <Video size={16} /> Video Call
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "var(--text-secondary)" }}>
                    <Lock size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
                    <p>This conversation is End-to-End Encrypted.</p>
                    <p style={{ fontSize: "0.85rem" }}>No one outside of this chat can read these messages.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === sessionUser.id;
                    let displayMsg = msg.encrypted_content;
                    if (displayMsg.startsWith("ENC_GROUP:")) displayMsg = atob(displayMsg.split(":")[1]);

                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%", alignSelf: isMe ? "flex-end" : "flex-start" }}>
                        <div style={{ background: isMe ? "var(--accent-blue)" : "var(--glass-bg)", border: isMe ? "none" : "1px solid var(--glass-border)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", color: "#fff", position: "relative" }}>
                          {displayMsg}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <div style={{ padding: "1.5rem", borderTop: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type an encrypted message..."
                    style={{ flex: 1, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "1rem 1.5rem", borderRadius: "100px", color: "#fff", outline: "none", fontSize: "1rem" }}
                  />
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "0 1.5rem", borderRadius: "100px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-secondary)" }}>
              <MessageSquare size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
              <h3>Select a conversation</h3>
              <p>Choose a chat from the sidebar to start messaging securely.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
