"use client";

import React, { useMemo, useState } from "react";

export default function UserAvatar({ user }: { user: any }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = typeof user?.image === "string" && user.image.trim()
    ? user.image.trim()
    : typeof user?.avatar === "string" && user.avatar.trim()
      ? user.avatar.trim()
      : "";

  const initials = useMemo(() => {
    const source = typeof user?.name === "string" && user.name.trim()
      ? user.name
      : typeof user?.email === "string"
        ? user.email
        : "";

    if (!source) return "";
    return source
      .split(/[.\s@_-]+/)
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.name, user?.email]);

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={user?.name || "User Avatar"}
        onError={() => setImageFailed(true)}
        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }

  if (initials) {
    return (
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        background: "var(--accent-blue)", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: "600", fontSize: "0.8rem", letterSpacing: "1px"
      }}>
        {initials}
      </div>
    );
  }

  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "50%",
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 22H22L12 2Z" fill="var(--accent-blue)" fillOpacity="0.5" />
        <circle cx="12" cy="14" r="4" fill="var(--text-primary)" fillOpacity="0.7" />
      </svg>
    </div>
  );
}
