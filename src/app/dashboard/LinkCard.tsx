"use client";

import { useState, useEffect } from "react";
import { Lock, Trash2, Edit2, Check, X, Key } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LinkCard({ link }: { link: any }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [maxDownloads, setMaxDownloads] = useState<number>(link.max_downloads);
  const initialDate = new Date(link.expires_at).toISOString().split("T")[0];
  const [expiresAtDate, setExpiresAtDate] = useState<string>(initialDate);
  const [allowSave, setAllowSave] = useState<boolean>(link.allow_save !== 0);
  const [authRequired, setAuthRequired] = useState<boolean>(link.auth_required === 1);
  const [localPassword, setLocalPassword] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `vaultshare_key_${link.id}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.key === "string") {
          const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : 0;
          if (expiresAt && expiresAt > Date.now()) {
            setLocalPassword(parsed.key);
          } else {
            localStorage.removeItem(storageKey);
          }
          return;
        }
      } catch {
        // Backward compatibility for older plain-string records.
      }

      setLocalPassword(raw);
    }
  }, [link.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      const dateObj = new Date(expiresAtDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid expiration date");
      }

      const newExpiresAt = dateObj.toISOString();

      const response = await fetch("/api/links/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: link.id,
          maxDownloads,
          expiresAt: newExpiresAt,
          allowSave,
          authRequired,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update transfer");
      }

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setMaxDownloads(link.max_downloads);
    setExpiresAtDate(new Date(link.expires_at).toISOString().split("T")[0]);
    setAllowSave(link.allow_save !== 0);
    setAuthRequired(link.auth_required === 1);
    setError("");
    setIsEditing(false);
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Lock size={16} color="var(--accent-blue)" />
          <span style={{ fontWeight: "600", letterSpacing: "1px" }}>{link.id}</span>
        </div>

        {!isEditing && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.3)", padding: "0.2rem 0.5rem", borderRadius: "10px" }}>
            {link.current_downloads} / {link.max_downloads === 0 ? "unlimited" : link.max_downloads} DLs
          </span>
        )}
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Max Downloads (0 for unlimited)</label>
            <input
              type="number"
              min="0"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(parseInt(e.target.value, 10) || 0)}
              className="input-field"
              style={{ padding: "0.5rem" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Expires On</label>
            <input
              type="date"
              value={expiresAtDate}
              onChange={(e) => setExpiresAtDate(e.target.value)}
              className="input-field"
              style={{ padding: "0.5rem" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Allow 'Save to Vault'</label>
            <input
              type="checkbox"
              checked={allowSave}
              onChange={(e) => setAllowSave(e.target.checked)}
              style={{ accentColor: "var(--accent-blue)", width: "16px", height: "16px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Require sign-in for download</label>
            <input
              type="checkbox"
              checked={authRequired}
              onChange={(e) => setAuthRequired(e.target.checked)}
              style={{ accentColor: "var(--accent-blue)", width: "16px", height: "16px" }}
            />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <p suppressHydrationWarning>Created: {new Date(link.created_at).toLocaleDateString()}</p>
          <p suppressHydrationWarning>Expires: {new Date(link.expires_at).toLocaleDateString()}</p>
          {link.auth_required === 1 && <p style={{ marginTop: "0.5rem", color: "var(--text-primary)", fontWeight: "500" }}>Sign-in required for download</p>}
          {link.save_count !== undefined && (
            <p style={{ marginTop: "0.5rem", color: "var(--text-primary)", fontWeight: "500" }}>{link.save_count} user(s) saved this</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 1, padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
            >
              {isSaving ? "Saving..." : <><Check size={16} /> Save</>}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="btn btn-secondary"
              style={{ padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Cancel Editing"
            >
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </>
        ) : (
          <>
            <a href={`/${link.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, padding: "0.5rem", textAlign: "center" }}>
              View
            </a>
            {localPassword && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(localPassword);
                  alert("Password copied to clipboard!");
                }}
                className="btn btn-secondary"
                style={{ padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", borderColor: "var(--accent-purple)", color: "var(--accent-purple)" }}
                title="Copy Password"
              >
                <Key size={16} />
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
              style={{ padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Edit Transfer Limits"
            >
              <Edit2 size={16} style={{ color: "var(--accent-blue)" }} />
            </button>
            <form action="/api/links/delete" method="POST" style={{ display: "flex" }}>
              <input type="hidden" name="id" value={link.id} />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ height: "100%", padding: "0.5rem", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Delete Transfer"
              >
                <Trash2 size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
