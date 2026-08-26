"use client";

import { FormEvent, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

declare global {
  interface Window { zyphorDesktop?: { authenticated(token: string, id: string, email: string, name: string): void } }
}

const enabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.toLowerCase() !== "false";

export default function DesktopLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const query = new URLSearchParams(window.location.search); const redirectUri = query.get("redirect_uri"); const state = query.get("state"); const codeChallenge = query.get("code_challenge");
      const response = await fetch("/api/desktop/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, turnstileToken: enabled ? turnstileToken : undefined, redirectUri: redirectUri || undefined, codeChallenge: codeChallenge || undefined }) });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || "Sign-in failed.");
      if (redirectUri && state && data.code) { window.location.assign(`${redirectUri}?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(state)}`); return; }
      if (!window.zyphorDesktop) throw new Error("Open this page from Zyphor Desktop to finish sign-in.");
      window.zyphorDesktop.authenticated(data.token, data.user.id, data.user.email || "", data.user.name || "Zyphor User");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed."); }
    finally { setLoading(false); }
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "#f0f0f5", fontFamily: "Segoe UI, sans-serif", padding: "24px" }}>
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#13131c", padding: 32, borderRadius: 16, border: "1px solid #2a2a35", display: "grid", gap: 16 }}>
      <h1 style={{ textAlign: "center", margin: 0 }}>ZYPHOR</h1><p style={{ color: "#9aa0a6", textAlign: "center", margin: 0 }}>Secure desktop sign-in</p>
      {error && <p style={{ color: "#ff6b6b", margin: 0 }}>{error}</p>}
      <label>Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12 }} /></label>
      <label>Password<input required type="password" value={password} onChange={event => setPassword(event.target.value)} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12 }} /></label>
      {enabled && <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken("")} />}
      <button disabled={loading || (enabled && !turnstileToken)} type="submit" style={{ padding: 13, border: 0, borderRadius: 8, color: "white", fontWeight: 700, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>{loading ? "Signing in…" : "Sign in securely"}</button>
      <p style={{ color: "#9aa0a6", fontSize: 12, margin: 0 }}>Cloudflare Turnstile protects this request. Your password is sent only to Zyphor over HTTPS.</p>
    </form>
  </main>;
}
