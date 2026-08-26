"use client";

import { FormEvent, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { isDesktopLoopbackRedirect } from "@/lib/security";

const enabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.toLowerCase() !== "false";

export default function DesktopTurnstilePage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const redirectUri = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("redirect_uri") || "";
  }, []);

  function finish(event: FormEvent) {
    event.preventDefault();
    if (!isDesktopLoopbackRedirect(redirectUri, "turnstile")) {
      setError("This page must be opened from Zyphor Desktop.");
      return;
    }
    if (enabled && !token) {
      setError("Complete the Cloudflare Turnstile check.");
      return;
    }
    window.location.assign(`${redirectUri}?token=${encodeURIComponent(token)}`);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "Segoe UI, sans-serif", padding: 24 }}>
      <form onSubmit={finish} style={{ width: "100%", maxWidth: 420, background: "#13131c", padding: 32, borderRadius: 16, border: "1px solid #2a2a35", display: "grid", gap: 16 }}>
        <h1 style={{ textAlign: "center", margin: 0 }}>Zyphor</h1>
        <p style={{ color: "#9aa0a6", textAlign: "center", margin: 0 }}>
          Cloudflare Turnstile protects guest downloads. Signed-in desktop sessions skip this step.
        </p>
        {error && <p style={{ color: "#ff6b6b", margin: 0 }}>{error}</p>}
        {enabled && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              options={{ action: "desktop-download" }}
              onSuccess={setToken}
              onExpire={() => setToken("")}
            />
          </div>
        )}
        <button
          disabled={enabled && !token}
          type="submit"
          style={{ padding: 13, border: 0, borderRadius: 8, color: "white", fontWeight: 700, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
        >
          Continue download
        </button>
      </form>
    </main>
  );
}
