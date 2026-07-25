"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Lock, Send, Users, Video, Phone, Edit2, Trash2, Reply, X, Paperclip, Flame, Bell, CheckCircle } from "lucide-react";
import { encryptMessage, decryptMessage } from "@/lib/key-exchange";
import { withCsrfHeaders } from "@/lib/csrf-client";

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

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function encodeReadablePayload(prefix: "ENC_DM" | "ENC_GROUP", value: string): string {
  return `${prefix}:${encodeBase64Utf8(value)}`;
}

function decodeReadablePayload(value: string): string | null {
  if (value.startsWith("ENC_GROUP:") || value.startsWith("ENC_DM:")) {
    try {
      return decodeBase64Utf8(value.slice(value.indexOf(":") + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function decodeReactionPayload(value: string): Record<string, string[]> {
  const payload = value.startsWith("ENC_GROUP:") ? value.slice(value.indexOf(":") + 1) : value;
  try {
    return JSON.parse(decodeBase64Utf8(payload));
  } catch {
    try {
      return JSON.parse(window.atob(payload));
    } catch {
      return {};
    }
  }
}

function getMessageDisplayText(msg: any): string {
  const raw = msg.display_content || msg.encrypted_content || "";
  const decoded = decodeReadablePayload(raw);
  return decoded || raw;
}

function extractEditableText(msg: any): string {
  const display = getMessageDisplayText(msg);
  try {
    const parsed = JSON.parse(display);
    if (parsed && typeof parsed === "object") return parsed.text || "";
  } catch {
    // Plain text fallback.
  }
  return display === "ENC_DELETED" ? "" : display;
}

function MessageContentRenderer({ msg, isMe }: { msg: any, isMe: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isBurned, setIsBurned] = useState(false);

  const displayMsg = getMessageDisplayText(msg);
  let parsed: any = null;
  try { parsed = JSON.parse(displayMsg); } catch (e) {}

  const isBurnerMessage = Boolean(msg.burn_after_view || parsed?.viewOnce);

  useEffect(() => {
    if (msg.is_deleted || isBurned || !isBurnerMessage || isMe) return;

    setTimeLeft(15);
    const interval = window.setInterval(() => {
      setTimeLeft(prev => Math.max((prev ?? 15) - 1, 0));
    }, 1000);

    const burnTimer = window.setTimeout(() => {
      const url = msg.group_id ? `/api/groups/messages/${msg.id}` : `/api/chat/messages/${msg.id}`;
      fetch(url, {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ is_deleted: true, burn_after_view: true })
      })
        .then((res) => {
          if (res.ok) setIsBurned(true);
        })
        .catch(console.error);
    }, 15000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(burnTimer);
    };
  }, [msg.id, msg.group_id, msg.is_deleted, isMe, isBurned, isBurnerMessage]);

  if (isBurned) {
    return <div style={{ fontStyle: "italic", opacity: 0.7, color: "var(--accent-red)" }}>Message self-destructed</div>;
  }

  if (msg.is_deleted || displayMsg === "ENC_DELETED") {
    return <div style={{ fontStyle: "italic", opacity: 0.7 }}>This message was deleted</div>;
  }

  return (
    <div>
      {isBurnerMessage && (
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
        displayMsg.length > 50 && displayMsg.includes("encryptedContent") ? "Encrypted message - set up this device key to decrypt it" : displayMsg
      )}
    </div>
  );
}
export default function ChatClient({
  sessionUser,
  initialConversations,
  initialGroups = [],
  initialActiveId = null,
  initialActiveType = null
}: {
  sessionUser: any,
  initialConversations: any[],
  initialGroups?: any[],
  initialActiveId?: string | null,
  initialActiveType?: "dm" | "group" | null
}) {
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [activeType, setActiveType] = useState<"dm" | "group" | null>(initialActiveType);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
  const [ownPublicKey, setOwnPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatError, setChatError] = useState("");

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
  useEffect(() => {
    setOwnPublicKey(localStorage.getItem("zyphor_public_key_pem"));
    setPrivateKey(localStorage.getItem("zyphor_private_key_pem"));
  }, []);

  const hydrateMessages = async (rawMessages: any[]) => {
    if (activeType !== "dm" || !privateKey) return rawMessages;

    return Promise.all(rawMessages.map(async (msg) => {
      if (decodeReadablePayload(msg.encrypted_content || "")) return msg;
      if (!String(msg.encrypted_content || "").includes("encryptedContent")) return msg;
      try {
        return { ...msg, display_content: await decryptMessage(msg.encrypted_content, privateKey) };
      } catch {
        return msg;
      }
    }));
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/live?lookbackSeconds=86400&limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setNotifications(data.events || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const openNotification = async (notification: any) => {
    if (notification.entity_type === "conversation") {
      setActiveId(notification.entity_id);
      setActiveType("dm");
    } else if (notification.entity_type === "group") {
      setActiveId(notification.entity_id);
      setActiveType("group");
    } else if (notification.link) {
      window.location.href = notification.link;
      return;
    }

    setNotifications(current => current.filter(item => item.id !== notification.id));
    setShowNotifications(false);
  };

  const markAllNotificationsRead = async () => {
    setNotifications([]);
  };

  useEffect(() => {
    loadNotifications();
    const notificationTimer = setInterval(loadNotifications, 5000);
    return () => clearInterval(notificationTimer);
  }, []);

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
    if (!activeId) return;

    const fetchMessages = async () => {
      if (!activeType) return;
      const url = activeType === "dm" ? `/api/chat/messages?conversationId=${activeId}` : `/api/groups/messages?groupId=${activeId}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setMessages(await hydrateMessages(data.messages || []));
          setChatError("");
        } else {
          setChatError(data.error || "Could not load messages.");
        }
      } catch (err) {
        console.error("Failed to load messages", err);
        setChatError("Could not load messages.");
      }
    };

    const fetchKey = async () => {
      setRecipientPublicKey(null);
      if (activeType === "group") return;
      const activeConv = initialConversations.find((c: any) => c.id === activeId);
      if (!activeConv) return;
      const otherUserId = activeConv.user1_id === sessionUser.id ? activeConv.user2_id : activeConv.user1_id;

      try {
        const res = await fetch(`/api/keys?userId=${otherUserId}`);
        const data = await res.json();
        setRecipientPublicKey(data.success ? data.public_key : null);
      } catch (err) {
        console.error("Failed to fetch recipient key", err);
        setRecipientPublicKey(null);
      }
    };

    fetchMessages();
    fetchKey();

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeId, activeType, initialConversations, sessionUser.id, privateKey]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !activeId || !activeType) return;

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
        encryptedPayload = recipientPublicKey
          ? await encryptMessage(plaintextPayload, recipientPublicKey, ownPublicKey)
          : encodeReadablePayload("ENC_DM", plaintextPayload);
      } else {
        encryptedPayload = encodeReadablePayload("ENC_GROUP", plaintextPayload);
      }

      if (editingMsg) {
        // Edit Message
        const url = activeType === "dm" ? `/api/chat/messages/${editingMsg.id}` : `/api/groups/messages/${editingMsg.id}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ encrypted_content: encryptedPayload })
        });
        const data = await res.json();
        if (data.success) {
          setMessages(messages.map(m => m.id === editingMsg.id ? { ...data.message, display_content: plaintextPayload } : m));
          setEditingMsg(null);
          setInputText("");
          setChatError("");
        } else {
          setChatError(data.error || "Could not update message.");
        }
      } else {
        // Send New Message
        const url = activeType === "dm" ? "/api/chat/messages" : "/api/groups/messages";
        const body: any = { encrypted_content: encryptedPayload };
        if (activeType === "dm") body.conversation_id = activeId;
        else body.group_id = activeId;

        if (replyingTo) body.reply_to_id = replyingTo.id;
        body.burn_after_view = isBurnerMode;

        const res = await fetch(url, {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (data.success) {
          setMessages([...messages, { ...data.message, display_content: plaintextPayload }]);
          setReplyingTo(null);
          setInputText("");
          setAttachment(null);
          setChatError("");
          await loadNotifications();
        } else {
          setChatError(data.error || "Could not send message.");
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
      setChatError("Could not send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    try {
      const url = activeType === "dm" ? `/api/chat/messages/${msgId}` : `/api/groups/messages/${msgId}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
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
      let currentReactions: Record<string, string[]> = msg.reactions ? decodeReactionPayload(msg.reactions) : {};

      if (!currentReactions[emoji]) currentReactions[emoji] = [];

      const userIndex = currentReactions[emoji].indexOf(sessionUser.id);
      if (userIndex > -1) {
        currentReactions[emoji].splice(userIndex, 1); // toggle off
        if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
      } else {
        currentReactions[emoji].push(sessionUser.id);
      }

      const stringified = JSON.stringify(currentReactions);
      const encryptedReactions = activeType === "group" ? encodeReadablePayload("ENC_GROUP", stringified) : encodeBase64Utf8(stringified);

      const url = activeType === "dm" ? `/api/chat/messages/${msg.id}` : `/api/groups/messages/${msg.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
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
      // 1. Generate a random encryption key for the file
      const encryptionKey = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

      // 2. Encrypt file using the same logic as the main upload area
      const { encryptFile } = await import("@/lib/crypto");
      const { encryptedData, salt, iv } = await encryptFile(file, encryptionKey);

      const formData = new FormData();
      formData.append("maxDownloads", "0");
      formData.append("isProtected", "true");
      formData.append("allowSave", "true");
      formData.append("authRequired", "false");
      formData.append("files", encryptedData, `${file.name}.enc`);
      formData.append("salt", window.btoa(String.fromCharCode(...Array.from(salt))));
      formData.append("iv", window.btoa(String.fromCharCode(...Array.from(iv))));
      formData.append("originalName", file.name);
      formData.append("originalMime", file.type || "application/octet-stream");

      const { withCsrfHeaders } = await import("@/lib/csrf-client");

      // 3. Upload to main /api/upload endpoint
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: withCsrfHeaders(),
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        // 4. Set the input text to the secure share link so the user can send it
        const linkDetail = `${window.location.origin}/${data.linkId}#${encryptionKey}`;
        setInputText(prev => (prev ? prev + "\n" + linkDetail : linkDetail));
      } else {
        throw new Error(data.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("File upload failed: " + err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    setLoading(true);
    try {
      const members = [{ user_id: sessionUser.id, encrypted_group_key: "GROUP_KEY_PENDING" }];

      for (const member of selectedGroupMembers) {
        members.push({ user_id: member.id, encrypted_group_key: "GROUP_KEY_PENDING" });
      }

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: newGroupName,
          members
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = `/chat?group=${data.group.id}`;
      } else {
        setChatError(data.error || "Could not create group.");
      }
    } catch (err) {
      console.error(err);
      setChatError("Could not create group.");
    } finally {
      setLoading(false);
    }
  };
  const startCall = async (mediaType: "AUDIO" | "VIDEO") => {
    if (!activeId || activeType !== "dm") return;

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ conversation_id: activeId, media_type: mediaType })
      });
      const data = await res.json();
      if (data.success && data.call) {
        window.location.href = `/chat/call/${data.call.id}`;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Failed to start call", err);
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

      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}><h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Zyphor Chat</h1></Link>
          <span style={{ fontSize: "0.75rem", background: "var(--accent-blue)", padding: "0.1rem 0.5rem", borderRadius: "10px", fontWeight: "600", color: "#fff" }}>E2EE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-secondary"
            style={{ position: "relative", padding: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Notifications"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span style={{ position: "absolute", top: "-5px", right: "-5px", minWidth: "18px", height: "18px", borderRadius: "9px", background: "var(--accent-red)", color: "#fff", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 0.25rem", fontWeight: 700 }}>
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div style={{ position: "absolute", top: "calc(100% + 0.5rem)", right: "5.75rem", width: "340px", maxHeight: "420px", overflowY: "auto", background: "var(--bg-main)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", boxShadow: "0 20px 45px rgba(0,0,0,0.35)", zIndex: 200 }}>
              <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.95rem" }}>Notifications</strong>
                {notifications.length > 0 && (
                  <button type="button" onClick={markAllNotificationsRead} style={{ background: "transparent", border: "none", color: "var(--accent-blue)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}>
                    <CheckCircle size={14} /> Clear
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "1.5rem", color: "var(--text-secondary)", textAlign: "center", fontSize: "0.9rem" }}>No new notifications</div>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.9rem 1rem", color: "#fff", cursor: "pointer" }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{notification.title}</div>
                  {notification.body && <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.35 }}>{notification.body}</div>}
                </button>
              ))}
            </div>
          )}
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
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
                          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
                      onClick={() => startCall("AUDIO")}
                      title="Start audio call"
                    >
                      <Phone size={16} /> Audio
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1rem", borderRadius: "100px", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}
                      onClick={() => startCall("VIDEO")}
                      title="Start video call"
                    >
                      <Video size={16} /> Video
                    </button>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {chatError && <div style={{ alignSelf: "center", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "var(--accent-red)", padding: "0.65rem 0.9rem", borderRadius: "var(--radius-sm)", fontSize: "0.9rem" }}>{chatError}</div>}
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
                    let reactionsObj: Record<string, string[]> = msg.reactions ? decodeReactionPayload(msg.reactions) : {};

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
                                  <button onClick={() => { setEditingMsg(msg); setInputText(extractEditableText(msg)); }} title="Edit" style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem" }}><Edit2 size={14} /></button>
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
