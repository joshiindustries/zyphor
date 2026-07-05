"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Lock, Send, Users, Video, Edit2, Trash2, Reply, Smile, X, Paperclip, Flame } from "lucide-react";
import { encryptMessage, decryptMessage } from "@/lib/key-exchange";

function AttachmentRenderer({ attachment }: { attachment: any }) {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(attachment.url);
      const encryptedBuffer = await res.arrayBuffer();
      
      const rawKey = new Uint8Array(window.atob(attachment.aesKey).split("").map(c => c.charCodeAt(0)));
      const aesKey = await window.crypto.subtle.importKey(
        "raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]
      );
      
      const iv = new Uint8Array(window.atob(attachment.iv).split("").map(c => c.charCodeAt(0)));
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encryptedBuffer
      );
      
      const blob = new Blob([decryptedBuffer], { type: attachment.type });
      const url = URL.createObjectURL(blob);
      setDecryptedUrl(url);
    } catch (err) {
      console.error("Decryption failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attachment.type.startsWith("image/") || attachment.type.startsWith("video/")) {
      handleDownload();
    }
  }, []);

  if (attachment.type.startsWith("image/")) {
    return decryptedUrl ? (
      <img src={decryptedUrl} alt={attachment.name} style={{ maxWidth: "300px", borderRadius: "8px", marginTop: "0.5rem" }} />
    ) : (
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        {loading ? "Decrypting image..." : "Loading image..."}
      </div>
    );
  }
  
  if (attachment.type.startsWith("video/")) {
    return decryptedUrl ? (
      <video src={decryptedUrl} controls style={{ maxWidth: "300px", borderRadius: "8px", marginTop: "0.5rem" }} />
    ) : (
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        {loading ? "Decrypting video..." : "Loading video..."}
      </div>
    );
  }

  return (
    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
        📎 {attachment.name}
      </div>
      {decryptedUrl ? (
        <a href={decryptedUrl} download={attachment.name} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", textDecoration: "none", color: "#fff", border: "1px solid var(--glass-border)" }}>Download</a>
      ) : (
        <button onClick={handleDownload} disabled={loading} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", background: "transparent", color: "#fff", border: "1px solid var(--glass-border)", cursor: "pointer" }}>
          {loading ? "Decrypting..." : "Decrypt & Download"}
        </button>
      )}
    </div>
  );
}

function MessageContentRenderer({ msg, isMe }: { msg: any, isMe: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isBurned, setIsBurned] = useState(false);

  useEffect(() => {
    if (msg.is_deleted || isBurned) return;

    let displayMsg = msg.encrypted_content;
    if (displayMsg.startsWith("ENC_GROUP:")) displayMsg = window.atob(displayMsg.split(":")[1]);
    
    let parsed: any = null;
    try { parsed = JSON.parse(displayMsg); } catch (e) {}

    if (parsed && parsed.viewOnce && !isMe) {
      // Fire delete to server immediately
      fetch(`/api/chat/messages?id=${msg.id}`, { method: 'DELETE' }).catch(console.error);
      
      setTimeLeft(15);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            setIsBurned(true);
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [msg, isMe, isBurned]);

  if (isBurned) {
    return <div style={{ fontStyle: "italic", opacity: 0.7, color: "var(--accent-red)" }}>🔥 Message self-destructed</div>;
  }

  if (msg.is_deleted) {
    return <div style={{ fontStyle: "italic", opacity: 0.7 }}>🚫 This message was deleted</div>;
  }
  
  let displayMsg = msg.encrypted_content;
  if (displayMsg.startsWith("ENC_GROUP:")) displayMsg = window.atob(displayMsg.split(":")[1]);
  
  let parsed: any = null;
  try { parsed = JSON.parse(displayMsg); } catch (e) {}

  return (
    <div>
      {parsed && parsed.viewOnce && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)", fontSize: "0.8rem", marginBottom: "0.5rem", fontWeight: "bold", background: "rgba(239, 68, 68, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
          <Flame size={14} className="animate-pulse" /> View Once {timeLeft !== null && !isMe && `(${timeLeft}s)`}
        </div>
      )}
      {parsed && typeof parsed === "object" ? (
        <>
          {parsed.text && <div>{parsed.text}</div>}
          {parsed.attachment && <AttachmentRenderer attachment={parsed.attachment} />}
        </>
      ) : (
        displayMsg.length > 50 && displayMsg.includes("encryptedContent") ? "<Encrypted Payload>" : displayMsg
      )}
    </div>
  );
}

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

  // Advanced Messaging States
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // Attachments State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);

  const [isBurnerMode, setIsBurnerMode] = useState(false);

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
      if (activeType === "group") return; 
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
      const payloadObj = {
        text: inputText,
        attachment: attachment,
        viewOnce: isBurnerMode
      };
      const plaintextPayload = JSON.stringify(payloadObj);

      let encryptedPayload = "";
      if (activeType === "dm") {
        if (!recipientPublicKey) throw new Error("Missing recipient public key");
        encryptedPayload = await encryptMessage(plaintextPayload, recipientPublicKey);
      } else {
        encryptedPayload = "ENC_GROUP:" + btoa(plaintextPayload); 
      }

      if (editingMsg) {
        // Edit Message
        const url = activeType === "dm" ? `/api/chat/messages/${editingMsg.id}` : `/api/groups/messages/${editingMsg.id}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encrypted_content: encryptedPayload })
        });
        const data = await res.json();
        if (data.success) {
          setMessages(messages.map(m => m.id === editingMsg.id ? data.message : m));
          setEditingMsg(null);
          setInputText("");
        }
      } else {
        // Send New Message
        const url = activeType === "dm" ? "/api/chat/messages" : "/api/groups/messages";
        const body: any = { encrypted_content: encryptedPayload };
        if (activeType === "dm") body.conversation_id = activeId;
        else body.group_id = activeId;

        if (replyingTo) body.reply_to_id = replyingTo.id;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (data.success) {
          setMessages([...messages, data.message]);
          setReplyingTo(null);
          setInputText("");
          setAttachment(null);
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    try {
      const url = activeType === "dm" ? `/api/chat/messages/${msgId}` : `/api/groups/messages/${msgId}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: true })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(messages.map(m => m.id === msgId ? data.message : m));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleReact = async (msg: any, emoji: string) => {
    try {
      // Decode existing reactions or create new
      let currentReactions: Record<string, string[]> = {};
      if (msg.reactions && !msg.reactions.startsWith("ENC_GROUP:")) {
        try {
          // Decrypting reactions (mock base64 for now, real app would use AES)
          currentReactions = JSON.parse(atob(msg.reactions));
        } catch (e) {}
      } else if (msg.reactions && msg.reactions.startsWith("ENC_GROUP:")) {
        try {
          currentReactions = JSON.parse(atob(msg.reactions.split(":")[1]));
        } catch (e) {}
      }

      if (!currentReactions[emoji]) currentReactions[emoji] = [];
      
      const userIndex = currentReactions[emoji].indexOf(sessionUser.id);
      if (userIndex > -1) {
        currentReactions[emoji].splice(userIndex, 1); // toggle off
        if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
      } else {
        currentReactions[emoji].push(sessionUser.id);
      }

      const stringified = JSON.stringify(currentReactions);
      const encryptedReactions = activeType === "group" ? "ENC_GROUP:" + btoa(stringified) : btoa(stringified); // MOCK encryption for DMs

      const url = activeType === "dm" ? `/api/chat/messages/${msg.id}` : `/api/groups/messages/${msg.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactions: encryptedReactions })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessages(messages.map(m => m.id === msg.id ? data.message : m));
      }
    } catch (err) {
      console.error("Failed to react", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const arrayBuffer = await file.arrayBuffer();
      
      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        arrayBuffer
      );
      
      const blob = new Blob([encryptedContent], { type: "application/octet-stream" });
      const formData = new FormData();
      formData.append("file", blob, file.name); 
      
      const res = await fetch("/api/chat/attachments", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
        const aesKeyB64 = window.btoa(String.fromCharCode(...new Uint8Array(rawAesKey)));
        const ivB64 = window.btoa(String.fromCharCode(...new Uint8Array(iv)));
        
        setAttachment({
          url: data.url,
          name: file.name,
          type: file.type,
          size: file.size,
          aesKey: aesKeyB64,
          iv: ivB64
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;
    
    setLoading(true);
    try {
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
                        }
                      } catch (err) {}
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
                    const parentMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                    // Parse reactions
                    let reactionsObj: Record<string, string[]> = {};
                    if (msg.reactions && !msg.reactions.startsWith("ENC_GROUP:")) {
                      try { reactionsObj = JSON.parse(atob(msg.reactions)); } catch (e) {}
                    } else if (msg.reactions && msg.reactions.startsWith("ENC_GROUP:")) {
                      try { reactionsObj = JSON.parse(atob(msg.reactions.split(":")[1])); } catch (e) {}
                    }

                    return (
                      <div 
                        key={msg.id} 
                        style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%", alignSelf: isMe ? "flex-end" : "flex-start" }}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexDirection: isMe ? "row-reverse" : "row" }}>
                          <div style={{ background: isMe ? "var(--accent-blue)" : "var(--glass-bg)", border: isMe ? "none" : "1px solid var(--glass-border)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", color: "#fff", position: "relative", minWidth: "100px" }}>
                            
                            {/* Reply Preview */}
                            {parentMsg && (
                              <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem", fontSize: "0.8rem", borderLeft: "3px solid var(--accent-purple)", cursor: "pointer", opacity: 0.8 }}>
                                <div style={{ fontWeight: "bold", marginBottom: "0.2rem" }}>{parentMsg.sender_id === sessionUser.id ? "You" : "Them"}</div>
                                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                                  <MessageContentRenderer msg={parentMsg} isMe={parentMsg.sender_id === sessionUser.id} />
                                </div>
                              </div>
                            )}

                            <MessageContentRenderer msg={msg} isMe={isMe} />

                            {msg.is_edited && !msg.is_deleted && (
                              <span style={{ fontSize: "0.7rem", opacity: 0.6, marginLeft: "0.5rem" }}>(edited)</span>
                            )}
                            
                            {/* Reactions Inline */}
                            {Object.keys(reactionsObj).length > 0 && (
                              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                                {Object.entries(reactionsObj).map(([emoji, users]) => (
                                  <span key={emoji} onClick={() => handleReact(msg, emoji)} style={{ fontSize: "0.8rem", background: "rgba(0,0,0,0.3)", padding: "0.1rem 0.4rem", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", border: users.includes(sessionUser.id) ? "1px solid var(--accent-purple)" : "1px solid transparent" }}>
                                    {emoji} <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{users.length}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Hover Context Menu */}
                          {hoveredMsgId === msg.id && !msg.is_deleted && (
                            <div style={{ display: "flex", gap: "0.25rem", background: "var(--glass-bg)", padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
                              <button onClick={() => handleReact(msg, "👍")} title="React 👍" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}>👍</button>
                              <button onClick={() => handleReact(msg, "❤️")} title="React ❤️" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}>❤️</button>
                              <button onClick={() => setReplyingTo(msg)} title="Reply" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}><Reply size={14} /></button>
                              {isMe && (
                                <>
                                  <button onClick={() => { setEditingMsg(msg); setInputText(msg.encrypted_content.startsWith("ENC_GROUP:") ? atob(msg.encrypted_content.split(":")[1]) : "<Cannot decrypt inline>"); }} title="Edit" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete(msg.id)} title="Delete" style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", padding: "0.25rem" }}><Trash2 size={14} /></button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                
                {/* Reply/Edit Previews */}
                {replyingTo && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent-purple)", fontSize: "0.85rem" }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: "var(--accent-purple)", marginBottom: "0.25rem" }}>Replying to {replyingTo.sender_id === sessionUser.id ? "Yourself" : "Message"}</div>
                      <div style={{ color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "400px" }}><MessageContentRenderer msg={replyingTo} isMe={replyingTo.sender_id === sessionUser.id} /></div>
                    </div>
                    <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={16} /></button>
                  </div>
                )}
                {editingMsg && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent-blue)", fontSize: "0.85rem" }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: "var(--accent-blue)", marginBottom: "0.25rem" }}>Editing Message</div>
                    </div>
                    <button onClick={() => { setEditingMsg(null); setInputText(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={16} /></button>
                  </div>
                )}
                {attachment && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent-green)", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Paperclip size={14} color="var(--text-secondary)" />
                      <span style={{ color: "var(--text-secondary)" }}>{attachment.name}</span>
                    </div>
                    <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={16} /></button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {uploadingFile ? <div style={{ width: "18px", height: "18px", border: "2px solid var(--text-secondary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> : <Paperclip size={20} />}
                  </button>
                  <button type="button" onClick={() => setIsBurnerMode(!isBurnerMode)} style={{ background: "transparent", border: "none", color: isBurnerMode ? "var(--accent-red)" : "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.2s" }} title="Burner Mode (View Once)">
                    <Flame size={20} />
                  </button>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={editingMsg ? "Edit your message..." : "Type an encrypted message..."}
                    style={{ flex: 1, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "1rem 1.5rem", borderRadius: "100px", color: "#fff", outline: "none", fontSize: "1rem" }}
                  />
                  <button type="submit" disabled={loading || (!inputText.trim() && !attachment)} className="btn btn-primary" style={{ padding: "0 1.5rem", height: "100%", borderRadius: "100px", display: "flex", alignItems: "center", justifyContent: "center", opacity: (inputText.trim() || attachment) ? 1 : 0.5 }}>
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
